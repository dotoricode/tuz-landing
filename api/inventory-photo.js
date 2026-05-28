const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_IMAGE_BASE64_CHARS = 7_000_000;

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?tuz\.kr$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http:\/\/\[::1\](:\d+)?$/
];

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `photo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
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
    if (raw.length > MAX_IMAGE_BASE64_CHARS + 2000) {
      throw Object.assign(new Error('이미지 요청이 너무 큽니다.'), { statusCode: 413 });
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw Object.assign(new Error('지원하지 않는 이미지 형식입니다.'), { statusCode: 400, code: 'INVALID_IMAGE' });
  }
  if (match[2].length > MAX_IMAGE_BASE64_CHARS) {
    throw Object.assign(new Error('이미지 용량이 너무 큽니다.'), { statusCode: 413, code: 'IMAGE_TOO_LARGE' });
  }
  return { mimeType: match[1], data: match[2] };
}

function textFromGemini(data) {
  return (data?.candidates || [])
    .flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || '')
    .join('\n')
    .trim();
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return {};
  }
}

function normalizeFields(fields = {}) {
  return {
    name: String(fields.name || '').trim(),
    quantity: fields.quantity === undefined || fields.quantity === null ? '' : String(fields.quantity).trim(),
    unit: String(fields.unit || '').trim(),
    category: String(fields.category || '').trim(),
    min_quantity: fields.min_quantity === undefined || fields.min_quantity === null ? '' : String(fields.min_quantity).trim(),
    storage_method: String(fields.storage_method || '').trim(),
    origin: String(fields.origin || '').trim(),
    expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(String(fields.expiry_date || '')) ? String(fields.expiry_date) : '',
    expiry_type: fields.expiry_type === 'NONE' ? 'NONE' : 'SELL-BY',
    notes: String(fields.notes || '').trim()
  };
}

async function callGeminiVision({ image, currentDate }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  if (!apiKey) {
    throw Object.assign(new Error('서버에 GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.'), {
      statusCode: 503,
      code: 'MISSING_GEMINI_API_KEY',
      model
    });
  }

  const prompt = [
    'Tuz 카페 재고 등록용 사진을 분석한다.',
    '사진에서 읽을 수 있는 제품명, 수량, 단위, 분류, 보관 방식, 원산지, 날짜를 추출한다.',
    `오늘 날짜는 ${currentDate || new Date().toISOString().slice(0, 10)}이다.`,
    '유통기한/소비기한/폐기일처럼 날짜가 보이면 expiry_date를 YYYY-MM-DD로 쓴다.',
    '확실하지 않은 값은 빈 문자열로 둔다.',
    '응답은 설명 없이 JSON 객체만 출력한다.',
    '형식: {"fields":{"name":"","quantity":"","unit":"","category":"","min_quantity":"","storage_method":"","origin":"","expiry_date":"","expiry_type":"SELL-BY","notes":""}}'
  ].join('\n');

  const payload = {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 320,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };

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
    const image = parseDataUrl(body.image);
    const startedAt = Date.now();
    const result = await callGeminiVision({ image, currentDate: body.currentDate });
    const parsed = extractJsonObject(result.text);
    const fields = normalizeFields(parsed.fields || parsed);

    console.log('[inventory-photo]', JSON.stringify({
      requestId: id,
      model: result.model,
      latencyMs: Date.now() - startedAt,
      usageMetadata: result.usageMetadata
    }));

    sendJson(res, 200, {
      fields,
      requestId: id,
      model: result.model,
      usageMetadata: result.usageMetadata
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    console.error('[inventory-photo]', JSON.stringify({
      requestId: id,
      code: err.code || 'HANDLER_ERROR',
      message: err.message || String(err)
    }));
    sendJson(res, statusCode, {
      error: err.message || 'Gemini 사진 분석 중 오류가 발생했습니다.',
      requestId: id,
      code: err.code || 'HANDLER_ERROR'
    });
  }
};
