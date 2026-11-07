/**
 * [파일 안내] frontend/src/models/utils/canvas.ts
 * 스티키 색상과 대비색 등 캔버스 표현용 계산을 모읍니다.
 * 스타일 계산은 데이터 저장과 분리되어 있습니다. 반환한 색은 Task/Group 저장 필드와 자동 동기화되지 않습니다.
 */


export const STICKY_COLORS = [
  { id: 'yellow', bg: 'bg-[#FFF9C4]', text: 'text-gray-800', border: 'border-yellow-200', dot: 'bg-[#FDE047]' },
  { id: 'blue', bg: 'bg-[#E3F2FD]', text: 'text-blue-900', border: 'border-blue-200', dot: 'bg-[#93C5FD]' },
  { id: 'green', bg: 'bg-[#E8F5E9]', text: 'text-green-900', border: 'border-green-200', dot: 'bg-[#86EFAC]' },
  { id: 'pink', bg: 'bg-[#FCE7F3]', text: 'text-pink-900', border: 'border-pink-200', dot: 'bg-[#F9A8D4]' },
  { id: 'purple', bg: 'bg-[#F3E8FF]', text: 'text-purple-900', border: 'border-purple-200', dot: 'bg-[#D8B4FE]' },
];

export function getStickyStyle(id: string, color?: string) {
  // Return predefined style if color matches an ID, or default yellow
  const found = STICKY_COLORS.find(c => c.id === color);
  if (found) return found;
  
  // If it's a custom hex code, we handle it in the component style directly, 
  // but here we return a default object or null to indicate custom handling.
  if (color?.startsWith('#')) return null;

  return STICKY_COLORS[0]; // Default yellow
}

export function getContrastColor(hexColor: string): string {
  // 화면 테마에 따라 바뀌는 gray 토큰 대신 순수 검정/흰색 중 대비가 더 큰 색을 고릅니다.
  // sRGB를 선형화한 상대 휘도를 사용하며, #RGB와 #RRGGBB를 모두 지원합니다.
  let hex = hexColor.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map(channel => channel + channel).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 'text-black';
  const channels = [0, 2, 4].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? 'text-black' : 'text-white';
}
