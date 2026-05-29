const fs = require('node:fs');
const path = require('node:path');

const TABLE = 'inventory_items';
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
  'updated_by',
  'created_at',
  'updated_at'
];

const BACKUP_VERSION = 1;

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

function tableUrl(baseUrl, query = '') {
  return `${baseUrl.replace(/\/$/, '')}/rest/v1/${TABLE}${query}`;
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
    const { body } = await fetchJson(tableUrl(config.url, `?${query}`), {
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

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function defaultBackupPath(rootDir = path.join(__dirname, '..'), date = new Date()) {
  return path.join(rootDir, 'backups', 'inventory', `inventory-${timestampForFilename(date)}.json`);
}

function createBackupDocument(rows, config, date = new Date()) {
  return {
    version: BACKUP_VERSION,
    created_at: date.toISOString(),
    source: {
      supabase_url: config.url,
      table: TABLE
    },
    row_count: rows.length,
    rows
  };
}

function validateBackupDocument(document) {
  if (!document || typeof document !== 'object') {
    throw new Error('Backup file is not a JSON object.');
  }
  if (document.version !== BACKUP_VERSION) {
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

async function upsertInventoryRows(config, rows) {
  const batchSize = 500;
  let restored = 0;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    await fetchJson(tableUrl(config.url, '?on_conflict=id'), {
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
    await fetchJson(tableUrl(config.url, `?id=in.(${encodeURIComponent(encoded)})`), {
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
  SELECT_COLUMNS,
  TABLE,
  createBackupDocument,
  defaultBackupPath,
  deleteInventoryRows,
  fetchInventoryRows,
  normalizeRowsForRestore,
  readBackupFile,
  readSupabaseConfig,
  upsertInventoryRows,
  validateBackupDocument,
  writeBackupFile
};
