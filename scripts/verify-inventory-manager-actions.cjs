const assert = require('node:assert/strict');
const manager = require('../inventory/manager-actions.js');

const TODAY = '2026-05-29';

function inventoryFixture() {
  return [
    { id: 'strawberry', name: '딸기 퓨레', quantity: 1, unit: '팩', category: '과일/토핑', min_quantity: 2, expiry_date: '2026-05-28', expiry_type: 'SELL-BY', storage_method: '냉장' },
    { id: 'tiramisu', name: '수제 티라미수', quantity: 2, unit: '개', category: '디저트', min_quantity: 2, expiry_date: '2026-05-27', expiry_type: 'SELL-BY', storage_method: '냉장' },
    { id: 'milk', name: '우유 1L', quantity: 8, unit: '개', category: '유제품', min_quantity: 5, expiry_date: '2026-05-30', expiry_type: 'SELL-BY', storage_method: '냉장' },
    { id: 'syrup', name: '바닐라 시럽', quantity: 3, unit: '병', category: '시럽/소스', min_quantity: 2, expiry_date: '2026-05-29', expiry_type: 'SELL-BY', storage_method: '상온' },
    { id: 'latte-cup', name: '라떼컵', quantity: 10, unit: '개', category: '일회용품', min_quantity: 4, expiry_date: null, expiry_type: 'NONE', storage_method: '실온' }
  ];
}

function plan(message) {
  return manager.buildManagerActionPlan(message, inventoryFixture(), { todayIso: TODAY });
}

function simulate(planToApply, list = inventoryFixture()) {
  for (const candidate of planToApply.candidates || []) {
    const index = list.findIndex(item => item.id === candidate.id);
    if (index < 0) continue;
    if (candidate.actionKind === 'decrement') {
      const current = Number(list[index].quantity) || 0;
      list[index].quantity = Math.max(0, current - Number(candidate.actionQuantity || 0));
    } else {
      list.splice(index, 1);
    }
  }
  return list;
}

const disposeGeneric = plan('폐기해야할 거 폐기해줘');
assert.equal(disposeGeneric.intent, 'dispose_candidates');
assert.equal(disposeGeneric.execution, 'auto');
assert.deepEqual(disposeGeneric.candidates.map(item => item.id).sort(), ['strawberry', 'tiramisu']);
assert.equal(simulate(disposeGeneric).some(item => item.id === 'strawberry'), false);

const disposeExpired = plan('유통기한 지난 거 다 빼줘');
assert.equal(disposeExpired.execution, 'auto');
assert.deepEqual(disposeExpired.candidates.map(item => item.id).sort(), ['strawberry', 'tiramisu']);

const spoiledMilk = plan('상한 우유 폐기해줘');
assert.equal(spoiledMilk.intent, 'dispose_named_item');
assert.equal(spoiledMilk.execution, 'confirm');
assert.equal(spoiledMilk.candidates[0].id, 'milk');

const todayBrief = plan('오늘 정리할 재고 있어?');
assert.equal(todayBrief.intent, 'brief_today');
assert.equal(todayBrief.execution, 'reply');
assert(todayBrief.candidates.some(item => item.id === 'syrup'));

const disposePartial = plan('라떼컵 3개 버려');
assert.equal(disposePartial.intent, 'dispose_named_item');
assert.equal(disposePartial.execution, 'auto');
assert.equal(disposePartial.candidates[0].id, 'latte-cup');
assert.equal(disposePartial.candidates[0].actionKind, 'decrement');
assert.equal(disposePartial.candidates[0].actionQuantity, 3);
assert.equal(simulate(disposePartial).find(item => item.id === 'latte-cup').quantity, 7);

const vague = plan('이상한 거 정리해줘');
assert.equal(vague.intent, 'ask_clarification');
assert.equal(vague.execution, 'ask');

console.log('inventory manager action verification passed');
