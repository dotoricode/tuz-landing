const fs = require('node:fs');
const path = require('node:path');

const TABLE = 'inventory_items';
const EVENT_TABLE = 'inventory_events';
const SELECT_COLUMNS = [
  'id',
  'sort_order',
  'name',
  'quantity',
  'unit',
  'category',
  'min_quantity',
  'expiry_date',
  'expiry_type',
  'storage_method',
  'origin',
  'stock_group',
  'opened_at',
  'is_favorite',
  'updated_by',
  'created_at',
  'updated_at'
];
const EVENT_SELECT_COLUMNS = [
  'id',
  'type',
  'item_id',
  'stock_key',
  'lot_id',
  'quantity_delta',
  'reason',
  'undo_until',
  'reversed_at',
  'reverses_event_id',
  'actor',
  'metadata',
  'created_at'
];

const BACKUP_VERSION = 2;

function readSupabaseConfig(rootDir = path.join(__dirname, '..')) {
  const file = path.join(rootDir, 'shared', 'supabase.js');
  const source = fs.readFileSync(file, 'utf8');
  const url = source.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
  const anonKey = source.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1];
  if (!url || !anonKey) {
    throw new Error(`Supabase config not found in ${file}`);
  }
  return { url, anonKey };
}

function restHeaders(anonKey, extra = {}) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    ...extra
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const message = typeof body === 'string' ? body : body?.message || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return { response, body };
}

function tableUrl(baseUrl, table = TABLE, query = '') {
  return `${baseUrl.replace(/\/$/, '')}/rest/v1/${table}${query}`;
}

function isMissingInventoryEventTableError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes(EVENT_TABLE) ||
    message.includes('schema cache') ||
    message.includes('relation') ||
    message.includes('does not exist');
}

