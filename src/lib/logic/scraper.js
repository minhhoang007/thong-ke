/**
 * Multi-source scraper với fallback tự động.
 * Thứ tự ưu tiên: SOURCES[0] → SOURCES[1] → ... cho đến khi thành công.
 *
 * Thêm nguồn mới: push 1 object { name, label, buildUrl, parse } vào SOURCES.
 */

import https from 'https';
import http  from 'http';

// ─── Hằng số chung ────────────────────────────────────────────────────────────

const PRIZE_COUNT = {
  giai_db: 1, giai_nhat: 1, giai_nhi: 2, giai_ba: 6,
  giai_tu: 4, giai_nam: 6, giai_sau: 3, giai_bay: 4,
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function fetchHtml(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Quá nhiều redirect'));

    const parsedUrl = new URL(url);
    const proto     = parsedUrl.protocol === 'https:' ? https : http;
    const options   = {
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      method:   'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.5',
        'Connection':      'keep-alive',
      },
    };

    const req = proto.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsedUrl.protocol}//${parsedUrl.hostname}${res.headers.location}`;
        res.resume();
        return resolve(fetchHtml(next, redirectCount + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end',  () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(12_000, () => { req.destroy(new Error('Timeout 12s')); });
    req.end();
  });
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
  const re = /<span[^>]*>(\d{4,6})<\/span>/g;
  while ((m = re.exec(section)) !== null) vals.push(m[1]);
  if (vals.length) return vals;
  // fallback: số ≥4 chữ số xuất hiện trong text thuần
  const rePlain = /\b(\d{4,6})\b/g;
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
  for (const key of Object.keys(PRIZE_COUNT)) {
    const vals = map[key] ?? [];
    if (vals.length) found++;
    prizes[key] = PRIZE_COUNT[key] === 1 ? (vals[0] ?? '') : vals.slice(0, PRIZE_COUNT[key]);
  }
  return { prizes, foundCount: found, totalPrizes: Object.keys(PRIZE_COUNT).length };
}

// ─── NGUỒN 1: minhchinh.com ───────────────────────────────────────────────────

const SOURCE_MINHCHINH = {
  name:  'minhchinh',
  label: 'Minh Chính (minhchinh.com)',

  buildUrl(province, date) {
    const TODAY = {
      'mien-bac':   '/xo-so-mien-bac.html',
      'mien-trung': '/xo-so-mien-trung.html',
      'mien-nam':   '/xo-so-mien-nam.html',
    };
    const PREFIX = {
      'mien-bac':   '/ket-qua-xo-so-mien-bac',
      'mien-trung': '/ket-qua-xo-so-mien-trung',
      'mien-nam':   '/ket-qua-xo-so-mien-nam',
    };
    const base = 'https://www.minhchinh.com';
    if (!date) return base + (TODAY[province] ?? TODAY['mien-bac']);
    const [y, m, d] = date.split('-');
    const prefix = PREFIX[province] ?? PREFIX['mien-bac'];
    return `${base}${prefix}/${d}-${m}-${y}.html`;
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
      const re    = new RegExp(`<td[^>]+class="${htmlClass}"[^>]*>([\\s\\S]*?)(?=<td|</tr>)`, 'i');
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

  buildUrl(province, date) {
    const SLUG = {
      'mien-bac':   'xs-mien-bac',
      'mien-trung': 'xs-mien-trung',
      'mien-nam':   'xs-mien-nam',
    };
    const slug = SLUG[province] ?? SLUG['mien-bac'];
    const base = 'https://www.xosothantai.com';
    if (!date) return `${base}/${slug}.html`;
    const [y, m, d] = date.split('-');
    return `${base}/${slug}-${d}-${m}-${y}.html`;
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

  buildUrl(province, date) {
    const SLUG = {
      'mien-bac':   'xo-so-mien-bac',
      'mien-trung': 'xo-so-mien-trung',
      'mien-nam':   'xo-so-mien-nam',
    };
    const slug = SLUG[province] ?? SLUG['mien-bac'];
    const base = 'https://ketquaxoso.com';
    if (!date) return `${base}/${slug}/`;
    const [y, m, d] = date.split('-');
    return `${base}/${slug}/${d}-${m}-${y}/`;
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

/**
 * Scrape kết quả xổ số với fallback tự động qua nhiều nguồn.
 * @param {string} province  'mien-bac' | 'mien-trung' | 'mien-nam'
 * @param {string|null} date 'YYYY-MM-DD' hoặc null = hôm nay
 * @returns {{ success, prizes?, source?, sourceLabel?, sourceUrl?, partial?, errors? }}
 */
export async function scrapeResult(province = 'mien-bac', date = null) {
  const errors = [];

  for (const src of SOURCES) {
    const url = src.buildUrl(province, date);
    let html;
    try {
      html = await fetchHtml(url);
    } catch (err) {
      errors.push({ source: src.name, error: `Fetch thất bại: ${err.message}`, url });
      continue;
    }

    let parsed;
    try {
      parsed = src.parse(html, province);
    } catch (err) {
      errors.push({ source: src.name, error: `Parse lỗi: ${err.message}`, url });
      continue;
    }

    if (parsed.foundCount === 0) {
      errors.push({ source: src.name, error: 'Không tìm thấy dữ liệu giải (chưa có KQ hoặc cấu trúc HTML đổi)', url });
      continue;
    }

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

  return {
    success: false,
    error:   `Tất cả ${SOURCES.length} nguồn đều thất bại`,
    errors,
  };
}

/** Danh sách nguồn đang cấu hình (dùng để hiển thị UI) */
export const SCRAPE_SOURCES = SOURCES.map(s => ({ name: s.name, label: s.label }));
