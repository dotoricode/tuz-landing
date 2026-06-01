# Inventory Backups

TUZ inventory rows live in Supabase table `public.inventory_items`.
Inventory event history lives in `public.inventory_events`.
Use these scripts before risky edits, after big inventory updates, and whenever recovery point is needed.

## Create Backup

```bash
npm run backup:inventory
```

The script writes a timestamped JSON file to:

```text
backups/inventory/
```

`backups/` is ignored by Git so operational inventory data is not committed.

To choose a specific file:

```bash
npm run backup:inventory -- --out backups/inventory/before-cleanup.json
```

## Check Restore Plan

Restore is dry-run by default:

```bash
npm run restore:inventory -- backups/inventory/inventory-YYYYMMDDTHHMMSSZ.json
```

This prints row counts and what would be restored.

## Restore Missing Or Changed Rows

```bash
npm run restore:inventory -- backups/inventory/inventory-YYYYMMDDTHHMMSSZ.json --apply
```

This upserts backup rows and event rows by `id`. It restores deleted rows/events and overwrites changed rows/events with the backup values.
It does not delete current rows/events that are absent from the backup.

## Full Replace Restore

Use this only when the current table should match the backup exactly:

```bash
npm run restore:inventory -- backups/inventory/inventory-YYYYMMDDTHHMMSSZ.json --apply --replace --yes
```

`--replace` deletes current rows that are not in the backup. For backups that include events, it also deletes current events that are not in the backup. The extra `--yes` flag is required intentionally.

## Notes

- Backups use the same Supabase anon key as the inventory web app.
- New backups contain inventory rows and event history, not photos or unrelated site content.
- Old backups without `events[]` can still be restored. They restore item rows only and leave existing event history untouched.
- Keep important backup JSON files somewhere durable outside this working directory too, such as iCloud Drive or another private storage location.
