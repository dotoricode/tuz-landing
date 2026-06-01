const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_PROMPT_CHARS = 14000;
const MAX_HISTORY = 8;
const managerActions = require('../inventory/manager-actions.js');

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?tuz\.kr$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http:\/\/\[::1\](:\d+)?$/
];

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isAllowedOrigin(origin = '') {
  return !origin || ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_PROMPT_CHARS * 2) {
      throw Object.assign(new Error('요청이 너무 큽니다.'), { statusCode: 413 });
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function textFromGemini(data) {
  return (data?.candidates || [])
    .flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || '')
    .join('\n')
    .trim();
}

function historyContents(recentMessages) {
  if (!Array.isArray(recentMessages)) return [];
  return recentMessages.slice(-MAX_HISTORY).map(message => {
    const text = String(message?.content || '').trim().slice(0, 900);
    if (!text) return null;
    return {
      role: message?.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    };
  }).filter(Boolean);
}

function buildSystemPrompt({ manager, inventory }) {
  const managerName = String(manager?.fullName || manager?.name || '하동이 매니저').trim();
  const inventoryJson = JSON.stringify(Array.isArray(inventory) ? inventory.slice(0, 80) : []);
  return [
    `너는 Tuz 카페 사장이 현재 재고 상태를 바로 판단하도록 돕는 조회 전용 "재고 AI ${managerName}"다.`,
    '응답은 반드시 한국어로만 한다. 영어 공급자명, 모델명, 내부 추론, <think> 태그는 출력하지 않는다.',
    '짧고 실무적으로 답한다. 사장이 지금 확인할 수 있게 현재 상태, 위험 신호, 오늘 할 일, 판단 포인트를 우선한다.',
    '항목은 "이모지 이름" 다음 줄에 "재고 N | 분류 | D-day | 기준 N"처럼 정리한다.',
    '상태 이모지는 기한 초과 🚨, 오늘까지 ⏰, 곧 사용 📅, 부족 가능 📦, 정상 ✅를 우선 사용한다.',
    '재고 데이터 안에서만 판단하고, 현재 재고 JSON에 없는 품목명은 절대 만들지 않는다.',
    '모르면 확인이 필요하다고 말하고, 항목명은 JSON의 name 값을 그대로 인용한다.',
    '"우유 얼마나 남았어?", "오늘 라떼 재료 괜찮아?", "지금 부족한 거 있어?", "오늘 주문 넣어야 할 거 있어?", "재료 상태 한번 봐줘" 같은 질문은 재고량, 기준 수량, 카테고리, 기한을 종합해 조회 전용으로 답한다.',
    '폐기/삭제/차감/수정 같은 변경 요청을 받아도 직접 처리한다고 말하지 않는다. 수정 화면에서 사장이 직접 확인해야 한다고 안내한다.',
    '부족 가능 재료, 오늘 버틸 수 있는지, 주문 우선순위, 곧 쓸 재료를 도와준다.',
    `현재 재고 JSON: ${inventoryJson}`
  ].join('\n');
}

const ACTION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'dispose_candidates',
        'dispose_named_item',
        'brief_today',
        'low_stock_report',
        'excess_stock_report',
        'stock_status_report',
        'ask_clarification',
        'search_inventory',
        'unknown'
      ]
    },
    operationType: {
      type: 'string',
      enum: ['read', 'write', 'ask', 'none']
    },
    operation: {
      type: 'string',
      enum: ['dispose', 'adjust_quantity', 'brief', 'ask', 'search', 'none']
    },
    action: {
      type: 'string',
      enum: ['dispose', 'adjust_quantity', 'inspect_candidates', 'low_stock_report', 'excess_stock_report', 'stock_status_report', 'search_inventory', 'ask_clarification', 'none']
    },
    confidence: { type: 'number' },
    requiresConfirmation: { type: 'boolean' },
    criteria: {
      type: 'object',
      properties: {
        expired: { type: 'boolean' },
        markedForDisposal: { type: 'boolean' },
        spoiled: { type: 'boolean' },
        today: { type: 'boolean' },
        all: { type: 'boolean' },
        itemQuery: { type: 'string' },
        quantity: { type: 'number' },
        quantityMode: { type: 'string', enum: ['all', 'amount', 'unknown'] }
      }
    },
    candidateNames: {
      type: 'array',
      items: { type: 'string' }
    },
    operations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          itemName: { type: 'string' },
          quantity: { type: 'number' },
          reason: { type: 'string' }
        }
      }
    },
    userMessage: { type: 'string' },
    reply: { type: 'string' }
  },
  required: ['intent', 'operationType', 'operation', 'action', 'confidence', 'requiresConfirmation', 'criteria', 'candidateNames', 'operations', 'userMessage', 'reply']
};

