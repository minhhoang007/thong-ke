// Lấy 2 số cuối của một chuỗi số
// Ví dụ: "123456" → "56",  "98" → "98",  "5" → null,  "ab" → null
export function getLast2(numStr) {
  const s = String(numStr).trim();
  if (s.length < 2) return null;
  const pair = s.slice(-2);
  return /^\d{2}$/.test(pair) ? pair : null;
}
