const VN_OFFSET = 7 * 3600 * 1000;

/** Trả về Date "fake-UTC": UTC methods (getUTCHours...) cho ra giờ Việt Nam */
export function nowVN() {
  return new Date(Date.now() + VN_OFFSET);
}

/** Trả về ngày hôm nay theo giờ Việt Nam dạng 'YYYY-MM-DD' */
export function todayVN() {
  return nowVN().toISOString().slice(0, 10);
}
