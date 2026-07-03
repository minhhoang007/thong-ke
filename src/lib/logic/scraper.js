/**
 * Multi-source scraper với fallback tự động.
 * Thứ tự ưu tiên: SOURCES[0] → SOURCES[1] → ... cho đến khi thành công.
 *
 * Thêm nguồn mới: push 1 object { name, label, buildUrl, parse } vào SOURCES.
 */

import { PRIZE_SCHEMA } from '../server/validation.js';

// ─── Hằng số chung ────────────────────────────────────────────────────────────

const PRIZE_COUNT = {
  giai_db: 1, giai_nhat: 1, giai_nhi: 2, giai_ba: 6,
  giai_tu: 4, giai_nam: 6, giai_sau: 3, giai_bay: 4,
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────

const ALLOWED_HOSTS = new Set(['www.minhchinh.com', 'minhchinh.com', 'www.xosothantai.com', 'xosothantai.com', 'ketquaxoso.com', 'www.ketquaxoso.com']);
const MAX_HTML_BYTES = 2 * 1024 * 1024;

async function fetchHtml(initialUrl) {
  const timeoutMs = Math.min(30_000, Math.max(1_000, Number.parseInt(process.env.SCRAPE_TIMEOUT_MS ?? '10000', 10) || 10_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timeout ${timeoutMs}ms`)), timeoutMs);

  try {
    let current = new URL(initialUrl);
    for (let redirects = 0; redirects <= 5; redirects++) {
      if (current.protocol !== 'https:' || !ALLOWED_HOSTS.has(current.hostname)) {
        throw new Error('Nguồn hoặc redirect không được phép');
      }
      const response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; XoSoStats/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'vi-VN,vi;q=0.9',
        },
      });
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        current = new URL(response.headers.get('location'), current);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declared = Number(response.headers.get('content-length') ?? 0);
      if (declared > MAX_HTML_BYTES) throw new Error('Response quá lớn');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response không có nội dung');
      const chunks = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new Error('Response quá lớn');
        }
        chunks.push(value);
      }
      return new TextDecoder('utf-8').decode(Buffer.concat(chunks));
    }
    throw new Error('Quá nhiều redirect');
  } finally {
    clearTimeout(timer);
  }
}

// ─── Helper dùng chung cho parser ─────────────────────────────────────────────

/** Trích giá trị từ thuộc tính data="..." bên trong 1 đoạn HTML */
function extractDataAttrs(section) {
  const vals = [];
  let m;
  const re = /data="(\d+)"/g;
  while ((m = re.exec(section)) !== null) vals.push(m[1]);
  return vals;
}

/** Trích số từ <span>...</span> hoặc text thuần bên trong 1 đoạn HTML */
function extractSpanNumbers(section) {
  const vals = [];
  let m;
  const re = /<span[^>]*>\s*(\d{2,6})\s*<\/span>/g;
  while ((m = re.exec(section)) !== null) vals.push(m[1]);
  if (vals.length) return vals;
  // fallback: số ≥4 chữ số xuất hiện trong text thuần
  const rePlain = /\b(\d{2,6})\b/g;
  while ((m = rePlain.exec(section)) !== null) vals.push(m[1]);
  return vals;
}

/** Cắt HTML xung quanh 1 từ khóa, giới hạn N ký tự */
function sliceAround(html, keyword, len = 400) {
  const idx = html.indexOf(keyword);
  if (idx === -1) return null;
  return html.slice(idx, idx + len);
}

function makePrizes(map) {
  const prizes = {};
  let found = 0;
  for (const [key, count] of Object.entries(PRIZE_COUNT)) {
    const digits = PRIZE_SCHEMA[key].digits;
    const vals = (map[key] ?? []).filter((value) => new RegExp(`^\\d{${digits}}$`).test(value)).slice(0, count);
    if (vals.length === count) found++;
    prizes[key] = count === 1 ? (vals[0] ?? '') : vals;
  }
  return { prizes, foundCount: found, totalPrizes: Object.keys(PRIZE_COUNT).length };
}

// ─── NGUỒN 1: minhchinh.com ───────────────────────────────────────────────────

const SOURCE_MINHCHINH = {
  name:  'minhchinh',
  label: 'Minh Chính (minhchinh.com)',

  buildUrl(date) {
    const base = 'https://www.minhchinh.com';
    if (!date) return `${base}/xo-so-mien-bac.html`;
    const [y, m, d] = date.split('-');
    return `${base}/ket-qua-xo-so-mien-bac/${d}-${m}-${y}.html`;
  },

  parse(html) {
    // minhchinh.com: <td class="giai_dac_biet"> … data="XXXXXX" …
    const CLASS_MAP = {
      giai_dac_biet: 'giai_db',
      giai_nhat:     'giai_nhat',
      giai_nhi:      'giai_nhi',
      giai_ba:       'giai_ba',
      giai_tu:       'giai_tu',
      giai_nam:      'giai_nam',
      giai_sau:      'giai_sau',
      giai_bay:      'giai_bay',
    };
    const map = {};
    for (const [htmlClass, appKey] of Object.entries(CLASS_MAP)) {
      const re    = new RegExp(`<td[^>]+class="[^"]*\\b${htmlClass}\\b[^"]*"[^>]*>([\\s\\S]*?)(?=<td|</tr>)`, 'i');
      const match = re.exec(html);
      map[appKey] = match ? extractDataAttrs(match[1]) : [];
    }
    return makePrizes(map);
  },
};

// ─── NGUỒN 2: xosothantai.com ─────────────────────────────────────────────────

const SOURCE_XOSOTHANTAI = {
  name:  'xosothantai',
  label: 'XoSo Thần Tài (xosothantai.com)',

  buildUrl(date) {
    const base = 'https://www.xosothantai.com';
    if (!date) return `${base}/xs-mien-bac.html`;
    const [y, m, d] = date.split('-');
    return `${base}/xs-mien-bac-${d}-${m}-${y}.html`;
  },

  parse(html) {
    // xosothantai.com: <td class="giai_db"> hoặc <td class="kq_db"> với data="" hoặc <span>
    const CLASS_PAIRS = [
      [/giai_dac_biet|giai_db|kq_db/i, 'giai_db'],
      [/giai_nhat|kq_nhat/i,           'giai_nhat'],
      [/giai_nhi|kq_nhi/i,             'giai_nhi'],
      [/giai_ba|kq_ba/i,               'giai_ba'],
      [/giai_tu|kq_tu/i,               'giai_tu'],
      [/giai_nam|kq_nam/i,             'giai_nam'],
      [/giai_sau|kq_sau/i,             'giai_sau'],
      [/giai_bay|kq_bay/i,             'giai_bay'],
    ];

    const map = {};
    for (const [pattern, appKey] of CLASS_PAIRS) {
      const re    = new RegExp(`<td[^>]+class="[^"]*${pattern.source}[^"]*"[^>]*>([\\s\\S]*?)(?=<td|</tr>)`, 'i');
      const match = re.exec(html);
      if (!match) { map[appKey] = []; continue; }
      const section = match[1];
      // ưu tiên data="" → span → text thuần
      const byAttr = extractDataAttrs(section);
      map[appKey] = byAttr.length ? byAttr : extractSpanNumbers(section);
    }
    return makePrizes(map);
  },
};

// ─── NGUỒN 3: ketquaxoso.com ──────────────────────────────────────────────────

const SOURCE_KETQUAXOSO = {
  name:  'ketquaxoso',
  label: 'Kết Quả Xổ Số (ketquaxoso.com)',

  buildUrl(date) {
    const base = 'https://ketquaxoso.com';
    if (!date) return `${base}/xo-so-mien-bac/`;
    const [y, m, d] = date.split('-');
    return `${base}/xo-so-mien-bac/${d}-${m}-${y}/`;
  },

  parse(html) {
    // ketquaxoso.com: văn bản giải nằm trong <td> liền kề
    // "Đặc biệt" / "Giải nhất" → số 5-6 chữ số ở ô bên cạnh
    const KEYWORD_MAP = [
      [['đặc biệt', 'giai_db', 'giai-db', 'giải đặc biệt'],  'giai_db'],
      [['giải nhất', 'giai_nhat', 'giai-nhat'],               'giai_nhat'],
      [['giải nhì',  'giai_nhi',  'giai-nhi'],                'giai_nhi'],
      [['giải ba',   'giai_ba',   'giai-ba'],                 'giai_ba'],
      [['giải tư',   'giai_tu',   'giai-tu'],                 'giai_tu'],
      [['giải năm',  'giai_nam',  'giai-nam'],                'giai_nam'],
      [['giải sáu',  'giai_sau',  'giai-sau'],                'giai_sau'],
      [['giải bảy',  'giai_bay',  'giai-bay'],                'giai_bay'],
    ];

    const htmlLower = html.toLowerCase();
    const map = {};

    for (const [keywords, appKey] of KEYWORD_MAP) {
      let section = null;
      for (const kw of keywords) {
        section = sliceAround(htmlLower, kw, 600);
        if (section) break;
      }
      if (!section) { map[appKey] = []; continue; }
      // Lấy vị trí thực trong html gốc (để giữ case số)
      const idx = htmlLower.indexOf(section.slice(0, 20));
      const raw = idx >= 0 ? html.slice(idx, idx + 600) : section;
      const byAttr = extractDataAttrs(raw);
      map[appKey] = byAttr.length ? byAttr : extractSpanNumbers(raw);
    }
    return makePrizes(map);
  },
};

// ─── Danh sách nguồn theo thứ tự ưu tiên ─────────────────────────────────────

const SOURCES = [
  SOURCE_MINHCHINH,
  SOURCE_XOSOTHANTAI,
  SOURCE_KETQUAXOSO,
];

// ─── API công khai ─────────────────────────────────────────────────────────────

/** Scrape 1 nguồn — reject nếu fetch lỗi hoặc không tìm thấy dữ liệu. */
async function scrapeSource(src, date) {
  const url    = src.buildUrl(date);
  const html   = await fetchHtml(url);
  const parsed = src.parse(html);
  if (parsed.foundCount === 0) throw new Error('Không tìm thấy dữ liệu giải');
  return {
    success:     true,
    prizes:      parsed.prizes,
    source:      src.name,
    sourceLabel: src.label,
    sourceUrl:   url,
    partial:     parsed.foundCount < parsed.totalPrizes,
    foundCount:  parsed.foundCount,
    totalPrizes: parsed.totalPrizes,
  };
}

/**
 * Scrape kết quả xổ số Miền Bắc — race 3 nguồn song song, lấy nguồn về trước.
 * @param {string|null} date  'YYYY-MM-DD' hoặc null = hôm nay
 */
export async function scrapeResult(date = null) {
  const settled = await Promise.allSettled(SOURCES.map(src => scrapeSource(src, date)));
  const successes = settled
    .map((result, index) => result.status === 'fulfilled' ? { ...result.value, priority: index } : null)
    .filter(Boolean);
  const complete = successes.find((result) => !result.partial);
  if (complete) return complete;
  if (successes.length) {
    return successes.sort((a, b) => b.foundCount - a.foundCount || a.priority - b.priority)[0];
  }

  const errors = settled.map((result, index) => ({
    source: SOURCES[index].name,
    error: result.status === 'rejected' ? String(result.reason?.message ?? result.reason) : 'Không có dữ liệu',
    url: SOURCES[index].buildUrl(date),
  }));
  return { success: false, error: `Tất cả ${SOURCES.length} nguồn đều thất bại`, errors };
}
