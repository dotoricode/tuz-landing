const form = document.getElementById('orderForm');
const requestBox = document.getElementById('requestBox');
const requestText = document.getElementById('requestText');
const quantityInput = document.getElementById('quantity');
const instagramLink = document.getElementById('sendInstagram');
const requestNotice = document.getElementById('requestNotice');

function valueOf(name) {
  const field = form.elements[name];
  return field ? field.value.trim() : '';
}

function line(label, value, fallback = '미정') {
  return `${label}: ${value || fallback}`;
}

function buildRequest() {
  const quantity = valueOf('quantity');
  const lines = [
    'Tuz 답례품/선물세트 주문 상담 요청',
    '',
    line('주문 종류', valueOf('purpose')),
    line('예상 수량', quantity ? `${quantity}개` : ''),
    line('희망 날짜', valueOf('date')),
    line('예산', valueOf('budget')),
    line('원하는 구성', valueOf('package')),
    line('성함', valueOf('name')),
    line('연락처', valueOf('phone')),
    line('추가 요청', valueOf('memo'), '없음'),
  ];
  return lines.join('\n');
}

async function copyText(text) {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}

async function copyRequestForInstagram() {
  if (!requestText.textContent) return;
  const copied = await copyText(requestText.textContent);
  if (copied) {
    requestNotice.textContent = 'DM 문의 내용이 복사되었습니다. Instagram에서 붙여넣어 주세요.';
  } else {
    requestNotice.textContent = '위 문의 내용을 직접 복사해 Instagram DM에 붙여넣어 주세요.';
  }
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const request = buildRequest();
    requestText.textContent = request;
    requestBox.hidden = false;
    requestBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

if (instagramLink) {
  instagramLink.addEventListener('click', copyRequestForInstagram);
}

if (quantityInput) {
  quantityInput.addEventListener('input', () => {
    quantityInput.value = quantityInput.value.replace(/\D/g, '');
  });
}
