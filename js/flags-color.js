// Deterministic color helpers for flags
// Exported API: autoFlagColor(key: string) => hex color '#rrggbb'

export function hashCodeToHue(str) {
  if (!str) return 210;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 360;
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function autoFlagColor(key) {
  const h = hashCodeToHue(String(key || ''));
  return hslToHex(h, 70, 45);
}

export default { autoFlagColor, hashCodeToHue, hslToHex };
