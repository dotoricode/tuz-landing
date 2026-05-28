const DEFAULT_MODEL = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const MAX_IMAGE_BASE64_LENGTH = 7_500_000;
const DEV_ORIGINS = new Set([
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);

const CATEGORY_OPTIONS = [
  '과일/토핑', '시럽/소스', '유제품', '커피', '디저트', '브런치', '청/베이스',
  '티', '베이커리', '소모품', '일회용품', '컵/뚜껑', '빨대/스틱', '포장재'
];

const STORAGE_OPTIONS = ['냉장', '냉동', '실온', '상온', '기타'];
const UNIT_OPTIONS = ['개', '봉', '팩', '박스', '롤', '묶음', '병', '캔', 'kg', 'g', 'L', 'ml'];

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

function cleanText(value, maxLength = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanNumber(value) {
  const num = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function cleanDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : text;
}

function normalizeImage(body) {
  const dataUrl = String(body?.image || '');
  const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp|heic|heif));base64,([A-Za-z0-9+/=]+)$/i);
  const mimeType = cleanText(body?.mimeType, 40) || match?.[1] || 'image/jpeg';
  const base64 = match?.[2] || String(body?.base64 || '').replace(/\s+/g, '');
  if (!base64) return null;
  if (base64.length > MAX_IMAGE_BASE64_LENGTH) {
    const err = new Error('사진 용량이 큽니다. 조금 더 작게 촬영하거나 다시 시도해 주세요.');
    err.statusCode = 413;
    throw err;
  }
  return { mimeType, base64 };
}

function buildPrompt(currentDate) {
  return [
    '너는 카페 재고 앱의 사진 분석 도우미다.',
    '사진 전체를 보고 재고 추가 폼에 넣을 값을 추정한다.',
    '라벨 글자만 보지 말고 포장 모양, 수량 표기, 보관 문구, 원산지 문구를 함께 판단한다.',
    '확실하지 않은 값은 빈 문자열이나 null로 둔다. 추측을 과하게 하지 않는다.',
    `오늘 날짜는 ${currentDate || '알 수 없음'}이다. 연도 없는 기한은 오늘 이후 가장 가까운 날짜로 YYYY-MM-DD 형식으로 추정한다.`,
    `category는 가능하면 다음 중 하나를 쓴다: ${CATEGORY_OPTIONS.join(', ')}`,
    `unit은 가능하면 다음 중 하나를 쓴다: ${UNIT_OPTIONS.join(', ')}`,
    `storage_method는 가능하면 다음 중 하나를 쓴다: ${STORAGE_OPTIONS.join(', ')}`,
    'expiry_type은 날짜가 있으면 "SELL-BY", 기한이 없는 소모품이면 "NONE"을 쓴다.',
    'quantity는 사진 속 묶음/개수 표기가 보이면 그 수량, 모르겠으면 1이다.',
    'min_quantity는 사진만으로 알기 어려우면 null이다.',
    '반드시 JSON만 출력한다. 마크다운 코드블록을 쓰지 않는다.',
    '형식: {"name":"","quantity":1,"unit":"","category":"","min_quantity":null,"expiry_date":null,"expiry_type":"SELL-BY","storage_method":"","origin":"","confidence":"low|medium|high","notes":""}'
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

function parseJsonText(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function normalizeFields(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const quantity = cleanNumber(raw.quantity);
  const minQuantity = cleanNumber(raw.min_quantity);
  const expiryDate = cleanDate(raw.expiry_date);
  const expiryType = raw.expiry_type === 'NONE' ? 'NONE' : 'SELL-BY';
  return {
    name: cleanText(raw.name, 80),
    quantity: quantity === null ? 1 : quantity,
    unit: cleanText(raw.unit, 20),
    category: cleanText(raw.category, 40),
    min_quantity: minQuantity,
    expiry_date: expiryType === 'NONE' ? null : expiryDate,
    expiry_type: expiryType === 'NONE' ? 'NONE' : (expiryDate ? 'SELL-BY' : cleanText(raw.expiry_type, 20) || 'SELL-BY'),
    storage_method: cleanText(raw.storage_method, 30),
    origin: cleanText(raw.origin, 50),
    confidence: ['low', 'medium', 'high'].includes(raw.confidence) ? raw.confidence : 'low',
    notes: cleanText(raw.notes, 180)
  };
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
    const image = normalizeImage(body);
    if (!image) return sendJson(res, 400, { error: '사진 데이터가 비어 있습니다.' });

    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildPrompt(cleanText(body.currentDate, 20)) }]
        },
        contents: [{
          role: 'user',
          parts: [
            { text: '이 사진으로 재고 추가 폼을 채울 JSON을 만들어줘.' },
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.base64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 600,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = data?.error?.message || '사진 분석 응답을 받지 못했습니다.';
      return sendJson(res, upstream.status, { error: detail });
    }

    const text = extractOutputText(data);
    const fields = normalizeFields(parseJsonText(text));
    return sendJson(res, 200, { fields });
  } catch (err) {
    return sendJson(res, err?.statusCode || 500, { error: err?.message || '사진 분석 중 오류가 났습니다.' });
  }
};
