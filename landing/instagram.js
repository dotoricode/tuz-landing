const pinnedPosts = [
  {
    href: 'https://www.instagram.com/p/DZ6HPZYJJcP/',
    image: '/landing/assets/instagram/tuz-pinned-financier.jpg',
    alt: 'TUZ Instagram에 소개된 휘낭시에 라인업',
    datetime: '2026-06-23',
    date: '06.23',
    summary: '예약 수량에 맞춰 준비 가능한 휘낭시에 라인업을 소개합니다.'
  },
  {
    href: 'https://www.instagram.com/p/DZtbIDDv7gE/',
    image: '/landing/assets/instagram/tuz-pinned-hours.jpg',
    alt: 'TUZ Instagram의 7월 영업시간 안내',
    datetime: '2026-06-18',
    date: '06.18',
    summary: '7월 영업시간과 화요일 정기휴무, 오후 8시 마감을 안내합니다.'
  },
  {
    href: 'https://www.instagram.com/p/DYdvt8Rmb48/',
    image: '/landing/assets/instagram/tuz-pinned-minari.jpg',
    alt: 'TUZ Instagram에 소개된 미나리 브리즈',
    datetime: '2026-05-18',
    date: '05.18',
    summary: '미나리 큐브와 과일 소르베로 만든 시그니처 브리즈의 이야기를 전합니다.'
  }
];

const selectedPinnedPost = pinnedPosts[Math.floor(Math.random() * pinnedPosts.length)];
const pinnedLink = document.querySelector('#pinnedInstagramLink');
const pinnedImage = document.querySelector('#pinnedInstagramImage');
const pinnedDate = document.querySelector('#pinnedInstagramDate');
const pinnedSummary = document.querySelector('#pinnedInstagramSummary');

if (pinnedLink && pinnedImage && pinnedDate && pinnedSummary) {
  pinnedLink.href = selectedPinnedPost.href;
  pinnedImage.src = selectedPinnedPost.image;
  pinnedImage.alt = selectedPinnedPost.alt;
  pinnedDate.dateTime = selectedPinnedPost.datetime;
  pinnedDate.textContent = selectedPinnedPost.date;
  pinnedSummary.textContent = selectedPinnedPost.summary;
}
