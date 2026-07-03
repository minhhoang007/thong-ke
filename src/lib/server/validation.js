export const PRIZE_SCHEMA = Object.freeze({
  giai_db:   { count: 1, digits: 5 },
  giai_nhat: { count: 1, digits: 5 },
  giai_nhi:  { count: 2, digits: 5 },
  giai_ba:   { count: 6, digits: 5 },
  giai_tu:   { count: 4, digits: 4 },
  giai_nam:  { count: 6, digits: 4 },
  giai_sau:  { count: 3, digits: 3 },
  giai_bay:  { count: 4, digits: 2 },
});

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateDrawDate(value, { allowFuture = false } = {}) {
  if (!isValidDate(value)) return 'Ngày xổ không hợp lệ (cần YYYY-MM-DD).';
  if (value < '2000-01-01') return 'Ngày xổ nằm ngoài phạm vi hỗ trợ.';
  if (!allowFuture && value > new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)) {
    return 'Không thể nhập kết quả cho ngày trong tương lai.';
  }
  return null;
}

export function validatePrizes(input, { requireComplete = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'prizes phải là một object.', prizes: null };
  }

  const unknown = Object.keys(input).filter((key) => !(key in PRIZE_SCHEMA));
  if (unknown.length) return { error: `Tên giải không hợp lệ: ${unknown.join(', ')}.`, prizes: null };

  const normalized = {};
  for (const [key, spec] of Object.entries(PRIZE_SCHEMA)) {
    const raw = input[key];
    const values = raw == null ? [] : (Array.isArray(raw) ? raw : [raw]);
    if (values.length > spec.count) {
      return { error: `${key} chỉ được có ${spec.count} kết quả.`, prizes: null };
    }

    const clean = [];
    for (const value of values) {
      if (typeof value !== 'string') return { error: `${key} phải là chuỗi số.`, prizes: null };
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (!new RegExp(`^\\d{${spec.digits}}$`).test(trimmed)) {
        return { error: `${key} phải gồm đúng ${spec.digits} chữ số.`, prizes: null };
      }
      clean.push(trimmed);
    }

    if (requireComplete && clean.length !== spec.count) {
      return { error: `${key} cần đủ ${spec.count} kết quả.`, prizes: null };
    }
    normalized[key] = spec.count === 1 ? (clean[0] ?? '') : clean;
  }

  return { error: null, prizes: normalized };
}

export function boundedInt(value, fallback, { min, max }) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
