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
assert(increase.includes('canMergeQuickAdjustmentUndo'), 'Quick increase must join a recent quick-adjust undo batch');
assert(increase.includes('rememberQuickDecreaseUndo'), 'Quick increase must be tracked so mixed +/- undo returns to the original quantity');
assert(increase.includes('showUndoToast'), 'Quick increase must refresh undo UX when it joins a mixed quick-adjust batch');

const undo = functionBody('undoInventoryEvent');
assert(undo.includes("recordInventoryEvent('adjust'"), 'Undo must create a reversal/adjust event');
assert(undo.includes('reverses_event_id'), 'Undo event must link to the original event');
assert(undo.includes('markInventoryEventUndone'), 'Undo must mark the original event as reversed');
assert(undo.includes('restoreInventoryItemSnapshot'), 'Undo must be able to restore a removed item snapshot');

const restoreQuick = functionBody('restoreQuickDecrease');
assert(restoreQuick.includes('undoInventoryEvent'), 'Toast undo must use the generic event undo path');
assert(restoreQuick.includes('eventIds'), 'Toast undo must restore every event in a quick-decrease batch');
assert(restoreQuick.includes('.reverse()'), 'Toast undo must restore quick-decrease events in reverse order');
assert(restoreQuick.includes('silent: true'), 'Batch undo must suppress per-event toast noise');
assert(restoreQuick.includes('수량 변경'), 'Mixed quick-adjust undo must describe the whole quantity-change batch');

const rememberQuick = functionBody('rememberQuickDecreaseUndo');
assert(rememberQuick.includes('eventIds: [payload.eventId]'), 'Quick decrease undo must keep event ids as a batch');
assert(rememberQuick.includes('eventIds: [..._lastQuickDecreaseUndo.eventIds, payload.eventId]'), 'Repeated quick decreases must append to the undo batch');
assert(rememberQuick.includes('actionCount'), 'Quick adjustment undo batches must track mixed +/- action count');
assert(rememberQuick.includes('netDelta'), 'Quick adjustment undo batches must track mixed +/- net delta');

const canMergeQuick = functionBody('canMergeQuickAdjustmentUndo');
assert(canMergeQuick.includes('_lastQuickDecreaseUndo.batchKey === batchKey'), 'Mixed quick-adjust undo batches must only merge the same stock item');
assert(canMergeQuick.includes('QUICK_DECREASE_BATCH_WINDOW_MS'), 'Quick adjustments must have a short batching window');

assert(!html.includes('data-group-lot-action="open"'), 'Lot detail UI must not expose an open action');
assert(!html.includes('function markInventoryLotOpened'), 'Inventory open action handler must not ship');

const quickIncreaseGate = functionBody('canQuickIncreaseStock');
assert(quickIncreaseGate.includes('lots.every'), 'Quick plus must be limited by stock lots');
assert(quickIncreaseGate.includes('inventoryLotHasExpiryInput'), 'Quick plus must be hidden for expiry-date stock');

const quickAdjust = functionBody('handleInventoryQuickAdjust');
assert(quickAdjust.includes('captureQuickAdjustOrder'), 'Quick +/- must lock the current visible order before refreshing');
assert(quickAdjust.includes("action === 'increase-group'"), 'Group quick controls must support increase');
assert(quickAdjust.includes('canQuickIncreaseStock'), 'Group quick increase must be gated by missing expiry input');

