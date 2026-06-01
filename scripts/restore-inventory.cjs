#!/usr/bin/env node

const path = require('node:path');
const {
  deleteInventoryEventRows,
  deleteInventoryRows,
  fetchInventoryEventRows,
  fetchInventoryRows,
  normalizeEventsForRestore,
  normalizeRowsForRestore,
  readBackupFile,
  readSupabaseConfig,
  upsertInventoryEventRows,
  upsertInventoryRows,
  validateBackupDocument,
  validateBackupEvents
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
Backups created after the event-log migration also restore inventory_events.
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
  const backupEvents = validateBackupEvents(backup);
  if (!backupRows.length && !args.allowEmpty) {
    throw new Error('Backup contains 0 rows. Pass --allow-empty if this is intentional.');
  }

  const config = readSupabaseConfig(rootDir);
  const currentRows = await fetchInventoryRows(config);
  const currentEvents = backupEvents.length
    ? await fetchInventoryEventRows(config)
    : [];
  const backupIds = new Set(backupRows.map(row => row.id));
  const currentIds = new Set(currentRows.map(row => row.id));
  const backupEventIds = new Set(backupEvents.map(event => event.id));
  const currentEventIds = new Set(currentEvents.map(event => event.id));
  const missingInCurrent = backupRows.filter(row => !currentIds.has(row.id));
  const extraInCurrent = currentRows.filter(row => !backupIds.has(row.id));
  const missingEventsInCurrent = backupEvents.filter(event => !currentEventIds.has(event.id));
  const extraEventsInCurrent = currentEvents.filter(event => !backupEventIds.has(event.id));

  console.log(`Backup: ${backupPath}`);
  console.log(`Backup created at: ${backup.created_at || 'unknown'}`);
  console.log(`Backup rows: ${backupRows.length}`);
  console.log(`Backup events: ${backupEvents.length}`);
  console.log(`Current rows: ${currentRows.length}`);
  if (backupEvents.length) console.log(`Current events: ${currentEvents.length}`);
  console.log(`Rows to upsert: ${backupRows.length}`);
  console.log(`Missing rows that will be restored: ${missingInCurrent.length}`);
  console.log(`Current rows not in backup: ${extraInCurrent.length}`);
  if (backupEvents.length) {
    console.log(`Events to upsert: ${backupEvents.length}`);
    console.log(`Missing events that will be restored: ${missingEventsInCurrent.length}`);
    console.log(`Current events not in backup: ${extraEventsInCurrent.length}`);
  }

  if (!args.apply) {
    console.log('Dry-run only. Add --apply to restore rows.');
    if (extraInCurrent.length || extraEventsInCurrent.length) {
      console.log('Use --apply --replace --yes to delete rows/events that are not in the backup.');
    }
    return;
  }

  const rowsToRestore = normalizeRowsForRestore(backupRows);
  const restored = await upsertInventoryRows(config, rowsToRestore);
  const eventsToRestore = normalizeEventsForRestore(backupEvents);
  const restoredEvents = eventsToRestore.length
    ? await upsertInventoryEventRows(config, eventsToRestore)
    : 0;
  let deleted = 0;
  let deletedEvents = 0;
  if (args.replace) {
    deleted = await deleteInventoryRows(config, extraInCurrent.map(row => row.id));
    if (backupEvents.length) {
      deletedEvents = await deleteInventoryEventRows(config, extraEventsInCurrent.map(event => event.id));
    }
  }

  console.log(`Restore complete. Upserted rows: ${restored}. Deleted rows: ${deleted}. Upserted events: ${restoredEvents}. Deleted events: ${deletedEvents}.`);
}

main().catch(error => {
  console.error(`Inventory restore failed: ${error.message}`);
  process.exitCode = 1;
});
