const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_ITEMS = 8;
const MAX_INVENTORY_ITEMS = 80;
const DEV_ORIGINS = new Set([
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return '';
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (new URL(origin).host === host || DEV_ORIGINS.has(origin)) return origin;
    return null;
  } catch {
    return null;
  }
}

function applyCors(req, res, origin) {
  if (!origin) return;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('vary', 'Origin');
}

function cleanText(value, maxLength = MAX_MESSAGE_LENGTH) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizePublicText(value) {
  return String(value || '')
    .replace(/gemini(?:[-\s]*\d+(?:\.\d+)?(?:[-\s]*(?:flash|lite|pro))*)?/gi, 'AI')
    .replace(/제미나이/g, 'AI')
    .trim();
}

function normalizeManager(raw) {
  const id = raw?.id === 'cookie' ? 'cookie' : 'hadong';
  return id === 'cookie'
    ? { id, name: '쿠키', fullName: '쿠키 매니저' }
    : { id, name: '하동이', fullName: '하동이 매니저' };
}

function normalizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_HISTORY_ITEMS).map(entry => {
    const role = entry?.role === 'assistant' ? 'model' : 'user';
    const content = cleanText(entry?.content, 900);
    return content ? { role, content } : null;
  }).filter(Boolean);
}

function normalizeInventory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_INVENTORY_ITEMS).map(item => ({
    name: cleanText(item?.name, 80),
    quantity: cleanText(item?.quantity, 40),
    category: cleanText(item?.category, 60),
    storage: cleanText(item?.storage, 60),
    origin: cleanText(item?.origin, 60),
    expiryType: cleanText(item?.expiryType, 60),
    expiryDate: cleanText(item?.expiryDate, 40),
    dday: cleanText(item?.dday, 40),
    lowStock: cleanText(item?.lowStock, 40)
  })).filter(item => item.name);
}

function buildInstructions(manager, inventory) {
  const persona = manager.id === 'cookie'
    ? '장난스럽고 약간 차갑지만 일은 똑부러지게 잘하는 성격'
    : '귀엽고 친절하지만 살짝 어설픈 성격';

  return [
    `너는 Tuz 카페 재고 마감 업무를 같이 처리하는 "${manager.fullName}"다.`,
    `성격은 ${persona}이다.`,
    '응답은 반드시 한국어만 사용한다. 내부 추론이나 분석 과정을 출력하지 않는다.',
    '사용자는 재고 업무 중에도 인사, 잡담, 감정 표현, 짧은 일상 대화를 할 수 있다. 이런 경우에도 자연스럽게 받아준다.',
    '일상 대화에는 재고 요약을 억지로 붙이지 않는다. 다만 길게 수다 떨기보다 매니저답게 짧고 따뜻하게 답한다.',
    '마감 때 쓰는 앱이므로 오늘 정리할 일과 내일 오픈 준비를 우선한다.',
    '답변은 짧게 한다. 제목 1줄, 안내 1줄, 필요하면 2~4개 항목만 쓴다.',
    '말끝에 가끔 "~다멍"을 쓰되 과하게 쓰지 않는다.',
    'AI 공급자명, 모델명, 외부 서비스 이름은 절대 말하지 않는다. 필요하면 그냥 "AI"라고만 말한다.',
    '재고 판단은 제공된 재고 데이터 안에서만 한다. 재고와 무관한 일상 대화는 가볍게 답하되, 외부 사실을 단정하지 않는다.',
    '상태 이모지는 기한 초과 🚨, 오늘 마감 ⏰, 이번 주 📅, 부족 📦, 정상 ✅를 우선 사용한다.',
    `개별 품목의 상세 점검은 "${manager.name}가 이어서 봐줄거다멍"이라고 안내한다.`,
    `현재 재고 JSON: ${JSON.stringify(inventory)}`
  ].join('\n');
}

function extractOutputText(data) {
  return (data?.candidates || [])
    .flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

module.exports = async function handler(req, res) {
  const origin = allowedOrigin(req);
  if (origin === null) {
    return sendJson(res, 403, { error: '허용된 도메인에서만 사용할 수 있습니다.' });
  }
  applyCors(req, res, origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return sendJson(res, 405, { error: 'POST만 지원합니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 501, { error: 'Vercel 환경변수 GEMINI_API_KEY가 필요합니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = cleanText(body.message);
    if (!message) return sendJson(res, 400, { error: '질문이 비어 있습니다.' });

    const manager = normalizeManager(body.manager);
    const inventory = normalizeInventory(body.inventory);
    const history = normalizeHistory(body.recentMessages);
    const instructions = buildInstructions(manager, inventory);
    const contents = [
      ...history.map(entry => ({
        role: entry.role,
        parts: [{ text: entry.content }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: instructions }]
        },
        contents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 220
        }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = data?.error?.message || '서버 AI 응답을 받지 못했습니다.';
      return sendJson(res, upstream.status, { error: detail });
    }

    const reply = sanitizePublicText(extractOutputText(data));
    return sendJson(res, 200, { reply });
  } catch (err) {
    return sendJson(res, 500, { error: err?.message || '서버 AI 처리 중 오류가 났습니다.' });
  }
};