const renderList = functionBody('renderList');
assert(renderList.includes('inv-quick-qty'), 'Grouped quick controls must show current quantity');
assert(renderList.indexOf('is-minus') < renderList.indexOf('inv-quick-qty'), 'Grouped quick controls must show the minus action before the quantity');
assert(renderList.includes('increase-group'), 'Grouped quick controls must include plus action');
assert(renderList.includes('canQuickIncreaseStock'), 'Grouped plus action must render only when expiry is missing');
assert(renderList.includes('compactStockExpiryDateLabel(stock)'), 'Grouped item summary must show the nearest expiry D-day');
assert(renderList.includes('`최소 ${quantityLabel(stock.minQuantity, unit)}`'), 'Grouped item summary must use the compact minimum-stock label');
assert(renderList.includes("`${minText || '최소 없음'}, 기한 ${compactStockExpiryDateLabel(stock)}`"), 'Grouped item summary must separate minimum stock and D-day with a comma and label');
assert(renderList.includes("inv-quick-actions${showQuickIncrease ? ' has-plus' : ''}"), 'Grouped quick controls must only reserve plus space when plus is visible');
assert(!renderList.includes('inv-quick-spacer'), 'Grouped quick controls must not render empty spacer slots');
assert(renderList.includes('data-group-menu'), 'Grouped cards must expose a top-right management menu');
assert(renderList.includes('data-group-menu-action="restock"'), 'Grouped card menu must include restock');
assert(renderList.includes('data-group-menu-action="edit"'), 'Grouped card menu must include edit');
assert(renderList.includes('data-group-menu-action="delete"'), 'Grouped card menu must include delete');
assert(renderList.includes('openAddSheetForStockReceipt'), 'Grouped restock menu must open a same-item receipt sheet');
assert(renderList.includes('openGroupEditChoice'), 'Grouped edit menu must ask whether to edit common info or an individual lot');
assert(renderList.includes('openGroupDeletePicker'), 'Grouped delete menu must reuse the group delete picker');
assert(!renderList.includes('>추가</button>'), 'Dated stock quick action must move out of the card quick-control area');
assert(renderList.includes("groupCard?.classList.contains('has-menu-open')"), 'Grouped card body clicks must be ignored while the menu is open');
assert(renderList.includes("[data-group-menu-root]').forEach"), 'Grouped card menu root must stop click propagation');
assert(renderList.includes('e.preventDefault()'), 'Grouped card menu clicks must not fall through to card detail actions');
assert(renderList.includes('sortByQuickAdjustItemOrder'), 'Expanded item view must use grouped-style risk sorting');

const renderExpanded = functionBody('renderExpandedList');
assert(!renderExpanded.includes('data-quick-adjust'), 'Expanded item view must not expose quick quantity controls');
assert(!renderExpanded.includes('inv-quick-qty'), 'Expanded item view must not show grouped-style quantity controls');
assert(renderExpanded.includes('inventoryExpandedItemRiskProfile'), 'Expanded item view must use grouped-style risk color status');
assert(renderExpanded.includes('makeInventoryCardBadges'), 'Expanded item view must use the same badge labels as grouped view');
assert(!renderExpanded.includes('<div class="inv-summary-line">현재 수량'), 'Expanded item view summary must not duplicate current quantity');
assert(renderExpanded.includes('compactExpiryDateLabel(item)'), 'Expanded item summary must include a compact expiry date');
assert(renderExpanded.includes('summaryText'), 'Expanded item summary must combine minimum stock and compact expiry date');
assert(renderExpanded.includes('`최소 ${quantityLabel(stock.minQuantity, unit)}`'), 'Expanded item summary must use the compact minimum-stock label');
assert(renderExpanded.includes('`${minText}, 기한 ${compactExpiryDateLabel(item)}`'), 'Expanded item summary must separate minimum stock and D-day with a comma and label');
assert(renderExpanded.includes('class="inv-expanded-qty"'), 'Expanded item view must show current quantity at the card edge');
assert(html.includes('.inv-expanded-qty'), 'Expanded item quantity must have dedicated right-bottom styling');
assert(!renderExpanded.includes('expiryText'), 'Expanded item view summary must not include expiry text');
assert(renderExpanded.includes('data-expanded-edit'), 'Expanded item body must open the edit sheet');
assert(renderExpanded.includes('data-expanded-menu'), 'Expanded item cards must expose a menu button');
assert(renderExpanded.includes('data-expanded-menu-action="edit"'), 'Expanded item card menu must include edit');
assert(renderExpanded.includes('data-expanded-menu-action="delete"'), 'Expanded item card menu must include delete');
assert(renderExpanded.includes('closeExpandedCardMenus'), 'Expanded item card menu must close after actions');
assert(html.includes('.inv-card-menu-popover'), 'Expanded item card menu must have popover styling');

