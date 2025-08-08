// Enhanced startup with error handling
console.log('✅ Starting Realtor Scraper...');

// Validate required environment variables
const requiredEnvVars = ['PORT'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Validate Puppeteer executable path
const puppeteerExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!puppeteerExecutablePath) {
  console.warn('⚠️ PUPPETEER_EXECUTABLE_PATH not set, using default');
}

let express, cors, puppeteer;

try {
  express = require('express');
  cors = require('cors');
  puppeteer = require('puppeteer');
  
  console.log('✅ Dependencies loaded successfully');
} catch (error) {
  console.error('❌ Failed to load dependencies:', error.message);
  process.exit(1);
}

const app = express();

// Utility functions for address parsing and normalization
function normalizePostal(pc) {
  return (pc || "").toUpperCase().replace(/\s+/g, "").replace(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/, "$1 $2");
}

function fixJoinedStreetCity(addr) {
  // add comma if street+city are jammed together like "... DRIVEKingsville"
  return addr.replace(/([a-z])([A-Z][a-z]+)/g, "$1, $2");
}

function parseAddressParts(addr) {
  const a = fixJoinedStreetCity((addr || "").replace(/\s+/g, " ").trim());
  let m = a.match(/^(.*?),\s*([^,]+?),\s*([A-Z]{2,})\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)$/i);
  if (m) return { addressLine1: m[1].trim(), city: m[2].trim(), state: m[3].toUpperCase(), postalCode: normalizePostal(m[4]) };
  m = a.match(/^(.*?),\s*([^,]+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/);
  if (m) return { addressLine1: m[1].trim(), city: m[2].trim(), state: m[3].toUpperCase(), postalCode: m[4] };
  const parts = a.split(",").map(s => s.trim());
  return { addressLine1: parts[0] || "", city: parts[1] || "", state: (parts[2] || "").split(" ")[0].toUpperCase(), postalCode: normalizePostal((parts[2] || "").split(" ").slice(1).join(" ")) };
}

// Tolerant LD+JSON helpers
function sanitizeLdJson(txt = "") {
  return txt
    .replace(/^\uFEFF/, "")                  // BOM
    .replace(/^\s*<!--/, "")                 // html comment open
    .replace(/-->\s*$/, "")                  // html comment close
    .replace(/,\s*([}\]])/g, "$1");          // trailing commas
}

