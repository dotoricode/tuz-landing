#!/usr/bin/env node

const path = require('node:path');
const {
  deleteInventoryRows,
  fetchInventoryRows,
  normalizeRowsForRestore,
  readBackupFile,
  readSupabaseConfig,
  upsertInventoryRows,
  validateBackupDocument
} = require('./inventory-backup-lib.cjs');

function parseArgs(argv) {
  const args = {
    apply: false,
    allowEmpty: false,
    backupPath: null,
    replace: false,
    yes: false
  };

  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg === '--allow-empty') args.allowEmpty = true;
    else if (arg === '--replace') args.replace = true;
    else if (arg === '--yes') args.yes = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (!args.backupPath) args.backupPath = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run restore:inventory -- backups/inventory/inventory-YYYYMMDDTHHMMSSZ.json
  npm run restore:inventory -- backups/inventory/inventory-YYYYMMDDTHHMMSSZ.json --apply
  npm run restore:inventory -- backups/inventory/inventory-YYYYMMDDTHHMMSSZ.json --apply --replace --yes

Default mode is dry-run.
--apply writes backup rows back to Supabase with upsert.
--replace also deletes current rows that are not present in the backup.
--yes is required with --replace.`);
}

async function main() {
  const rootDir = path.join(__dirname, '..');
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.backupPath) {
    printHelp();
    process.exitCode = args.help ? 0 : 1;
    return;
  }
  if (args.replace && !args.yes) {
    throw new Error('--replace requires --yes.');
  }

  const backupPath = path.resolve(rootDir, args.backupPath);
  const backup = readBackupFile(backupPath);
  const backupRows = validateBackupDocument(backup);
  if (!backupRows.length && !args.allowEmpty) {
    throw new Error('Backup contains 0 rows. Pass --allow-empty if this is intentional.');
  }

  const config = readSupabaseConfig(rootDir);
  const currentRows = await fetchInventoryRows(config);
  const backupIds = new Set(backupRows.map(row => row.id));
  const currentIds = new Set(currentRows.map(row => row.id));
  const missingInCurrent = backupRows.filter(row => !currentIds.has(row.id));
  const extraInCurrent = currentRows.filter(row => !backupIds.has(row.id));

  console.log(`Backup: ${backupPath}`);
  console.log(`Backup created at: ${backup.created_at || 'unknown'}`);
  console.log(`Backup rows: ${backupRows.length}`);
  console.log(`Current rows: ${currentRows.length}`);
  console.log(`Rows to upsert: ${backupRows.length}`);
  console.log(`Missing rows that will be restored: ${missingInCurrent.length}`);
  console.log(`Current rows not in backup: ${extraInCurrent.length}`);

  if (!args.apply) {
    console.log('Dry-run only. Add --apply to restore rows.');
    if (extraInCurrent.length) {
      console.log('Use --apply --replace --yes to delete rows that are not in the backup.');
    }
    return;
  }

  const rowsToRestore = normalizeRowsForRestore(backupRows);
  const restored = await upsertInventoryRows(config, rowsToRestore);
  let deleted = 0;
  if (args.replace) {
    deleted = await deleteInventoryRows(config, extraInCurrent.map(row => row.id));
  }

  console.log(`Restore complete. Upserted: ${restored}. Deleted: ${deleted}.`);
}

main().catch(error => {
  console.error(`Inventory restore failed: ${error.message}`);
  process.exitCode = 1;
});