const cardClass = functionBody('cardClassForProfile');
assert(cardClass.includes('detailStatusClass'), 'Grouped and expanded cards must share status color classes');
const compactExpiryDateLabel = functionBody('compactExpiryDateLabel');
assert(compactExpiryDateLabel.includes("return '기한 없음'"), 'Compact expiry label must handle no-expiry items');
assert(compactExpiryDateLabel.includes("return '기한 미입력'"), 'Compact expiry label must handle missing dated values');
assert(compactExpiryDateLabel.includes('`+${Math.abs(dday)}일`'), 'Compact expiry label must render expired dates as +n일');
assert(compactExpiryDateLabel.includes("return '오늘'"), 'Compact expiry label must render same-day dates as 오늘');
assert(compactExpiryDateLabel.includes('`-${dday}일`'), 'Compact expiry label must render future dates as -n일');
const compactStockExpiryDateLabel = functionBody('compactStockExpiryDateLabel');
assert(compactStockExpiryDateLabel.includes('.sort((a, b) => a.dday - b.dday)'), 'Grouped compact expiry label must use the nearest expiry lot');
assert(compactStockExpiryDateLabel.includes('compactExpiryDateLabel(datedLots[0].lot)'), 'Grouped compact expiry label must reuse compact D-day text');
assert(html.includes('font-size: .78rem;'), 'Expanded item quantity should use the same compact font size as grouped quantity');
assert(html.includes('const INVENTORY_STATUS_SORT_RANK = { expired: 0, today: 1, tomorrow: 2, week: 3, low: 4, watch: 5, safe: 6 }'), 'Inventory cards must sort red, orange, then green statuses');
assert(html.includes('const INVENTORY_BADGE_SORT_RANK = { expired: 0, today: 1, tomorrow: 2, week: 3, low: 4, watch: 5, safe: 6 }'), 'Inventory badges must sort red, orange, then green statuses');
const cardBadges = functionBody('makeInventoryCardBadges');
assert(cardBadges.includes('switch (profile.status)'), 'First inventory badge must be based on the representative status');
assert(cardBadges.includes('사용 후 부족 가능'), 'Watch status must have a user-facing representative badge');
assert(cardBadges.includes("!badges.some(badge => badge.className === 'week')"), 'Secondary week badge must not replace the representative status');
assert(cardBadges.includes('INVENTORY_BADGE_SORT_RANK'), 'Inventory card badges must be severity sorted');
assert(!cardBadges.includes('quantityLabel('), 'Inventory card badges should show status only, not quantities');
assert(html.includes('.inv-badge-grid .inv-badge:first-child'), 'Inventory cards must emphasize the first representative badge');
assert(html.includes('min-height: 23px'), 'Inventory cards without badges must reserve the same badge row height');
assert(!html.includes('.inv-badge-grid .inv-badge:not(:first-child)'), 'Secondary inventory badges must keep semantic colors');
assert(html.includes('.inv-quick-btn.is-date-add'), 'New-expiry quick action must have dedicated styling');
assert.match(html, /\.inv-quick-btn\.is-minus\s*\{[^}]*background:\s*transparent/s, 'Quick minus button must not carry a colored background');
assert.match(html, /\.inv-quick-btn\.is-plus\s*\{[^}]*background:\s*transparent/s, 'Quick plus button must not carry a colored background');
assert.match(html, /#toast\s*\{[^}]*box-shadow:\s*0 18px 44px/s, 'Toast must be visually prominent enough for quick inventory actions');
assert(html.includes('#toast.has-undo'), 'Undo toast must have a dedicated visual state');
assert(html.includes("el.classList.add('show', 'has-undo')"), 'Undo toast must activate its dedicated visual state');
assert(html.includes('grid-template-columns: 28px minmax(28px, auto)'), 'Grouped quick controls must keep the compact minus/quantity layout');
assert(html.includes('grid-template-columns: 28px minmax(28px, auto) 28px'), 'Grouped quick controls with plus must stay compact');
assert.match(html, /\.inv-card\.group-card \.inv-card-main\s*\{[^}]*padding-right:\s*30px/s, 'Grouped card body must keep its original compact text spacing');
assert.match(html, /\.inv-quick-actions\s*\{[^}]*position:\s*absolute[^}]*right:\s*17px[^}]*bottom:\s*4px/s, 'Grouped quick controls must sit low enough for the quantity text to match expanded card quantity');
assert.match(html, /\.inv-quick-actions\.has-plus\s*\{[^}]*right:\s*7px/s, 'Grouped quick controls with plus must sit closer to the card edge');
assert(html.includes('margin-right: 0'), 'Grouped quick controls with plus must rely on fixed right-bottom alignment');
assert(html.includes('min-height: 36px'), 'Grouped quick controls must keep a stable compact touch target height');
assert(html.includes('clip-path: polygon(0 0, 100% 0, 0 100%)'), 'Inventory status color must be shown as a corner marker');
assert(html.includes('id="inventory-status-help-toggle"'), 'Inventory list must expose a status guide button');
assert(html.includes('id="inventory-status-help"'), 'Inventory status guide popover is missing');
assert(html.includes('aria-label="목록 안내 보기"'), 'Inventory guide button must keep an accessible label');
assert(html.includes('aria-controls="inventory-status-help">?</button>'), 'Inventory guide button should render as a compact question mark');
assert.match(html, /\.inventory-view-btn\.is-help\s*\{[^}]*background:\s*color-mix/s, 'Inventory guide button must have a distinct helper color');
assert(html.includes('.inventory-view-btn.is-help[aria-expanded="true"]'), 'Inventory guide button must have an open-state helper color');
assert(!html.includes('.rh-stat.today {'), 'Header stat cards must not use different background colors by stat type');
assert(!html.includes('.rh-stat.tomorrow {'), 'Header stat cards must not use different background colors by stat type');
assert(!html.includes('.rh-stat.week {'), 'Header stat cards must not use different background colors by stat type');
assert(!html.includes('.rh-stat-count.tomorrow'), 'Header stat counts must share the same text color');
assert(!html.includes('.rh-stat-count.week'), 'Header stat counts must share the same text color');
assert(html.includes('묶음은 유통기한이 달라도 같은 품목을 하나로 모아서 보여줘요.'), 'Inventory guide must explain grouped view');
assert(html.includes('개별은 유통기한별 재고를 각각 따로 보여줘요.'), 'Inventory guide must explain individual view');
assert(html.includes('뱃지는 어디에 붙어도 같은 상태면 같은 색으로 보여줘요.'), 'Inventory guide must explain semantic badge colors');
assert(html.includes('closeInventoryStatusHelp'), 'Inventory status guide must be dismissible');