function buildActionSystemPrompt({ manager, inventory, todayIso }) {
  const managerName = String(manager?.fullName || manager?.name || '하동이 매니저').trim();
  const inventoryJson = JSON.stringify(Array.isArray(inventory) ? inventory.slice(0, 100) : []);
  return [
    `너는 Tuz 카페 영업 중 재료 상태를 조회 전용으로 정리하는 "재고 AI ${managerName}"다.`,
    '목표는 사용자의 자연어를 안전한 조회 의도로 구조화하는 것이다.',
    '반드시 JSON만 출력한다. 마크다운, 설명문, <think> 태그, 코드블록은 금지한다.',
    '모델은 DB를 직접 변경하지 않고, 수정/폐기/차감 실행을 제안하지 않는다. 필요한 경우 수정 화면에서 사장이 직접 확인하라고 안내한다.',
    '사용자가 "우유 얼마나 남았어?", "오늘 라떼 재료 괜찮아?", "지금 부족한 거 있어?", "곧 떨어질 것 보여줘", "오늘 주문 넣어야 할 거 있어?", "재료 상태 한번 봐줘"라고 말하면 기본은 operationType="read"다.',
    '사용자가 "폐기해야 할 거", "버릴 거", "유통기한 지난 거", "상한 거", "오늘 정리할 거"라고 말하면 품목명이 아니라 작업 조건으로 해석한다. 단, "보여줘/목록/있어?"가 있으면 read-only다.',
    '"보여줘", "알려줘", "확인해줘", "뭐 있어?", "목록 보여줘", "찾아줘"처럼 조회 표현이 있으면 operationType="read"로 둔다.',
    '"정리해줘", "처리해줘"처럼 넓은 표현은 대상/기준/수량이 명확하지 않으면 operationType="ask", action="ask_clarification"으로 둔다.',
    '폐기/삭제/차감/수정 요청은 operationType="read" 또는 "ask"로 두고, action은 search_inventory 또는 ask_clarification을 우선한다.',
    '부족/주문/발주는 low_stock_report, 전체 상태 확인은 stock_status_report, 특정 품목 잔량 조회는 search_inventory, 많이 남은 재고는 excess_stock_report로 분류하고 기본은 read-only다.',
    '상함/이상함처럼 현장 감각이 필요한 조건은 후보를 찾되 requiresConfirmation=true로 둔다.',
    '후보가 여러 개이거나 수량/품목이 모호하면 ask_clarification 또는 requiresConfirmation=true로 둔다.',
    'candidateNames에는 현재 재고 JSON의 name 값만 그대로 넣는다. 없는 품목명은 만들지 않는다.',
    'reply는 짧고 업무적으로, 사장이 당장 확인할 재고 상태와 다음 판단만 말하며 Tuz 말투 "~다멍/~해달라멍"을 유지한다.',
    `오늘 날짜: ${todayIso || new Date().toISOString().slice(0, 10)}`,
    `현재 재고 JSON: ${inventoryJson}`
  ].join('\n');
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {}

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }
  return null;
}

