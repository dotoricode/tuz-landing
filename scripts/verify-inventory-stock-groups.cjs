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
const alertFunctions = extractBlock(
  'function getHadongAlertRows',
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

    ${stockFunctions}
    ${alertFunctions}

    return { inventoryStockSummary, lowInventorySummaries, getHadongAlertRows };
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

const shortLots = [{ ...lemonLots[0], quantity: 0.5 }, lemonLots[1]];
const short = loadInventoryDebug(shortLots);
assert.equal(short.inventoryStockSummary(shortLots[0]).totalQuantity, 1.5);
assert.equal(short.inventoryStockSummary(shortLots[0]).low, true);
assert.equal(short.lowInventorySummaries().length, 1);
assert.equal(short.getHadongAlertRows().length, 1);
assert.equal(short.getHadongAlertRows()[0].status, 'low');

console.log('inventory stock group verification passed');
