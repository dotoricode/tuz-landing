const form = document.getElementById('orderForm');
const requestBox = document.getElementById('requestBox');
const requestText = document.getElementById('requestText');
const copyButton = document.getElementById('copyRequest');

function valueOf(name) {
  const field = form.elements[name];
  return field ? field.value.trim() : '';
}

function line(label, value, fallback = '미정') {
  return `${label}: ${value || fallback}`;
}

function buildRequest() {
  const lines = [
    'Tuz 답례품/선물세트 주문 상담 요청',
    '',
    line('주문 종류', valueOf('purpose')),
    line('예상 수량', valueOf('quantity')),
    line('희망 날짜', valueOf('date')),
    line('예산', valueOf('budget')),
    line('원하는 구성', valueOf('package')),
    line('성함', valueOf('name')),
    line('연락처', valueOf('phone')),
    line('추가 요청', valueOf('memo'), '없음'),
  ];
  return lines.join('\n');
}

async function copyRequestText() {
  if (!requestText.textContent) return;
  try {
    await navigator.clipboard.writeText(requestText.textContent);
    copyButton.textContent = '복사됨';
  } catch (_) {
    copyButton.textContent = '직접 선택해 복사해주세요';
  }
  window.setTimeout(() => {
    copyButton.textContent = '문의 내용 복사';
  }, 1600);
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    requestText.textContent = buildRequest();
    requestBox.hidden = false;
    requestBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

if (copyButton) {
  copyButton.addEventListener('click', copyRequestText);
}
