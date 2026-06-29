// Scrape kết quả XSMB từ minhchinh.com
// URL hôm nay: /xo-so-mien-bac.html
// URL theo ngày: /ket-qua-xo-so-mien-bac/DD-MM-YYYY.html
//
// Dùng Node.js https module thay vì native fetch để tránh SSL renegotiation
// issues trên Windows Node.js (schannel vs openssl).

import https from 'https';
import http  from 'http';

const BASE = 'https://www.minhchinh.com';

const PROVINCE_TODAY = {
  'mien-bac':   '/xo-so-mien-bac.html',
  'mien-trung': '/xo-so-mien-trung.html',
  'mien-nam':   '/xo-so-mien-nam.html',
};

const PROVINCE_DATE_PREFIX = {
  'mien-bac':   '/ket-qua-xo-so-mien-bac',
  'mien-trung': '/ket-qua-xo-so-mien-trung',
  'mien-nam':   '/ket-qua-xo-so-mien-nam',
};

// Ánh xạ class HTML → key trong app
// minhchinh.com dùng giai_dac_biet thay vì giai_db
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

const PRIZE_COUNT = {
  giai_db: 1, giai_nhat: 1, giai_nhi: 2, giai_ba: 6,
  giai_tu: 4, giai_nam: 6, giai_sau: 3, giai_bay: 4,
};

function buildUrl(province, date) {
  const base = BASE;
  if (!date) {
    return base + (PROVINCE_TODAY[province] ?? PROVINCE_TODAY['mien-bac']);
  }
  // Chuyển YYYY-MM-DD → DD-MM-YYYY
  const [y, m, d] = date.split('-');
  const prefix = PROVINCE_DATE_PREFIX[province] ?? PROVINCE_DATE_PREFIX['mien-bac'];
  return `${base}${prefix}/${d}-${m}-${y}.html`;
}

// Lấy HTML qua Node.js https module (rejectUnauthorized: false để tránh SSL issues)
function fetchHtml(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Quá nhiều redirect'));

    const parsedUrl  = new URL(url);
    const proto      = parsedUrl.protocol === 'https:' ? https : http;
    const options    = {
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      method:   'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
    req.setTimeout(10_000, () => { req.destroy(new Error('Timeout 10s')); });
    req.end();
  });
}

// Trích tất cả giá trị data="..." trong một <td class="giai_xxx"> section
function extractPrizeValues(html, prizeClass) {
  const tdPattern = new RegExp(
    `<td[^>]+class="${prizeClass}"[^>]*>([\\s\\S]*?)(?=<td|</tr>)`,
    'i'
  );
  const match = tdPattern.exec(html);
  if (!match) return [];

  const section = match[1];
  const dataPattern = /data="(\d+)"/g;
  const values = [];
  let m;
  while ((m = dataPattern.exec(section)) !== null) {
    values.push(m[1]);
  }
  return values;
}

function parseXSMB(html) {
  const prizes    = {};
  let foundCount  = 0;

  for (const [htmlClass, appKey] of Object.entries(CLASS_MAP)) {
    const values    = extractPrizeValues(html, htmlClass);
    const expected  = PRIZE_COUNT[appKey];
    if (values.length > 0) foundCount++;

    prizes[appKey] = expected === 1 ? (values[0] ?? '') : values.slice(0, expected);
  }

  return { prizes, foundCount, totalPrizes: Object.keys(CLASS_MAP).length };
}

export async function scrapeResult(province = 'mien-bac', date = null) {
  const url = buildUrl(province, date);

  let html;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    return {
      success: false,
      error:   `Không kết nối được (${err.message}). URL: ${url}`,
    };
  }

  const { prizes, foundCount, totalPrizes } = parseXSMB(html);

  if (foundCount === 0) {
    return {
      success: false,
      error:   `Trang tải thành công nhưng không tìm thấy dữ liệu giải. Có thể chưa có kết quả hoặc cấu trúc HTML đã thay đổi. URL: ${url}`,
    };
  }

  return {
    success:     true,
    prizes,
    partial:     foundCount < totalPrizes,
    foundCount,
    totalPrizes,
    sourceUrl:   url,
  };
}