async function callGemini({
  systemPrompt,
  contents,
  temperature = 0.35,
  maxOutputTokens = 260,
  responseMimeType = null,
  responseSchema = null
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    throw Object.assign(new Error('서버에 GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.'), {
      statusCode: 503,
      code: 'MISSING_GEMINI_API_KEY',
      model
    });
  }

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };
  if (responseMimeType) payload.generationConfig.responseMimeType = responseMimeType;
  if (responseSchema) payload.generationConfig.responseSchema = responseSchema;

  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  const raw = await upstream.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!upstream.ok) {
    throw Object.assign(new Error(data?.error?.message || raw.slice(0, 500) || 'Gemini API 요청이 실패했습니다.'), {
      statusCode: upstream.status,
      code: 'GEMINI_UPSTREAM_ERROR',
      model
    });
  }

  const text = textFromGemini(data);
  if (!text) {
    throw Object.assign(new Error('Gemini 응답에 텍스트가 없습니다.'), {
      statusCode: 502,
      code: 'EMPTY_GEMINI_RESPONSE',
      model
    });
  }

  return { model, text, usageMetadata: data?.usageMetadata || null };
}

module.exports = async function handler(req, res) {
  const id = requestId();
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'POST만 지원합니다.', requestId: id });
    return;
  }

  if (!isAllowedOrigin(req.headers.origin || '')) {
    sendJson(res, 403, { error: '허용되지 않은 호출 출처입니다.', requestId: id });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const message = String(body.message || '').trim();
    if (!message) {
      sendJson(res, 400, { error: '메시지가 비어 있습니다.', requestId: id });
      return;
    }

    const mode = body.mode === 'manager_action' ? 'manager_action' : 'chat';
    const todayIso = String(body.todayIso || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const systemPrompt = mode === 'manager_action'
      ? buildActionSystemPrompt({ ...body, todayIso })
      : buildSystemPrompt(body);
    const contents = [
      ...historyContents(body.recentMessages),
      { role: 'user', parts: [{ text: message.slice(0, 1200) }] }
    ];
    const promptChars = systemPrompt.length + contents.reduce((sum, item) => (
      sum + item.parts.reduce((partSum, part) => partSum + part.text.length, 0)
    ), 0);
    if (promptChars > MAX_PROMPT_CHARS) {
      sendJson(res, 413, { error: '재고 문맥이 너무 큽니다.', requestId: id });
      return;
    }

    const startedAt = Date.now();
    const result = await callGemini({
      systemPrompt,
      contents,
      temperature: mode === 'manager_action' ? 0.15 : 0.35,
      maxOutputTokens: mode === 'manager_action' ? 700 : 260,
      responseMimeType: mode === 'manager_action' ? 'application/json' : null,
      responseSchema: mode === 'manager_action' ? ACTION_RESPONSE_SCHEMA : null
    });
    const action = mode === 'manager_action' ? parseJsonObject(result.text) : null;
    const serverPlan = mode === 'manager_action'
      ? managerActions.buildManagerActionPlan(message, body.inventory || [], { todayIso })
      : null;
    console.log('[inventory-chat]', JSON.stringify({
      requestId: id,
      model: result.model,
      mode,
      promptChars,
      latencyMs: Date.now() - startedAt,
      usageMetadata: result.usageMetadata
    }));

    sendJson(res, 200, {
      reply: action?.reply || result.text,
      action,
      serverPlan,
      requestId: id,
      model: result.model,
      usageMetadata: result.usageMetadata
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    console.error('[inventory-chat]', JSON.stringify({
      requestId: id,
      code: err.code || 'HANDLER_ERROR',
      message: err.message || String(err)
    }));
    sendJson(res, statusCode, {
      error: err.message || 'Gemini 채팅 처리 중 오류가 발생했습니다.',
      requestId: id,
      code: err.code || 'HANDLER_ERROR'
    });
  }
};
