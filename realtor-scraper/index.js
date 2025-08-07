console.log('✅ Starting Realtor Scraper...');

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main scraping endpoint
app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  
  // Body parsing + validation
  console.log('🟦 /scrape hit', { hasBody: !!req.body, url: req.body?.url });
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`🔍 Starting scrape for: ${url}`);
  
  // Wrap browser launch in its own try/catch
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process'],
    });
    console.log('🟩 Puppeteer launched');
  } catch (e) {
    console.error('🟥 Launch failed:', e);
    return res.status(500).json({ error: 'Browser launch failed', message: String(e.message || e) });
  }

  // Safe navigation with retry
  async function safeGoto(page, url) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
      return true;
    } catch (err) {
      console.warn('⚠️ goto failed, retrying with domcontentloaded:', err.message);
      await new Promise(r => setTimeout(r, 800));
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      return true;
    }
  }

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: 1366, height: 900 });

  try {
    await safeGoto(page, url);
    console.log('🟩 Navigation ok');
  } catch (navErr) {
    console.error('🟥 Navigation failed:', navErr);
    await browser.close().catch(()=>{});
    return res.status(500).json({ error: 'Navigation failed', message: String(navErr.message || navErr) });
  }

  // wait for Next.js data or visible price fallback
  const sourceReady = await Promise.race([
    page.waitForSelector('script#__NEXT_DATA__', { timeout: 10000 }).then(()=>'next'),
    page.waitForSelector('[class*="price"], [data-testid*="price"]', { timeout: 10000 }).then(()=>'dom')
  ]).catch(()=>null);
  console.log('🔎 sourceReady:', sourceReady);

  let result = {};
  try {
    result = await page.evaluate(() => {
      const out = {
        source: 'unknown',
        address: '',
        price: 0,
        bedrooms: 0,
        bathrooms: 0,
        description: '',
        images: [],
        mlsNumber: ''
      };

      const cleanNum = (s) => {
        if (!s) return 0;
        const m = String(s).replace(/[, ]+/g,'').match(/\d+(\.\d+)?/);
        return m ? Number(m[0]) : 0;
      };
      const text = (sel) => (document.querySelector(sel)?.textContent || '').trim();

      // ---- 1) Next.js data: __NEXT_DATA__ ----
      try {
        const nextScript = document.querySelector('script#__NEXT_DATA__');
        if (nextScript?.textContent) {
          const next = JSON.parse(nextScript.textContent);
          // Try to locate listing payload heuristically
          // Common pattern: next.props?.pageProps || next.query || next.state
          const deepFind = (obj, key) => {
            const stack = [obj];
            while (stack.length) {
              const cur = stack.pop();
              if (!cur || typeof cur !== 'object') continue;
              if (key in cur) return cur[key];
              for (const k in cur) stack.push(cur[k]);
            }
            return undefined;
          };

          // Heuristic keys we care about
          const priceVal = deepFind(next, 'Price') ?? deepFind(next, 'price') ?? deepFind(next, 'ListPrice') ?? deepFind(next, 'listPrice');
          const bedsVal  = deepFind(next, 'Bedrooms') ?? deepFind(next, 'bedrooms');
          const bathsVal = deepFind(next, 'Bathrooms') ?? deepFind(next, 'bathrooms') ?? deepFind(next, 'bathroomsTotal');
          const addrObj  = deepFind(next, 'Address') ?? deepFind(next, 'address') ?? {};
          const descVal  = deepFind(next, 'PublicRemarks') ?? deepFind(next, 'description');
          const mlsVal   = deepFind(next, 'MLS') ?? deepFind(next, 'mls') ?? deepFind(next, 'MlsNumber') ?? deepFind(next, 'mlsNumber');
          const imgs     = deepFind(next, 'Photos') ?? deepFind(next, 'photos') ?? deepFind(next, 'Images') ?? deepFind(next, 'images') ?? [];

          // Address may be object or string
          const addrStr = typeof addrObj === 'string'
            ? addrObj
            : [addrObj?.AddressText || addrObj?.streetAddress, addrObj?.Municipality || addrObj?.addressLocality, addrObj?.Province || addrObj?.addressRegion]
                .filter(Boolean).join(', ');

          // Normalize
          const nextCandidate = {
            source: 'next-data',
            address: addrStr || '',
            price: cleanNum(priceVal),
            bedrooms: cleanNum(bedsVal),
            bathrooms: cleanNum(bathsVal),
            description: descVal || '',
            images: Array.isArray(imgs) ? imgs.map(x => (typeof x === 'string' ? x : (x?.Url || x?.url))).filter(Boolean) : [],
            mlsNumber: typeof mlsVal === 'string' ? mlsVal : (mlsVal?.value || '')
          };

          // Accept if we got key fields
          if (nextCandidate.price || nextCandidate.bedrooms || nextCandidate.bathrooms || nextCandidate.address) {
            Object.assign(out, nextCandidate);
            out.source = 'next-data';
          }
        }
      } catch (e) { /* ignore */ }

      // ---- 2) ld+json fallback ----
      if (out.source === 'unknown') {
        try {
          const ld = document.querySelector('script[type="application/ld+json"]');
          if (ld?.textContent) {
            const j = JSON.parse(ld.textContent);
            out.source = 'ld+json';
            out.address = out.address || [j?.address?.streetAddress, j?.address?.addressLocality].filter(Boolean).join(', ');
            out.price   = out.price   || cleanNum(j?.offers?.price ?? j?.price);
            out.bedrooms= out.bedrooms|| cleanNum(j?.numberOfRooms ?? j?.numberOfBedrooms);
            out.bathrooms=out.bathrooms|| cleanNum(j?.numberOfBathroomsTotal ?? j?.numberOfBathrooms);
            out.description = out.description || (j?.description || '');
            if (!out.images?.length) {
              out.images = Array.isArray(j?.image) ? j.image.filter(u => typeof u === 'string') :
                (typeof j?.image === 'string' ? [j.image] : []);
            }
          }
        } catch (e) { /* ignore */ }
      }

      // ---- 3) DOM fallback ----
      const priceSel = '[class*="price"], [data-testid*="price"], [itemprop="price"]';
      const bedSel   = '[class*="bed"], [data-testid*="bed"], [aria-label*="bed"]';
      const bathSel  = '[class*="bath"], [data-testid*="bath"], [aria-label*="bath"]';
      const descSel  = '.description, [class*="description"], [data-testid*="description"]';
      if (!out.address) out.address = text('h1, [class*="title"], [data-testid*="address"]');
      if (!out.price)   out.price   = cleanNum(text(priceSel));
      if (!out.bedrooms) out.bedrooms = cleanNum(text(bedSel));
      if (!out.bathrooms) out.bathrooms = cleanNum(text(bathSel));
      if (!out.description) out.description = text(descSel);
      if (!out.images?.length) {
        out.images = Array.from(document.querySelectorAll('img'))
          .map(i => i.src).filter(u => u && u.startsWith('http')).slice(0, 12);
      }

      // ---- 4) Regex + Meta fallbacks ----
      // helpers
      const grabMeta = (p, n) => document.querySelector(`meta[property="${p}"]`)?.content
                                 || document.querySelector(`meta[name="${n}"]`)?.content || '';
      const fromTitle = () => (document.querySelector('title')?.textContent || '').trim();
      const wholeText = () => (document.body?.innerText || '').replace(/\s+/g, ' ').trim();

      // collect text sources
      const metaOG = grabMeta('og:description', 'description');
      const titleText = fromTitle();
      const bodyText = wholeText();
      const pools = [metaOG, titleText, bodyText].filter(Boolean);

      // regex helpers
      const matchPrice = (s) => {
        // $899,900 or CAD 899,900 etc.
        const m = s.match(/(?:\$|CAD)\s?([\d]{1,3}(?:[, ]\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?)/i);
        if (!m) return 0;
        return Number((m[1] || '').replace(/[,\s]/g, '')) || 0;
      };
      const matchBeds = (s) => {
        // "4 bed", "4 beds", "4 bedrooms"
        const m = s.match(/(\d+(?:\.\d+)?)\s*(?:bed(?:room)?s?)/i);
        return m ? Number(m[1]) : 0;
      };
      const matchBaths = (s) => {
        // "3 bath", "3.5 baths", "3 bathrooms"
        const m = s.match(/(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?)/i);
        return m ? Number(m[1]) : 0;
      };

      // only fill if still missing
      if (!out.price) {
        for (const src of pools) {
          const p = matchPrice(src);
          if (p) { out.price = p; break; }
        }
      }
      if (!out.bedrooms) {
        for (const src of pools) {
          const b = matchBeds(src);
          if (b) { out.bedrooms = b; break; }
        }
      }
      if (!out.bathrooms) {
        for (const src of pools) {
          const b = matchBaths(src);
          if (b) { out.bathrooms = b; break; }
        }
      }

      // final sanity: if address missing, check title/meta too
      if (!out.address) {
        const addrGuess = titleText.match(/^\s*(.+?)\s*[-|–]/)?.[1] || '';
        if (addrGuess) out.address = addrGuess.trim();
      }

      return out;
    });
  } catch (e) {
    console.error('🟥 evaluate error:', e);
    await browser.close().catch(()=>{});
    return res.status(500).json({ error: 'Evaluate failed', message: String(e.message || e) });
  }

  // Add more logging around what source was used
  console.log('📦 extracted source:', result.source, 'price:', result.price, 'beds:', result.bedrooms, 'baths:', result.bathrooms);
  console.log('📦 extracted (final):', { source: result.source, price: result.price, beds: result.bedrooms, baths: result.bathrooms });

  // Validate + return with partial support
  const missing = ['price','bedrooms','bathrooms'].filter(k => !result[k]);
  await page.close().catch(()=>{});
  await browser.close().catch(()=>{});
  if (missing.length) {
    console.warn('⚠️ Missing fields:', missing);
    return res.status(200).json({ success: true, partial: true, missing, ...result, url, timestamp: new Date().toISOString() });
  }
  return res.status(200).json({ success: true, partial: false, ...result, url, timestamp: new Date().toISOString() });
});

// Use PORT from environment variable for Cloud Run compatibility
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🔍 Scraping endpoint available at: http://localhost:${PORT}/scrape`);
}); 