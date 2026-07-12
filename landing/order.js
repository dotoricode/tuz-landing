const form = document.getElementById('orderForm');
const requestBox = document.getElementById('requestBox');
const requestText = document.getElementById('requestText');
const smsLink = document.getElementById('sendSms');
const emailLink = document.getElementById('sendEmail');
const instagramLink = document.getElementById('sendInstagram');
const requestNotice = document.getElementById('requestNotice');

const SMS_RECIPIENT = '01053433407';
const EMAIL_RECIPIENT = 'high048@gmail.com';
const EMAIL_SUBJECT = 'Tuz 답례품/선물세트 주문 상담 요청';

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

function updateContactLinks(request) {
  smsLink.href = `sms:${SMS_RECIPIENT}?body=${encodeURIComponent(request)}`;
  emailLink.href = `mailto:${EMAIL_RECIPIENT}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(request)}`;
}

async function copyRequestForInstagram() {
  if (!requestText.textContent) return;
  try {
    await navigator.clipboard.writeText(requestText.textContent);
    requestNotice.textContent = 'DM 문의 내용이 복사되었습니다. Instagram에서 붙여넣어 주세요.';
  } catch (_) {
    requestNotice.textContent = '위 문의 내용을 직접 복사해 Instagram DM에 붙여넣어 주세요.';
  }
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const request = buildRequest();
    requestText.textContent = request;
    updateContactLinks(request);
    requestBox.hidden = false;
    requestBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

if (instagramLink) {
  instagramLink.addEventListener('click', copyRequestForInstagram);
}
