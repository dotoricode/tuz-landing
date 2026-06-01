#!/usr/bin/env node

const path = require('node:path');
const {
  createBackupDocument,
  defaultBackupPath,
  fetchInventoryEventRows,
  fetchInventoryRows,
  readSupabaseConfig,
  writeBackupFile
} = require('./inventory-backup-lib.cjs');

function parseArgs(argv) {
  const args = { out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run backup:inventory
  npm run backup:inventory -- --out backups/inventory/manual.json

Creates a JSON backup of public.inventory_items and public.inventory_events using the configured Supabase anon key.
Backup files under backups/ are intentionally gitignored.`);
}

async function main() {
  const rootDir = path.join(__dirname, '..');
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = readSupabaseConfig(rootDir);
  const rows = await fetchInventoryRows(config);
  const events = await fetchInventoryEventRows(config, { optional: true });
  const outputPath = path.resolve(rootDir, args.out || defaultBackupPath(rootDir));
  const document = createBackupDocument(rows, config, new Date(), events);
  writeBackupFile(outputPath, document);

  console.log(`Inventory backup saved: ${outputPath}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Events: ${events.length}`);
}

main().catch(error => {
  console.error(`Inventory backup failed: ${error.message}`);
  process.exitCode = 1;
});
