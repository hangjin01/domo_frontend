
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
  // Simple brightness check to determine text color (black or white)
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? 'text-gray-800' : 'text-white';
}
