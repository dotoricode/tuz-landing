const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'inventory', 'index.html'), 'utf8');

function extractBlock(startNeedle, endNeedle) {
  const start = html.indexOf(startNeedle);
  const end = html.indexOf(endNeedle, start);
  assert.notEqual(start, -1, `Missing ${startNeedle}`);
  assert.notEqual(end, -1, `Missing ${endNeedle}`);
  return html.slice(start, end);
}

const stockFunctions = extractBlock(
  'function normalizeInventoryMergeText',
  'function compactInventoryName'
);
const renderHelperFunctions = extractBlock(
  'function quantityLabel',
  'function renderList'
);
const alertFunctions = extractBlock(
  'function hasFresherStockLot',
  'function setHadongView'
);

function loadInventoryDebug(fixture) {
  return new Function('fixture', `
    let items = fixture;

    function optionalNumber(value) {
      if (value === null || value === undefined || value === '') return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }

    function calcDDay(expiryDate) {
      if (!expiryDate) return null;
      const base = new Date('2026-05-29T00:00:00');
      const expiry = new Date(expiryDate + 'T00:00:00');
      if (Number.isNaN(expiry.getTime())) return null;
      return Math.round((expiry - base) / 86400000);
    }

    function ddayLabel(dday) {
      if (dday === null || dday === undefined) return '기한 미입력';
      if (dday < 0) return 'D+' + Math.abs(dday) + ' 초과';
      if (dday === 0) return '오늘 마감';
      return dday + '일 남음';
    }

    function inventorySortOrder(item, index = 0) {
      const value = Number(item?.sort_order);
      return Number.isFinite(value) ? value : index;
    }

    function getVisibleItems() {
      return items;
    }

    ${stockFunctions}
    ${renderHelperFunctions}
    ${alertFunctions}

    return { detailStatusLabel, groupAdvice, inventoryStockSummary, lowInventorySummaries, getHadongAlertRows, stockRiskProfile };
  `)(fixture);
}

const lemonLots = [
  { id: 'lemon-old', name: '레몬즙', quantity: 1, unit: '팩', category: '과일/토핑', min_quantity: 2, expiry_date: '2099-01-01', expiry_type: 'SELL-BY', storage_method: '냉장' },
  { id: 'lemon-new', name: '레몬즙', quantity: 1, unit: '팩', category: '과일/토핑', min_quantity: 2, expiry_date: '2099-02-01', expiry_type: 'SELL-BY', storage_method: '냉장' }
];

const exact = loadInventoryDebug(lemonLots);
assert.equal(exact.inventoryStockSummary(lemonLots[0]).totalQuantity, 2);
assert.equal(exact.inventoryStockSummary(lemonLots[0]).low, false);
assert.equal(exact.lowInventorySummaries().length, 0);
assert.equal(exact.getHadongAlertRows().length, 0);

const mixedExpiryLots = [
  { ...lemonLots[0], expiry_date: '2026-06-03' },
  { ...lemonLots[1], expiry_date: '2026-06-18' }
];
const mixed = loadInventoryDebug(mixedExpiryLots);
const mixedStock = mixed.inventoryStockSummary(mixedExpiryLots[0]);
const mixedProfile = mixed.stockRiskProfile(mixedStock);
assert.equal(mixedStock.totalQuantity, 2);
assert.equal(mixedProfile.status, 'watch');
assert.equal(mixedProfile.shortAfterAttention, true);
assert.equal(
  mixed.groupAdvice(mixedStock, mixedProfile).text,
  '전체 수량은 괜찮지만, 곧 써야 하는 걸 빼면 여유가 1팩뿐이에요. 가까운 기한부터 먼저 쓰고, 부족하면 새로 채워 주세요.'
);
assert.equal(mixed.detailStatusLabel(mixedStock, mixedProfile), '이번 주 1팩 · 임박분 제외 시 부족');
assert.equal(mixed.getHadongAlertRows().length, 0);

const butterLots = [
  { id: 'butter-soon', name: '버터', quantity: 7, unit: '개', category: '유제품', min_quantity: 3, expiry_date: '2026-05-30', expiry_type: 'SELL-BY', storage_method: '냉장' },
  { id: 'butter-fresh', name: '버터', quantity: 3, unit: '개', category: '유제품', min_quantity: 3, expiry_date: '2026-06-18', expiry_type: 'SELL-BY', storage_method: '냉장' }
];
const butter = loadInventoryDebug(butterLots);
const butterStock = butter.inventoryStockSummary(butterLots[0]);
const butterProfile = butter.stockRiskProfile(butterStock);
assert.equal(butter.detailStatusLabel(butterStock, butterProfile), '내일 마감 7개');
assert.equal(
  butter.groupAdvice(butterStock, butterProfile).text,
  '곧 써야 하는 재고가 7개 있어요. 기한이 넉넉한 것보다 먼저 사용해 주세요.'
);

const singleSoonLot = [{ ...lemonLots[0], min_quantity: null, expiry_date: '2026-06-03' }];
const singleSoon = loadInventoryDebug(singleSoonLot);
assert.equal(singleSoon.getHadongAlertRows().length, 1);
assert.equal(singleSoon.getHadongAlertRows()[0].status, 'week');

const shortLots = [{ ...lemonLots[0], quantity: 0.5 }, lemonLots[1]];
const short = loadInventoryDebug(shortLots);
assert.equal(short.inventoryStockSummary(shortLots[0]).totalQuantity, 1.5);
assert.equal(short.inventoryStockSummary(shortLots[0]).low, true);
assert.equal(short.lowInventorySummaries().length, 1);
assert.equal(short.getHadongAlertRows().length, 1);
assert.equal(short.getHadongAlertRows()[0].status, 'low');

console.log('inventory stock group verification passed');
