const axios = require('axios');
const cheerio = require('cheerio');

// Rotate User-Agents to reduce bot-detection chance
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

const getUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Google Custom Search JSON API
 * Requires env vars: GOOGLE_API_KEY and GOOGLE_CSE_ID
 * Free tier: 100 queries/day
 */
const searchGoogleAPI = async (query, maxResults = 5) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) return [];

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`;
    const response = await axios.get(url, { timeout: 8000 });
    if (response.status !== 200 || !response.data.items) return [];

    return response.data.items.map(item => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || ''
    })).filter(r => r.url && r.url.startsWith('http'));
  } catch (err) {
    return [];
  }
};

/**
 * Google Search HTML Scraping (no API key needed)
 * Works for academic/demo use — falls back gracefully if blocked
 */
const searchGoogleScrape = async (query, maxResults = 5) => {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults + 3}&hl=en&gl=us&safe=off`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.google.com/',
      },
      timeout: 9000,
      maxRedirects: 3,
    });

    if (response.status !== 200) return [];

    const html = response.data;
    // Detect CAPTCHA / bot block
    if (html.includes('unusual traffic') || html.includes('detected unusual') || html.includes('/sorry/index')) {
      console.warn('[Google Scrape] Bot detection triggered, skipping.');
      return [];
    }

    const $ = cheerio.load(html);
    const results = [];

    // Selectors for Google organic results (multiple fallback patterns)
    const selectors = [
      'div.g',           // Classic
      'div[data-hveid]', // Modern
      'div.MjjYud > div', // 2024 layout
    ];

    for (const selector of selectors) {
      if (results.length >= maxResults) break;
      $(selector).each((_, item) => {
        if (results.length >= maxResults) return false;

        // Extract link
        const aTag = $(item).find('a[href]').first();
        const href = aTag.attr('href') || '';
        if (!href.startsWith('http') || href.includes('google.com')) return;

        // Extract title
        const title = $(item).find('h3').first().text().trim();
        if (!title) return;

        // Extract snippet — multiple selectors
        const snippetEl = $(item).find('div.VwiC3b, span.aCOpRe, div.lyLwlc, div[data-sncf], div.IsZvec, div.lEBKkf').first();
        const snippet = snippetEl.text().trim();

        // Deduplicate by URL
        if (results.some(r => r.url === href)) return;

        results.push({ title, url: href, snippet });
      });

      if (results.length > 0) break; // Found results with this selector
    }

    return results;
  } catch (err) {
    return [];
  }
};

/**
 * Bing HTML Scraping
 */
const searchBing = async (query, maxResults = 5) => {
  const url = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': getUA() },
      timeout: 8000
    });
    if (response.status !== 200) return [];

    const $ = cheerio.load(response.data);
    const results = [];
    const items = $('li.b_algo');

    items.each((_, item) => {
      if (results.length >= maxResults) return false;
      const h2 = $(item).find('h2');
      if (!h2.length) return;
      const aTag = h2.find('a');
      if (!aTag.length) return;

      const title = aTag.text().trim();
      const href = aTag.attr('href') || '';

      // Decode base64 URL inside Bing redirect
      let actualUrl = href;
      if (href.includes('u=')) {
        try {
          let part = href.split('u=')[1].split('&')[0];
          if (part.startsWith('a1')) part = part.substring(2);
          const padding = part.length % 4;
          if (padding > 0) part += '='.repeat(4 - padding);
          const decoded = Buffer.from(part, 'base64').toString('utf8');
          if (decoded.startsWith('http')) actualUrl = decoded;
        } catch (err) {}
      }

      if (!actualUrl.startsWith('http')) return;

      let snippetEl = $(item).find('p');
      if (!snippetEl.length) snippetEl = $(item).find('.b_caption');
      const snippet = snippetEl.text().trim();

      results.push({ title, url: actualUrl, snippet });
    });
    return results;
  } catch (err) {
    return [];
  }
};

/**
 * DuckDuckGo Lite — last resort fallback
 */
const searchDdgLite = async (query, maxResults = 5) => {
  const url = 'https://lite.duckduckgo.com/lite/';
  try {
    const response = await axios.post(url, `q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': getUA(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 8000
    });
    if (response.status !== 200) return [];

    const $ = cheerio.load(response.data);
    const results = [];
    const tables = $('table');

    if (tables.length >= 3) {
      const targetTable = tables.eq(2);
      const rows = targetTable.find('tr');
      let i = 0;
      while (i < rows.length - 2 && results.length < maxResults) {
        const titleRow = rows.eq(i);
        const snippetRow = rows.eq(i + 1);
        const titleLink = titleRow.find('a.result-link');
        if (titleLink.length) {
          const title = titleLink.text().trim();
          const href = titleLink.attr('href') || '';
          if (href && !(href.includes('duckduckgo.com/y.js') || href.includes('ad_domain') || href.includes('ad_provider'))) {
            const snippet = snippetRow.find('td.result-snippet').text().trim();
            results.push({ title, url: href, snippet });
          }
          i += 3;
        } else {
          i += 1;
        }
      }
    }
    return results;
  } catch (err) {
    return [];
  }
};

/**
 * Unified Search Handler
 * Priority: Google API (if keys set) → Google Scrape → Bing → DuckDuckGo Lite
 */
const searchWebEngine = async (query, maxResults = 5) => {
  // 1. Google Custom Search API (most accurate — requires API key)
  const googleApiResults = await searchGoogleAPI(query, maxResults);
  if (googleApiResults.length > 0) {
    console.log(`[Search] Google API: ${googleApiResults.length} results`);
    return googleApiResults;
  }

  // 2. Google Scrape (no key needed — may be blocked on cloud IPs)
  const googleScrapeResults = await searchGoogleScrape(query, maxResults);
  if (googleScrapeResults.length > 0) {
    console.log(`[Search] Google Scrape: ${googleScrapeResults.length} results`);
    return googleScrapeResults;
  }

  // 3. Bing fallback
  const bingResults = await searchBing(query, maxResults);
  if (bingResults.length > 0) {
    console.log(`[Search] Bing: ${bingResults.length} results`);
    return bingResults;
  }

  // 4. DuckDuckGo Lite last resort
  const ddgResults = await searchDdgLite(query, maxResults);
  console.log(`[Search] DDG Lite: ${ddgResults.length} results`);
  return ddgResults;
};

/**
 * Downloads webpage content in parallel and extracts clean body text
 */
const fetchWebTexts = async (urls) => {
  const fetchUrl = async (url) => {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': getUA() },
        timeout: 6000,
        maxRedirects: 3,
      });
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        // Strip non-content elements
        $('script, style, noscript, header, footer, nav, aside, form, iframe, img, [role="navigation"], [role="banner"]').remove();
        // Extract main content — prefer article/main if available
        const mainEl = $('article, main, [role="main"], .content, #content, .post, .article');
        const text = mainEl.length ? mainEl.text() : $('body').text();
        const cleaned = text.replace(/\s+/g, ' ').trim();
        if (cleaned.length > 100) {
          return { url, text: cleaned };
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  const results = {};
  const fetched = await Promise.all(urls.map(url => fetchUrl(url)));
  fetched.forEach(item => {
    if (item) results[item.url] = item.text;
  });
  return results;
};

module.exports = { searchWebEngine, fetchWebTexts };
