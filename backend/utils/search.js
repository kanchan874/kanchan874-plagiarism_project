const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Parses organic search results from Bing
 */
const searchBing = async (query, maxResults = 5) => {
  const url = "https://www.bing.com/search?q=" + encodeURIComponent(query);
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
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
          if (part.startsWith('a1')) {
            part = part.substring(2);
          }
          // Pad base64 if needed
          const padding = part.length % 4;
          if (padding > 0) {
            part += '='.repeat(4 - padding);
          }
          const decoded = Buffer.from(part, 'base64').toString('utf8');
          if (decoded.startsWith('http')) {
            actualUrl = decoded;
          }
        } catch (err) {}
      }

      // Find snippet
      let snippetEl = $(item).find('p');
      if (!snippetEl.length) {
        snippetEl = $(item).find('.b_caption');
      }
      const snippet = snippetEl.text().trim();

      results.append = results.push({
        title,
        url: actualUrl,
        snippet
      });
    });
    return results;
  } catch (err) {
    return [];
  }
};

/**
 * Parses organic search results from DuckDuckGo Lite
 */
const searchDdgLite = async (query, maxResults = 5) => {
  const url = "https://lite.duckduckgo.com/lite/";
  try {
    const response = await axios.post(url, `q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded"
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

          // Filter ads and DDG links
          if (href && !(href.includes('duckduckgo.com/y.js') || href.includes('ad_domain') || href.includes('ad_provider'))) {
            const snippetTd = snippetRow.find('td.result-snippet');
            const snippet = snippetTd.text().trim();
            results.push({
              title,
              url: href,
              snippet
            });
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
 * Unified Search Handler (Tries Bing, falls back to DDG Lite)
 */
const searchWebEngine = async (query, maxResults = 5) => {
  const bingResults = await searchBing(query, maxResults);
  if (bingResults && bingResults.length > 0) {
    return bingResults;
  }
  return await searchDdgLite(query, maxResults);
};

/**
 * Downloads webpage content in parallel and extracts text
 */
const fetchWebTexts = async (urls) => {
  const fetchUrl = async (url) => {
    try {
      const response = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        timeout: 5000
      });
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        // Strip scripts, styles, forms, header, footer, etc.
        $('script, style, noscript, header, footer, nav, aside, form').remove();
        const text = $('body').text();
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
  const promises = urls.map(url => fetchUrl(url));
  const fetched = await Promise.all(promises);
  fetched.forEach(item => {
    if (item) {
      results[item.url] = item.text;
    }
  });
  return results;
};

module.exports = { searchWebEngine, fetchWebTexts };
