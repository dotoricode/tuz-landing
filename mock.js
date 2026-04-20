import { RENDERERS } from './app.js';

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();

const MOCK = {
  settings: [{
    wifiSsid: 'Tuz_Guest',
    wifiPassword: 'tuz2026!',
    hoursWeekday: '08:00-22:00',
    hoursWeekend: '10:00-23:00',
    stampMax: 10,
    stampNote: '10잔 모으면 음료 한 잔 무료',
    spotlightPickId: null,
    spotlightMenuId: 'mock-m5',
    spotlightLabel: '이번 주의 한 잔',
    holidayNotice: '',
    regularClosureKr: null,
    regularClosureEn: null,
  }],

  news: [
    {
      id: 'mock-n1',
      title: '5월 시즌 메뉴 출시 — 딸기 라떼 & 말차 크림',
      body: '봄 시즌 한정 메뉴를 오늘부터 만나보실 수 있습니다. 재료 소진 시 조기 종료됩니다.',
      tag: 'NEW',
      isToday: true,
      date: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-n2',
      title: '스탬프 카드 리뉴얼 안내',
      body: '기존 종이 스탬프 카드는 4월 말까지 사용 가능하며, 이후 앱 스탬프로 전환됩니다.',
      tag: 'INFO',
      isToday: false,
      date: yesterday.slice(0, 10),
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: 'mock-n3',
      title: '이달의 커피 챌린지 당첨자 발표',
      body: '참여해 주신 모든 분께 감사드립니다. 당첨자는 SNS DM으로 안내드렸습니다.',
      tag: 'EVENT',
      isToday: false,
      date: yesterday.slice(0, 10),
      createdAt: yesterday,
      updatedAt: yesterday,
    },
  ],

  pick: [
    {
      id: 'mock-p1',
      barista: '큰 사장',
      name: '딸기 라떼',
      nameEn: 'Strawberry Latte',
      note: '국내산 딸기를 직접 갈아 넣은 진한 라떼. 달지 않고 과일 향이 선명해요.',
      price: 6500,
      photo: '',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-p2',
      barista: '작은 사장',
      name: '말차 크림 라떼',
      nameEn: 'Matcha Cream Latte',
      note: '교토산 말차와 홈메이드 생크림의 조합. 쌉쌀함과 부드러움이 균형을 이룹니다.',
      price: 7000,
      photo: '',
      createdAt: now,
      updatedAt: now,
    },
  ],

  menu: [
    { id: 'mock-m1', name: '아메리카노', nameEn: 'Americano', price: 4500, tag: 'SIGNATURE', isSignature: true, sortOrder: 1 },
    { id: 'mock-m2', name: '카페 라떼', nameEn: 'Cafe Latte', price: 5000, tag: 'SIGNATURE', isSignature: true, sortOrder: 2 },
    { id: 'mock-m3', name: '딸기 라떼', nameEn: 'Strawberry Latte', price: 6500, tag: 'SIGNATURE,NEW', isSignature: true, sortOrder: 3 },
    { id: 'mock-m4', name: '말차 크림 라떼', nameEn: 'Matcha Cream Latte', price: 7000, tag: 'SIGNATURE,NEW', isSignature: true, sortOrder: 4 },
    { id: 'mock-m5', name: '얼 그레이 밀크티', nameEn: 'Earl Grey Milk Tea', price: 6000, tag: 'SIGNATURE', isSignature: true, sortOrder: 5 },
  ],

  faq: [
    {
      id: 'mock-f1',
      questionKr: '주차는 가능한가요?',
      answerKr: '매장 바로 앞 공영주차장을 이용하실 수 있습니다. 2시간 무료 주차 쿠폰을 드립니다.',
      answerEn: 'You can use the public parking lot right in front. We provide a 2-hour free parking coupon.',
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: 'mock-f2',
      questionKr: '반려동물 동반 가능한가요?',
      answerKr: '외부 테라스에 한해 소형 반려동물 동반이 가능합니다. 리드줄 필수입니다.',
      answerEn: 'Small pets are welcome on the outdoor terrace only. Leashes are required.',
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: 'mock-f3',
      questionKr: '단체 예약이 가능한가요?',
      answerKr: '10인 이상 단체는 인스타그램 DM 또는 전화로 사전 예약 부탁드립니다.',
      answerEn: 'For groups of 10 or more, please contact us via Instagram DM or phone in advance.',
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: 'mock-f4',
      questionKr: '스탬프는 어떻게 받나요?',
      answerKr: '음료 한 잔 주문 시 스탬프 1개가 적립됩니다. 10개 모으면 음료 1잔이 무료입니다.',
      answerEn: 'One stamp is earned per drink. Collect 10 stamps to get one free drink.',
      createdAt: now,
      updatedAt: now,
    },
  ],

  winners: [
    { id: 'mock-w1', nick: '딸기고양이', month: '2026년 4월', period: '~2026.05.31' },
    { id: 'mock-w2', nick: 'tuz_lover', month: '2026년 3월', period: '~2026.04.30' },
  ],

  greeting: [{
    body: '안녕하세요, Tuz입니다.\n작은 공간에서 좋은 커피 한 잔으로\n일상의 여백을 드리고 싶습니다.\n천천히, 편하게 머물다 가세요.',
    sign: '큰 사장 & 작은 사장 드림',
    photo: '',
  }],
};

RENDERERS.settings(MOCK.settings);
RENDERERS.news(MOCK.news);
RENDERERS.pick(MOCK.pick);
RENDERERS.menu(MOCK.menu);
RENDERERS.faq(MOCK.faq);
RENDERERS.winners(MOCK.winners);
RENDERERS.greeting(MOCK.greeting);

// Mock 모드 배너 + 룰렛 테스트 버튼
const _banner = document.createElement('div');
_banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#a52a1a;color:#f4ecda;font-size:11px;text-align:center;padding:2px 8px;pointer-events:none';
_banner.textContent = '🧪 MOCK MODE — localhost 테스트 전용';
document.body.appendChild(_banner);

const _rouletteBtn = document.createElement('button');
_rouletteBtn.textContent = '룰렛 테스트';
_rouletteBtn.style.cssText = 'position:fixed;bottom:88px;right:12px;z-index:9998;padding:10px 14px;background:#a52a1a;color:#f4ecda;border:none;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)';
_rouletteBtn.addEventListener('click', () => {
  const tiers = ['normal', 'normal', 'double', 'half_off', 'free_drink'];
  const bonus_type = tiers[Math.floor(Math.random() * tiers.length)];
  const arts = window.__tuzMock?.arts ?? [];
  const art = arts.length ? arts[Math.floor(Math.random() * arts.length)] : null;
  if (window.tuzShowRoulette) {
    window.tuzShowRoulette({ bonus_type, art, new_count: (window.__tuzMock?.activeCount ?? 3) + 1 });
  } else {
    alert('tuzShowRoulette 아직 미로드 — 잠시 후 다시 눌러주세요');
  }
});
document.body.appendChild(_rouletteBtn);