function safeParseJSON(txt) {
  try {
    return JSON.parse(sanitizeLdJson(txt));
  } catch {
    return null;
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Centralized response function
function sendPartial(res, payload = {}) {
  const { address, addressLine1, city, state, postalCode, price, bedrooms, bathrooms, description } = payload;
  const missing = [];
  if (!address && !(addressLine1 && city && state)) missing.push("address");
  if (price == null) missing.push("price");
  if (bedrooms == null) missing.push("bedrooms");
  if (bathrooms == null) missing.push("bathrooms");
  if (!description) missing.push("description");
  const body = { success: missing.length === 0, partial: missing.length > 0, missing, ...payload };
  if (body.partial) console.warn("partial extract", { url: payload.url, missing });
  return res.status(200).json(body);
}

// Health check endpoint
app.get('/', (req, res) => res.status(200).json({ ok: true }));

// Main scraping endpoint with multiple routes
app.post(['/', '/import', '/importPropertyFromText'], async (req, res) => {
  try {
    const { text, userId } = req.body;
    
    // Body parsing + validation
    console.log('🟦 POST endpoint hit', { hasBody: !!req.body, hasText: !!req.body?.text, hasUserId: !!req.body?.userId });
    
    // Extract URL from text field (text contains the URL to scrape)
    const url = text;
    
    if (!url) {
      return sendPartial(res, {
        source: "validation-error",
        error: "text field with URL is required for scraping",
        url: null,
        timestamp: new Date().toISOString()
      });
    }

  console.log(`🔍 Starting scrape for: ${url}`);
  
  // Wrap browser launch in its own try/catch
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
    });
    console.log('🟩 Puppeteer launched successfully');
  } catch (e) {
    console.error('🟥 Launch failed:', e);
    return sendPartial(res, {
      source: "launch-error",
      error: String(e?.message || e),
      url,
      timestamp: new Date().toISOString()
    });
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
   
   // Harden navigation & headers against bot detection
   const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
   await page.setUserAgent(UA);
   await page.setExtraHTTPHeaders({
     "accept-language": "en-CA,en;q=0.9",
     "sec-ch-ua-platform": "\"Windows\"",
     "upgrade-insecure-requests": "1",
     "cache-control": "no-cache"
   });
   await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });

   try {
     await page.goto(url, { waitUntil: ["networkidle0","domcontentloaded"], timeout: 60000 });
     console.log('🟩 Navigation ok');
     
     // Dismiss consent banners if they appear
     const consentBtn = await page.$('button:has-text("Accept") , button:has-text("I Agree") , [aria-label*="Accept"]');
     if (consentBtn) {
       await consentBtn.click().catch(()=>{});
       console.log('🟩 Dismissed consent banner');
     }
       } catch (navErr) {
      console.error('🟥 Navigation failed:', navErr);
      
      // Ensure cleanup happens even on navigation error
      try {
        if (browser) await browser.close();
        console.log('🟩 Browser resources cleaned up after navigation error');
      } catch (cleanupErr) {
        console.warn('⚠️ Cleanup warning after navigation error:', cleanupErr.message);
      }
      
      return sendPartial(res, {
        source: 'navigation-error',
        error: String(navErr?.message || navErr),
        url,
        timestamp: new Date().toISOString()
      });
    }

  // wait for Next.js data or visible price fallback
  const sourceReady = await Promise.race([
    page.waitForSelector('script#__NEXT_DATA__', { timeout: 10000 }).then(()=>'next'),
    page.waitForSelector('[class*="price"], [data-testid*="price"]', { timeout: 10000 }).then(()=>'dom')
  ]).catch(()=>null);
  console.log('🔎 sourceReady:', sourceReady);

     // Initialize result object
   let address = '';
   let addressLine1 = '';
   let city = '';
   let state = '';
   let postalCode = '';
   let price = null;
   let bedrooms = null;
   let bathrooms = null;
   let description = '';
   let images = [];
   let mlsNumber = '';
   let source = 'unknown';

   // ---- 1) Tolerant LD+JSON parsing ----
   try {
     const ldRaw = await page.$$eval('script[type="application/ld+json"]', ns => ns.map(n => n.textContent || ""));
     const ldAll = ldRaw.map(safeParseJSON).filter(Boolean).flatMap(v => Array.isArray(v) ? v : [v]);

     const isType = t => (o) => (o && o['@type'] && [].concat(o['@type']).some(x => [ 'RealEstateListing','Residence','SingleFamilyResidence','Apartment','Product','Offer' ].includes(String(x))));
     const ldPref = ldAll.find(isType()) || ldAll.find(o => o?.address || o?.offers || o?.price) || null;

     if (ldPref) {
       source = 'ld+json';
       const addr = ldPref.address || {};
       addressLine1 = addressLine1 || addr.streetAddress || "";
       city = city || addr.addressLocality || "";
       state = state || (addr.addressRegion || "").toUpperCase();
       postalCode = postalCode || addr.postalCode || "";
       price = price ?? (ldPref.offers?.price ?? ldPref.price ?? null);
       bedrooms = bedrooms ?? (ldPref.numberOfRooms ?? ldPref.bedroomCount ?? ldPref.bedrooms ?? null);
       bathrooms = bathrooms ?? (ldPref.numberOfBathroomsTotal ?? ldPref.bathrooms ?? null);
       description = description || ldPref.description || ldPref.name || "";
       mlsNumber = mlsNumber || ldPref.mlsNumber || ldPref.identifier || "";
     }
   } catch (e) {
     console.warn('LD+JSON parsing failed:', e.message);
   }

   // ---- 2) __NEXT_DATA__ fallback ----
   try {
     const nextRaw = await page.$eval('#__NEXT_DATA__', n => n.textContent).catch(() => null);
     const nextJSON = nextRaw ? safeParseJSON(nextRaw) : null;
     if (nextJSON) {
       const any = JSON.stringify(nextJSON);
       // cheap picks
       const addrMatch = any.match(/"streetAddress":"([^"]+)".*?"addressLocality":"([^"]+)".*?"addressRegion":"([^"]+)".*?"postalCode":"([^"]+)"/s);
       if (addrMatch) {
         addressLine1 ||= addrMatch[1];
         city ||= addrMatch[2];
         state ||= addrMatch[3].toUpperCase();
         postalCode ||= addrMatch[4];
       }
       const priceMatch = any.match(/"price":\s*("?[\d,\.]+"?)/);
       if (price == null && priceMatch) price = Number(String(priceMatch[1]).replace(/[",]/g,"")) || null;
       const mlsMatch = any.match(/"mlsNumber":"?([A-Z0-9\-]+)"?/i) || any.match(/"identifier":"?([A-Z0-9\-]+)"?/i);
       if (!mlsNumber && mlsMatch) mlsNumber = mlsMatch[1];
     }
   } catch (e) {
     console.warn('Next.js data parsing failed:', e.message);
   }

   // ---- 3) DOM fallback (augment, don't replace) ----
   try {
     const dom = await page.evaluate(() => {
       const grab = sel => (document.querySelector(sel)?.textContent || "").trim();
       let domAddr = grab('[data-testid="property-address"]') || grab('.listingAddress') || grab('.address');
       let domPrice = grab('[data-testid="listing-price"]') || grab('.price') || grab('[itemprop="price"]');
       let domMLS = [...document.querySelectorAll('body *')].map(x => x.textContent || "").join(" ").match(/MLS[:\s#-]*([A-Z0-9-]+)/i);

       return { domAddr, domPrice, domMLS: domMLS ? domMLS[1] : "" };
     });

     if (!address && dom.domAddr) address = dom.domAddr;
     if (price == null && dom.domPrice) price = Number(dom.domPrice.replace(/[^\d.]/g,"")) || null;
     if (!mlsNumber && dom.domMLS) mlsNumber = dom.domMLS;
   } catch (e) {
     console.warn('DOM extraction failed:', e.message);
   }

   // ---- 4) Parse/normalize address if needed ----
   if ((!addressLine1 || !city || !state) && address) {
     const p = parseAddressParts(address);
     addressLine1 ||= p.addressLine1;
     city ||= p.city;
     state ||= p.state;
     postalCode ||= p.postalCode;
   }
   if (!address) {
     address = [addressLine1, city, state && postalCode ? `${state} ${postalCode}` : state || postalCode].filter(Boolean).join(", ");
   }
   state = (state || "").toUpperCase().trim();
   postalCode = normalizePostal(postalCode);

   const result = {
     source,
     address,
     addressLine1,
     city,
     state,
     postalCode,
     price,
     bedrooms,
     bathrooms,
     description,
     images,
     mlsNumber
   };
     } catch (e) {
     console.error('🟥 evaluate error:', e);
     
     // Ensure cleanup happens even on evaluate error
     try {
       if (page) await page.close();
       if (browser) await browser.close();
       console.log('🟩 Browser resources cleaned up after evaluate error');
     } catch (cleanupErr) {
       console.warn('⚠️ Cleanup warning after evaluate error:', cleanupErr.message);
     }
     
     return sendPartial(res, {
       source: 'evaluate-error',
       error: String(e?.message || e),
       url,
       timestamp: new Date().toISOString()
     });
   }

   // Add more logging around what source was used
   console.log('📦 extracted source:', result.source, 'price:', result.price, 'beds:', result.bedrooms, 'baths:', result.bathrooms);
   console.log('📦 extracted (final):', { source: result.source, price: result.price, beds: result.bedrooms, baths: result.bathrooms });

   // Ensure response has the input URL
   const payload = {
     ...result,
     url: req.body?.text || page.url() || null,
     timestamp: new Date().toISOString()
   };

   // Cleanup browser resources
   try {
     if (page) await page.close();
     if (browser) await browser.close();
     console.log('🟩 Browser resources cleaned up');
   } catch (cleanupErr) {
     console.warn('⚠️ Cleanup warning:', cleanupErr.message);
   }

   // Use centralized response function
   return sendPartial(res, payload);
  } catch (err) {
    console.error("scrape error", req.body?.text, err);
    
    // Ensure cleanup happens even on error
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log('🟩 Browser resources cleaned up after error');
    } catch (cleanupErr) {
      console.warn('⚠️ Cleanup warning after error:', cleanupErr.message);
    }
    
    return sendPartial(res, {
      source: "error",
      error: String(err?.message || err),
      url: req.body?.text || null,
      timestamp: new Date().toISOString()
    });
  }
 });

// Express error handler - catch any unhandled errors
app.use((err, req, res, _next) => {
  console.error("unhandled", err);
  return sendPartial(res, {
    source: "unhandled",
    error: String(err?.message || err),
    url: req.body?.text || null,
    timestamp: new Date().toISOString()
  });
});

// Use PORT from environment variable for Cloud Run compatibility
const PORT = process.env.PORT || 8080;

// Validate port number
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('❌ Invalid PORT number:', PORT);
  process.exit(1);
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🟥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🟥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server with enhanced error handling
let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server listening on port ${PORT}`);
    console.log(`🌐 Health check available at: http://localhost:${PORT}/`);
    console.log(`🔍 Scraping endpoints available at: http://localhost:${PORT}/, /import, /importPropertyFromText`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🖥️  Puppeteer executable: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'default'}`);
  });

  // Handle server errors
  server.on('error', (err) => {
    console.error('🟥 Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error('❌ Port', PORT, 'is already in use');
    } else if (err.code === 'EACCES') {
      console.error('❌ Permission denied to bind to port', PORT);
    }
    process.exit(1);
  });

  // Handle server close
  server.on('close', () => {
    console.log('🔄 Server closed');
  });

} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}  