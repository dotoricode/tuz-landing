export const WIFI_SCHEMA = {
  label: 'WiFi',
  noun: 'WiFi',
  mode: 'single',
  views: ['wifi'],
  table: 'settings',
  fields: [
    { col: 'wifi_ssid',     label: '네트워크 이름 (SSID)', type: 'text', required: true, placeholder: 'TUZ_Guest' },
    { col: 'wifi_password', label: '비밀번호',             type: 'text', required: true, placeholder: 'tuz12345' },
  ],
};
