const hexRegex = /^#?([a-f\d]{6}|[a-f\d]{3})$/i;

const normalizeHex = (hex: string): string => {
  if (!hexRegex.test(hex)) return '#cccccc';
  let value = hex.startsWith('#') ? hex.substring(1) : hex;
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  return `#${value.toLowerCase()}`;
};

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.replace('#', ''), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

export const lightenColor = (hex: string, percent: number): string => {
  const normalized = normalizeHex(hex);
  const { r, g, b } = hexToRgb(normalized);
  const ratio = Math.min(Math.max(percent, 0), 100) / 100;
  const newR = Math.round(r + (255 - r) * ratio);
  const newG = Math.round(g + (255 - g) * ratio);
  const newB = Math.round(b + (255 - b) * ratio);
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};

export const getReadableTextColor = (hex: string): string => {
  const normalized = normalizeHex(hex);
  const { r, g, b } = hexToRgb(normalized);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
};

export const darkenColor = (hex: string, percent: number): string => {
  const normalized = normalizeHex(hex);
  const { r, g, b } = hexToRgb(normalized);
  const ratio = Math.min(Math.max(percent, 0), 100) / 100;
  const newR = Math.round(r * (1 - ratio));
  const newG = Math.round(g * (1 - ratio));
  const newB = Math.round(b * (1 - ratio));
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};
