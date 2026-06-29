// Lấy 2 số cuối của một chuỗi số
// Ví dụ: "123456" → "56",  "98" → "98",  "5" → null
export function getLast2(numStr) {
  const s = String(numStr).trim();
  return s.length >= 2 ? s.slice(-2) : null;
}