async function fetchInventoryRows(config) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const query = [
      `select=${SELECT_COLUMNS.join(',')}`,
      'order=sort_order.asc',
      'order=created_at.asc'
    ].join('&');
    const { body } = await fetchJson(tableUrl(config.url, TABLE, `?${query}`), {
      headers: restHeaders(config.anonKey, {
        Range: `${offset}-${offset + pageSize - 1}`,
        Prefer: 'count=exact'
      })
    });
    const page = Array.isArray(body) ? body : [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function fetchInventoryEventRows(config, { optional = false } = {}) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const query = [
      `select=${EVENT_SELECT_COLUMNS.join(',')}`,
      'order=created_at.desc'
    ].join('&');
    let body;
    try {
      ({ body } = await fetchJson(tableUrl(config.url, EVENT_TABLE, `?${query}`), {
        headers: restHeaders(config.anonKey, {
          Range: `${offset}-${offset + pageSize - 1}`,
          Prefer: 'count=exact'
        })
      }));
    } catch (error) {
      if (optional && isMissingInventoryEventTableError(error)) return [];
      throw error;
    }
    const page = Array.isArray(body) ? body : [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function defaultBackupPath(rootDir = path.join(__dirname, '..'), date = new Date()) {
  return path.join(rootDir, 'backups', 'inventory', `inventory-${timestampForFilename(date)}.json`);
}

function createBackupDocument(rows, config, date = new Date(), events = []) {
  return {
    version: BACKUP_VERSION,
    created_at: date.toISOString(),
    source: {
      supabase_url: config.url,
      table: TABLE,
      event_table: EVENT_TABLE
    },
    row_count: rows.length,
    event_count: events.length,
    events,
    rows
  };
}

function validateBackupDocument(document) {
  if (!document || typeof document !== 'object') {
    throw new Error('Backup file is not a JSON object.');
  }
  if (![1, 2].includes(document.version)) {
    throw new Error(`Unsupported backup version: ${document.version}`);
  }
  if (!Array.isArray(document.rows)) {
    throw new Error('Backup file is missing rows[].');
  }

  const ids = new Set();
  for (const [index, row] of document.rows.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Invalid row at index ${index}.`);
    }
    if (!row.id || typeof row.id !== 'string') {
      throw new Error(`Missing row id at index ${index}.`);
    }
    if (ids.has(row.id)) {
      throw new Error(`Duplicate row id in backup: ${row.id}`);
    }
    ids.add(row.id);
    if (!row.name || typeof row.name !== 'string') {
      throw new Error(`Missing row name for ${row.id}.`);
    }
  }
  return document.rows;
}

function validateBackupEvents(document) {
  if (!document || typeof document !== 'object') {
    throw new Error('Backup file is not a JSON object.');
  }
  if (![1, 2].includes(document.version)) {
    throw new Error(`Unsupported backup version: ${document.version}`);
  }
  if (document.events === undefined) return [];
  if (!Array.isArray(document.events)) {
    throw new Error('Backup file events must be an array when present.');
  }

  const ids = new Set();
  for (const [index, event] of document.events.entries()) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new Error(`Invalid event at index ${index}.`);
    }
    if (!event.id || typeof event.id !== 'string') {
      throw new Error(`Missing event id at index ${index}.`);
    }
    if (ids.has(event.id)) {
      throw new Error(`Duplicate event id in backup: ${event.id}`);
    }
    ids.add(event.id);
    if (!['use', 'discard', 'open', 'restock', 'adjust'].includes(event.type)) {
      throw new Error(`Invalid event type for ${event.id}: ${event.type}`);
    }
  }
  return document.events;
}

function normalizeRowsForRestore(rows) {
  return rows.map(row => {
    const normalized = {};
    for (const column of SELECT_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(row, column)) {
        normalized[column] = row[column];
      }
    }
    return normalized;
  });
}

function normalizeEventsForRestore(events) {
  return events.map(event => {
    const normalized = {};
    for (const column of EVENT_SELECT_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(event, column)) {
        normalized[column] = event[column];
      }
    }
    return normalized;
  });
}

async function upsertInventoryRows(config, rows) {
  const batchSize = 500;
  let restored = 0;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    await fetchJson(tableUrl(config.url, TABLE, '?on_conflict=id'), {
      method: 'POST',
      headers: restHeaders(config.anonKey, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(batch)
    });
    restored += batch.length;
  }
  return restored;
}

async function upsertInventoryEventRows(config, events) {
  const batchSize = 500;
  let restored = 0;
  for (let offset = 0; offset < events.length; offset += batchSize) {
    const batch = events.slice(offset, offset + batchSize);
    await fetchJson(tableUrl(config.url, EVENT_TABLE, '?on_conflict=id'), {
      method: 'POST',
      headers: restHeaders(config.anonKey, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(batch)
    });
    restored += batch.length;
  }
  return restored;
}

async function deleteInventoryRows(config, ids) {
  const batchSize = 200;
  let deleted = 0;
  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const batch = ids.slice(offset, offset + batchSize);
    const encoded = batch.map(id => `"${String(id).replaceAll('"', '\\"')}"`).join(',');
    await fetchJson(tableUrl(config.url, TABLE, `?id=in.(${encodeURIComponent(encoded)})`), {
      method: 'DELETE',
      headers: restHeaders(config.anonKey, {
        Prefer: 'return=minimal'
      })
    });
    deleted += batch.length;
  }
  return deleted;
}

async function deleteInventoryEventRows(config, ids) {
  const batchSize = 200;
  let deleted = 0;
  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const batch = ids.slice(offset, offset + batchSize);
    const encoded = batch.map(id => `"${String(id).replaceAll('"', '\\"')}"`).join(',');
    await fetchJson(tableUrl(config.url, EVENT_TABLE, `?id=in.(${encodeURIComponent(encoded)})`), {
      method: 'DELETE',
      headers: restHeaders(config.anonKey, {
        Prefer: 'return=minimal'
      })
    });
    deleted += batch.length;
  }
  return deleted;
}

function readBackupFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeBackupFile(filePath, document) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`);
}

module.exports = {
  BACKUP_VERSION,
  EVENT_SELECT_COLUMNS,
  EVENT_TABLE,
  SELECT_COLUMNS,
  TABLE,
  createBackupDocument,
  defaultBackupPath,
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
  validateBackupEvents,
  writeBackupFile
};
