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
  const validation = manager.validateActionPlanForExecution(planToApply, list, { todayIso: TODAY });
  if (planToApply.execution !== 'auto') return list;
  assert.equal(validation.ok, true, validation.reason);
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
assert.equal(disposeGeneric.operationType, 'write');
assert.equal(disposeGeneric.action, 'dispose');
assert.equal(disposeGeneric.execution, 'auto');
assert.deepEqual(disposeGeneric.candidates.map(item => item.id).sort(), ['strawberry', 'tiramisu']);
assert.equal(simulate(disposeGeneric).some(item => item.id === 'strawberry'), false);

const disposeExpired = plan('유통기한 지난 거 다 빼줘');
assert.equal(disposeExpired.execution, 'auto');
assert.deepEqual(disposeExpired.candidates.map(item => item.id).sort(), ['strawberry', 'tiramisu']);

[
  '폐기해야할 거 보여줘',
  '폐기해야할 거 알려줘',
  '폐기해야할거 목록만 보여줘',
  '유통기한 지난 거 확인해줘'
].forEach(message => {
  const listOnly = plan(message);
  assert.equal(listOnly.intent, 'dispose_candidates', message);
  assert.equal(listOnly.operationType, 'read', message);
  assert.equal(listOnly.execution, 'reply', message);
  assert.deepEqual(listOnly.candidates.map(item => item.id).sort(), ['strawberry', 'tiramisu'], message);
  assert.equal(manager.validateActionPlanForExecution(listOnly, inventoryFixture(), { todayIso: TODAY }).ok, false, message);
  assert.equal(simulate(listOnly).length, inventoryFixture().length, message);
});

const spoiledMilk = plan('상한 우유 폐기해줘');
assert.equal(spoiledMilk.intent, 'dispose_named_item');
assert.equal(spoiledMilk.execution, 'confirm');
assert.equal(spoiledMilk.candidates[0].id, 'milk');
assert.equal(manager.validateActionPlanForExecution(spoiledMilk, inventoryFixture(), { todayIso: TODAY }).ok, false);
assert.equal(manager.validateActionPlanForExecution(spoiledMilk, inventoryFixture(), { todayIso: TODAY, confirmed: true }).ok, true);

const todayBrief = plan('오늘 정리할 재고 있어?');
assert.equal(todayBrief.intent, 'brief_today');
assert.equal(todayBrief.operationType, 'read');
assert.equal(todayBrief.execution, 'reply');
assert(todayBrief.candidates.some(item => item.id === 'syrup'));
assert.equal(manager.validateActionPlanForExecution(todayBrief, inventoryFixture(), { todayIso: TODAY }).ok, false);

const disposePartial = plan('라떼컵 3개 버려');
assert.equal(disposePartial.intent, 'dispose_named_item');
assert.equal(disposePartial.operationType, 'write');
assert.equal(disposePartial.execution, 'auto');
assert.equal(disposePartial.candidates[0].id, 'latte-cup');
assert.equal(disposePartial.candidates[0].actionKind, 'decrement');
assert.equal(disposePartial.candidates[0].actionQuantity, 3);
assert.equal(simulate(disposePartial).find(item => item.id === 'latte-cup').quantity, 7);

const vague = plan('이상한 거 정리해줘');
assert.equal(vague.intent, 'ask_clarification');
assert.equal(vague.execution, 'ask');
assert.equal(vague.operationType, 'ask');

['정리해줘', '처리해줘'].forEach(message => {
  const broad = plan(message);
  assert.equal(broad.intent, 'ask_clarification', message);
  assert.equal(broad.execution, 'ask', message);
  assert.equal(broad.operationType, 'ask', message);
  assert.equal(manager.validateActionPlanForExecution(broad, inventoryFixture(), { todayIso: TODAY }).ok, false, message);
});

const low = plan('떨어질 것 알려줘');
assert.equal(low.intent, 'low_stock_report');
assert.equal(low.operationType, 'read');
assert.equal(low.execution, 'reply');
assert(low.candidates.some(item => item.id === 'strawberry'));

const excess = plan('많이 남은 것 보여줘');
assert.equal(excess.intent, 'excess_stock_report');
assert.equal(excess.operationType, 'read');
assert.equal(excess.execution, 'reply');

console.log('inventory manager action verification passed');