assert.match(html, /#add-item-sheet \.add-sheet-panel\s*\{[^}]*var\(--manager-soft/s, 'Add inventory sheet must use the manager theme soft background');
assert.match(html, /#add-item-sheet \.form-input,[\s\S]*?#add-item-sheet \.edit-type-segment\s*\{[^}]*var\(--manager-soft/s, 'Add inventory filled controls must use manager theme soft color');

const stockReceipt = functionBody('openAddSheetForStockReceipt');
assert(stockReceipt.includes('openAddSheet({ reset: true })'), 'Grouped restock must start from a clean add sheet');
assert(stockReceipt.includes("document.getElementById('add-name').value"), 'Grouped restock must prefill the item name');
assert(stockReceipt.includes("document.getElementById('expiry-date-input').value = ''"), 'Grouped restock must leave the expiry date empty');
assert(stockReceipt.includes("setAddExpiryPresence(useDatedMode ? 'dated' : 'none')"), 'Grouped restock must match dated vs no-expiry stock');
assert(stockReceipt.includes('showAddAutoFillHint'), 'Grouped restock must explain the prefilled add sheet');

const addForExpiry = functionBody('openAddSheetForNewExpiry');
assert(addForExpiry.includes('openAddSheetForStockReceipt'), 'New-expiry helper must reuse the grouped restock sheet');
assert(addForExpiry.includes('forceDated: true'), 'New-expiry helper must force dated mode');

const groupEditChoice = functionBody('openGroupEditChoice');
assert(groupEditChoice.includes('data-group-edit-common'), 'Grouped edit must offer common-info editing');
assert(groupEditChoice.includes('data-group-edit-one'), 'Grouped edit must allow choosing an individual lot');
assert(groupEditChoice.includes('일괄 수정'), 'Grouped edit must label grouped stock editing clearly');
assert(groupEditChoice.includes('공통 정보'), 'Grouped edit must label common-info editing clearly');
assert(groupEditChoice.includes('개별 수정'), 'Grouped edit must label individual lot editing clearly');

const groupCommonEdit = functionBody('openGroupCommonEditSheet');
assert(groupCommonEdit.includes("mode: 'group-common'"), 'Common group edit must open the item edit sheet in common-info mode');
assert(html.includes('id="group-edit-sheet"'), 'Grouped edit choice sheet is missing');
assert(html.includes('data-edit-mode="group-common"'), 'Common group edit mode must hide quantity and expiry fields');

const saveEdit = functionBody('saveItemEdit');
assert(saveEdit.includes('_editingGroupCommonIds.length'), 'Saving common group edit must detect group-common mode');
assert(saveEdit.includes('공통 정보가 수정됐습니다'), 'Common group edit must show a clear success toast');

const openEdit = functionBody('openItemEditSheet');
assert(openEdit.includes('수량과 유통기한은 바뀌지 않아요'), 'Common group edit must explain that quantity and expiry do not change');

const unitInferenceName = functionBody('inventoryNameForUnitInference');
assert(unitInferenceName.includes('ml|mL|ML'), 'Add-name prediction must strip package volume before unit inference');
assert(unitInferenceName.includes('kg|g'), 'Add-name prediction must strip package weight before unit inference');

const addRules = functionBody('addNameRulePrediction');
assert(addRules.includes('수제\\s*청'), 'Handmade syrup names must infer bottle-based stock fields');

const inferAdd = functionBody('inferAddFieldsFromName');
assert(inferAdd.includes('inventoryNameForUnitInference(name)'), 'Add-name prediction must infer fields from the product name, not the package size');
assert(inferAdd.includes('parseInventoryFieldsFromText(inferenceName)'), 'Parsed units must use the package-size-stripped name');

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
