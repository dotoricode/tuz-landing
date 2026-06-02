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

requireMatch(/id="today-used-sheet"/, 'Today-used quick panel must open in a separate sheet');
requireMatch(/id="today-oneclick-sheet"/, 'One-click choice sheet is missing');
requireMatch(/id="today-ai-result-sheet"/, 'AI deduction result sheet is missing');
requireMatch(/<section id="today-used-panel"[^>]*직접 선택 차감/, 'Manual deduction panel is missing');
requireMatch(/id="manager-call-btn"[^>]*한 번에 정리 열기/, 'Bottom action must open one-click cleanup');
requireMatch(/id="manager-call-label">한 번에 정리<\/span>/, 'Bottom action label must be one-click focused');
requireMatch(/let _todayUsedPanelOpen = false/, 'Today-used panel must be hidden by default');
requireMatch(/id="today-use-intro-sheet"/, 'First-run today-use intro sheet is missing');
requireMatch(/<strong id="today-use-intro-title">/, 'Today-use intro title must be integrated into the manager card');
requireMatch(/직접 선택하거나 AI 차감/, 'Today-use intro must explain direct and AI deduction choices');
requireMatch(/id="today-use-intro-avatar"/, 'Today-use intro must show the active manager');
requireMatch(/유통기한 가까운 재고부터 차감해요/, 'Today-use intro must use plain owner-facing language');
requireMatch(/실수해도 되돌릴 수 있어요/, 'Today-use intro must explain undo in plain language');
requireMatch(/잘못 눌렀거나 수량을 잘못 바꿔도/, 'Today-use intro undo copy must avoid admin jargon');
requireMatch(/자주 쓰는 재료를 먼저 보여줘요/, 'Today-use intro headings must use friendly sentence endings');
requireMatch(/누를 때마다 사용 기록이 쌓여요/, 'Today-use intro must explain why recommendations improve');
requireMatch(/자주 쓰는 재료, 오늘 이미 쓴 재료, 기한 가까운 재료/, 'Today-use intro must explain how recommendations are ordered');
requireMatch(/--today-intro-bg: linear-gradient/, 'Today-use intro must define theme backgrounds');
requireMatch(/body\[data-manager="cookie"\][\s\S]*--today-intro-accent: #2B2B2B/, 'Today-use intro must have Cookie theme colors');
requireMatch(/body\[data-manager="hadong"\][\s\S]*--today-intro-accent: #8A5A3D/, 'Today-use intro must have Hadong theme colors');
requireMatch(/TODAY_USE_INTRO_SEEN_STORAGE_KEY/, 'Today-use intro seen state must be persisted');
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

const quickUse = functionBody('useTodayIngredient');
assert(quickUse.includes('sortedLots'), 'Quick use must choose the earliest/most urgent lot');
assert(quickUse.includes('Number(row.quantity) > 0'), 'Quick use must ignore empty lots');

const delta = functionBody('applyInventoryLotDelta');
assert(delta.includes('recordInventoryEvent(type'), 'Quantity deltas must record an inventory event');
assert(delta.includes('quantity_delta: -consumeAmount'), 'Use/discard deltas must be negative');
assert(delta.includes('undo_until'), 'Use/discard events must carry an undo window');
assert(delta.includes('showUndoToast'), 'Use/discard must expose undo UX');
assert(delta.includes('소진'), 'Last-unit consumption must make depletion explicit');
assert(delta.includes('snapshot: inventoryEventItemSnapshot(lot)'), 'Use/discard events must preserve a lot snapshot for stable undo');

const undo = functionBody('undoInventoryEvent');
assert(undo.includes("recordInventoryEvent('adjust'"), 'Undo must create a reversal/adjust event');
assert(undo.includes('reverses_event_id'), 'Undo event must link to the original event');
assert(undo.includes('markInventoryEventUndone'), 'Undo must mark the original event as reversed');
assert(undo.includes('restoreInventoryItemSnapshot'), 'Undo must be able to restore a removed item snapshot');

const restoreQuick = functionBody('restoreQuickDecrease');
assert(restoreQuick.includes('undoInventoryEvent'), 'Toast undo must use the generic event undo path');

const eventRows = functionBody('inventoryEventLogRows');
assert(eventRows.includes('data-inventory-event-undo'), 'Recent event log must expose undo buttons');
assert(eventRows.includes('최근 기록'), 'Recent event log must be rendered in the quick panel');

const opened = functionBody('markInventoryLotOpened');
assert(opened.includes('opened_at'), 'Open action must stamp opened_at');
assert(opened.includes("recordInventoryEvent('open'"), 'Open action must record an open event');
assert(opened.includes('quantity_delta: 0'), 'Open action must not change quantity');
assert(opened.includes('previous_opened_at'), 'Open undo must preserve the previous opened_at value');

const candidates = functionBody('todayUsedCandidates');
assert(candidates.includes('is_favorite'), 'Favorites must affect quick panel ranking');
assert(candidates.includes('eventStats.seven'), 'Recent 7-day use count must affect quick panel ranking');
assert(candidates.includes('eventStats.thirty'), 'Recent 30-day use count must affect quick panel ranking');
assert(candidates.includes('signals.alreadyUsedToday'), 'Today-used count must affect quick panel ranking');
assert(candidates.includes('signals.expiryUrgency'), 'Expiry urgency must affect quick panel ranking');
assert(candidates.includes('signals.nearMinimum'), 'Near-minimum stock must affect quick panel ranking');
assert(candidates.includes('signals.aiRecommended'), 'AI recommendation signal must affect quick panel ranking');

const signals = functionBody('todayUsedRecommendationSignals');
assert(signals.includes('AI 추천'), 'Quick panel must expose AI recommendation labels');
assert(signals.includes('기한 임박'), 'Quick panel must expose expiry urgency labels');
assert(signals.includes('최소재고 근처'), 'Quick panel must expose near-minimum labels');
assert(signals.includes('오늘 사용'), 'Quick panel must expose today-used labels');

const batchCandidates = functionBody('todayUsedBatchCandidates');
assert(batchCandidates.includes('signals.aiRecommended'), 'Batch beta must include AI-recommended items');
assert(batchCandidates.includes('signals.expiryUrgency'), 'Batch beta must include urgent-expiry items');
assert(batchCandidates.includes('signals.nearMinimum'), 'Batch beta must include near-minimum items');
assert(batchCandidates.includes('signals.alreadyUsedToday'), 'Batch beta must include already-used-today items');
assert(batchCandidates.includes('.slice(0, 4)'), 'Batch beta must cap automatic deductions for reviewability');

const batchBeta = functionBody('useTodayRecommendedBatchBeta');
assert(batchBeta.includes('quantity_delta: -amount'), 'Batch beta must avoid subtracting more than the available quantity');
assert(batchBeta.includes("reason: 'quick-use-beta-batch'"), 'Batch beta events must be traceable');
assert(batchBeta.includes('Math.min(1, qty)'), 'Batch beta must record at most one unit per recommended item');
assert(batchBeta.includes('saveData(items)'), 'Batch beta must persist inventory changes');

const focusToday = functionBody('focusTodayUsedPanel');
assert(focusToday.includes("document.getElementById('today-used-sheet')"), 'Bottom today-use action must open the separate sheet');
assert(focusToday.includes("setAttribute('aria-hidden', 'false')"), 'Today-use sheet must become visible when opened');
assert(focusToday.includes('_todayUsedPanelOpen = true'), 'Bottom today-use action must open the hidden quick panel');

const oneClick = functionBody('openTodayOneClickChoice');
assert(oneClick.includes("document.getElementById('today-oneclick-sheet')"), 'One-click flow must open a choice sheet');
assert(oneClick.includes('todayUsedBatchCandidates().length'), 'Choice sheet must disclose AI candidate availability');
assert(oneClick.includes('AI 차감 후보'), 'Choice sheet must explain AI deduction availability');

const closeToday = functionBody('closeTodayUsedPanel');
assert(closeToday.includes('_todayUsedPanelOpen = false'), 'Today-use panel must close from the bottom toggle');
assert(closeToday.includes('panel.hidden = true'), 'Closing today-use panel must hide it');
assert(closeToday.includes("setAttribute('aria-hidden', 'true')"), 'Closing today-use panel must hide the sheet');

const closeChoice = functionBody('closeTodayOneClickChoice');
assert(closeChoice.includes("today-oneclick-sheet"), 'Choice sheet must be closable');

const aiResult = functionBody('openTodayAiResult');
assert(aiResult.includes('today-ai-result-sheet'), 'AI deduction must show a result sheet');
assert(aiResult.includes('data-ai-result-undo'), 'AI result sheet must expose undo buttons');
assert(aiResult.includes('undoInventoryEvent'), 'AI result undo must use event-based undo');

const toggleToday = functionBody('toggleTodayUsedPanel');
assert(toggleToday.includes('closeTodayOneClickStack'), 'Bottom today-use action must close open one-click sheets');
assert(toggleToday.includes('openTodayOneClickChoice'), 'Bottom today-use action must open the choice sheet');
assert(toggleToday.includes('hasSeenTodayUseIntro'), 'Bottom today-use action must show the first-run explainer');
assert(toggleToday.includes('openTodayUseIntro'), 'Bottom today-use action must open the first-run explainer');

const introCopy = functionBody('todayUseIntroCopy');
assert(introCopy.includes("profile.id === 'cookie'"), 'Today-use intro must adapt to manager theme');
assert(introCopy.includes('쿠키가 재고 정리를 더 편하게 도와줘요'), 'Today-use intro must include Cookie theme copy');
assert(introCopy.includes('하동이가 재고 정리를 더 편하게 도와줘요'), 'Today-use intro must include Hadong theme copy');
assert(introCopy.includes('사용할수록'), 'Today-use intro must clarify that recommendations improve with use');
assert(introCopy.includes('더 잘 골라드릴게요'), 'Today-use intro must describe the recommendation behavior');

const introTheme = functionBody('applyTodayUseIntroTheme');
assert(introTheme.includes('setElImage'), 'Today-use intro must set the active manager image');
assert(introTheme.includes('today-use-intro-avatar'), 'Today-use intro must update the manager avatar');

const introAccept = functionBody('acceptTodayUseIntro');
assert(introAccept.includes('rememberTodayUseIntroSeen'), 'Today-use intro accept must persist seen state');
assert(introAccept.includes('openTodayOneClickChoice'), 'Today-use intro accept must open the choice sheet');

const renderToday = functionBody('renderTodayUsedPanel');
assert(renderToday.includes('if (!_todayUsedPanelOpen)'), 'Today-used panel must not render inline until opened');
assert(renderToday.includes('id="today-used-close"'), 'Today-use sheet must expose an explicit close button');
assert(renderToday.includes('우선 표시 중'), 'Favorite action must use owner-facing text instead of an unclear icon');
assert(renderToday.includes('자주 보여줘'), 'Favorite action must explain the priority display behavior');
assert(renderToday.includes('직접 선택 차감'), 'Manual sheet must be clearly labeled as direct selection');
assert(renderToday.includes('AI 추천'), 'Manual sheet must group AI recommendations under a section title');
assert(renderToday.includes("reason.key !== 'ai'"), 'Manual rows must not repeat AI recommendation badges on every item');
assert(!renderToday.includes('추천 재료를 한 번에 기록해요'), 'Manual sheet must not mix AI batch deduction into direct selection');

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
