export const BRANDING_STEP = 4;
export const REVIEW_STEP = 3;
export const brandColors = [
  { name: 'primaryColor1', label: 'Primary Color 1', required: true },
  { name: 'primaryColor2', label: 'Primary Color 2', required: false },
  { name: 'primaryColor3', label: 'Primary Color 3', required: false },
  { name: 'secondaryColor1', label: 'Secondary Color 1', required: true },
  { name: 'secondaryColor2', label: 'Secondary Color 2', required: false },
  { name: 'secondaryColor3', label: 'Secondary Color 3', required: false },
];
export const logoCategories = ['Logo Square/Portrait', 'Logo Landscape'];
/** @param {string} value */
export function colorHex(value) {
  const hex = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(hex)) return '#' + [...hex].map(char => char + char).join('').toUpperCase();
  if (/^[\da-f]{6}$/i.test(hex)) return '#' + hex.toUpperCase();
  const rgb = value.trim().match(/^(?:rgb\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i);
  if (!rgb || rgb.slice(1).some(channel => Number(channel) > 255)) return null;
  // Parentheses must be paired when using rgb(...).
  if (/^rgb/i.test(value.trim()) !== /\)$/.test(value.trim())) return null;
  return '#' + rgb.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('').toUpperCase();
}
/** @param {string} value */
export function colorRgb(value) {
  const hex = colorHex(value);
  return hex ? [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ') : '';
}
/** @param {Uint8Array} bytes */
export function logoImageType(bytes) {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
