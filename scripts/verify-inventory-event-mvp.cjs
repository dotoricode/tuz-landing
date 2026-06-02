const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'inventory', 'index.html'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'schema.sql'), 'utf8');
const backupLib = fs.readFileSync(path.join(root, 'scripts', 'inventory-backup-lib.cjs'), 'utf8');

function count(pattern, source = html) {
  return [...source.matchAll(pattern)].length;
}

function requireMatch(pattern, message, source = html) {
  assert.match(source, pattern, message);
}

function functionBody(name) {
  const startNeedle = `function ${name}`;
  const start = html.indexOf(startNeedle);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const paramsEnd = html.indexOf(')', start);
  assert.notEqual(paramsEnd, -1, `Missing function params for ${name}`);
  const bodyStart = html.indexOf('{', paramsEnd);
  assert.notEqual(bodyStart, -1, `Missing function body for ${name}`);
  let depth = 0;
  for (let index = bodyStart; index < html.length; index += 1) {
    const char = html[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return html.slice(start, index + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}

assert.equal(count(/function restoreQuickDecrease\s*\(/g), 1, 'restoreQuickDecrease should have one event-based implementation');
assert.equal(count(/function decreaseInventoryLot\s*\(/g), 1, 'decreaseInventoryLot should have one event-based implementation');
assert.equal(count(/function handleInventoryQuickAdjust\s*\(/g), 1, 'quick adjust dispatcher should have one implementation');

assert(!html.includes('today-used-sheet'), 'One-click direct-selection sheet must not ship');
assert(!html.includes('today-oneclick-sheet'), 'One-click choice sheet must not ship');
assert(!html.includes('today-ai-result-sheet'), 'One-click AI result sheet must not ship');
assert(!html.includes('today-use-intro-sheet'), 'One-click intro sheet must not ship');
assert(!html.includes('한 번에 정리'), 'One-click cleanup copy must not ship');
assert(!html.includes('quick-use-beta-batch'), 'One-click AI batch deduction must not ship');
requireMatch(/id="manager-call-btn"[^>]*재고 AI 매니저 호출/, 'Bottom action must remain the manager AI entrypoint');
requireMatch(/id="manager-call-label">하동 AI<\/span>/, 'Bottom action label must default to manager AI');
requireMatch(/setElText\('manager-call-label', profile\.aiButtonLabel/, 'Manager profile must set the AI button label');
requireMatch(/const INVENTORY_EVENT_TABLE = 'inventory_events'/, 'Inventory event table constant is missing');
requireMatch(/const INVENTORY_EVENT_STORAGE_KEY = `\$\{INVENTORY_EVENT_KEY\}\$\{INVENTORY_STORAGE_SUFFIX\}`/, 'Event local storage key is missing');

const normalizeEvent = functionBody('normalizeInventoryEvent');
for (const type of ['use', 'discard', 'open', 'restock', 'adjust']) {
  assert(normalizeEvent.includes(`'${type}'`), `Event type ${type} is not normalized`);
}
for (const field of ['item_id', 'stock_key', 'lot_id', 'quantity_delta', 'reason', 'created_at', 'undo_until']) {
  assert(normalizeEvent.includes(field), `Event field ${field} is not normalized`);
}

const recordEvent = functionBody('recordInventoryEvent');
assert(recordEvent.includes('writeInventoryEventsLocal([event, ...inventoryEvents])'), 'Events must be written locally first');
assert(recordEvent.includes('insertInventoryEventRemote(event)'), 'Events must be queued for remote insert');

const delta = functionBody('applyInventoryLotDelta');
assert(delta.includes('recordInventoryEvent(type'), 'Quantity deltas must record an inventory event');
assert(delta.includes('quantity_delta: -consumeAmount'), 'Use/discard deltas must be negative');
assert(delta.includes('undo_until'), 'Use/discard events must carry an undo window');
assert(delta.includes('showUndoToast'), 'Use/discard must expose undo UX');
assert(delta.includes('소진'), 'Last-unit consumption must make depletion explicit');
assert(delta.includes('snapshot: inventoryEventItemSnapshot(lot)'), 'Use/discard events must preserve a lot snapshot for stable undo');

const increase = functionBody('increaseInventoryLot');
assert(increase.includes("recordInventoryEvent('adjust'"), 'Quick increase must record an inventory event');
assert(increase.includes('quantity_delta: addAmount'), 'Quick increase must record a positive quantity delta');
assert(increase.includes("reason: 'quick-increase'"), 'Quick increase events must be traceable');
assert(increase.includes('undo_until'), 'Quick increase must carry an undo window');
assert(increase.includes('showToast'), 'Quick increase must show a lightweight completion message');
assert(!increase.includes('showUndoToast'), 'Quick increase must not show the undo popup');
assert(!increase.includes('rememberQuickDecreaseUndo'), 'Quick increase must not replace the quick-decrease undo target');

const undo = functionBody('undoInventoryEvent');
assert(undo.includes("recordInventoryEvent('adjust'"), 'Undo must create a reversal/adjust event');
assert(undo.includes('reverses_event_id'), 'Undo event must link to the original event');
assert(undo.includes('markInventoryEventUndone'), 'Undo must mark the original event as reversed');
assert(undo.includes('restoreInventoryItemSnapshot'), 'Undo must be able to restore a removed item snapshot');

const restoreQuick = functionBody('restoreQuickDecrease');
assert(restoreQuick.includes('undoInventoryEvent'), 'Toast undo must use the generic event undo path');

assert(!html.includes('data-group-lot-action="open"'), 'Lot detail UI must not expose an open action');
assert(!html.includes('function markInventoryLotOpened'), 'Inventory open action handler must not ship');

const quickIncreaseGate = functionBody('canQuickIncreaseStock');
assert(quickIncreaseGate.includes('lots.every'), 'Quick plus must be limited by stock lots');
assert(quickIncreaseGate.includes('inventoryLotHasExpiryInput'), 'Quick plus must be hidden for expiry-date stock');

const quickAdjust = functionBody('handleInventoryQuickAdjust');
assert(quickAdjust.includes('captureQuickAdjustOrder'), 'Quick +/- must lock the current visible order before refreshing');
assert(quickAdjust.includes("action === 'increase-group'"), 'Group quick controls must support increase');
assert(quickAdjust.includes('canQuickIncreaseStock'), 'Group quick increase must be gated by missing expiry input');
assert(quickAdjust.includes("action === 'increase-item'"), 'Item quick controls must support increase');
assert(quickAdjust.includes('inventoryLotHasExpiryInput'), 'Item quick increase must be gated by missing expiry input');

const renderList = functionBody('renderList');
assert(renderList.includes('inv-quick-qty'), 'Grouped quick controls must show current quantity');
assert(renderList.includes('increase-group'), 'Grouped quick controls must include plus action');
assert(renderList.includes('canQuickIncreaseStock'), 'Grouped plus action must render only when expiry is missing');
assert(renderList.includes('sortByQuickAdjustItemOrder'), 'Expanded quick +/- must preserve visible item order after refresh');

const renderExpanded = functionBody('renderExpandedList');
assert(renderExpanded.includes('inv-quick-qty'), 'Expanded quick controls must show current quantity');
assert(renderExpanded.includes('increase-item'), 'Expanded quick controls must include plus action');
assert(renderExpanded.includes('inventoryLotHasExpiryInput'), 'Expanded plus action must render only when expiry is missing');

const captureOrder = functionBody('captureQuickAdjustOrder');
assert(captureOrder.includes('data-group-card-id'), 'Quick order lock must capture grouped card order');
assert(captureOrder.includes('data-item-card-id'), 'Quick order lock must capture expanded item order');

const groupOrder = functionBody('sortByQuickAdjustGroupOrder');
assert(groupOrder.includes('_quickAdjustGroupOrder'), 'Grouped quick +/- must reuse the previous visual order');
assert(groupOrder.includes('inventoryGroupCardSort'), 'Grouped quick order must fall back to normal inventory sorting');

const itemOrder = functionBody('sortByQuickAdjustItemOrder');
assert(itemOrder.includes('_quickAdjustItemOrder'), 'Expanded quick +/- must reuse the previous visual order');
assert(itemOrder.includes('inventoryExpandedItemSort'), 'Expanded quick order must fall back to grouped-style risk sorting');

const expandedSortProfile = functionBody('inventoryExpandedItemRiskProfile');
assert(expandedSortProfile.includes('lotStatusInfo'), 'Expanded item sorting must consider lot deadline status');
assert(expandedSortProfile.includes('stockRiskProfile'), 'Expanded item sorting must consider grouped stock risk');
assert(expandedSortProfile.includes('stock.low'), 'Expanded item sorting must align low-stock priority with grouped sorting');

const expandedSort = functionBody('inventoryExpandedItemSort');
assert(expandedSort.includes('inventoryStatusSortValue'), 'Expanded item sorting must use the same status rank as grouped sorting');
assert(expandedSort.includes('lotUrgencyRank'), 'Expanded item sorting must keep near-expiry lots first inside the same rank');

const clearOrder = functionBody('clearQuickAdjustOrderLock');
assert(clearOrder.includes('_quickAdjustGroupOrder = null'), 'Quick order lock must be clearable for intentional filter changes');
assert(clearOrder.includes('_quickAdjustItemOrder = null'), 'Quick item order lock must be clearable for intentional filter changes');

for (const statement of [
  /CREATE TABLE IF NOT EXISTS public\.inventory_events/,
  /type text not null check \(type in \('use', 'discard', 'open', 'restock', 'adjust'\)\)/,
  /item_id uuid/,
  /stock_key text/,
  /lot_id uuid/,
  /quantity_delta numeric not null default 0/,
  /undo_until timestamptz/,
  /reverses_event_id uuid references public\.inventory_events\(id\)/,
  /actor text/,
  /metadata jsonb not null default '\{\}'::jsonb/,
  /CREATE POLICY "public_write_inventory_events"/,
  /ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ/,
  /ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false/
]) {
  requireMatch(statement, `Missing schema requirement: ${statement}`, schema);
}

for (const backupRequirement of [
  /const EVENT_TABLE = 'inventory_events'/,
  /const EVENT_SELECT_COLUMNS = \[/,
  /async function fetchInventoryEventRows/,
  /function validateBackupEvents/,
  /function normalizeEventsForRestore/,
  /async function upsertInventoryEventRows/,
  /async function deleteInventoryEventRows/,
  /event_count: events\.length/,
  /events,/
]) {
  requireMatch(backupRequirement, `Missing backup event support: ${backupRequirement}`, backupLib);
}

console.log('inventory event MVP verification passed');
