import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import cors from 'cors';

setGlobalOptions({ region: 'us-central1' });
admin.initializeApp();

console.log('🚀 Firebase Functions module loaded');
console.log('🔧 Node.js version:', process.version);
console.log('🔧 Environment:', process.env.NODE_ENV || 'production');

// Initialize CORS handler for Vercel frontend
const corsHandler = cors({
  origin: 'https://realtor-ai-mu.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// ✅ Load .env only in local emulator
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config();
  console.log("✅ .env loaded locally");
  console.log("🔑 OPENAI_KEY =", process.env.OPENAI_KEY?.slice(0, 8));
}



// ✅ 1. generateAiFollowUp
export const generateAiFollowUp = onRequest(
  {
    secrets: ['OPENAI_KEY'],
  },
  async (req, res) => {
    // Handle CORS for Vercel frontend
    res.set('Access-Control-Allow-Origin', 'https://realtor-ai-mu.vercel.app');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    try {
      // 🔧 UPDATED: Use Firebase Functions v2 secrets instead of deprecated config()
      const openaiApiKey = (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '').trim();

      console.log("🔐 OPENAI_KEY partial (cleaned):", JSON.stringify(openaiApiKey?.slice(0, 10)));

      if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
        throw new Error('❌ OPENAI_KEY is missing or malformed. Make sure it is set using: firebase functions:secrets:set OPENAI_KEY');
      }

      if (openaiApiKey.startsWith('Bearer ')) {
        throw new Error('❌ OPENAI_KEY should not include "Bearer " prefix — please update the secret');
      }

      const {
        prompt,
        transcript,
        clientName,
        sessionId,
        tags = [],
        propertyContext = null,
        followUpTone,
        speakerSeparation,
        sentimentAnalysis,
        keywordExtraction,
        generatePersona,
        generateVoiceSummary,
      } = req.body;

      if (!prompt && !transcript) throw new Error('Either prompt or transcript is required');
      const safeClientName = clientName || 'Client';

      const finalPrompt = prompt || `
Generate a ${followUpTone || 'professional'} real estate follow-up for ${safeClientName} based on the following transcript:

"${transcript}"

Consider the following context:
${speakerSeparation ? '- The transcript has speaker separation.\n' : ''}
${sentimentAnalysis ? '- Perform sentiment analysis on the client’s statements.\n' : ''}
${keywordExtraction ? '- Identify key themes or keywords.\n' : ''}
${generatePersona ? '- Optionally generate insights into the client’s persona.\n' : ''}
${generateVoiceSummary ? '- Prepare a short spoken version of the follow-up.\n' : ''}

Respond ONLY with valid JSON in the following format:
{
  "preferences": "string",
  "objections": ["string"],
  "sms": "string",
  "email": "string",
  "urgencyLevel": "low | medium | high",
  "keyTopics": ["string"],
  "recommendedActions": ["string"],
  "tone": "friendly | professional | action-oriented | direct"
}
`.trim();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional real estate assistant generating personalized follow-ups. Return valid JSON with preferences, objections, sms, email, urgencyLevel, keyTopics, recommendedActions, tone.',
            },
            {
              role: 'user',
              content: finalPrompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
  const errorText = await response.text(); // 🔍 Log body
  console.error("❌ OpenAI response error:", response.status, errorText);
  throw new Error(`OpenAI API error: ${response.status}`);
}
      const result = await response.json() as any;
      const aiContent = result.choices[0]?.message?.content;
      console.log("🔎 Raw AI content:", aiContent);

      let parsed;
      try {
        parsed = JSON.parse(aiContent);
      } catch {
        parsed = {
          preferences: aiContent || 'General interest',
          objections: ['See follow-up'],
          sms: `Hi ${clientName}! Thanks for visiting today. Any questions?`,
          email: aiContent || `Hi ${clientName}, thank you for attending. Let me know if you need anything!`,
          urgencyLevel: 'medium',
          keyTopics: tags || ['real estate'],
          recommendedActions: ['Send email follow-up'],
          tone: 'professional',
        };
      }

      res.status(200).json({
        success: true,
        data: parsed,
        metadata: {
          timestamp: new Date().toISOString(),
          clientName,
          transcript: transcript || null,
          sessionId: sessionId || null,
          propertyContext: propertyContext || null,
        },
      });
    } catch (error) {
      console.error("❌ Error generating follow-up:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate follow-up',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ✅ 2. generateBuyerPersona
export const generateBuyerPersona = onRequest(
  {
    secrets: ['OPENAI_KEY'],
  },
  async (req, res) => {
    // Handle CORS for Vercel frontend
    res.set('Access-Control-Allow-Origin', 'https://realtor-ai-mu.vercel.app');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    try {
      // 🔧 UPDATED: Use Firebase Functions v2 secrets instead of deprecated config()
      const openaiApiKey = (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '').trim();

      console.log("🔐 OPENAI_KEY partial (cleaned):", JSON.stringify(openaiApiKey?.slice(0, 10)));

      if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
        throw new Error('❌ OPENAI_KEY is missing or malformed. Make sure it is set using: firebase functions:secrets:set OPENAI_KEY');
      }

      if (openaiApiKey.startsWith('Bearer ')) {
        throw new Error('❌ OPENAI_KEY should not include "Bearer " prefix — please update the secret');
      }

      const { prompt, transcript, clientName, sessionId } = req.body;
      if (!transcript && !prompt) throw new Error('Transcript or prompt required');

      const personaPrompt = prompt || `Analyze this conversation to create a buyer persona for ${clientName}: ${transcript}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a real estate assistant generating buyer personas. Return valid JSON only.',
            },
            {
              role: 'user',
              content: personaPrompt,
            },
          ],
          max_tokens: 800,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
  const errorText = await response.text(); // 🔍 Log body
  console.error("❌ OpenAI response error:", response.status, errorText);
  throw new Error(`OpenAI API error: ${response.status}`);
}
      const result = await response.json() as any;
      const aiContent = result.choices[0]?.message?.content;

      let persona;
      try {
        persona = JSON.parse(aiContent);
      } catch {
        persona = {
          clientName: clientName || '',
          buyerType: 'General',
          keyMotivations: ['Information gathering'],
          decisionTimeline: 'Undecided',
          budgetRange: { min: 0, max: 0, flexibility: 'Flexible' },
          locationPreferences: [],
          propertyFeaturePriorities: [],
          emotionalProfile: 'Unknown',
          communicationPreference: 'Mixed',
          concerns: ['None specified'],
          positiveSignals: [],
          recommendedStrategy: 'Send more listings',
          confidenceScore: 0.5,
        };
      }

      res.status(200).json({
        success: true,
        data: persona,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId,
        },
      });
    } catch (error) {
      console.error("❌ Error generating buyer persona:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate buyer persona',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ✅ 3. importPropertyFromText
export const importPropertyFromText = onRequest(
  {
    secrets: ['OPENAI_KEY'],
    region: 'us-central1',
    timeoutSeconds: 60,
  },
  async (req, res) => {
        // Wrap the entire function in CORS handler
    return corsHandler(req, res, async () => {
      try {
        console.log("🔁 Function started");
        console.log("🌐 Request method: " + req.method);
        console.log("🧠 Headers: " + JSON.stringify(req.headers));
        console.log("🌍 Origin: " + req.headers.origin);
        
        // Health check endpoint for Cloud Run - only intercept actual health checks
        if (req.method === 'GET' && req.path === '/') {
          console.log('🏥 Cloud Run health check request received');
          res.status(200).send("OK");
          return;
        }
        
        // Handle OPTIONS preflight requests
        if (req.method === 'OPTIONS') {
          console.log('✅ CORS preflight request handled');
          res.status(204).end();
          return;
        }

        console.log('🔧 Starting main function logic...');
        
        // 📥 Structured logging of incoming request body
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
        console.log('📥 Request body type:', typeof req.body);
        console.log('📥 Request body keys:', req.body ? Object.keys(req.body) : 'undefined');
        
        // Validate text field exists in request body
        const { text, content, userId } = req.body || {};
        
        // Check if req.body is missing or text is empty/undefined
        if (!req.body || (!text && !content)) {
          console.error('❌ No content available for processing');
          console.error('❌ req.body:', req.body);
          console.error('❌ text field:', text);
          console.error('❌ content field:', content);
          res.status(400).json({
            error: "No content available for processing"
          });
          return;
        }
        
        // Additional validation for empty strings
        if ((text === '' || text === undefined) && (content === '' || content === undefined)) {
          console.error('❌ Empty content provided');
          console.error('❌ text field:', text);
          console.error('❌ content field:', content);
          res.status(400).json({
            error: "No content available for processing"
          });
          return;
        }
        
        // Use text field if available, fallback to content for backward compatibility
        const inputText = text || content;
        console.log('📝 Input text length:', inputText?.length);
        
        // Check if this is a Realtor.ca URL - use Cloud Run scraper
        if (/^https?:\/\/www\.realtor\.ca\//i.test(inputText)) {
          console.log('🏠 Detected Realtor.ca URL, using Cloud Run scraper...');
          
          try {
            const SCRAPER_URL = process.env.SCRAPER_URL || "https://realtor-scraper-72019299027.us-central1.run.app";
            
            const resp = await fetch(`${SCRAPER_URL}/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: inputText, userId }),
            });
            
            const ct = resp.headers.get("content-type") || "";
            const bodyText = await resp.text();
            
            if (!resp.ok) {
              console.error('❌ Cloud Run scraper failed:', { status: resp.status, body: bodyText.slice(0, 500) });
              throw new Error(`Scraper ${resp.status}: ${bodyText.slice(0, 500)}`);
            }
            
            if (!ct.includes("application/json")) {
              console.error('❌ Non-JSON response from scraper:', { contentType: ct, body: bodyText.slice(0, 500) });
              throw new Error(`Non-JSON: ${bodyText.slice(0, 500)}`);
            }
            
            const data = JSON.parse(bodyText) as any;
            
            console.log('✅ Cloud Run scraper success:', { success: data.success, partial: data.partial, source: data.source });
            
            // normalize to PropertyData interface
            const toInt = (n: any) => Number.isFinite(Number(n)) ? Number(n) : 0;
            
            // Parse address components if missing from scraper response
            let addressLine1 = data.addressLine1 || "";
            let city = data.city || "";
            let state = data.state || "";
            let postalCode = data.postalCode || "";
            
            // If address components are missing, parse from full address
            if (!addressLine1 || !city || !state || !postalCode) {
              const parseAddressParts = (addr: string) => {
                const normalizePostal = (pc: string) => {
                  return (pc || "").toUpperCase().replace(/\s+/g, "").replace(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/, "$1 $2");
                };
                
                const fixJoinedStreetCity = (addr: string) => {
                  return addr.replace(/([a-z])([A-Z][a-z]+)/, "$1, $2");
                };
                
                const a = fixJoinedStreetCity((addr || "").replace(/\s+/g, " ").trim());
                let m = a.match(/^(.*?),\s*([^,]+?),\s*([A-Z]{2})\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)$/i); // CA
                if (m) return { addressLine1: m[1].trim(), city: m[2].trim(), state: m[3].toUpperCase(), postalCode: normalizePostal(m[4]) };
                m = a.match(/^(.*?),\s*([^,]+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/); // US
                if (m) return { addressLine1: m[1].trim(), city: m[2].trim(), state: m[3].toUpperCase(), postalCode: m[4] };
                const parts = a.split(",").map(s => s.trim());
                return { addressLine1: parts[0] || "", city: parts[1] || "", state: (parts[2] || "").split(" ")[0].toUpperCase(), postalCode: normalizePostal((parts[2] || "").split(" ").slice(1).join(" ")) };
              };
              
              const parsedAddress = parseAddressParts(data.address || "");
              addressLine1 = addressLine1 || parsedAddress.addressLine1;
              city = city || parsedAddress.city;
              state = state || parsedAddress.state;
              postalCode = postalCode || parsedAddress.postalCode;
            }
            
            const property = {
              address: data.address || [addressLine1, city, state, postalCode].filter(Boolean).join(", "),
              addressLine1,
              city,
              state,
              postalCode,
              propertyType: data.propertyType || "Single Family",
              status: "Active",
              price: toInt(data.price),
              squareFeet: toInt(data.squareFeet),
              bedrooms: toInt(data.bedrooms),
              bathrooms: toInt(data.bathrooms),
              lotSizeSqFt: toInt(data.lotSizeSqFt),
              yearBuilt: data.yearBuilt ? toInt(data.yearBuilt) : undefined,
              parking: data.parking || "",
              mlsNumber: data.mlsNumber || "",
              features: data.features || {},
              customFeatures: data.customFeatures || "",
              images: Array.isArray(data.images) ? data.images : [],
              description: data.description || "",
            };
            
            console.log('🏗️ Mapped property data:', {
              address: property.address,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              source: data.source,
              partial: data.partial
            });
            
            // Check if we still have missing critical fields after parsing
            const missingFields = [];
            if (!property.address && !(property.addressLine1 && property.city && property.state)) {
              missingFields.push('address');
            }
            if (!property.price) missingFields.push('price');
            if (!property.bedrooms) missingFields.push('bedrooms');
            if (!property.bathrooms) missingFields.push('bathrooms');
            if (!property.description) missingFields.push('description');
            
            const isPartial = data.partial || missingFields.length > 0;
            
            // Treat non-fatal partial:true as success; map whatever fields exist
            // Do not fail the import for partial; return warnings to client
            return res.status(200).json({ 
              success: true, // Always success, even with partial data
              partial: isPartial,
              importWarnings: missingFields.length > 0 ? missingFields : undefined,
              data: property,
              metadata: {
                timestamp: new Date().toISOString(),
                userId,
                source: 'cloud-run-scraper',
                scraperSource: data.source,
                url: inputText,
                extractionMethod: 'puppeteer',
                missing: data.missing || []
              }
            });
            
          } catch (cloudRunError) {
            console.error('❌ Cloud Run scraper error:', cloudRunError);
            // Fall through to text-based processing as fallback
            console.log('🔄 Falling back to text-based processing...');
          }
        }
        
        // 🔧 UPDATED: Use Firebase Functions v2 secrets instead of deprecated config()
        const openaiApiKey = (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '').trim();
        console.log("🔐 OPENAI_KEY partial (cleaned):", JSON.stringify(openaiApiKey?.slice(0, 10)));

        if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
          console.error('❌ OPENAI_KEY validation failed');
          res.status(400).json({
            success: false,
            error: 'Configuration error',
            message: 'OpenAI API key is missing or malformed. Please contact support.',
          });
          return;
        }
      
              // Validate required fields
        if (!inputText || typeof inputText !== 'string') {
          console.error('❌ Invalid text input provided:', { inputText, type: typeof inputText });
          res.status(400).json({
            success: false,
            error: 'Invalid input',
            message: 'Text input must be a non-empty string',
          });
          return;
        }

        if (!userId || typeof userId !== 'string') {
          console.error('❌ Invalid userId provided:', { userId, type: typeof userId });
          res.status(400).json({
            success: false,
            error: 'Invalid input',
            message: 'Valid userId is required',
          });
          return;
        }

        console.log('🏠 Property import request:', { 
          textLength: inputText.length, 
          userId,
          isUrl: inputText.startsWith('http')
        });

        let processedContent = inputText;

        // Check if content is a URL (specifically Realtor.ca)
        if (inputText.startsWith('https://www.realtor.ca/')) {
          console.log('🏠 Detected Realtor.ca URL, fetching and parsing property data...');
          
          try {
            console.log('🌐 Starting URL fetch:', inputText);
            const response = await fetch(inputText, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            console.log('🌐 URL fetch response status:', response.status, response.statusText);
            
            if (!response.ok) {
              console.error('❌ URL fetch failed:', response.status, response.statusText);
              res.status(400).json({
                error: "Failed to fetch property listing. Please check the URL and try again."
              });
              return;
            }
            
            const rawHtml = await response.text();
            console.log('✅ HTML fetched successfully, length:', rawHtml.length);
            
            // Extract meaningful text content from HTML using cheerio
            console.log('🧹 Starting HTML parsing with cheerio...');
            const $ = cheerio.load(rawHtml);
            
            // 🏠 Extract property fields using structured data (ld+json) first, then fallback to manual parsing
            console.log('🔍 Starting structured data extraction for Realtor.ca...');
            
            let address = '';
            let price = 0;
            let propertyType = 'Single Family';
            let status = 'Active';
            let squareFeet = 0;
            let bedrooms = 0;
            let bathrooms = 0;
            let lotSizeSqFt = 0;
            let yearBuilt: number | null = null;
            let parking = '';
            let mlsNumber = '';
            let description = '';
            let images: string[] = [];
            let featuresText = '';
            
            // Try to extract structured data from ld+json first
            try {
              const rawJson = $('script[type="application/ld+json"]').first().html();
              if (rawJson) {
                console.log('📄 Found ld+json structured data, parsing...');
                const listingData = JSON.parse(rawJson);
                console.log('🔍 Parsed listingData structure:', Object.keys(listingData));
                console.log('📊 Full listingData (truncated):', JSON.stringify(listingData, null, 2).substring(0, 1000) + '...');
                
                // Extract address from structured data
                if (listingData.address) {
                  const streetAddress = listingData.address.streetAddress || '';
                  const addressLocality = listingData.address.addressLocality || '';
                  address = `${streetAddress} ${addressLocality}`.trim();
                  console.log('📍 Extracted address from ld+json:', address);
                }
                
                // Extract property type
                if (listingData['@type']) {
                  propertyType = listingData['@type'].replace('Product', '').replace('RealEstateListing', '').trim() || 'Single Family';
                  console.log('🏘️ Extracted property type from ld+json:', propertyType);
                }
                
                // Extract price
                if (listingData.offers && listingData.offers.price) {
                  price = parseInt(listingData.offers.price.toString().replace(/[^0-9]/g, ''));
                  console.log('💰 Extracted price from ld+json:', listingData.offers.price, '→ Parsed:', price);
                } else if (listingData.price) {
                  price = parseInt(listingData.price.toString().replace(/[^0-9]/g, ''));
                  console.log('💰 Extracted price from ld+json:', listingData.price, '→ Parsed:', price);
                }
                
                // Extract bedrooms
                if (listingData.numberOfRooms) {
                  bedrooms = parseInt(listingData.numberOfRooms.toString());
                  console.log('🛏️ Extracted bedrooms from ld+json:', bedrooms);
                }
                
                // Extract bathrooms
                if (listingData.numberOfBathroomsTotal) {
                  bathrooms = parseInt(listingData.numberOfBathroomsTotal.toString());
                  console.log('🚿 Extracted bathrooms from ld+json:', bathrooms);
                } else if (listingData.numberOfBathrooms) {
                  bathrooms = parseInt(listingData.numberOfBathrooms.toString());
                  console.log('🚿 Extracted bathrooms from ld+json:', bathrooms);
                }
                
                // Extract description
                if (listingData.description) {
                  description = listingData.description;
                  console.log('📝 Extracted description from ld+json, length:', description.length);
                }
                
                // Extract images
                if (listingData.image) {
                  if (Array.isArray(listingData.image)) {
                    images = listingData.image.filter((img: string) => img && img.startsWith('http'));
                  } else if (typeof listingData.image === 'string') {
                    images = [listingData.image];
                  }
                  console.log('🖼️ Extracted images from ld+json, count:', images.length);
                }
                
                // Extract MLS number
                if (listingData.mlsId) {
                  mlsNumber = listingData.mlsId.toString();
                  console.log('🏷️ Extracted MLS number from ld+json:', mlsNumber);
                } else {
                  // Fallback: extract from URL
                  const urlParts = inputText.split('/');
                  const lastPart = urlParts[urlParts.length - 1];
                  if (lastPart && lastPart.match(/^\d+$/)) {
                    mlsNumber = lastPart;
                    console.log('🏷️ Extracted MLS number from URL:', mlsNumber);
                  }
                }
                
                // Extract square footage
                if (listingData.floorSize) {
                  squareFeet = parseInt(listingData.floorSize.toString().replace(/[^0-9]/g, ''));
                  console.log('📏 Extracted square feet from ld+json:', squareFeet);
                }
                
                // Extract lot size
                if (listingData.lotSize) {
                  lotSizeSqFt = parseInt(listingData.lotSize.toString().replace(/[^0-9]/g, ''));
                  console.log('🌳 Extracted lot size from ld+json:', lotSizeSqFt);
                }
                
                // Extract year built
                if (listingData.yearBuilt) {
                  yearBuilt = parseInt(listingData.yearBuilt.toString());
                  console.log('🏗️ Extracted year built from ld+json:', yearBuilt);
                }
                
                console.log('✅ Successfully extracted data from ld+json structured data');
              } else {
                console.log('⚠️ No ld+json structured data found, falling back to manual parsing');
              }
            } catch (ldJsonError) {
              console.error('❌ Error parsing ld+json structured data:', ldJsonError);
              console.log('🔄 Falling back to manual HTML parsing...');
            }
            
            // Fallback to manual HTML parsing for missing fields
            console.log('🔍 Starting manual HTML parsing for missing fields...');
            
            // Extract address if not found in ld+json
            if (!address) {
              address = $('h1, .title, .listing-title, .property-title, [class*="title"], .address-title, .street-address').first().text().trim();
              console.log('📍 Extracted address from HTML:', address);
            }
            
            // Extract price if not found in ld+json
            if (!price) {
              const priceText = $('.price, .listing-price, .property-price, [class*="price"], .amount, .price-amount, .listing-amount').first().text().trim();
              price = priceText ? parseInt(priceText.replace(/[^0-9]/g, '')) : 0;
              console.log('💰 Extracted price from HTML:', priceText, '→ Parsed:', price);
            }
            
            // Extract property type if not found in ld+json
            if (propertyType === 'Single Family') {
              const propertyTypeText = $('.property-type, .listing-type, [class*="type"], .category').first().text().trim();
              if (propertyTypeText) {
                propertyType = propertyTypeText;
                console.log('🏘️ Extracted property type from HTML:', propertyType);
              }
            }
            
            // Extract square footage if not found in ld+json
            if (!squareFeet) {
              const sqftText = $('.sqft, .square-feet, .area, [class*="sqft"], [class*="area"]').first().text().trim();
              squareFeet = sqftText ? parseInt(sqftText.replace(/[^0-9]/g, '')) : 0;
              console.log('📏 Extracted square feet from HTML:', sqftText, '→ Parsed:', squareFeet);
            }
            
            // Extract bedrooms if not found in ld+json
            if (!bedrooms) {
              const bedsText = $('.beds, .bedrooms, [class*="bed"]').first().text().trim();
              bedrooms = bedsText ? parseInt(bedsText.replace(/[^0-9]/g, '')) : 0;
              console.log('🛏️ Extracted bedrooms from HTML:', bedsText, '→ Parsed:', bedrooms);
            }
            
            // Extract bathrooms if not found in ld+json
            if (!bathrooms) {
              const bathsText = $('.baths, .bathrooms, [class*="bath"]').first().text().trim();
              bathrooms = bathsText ? parseInt(bathsText.replace(/[^0-9]/g, '')) : 0;
              console.log('🚿 Extracted bathrooms from HTML:', bathsText, '→ Parsed:', bathrooms);
            }
            
            // Extract lot size if not found in ld+json
            if (!lotSizeSqFt) {
              const lotSizeText = $('.lot-size, .lot-area, [class*="lot"]').first().text().trim();
              lotSizeSqFt = lotSizeText ? parseInt(lotSizeText.replace(/[^0-9]/g, '')) : 0;
              console.log('🌳 Extracted lot size from HTML:', lotSizeText, '→ Parsed:', lotSizeSqFt);
            }
            
            // Extract year built if not found in ld+json
            if (!yearBuilt) {
              const yearBuiltText = $('.year-built, .built-year, [class*="year"]').first().text().trim();
              yearBuilt = yearBuiltText ? parseInt(yearBuiltText.replace(/[^0-9]/g, '')) : null;
              console.log('🏗️ Extracted year built from HTML:', yearBuiltText, '→ Parsed:', yearBuilt);
            }
            
            // Extract parking
            if (!parking) {
              parking = $('.parking, .garage, [class*="parking"]').first().text().trim() || '';
              console.log('🚗 Extracted parking from HTML:', parking);
            }
            
            // Extract MLS number if not found in ld+json
            if (!mlsNumber) {
              mlsNumber = $('.mls, .mls-number, [class*="mls"]').first().text().trim() || '';
              console.log('🏷️ Extracted MLS number from HTML:', mlsNumber);
            }
            
            // Extract description if not found in ld+json
            if (!description) {
              description = $('.description, .listing-description, .property-description, [class*="description"], .summary, .property-summary').first().text().trim();
              console.log('📝 Extracted description from HTML, length:', description.length);
            }
            
            // Extract images if not found in ld+json
            if (images.length === 0) {
              $('img[src*="realtor"], .listing-image img, .property-image img, [class*="image"] img').each((_, img) => {
                const src = $(img).attr('src');
                if (src && src.startsWith('http')) {
                  images.push(src);
                }
              });
              console.log('🖼️ Extracted images from HTML, count:', images.length);
            }
            
            // Extract features and amenities
            featuresText = $('.features, .amenities, .property-features, [class*="feature"], .highlights, .property-highlights').text().trim();
            console.log('✨ Extracted features text:', featuresText.substring(0, 100) + '...');
            
            // Parse features into structured format
            const featureKeywords = [
              'Ensuite', 'Fireplace', 'Walk-in Closet', 'Hardwood Floors', 'Granite Countertops',
              'Stainless Steel Appliances', 'Central Air', 'Central Heat', 'Garage', 'Basement',
              'Deck', 'Patio', 'Pool', 'Garden', 'Balcony', 'Elevator', 'Doorman', 'Gym',
              'Pool', 'Spa', 'Tennis Court', 'Playground', 'Parking', 'Storage'
            ];
            
            const features: { [key: string]: boolean } = {};
            featureKeywords.forEach(keyword => {
              features[keyword] = featuresText.toLowerCase().includes(keyword.toLowerCase());
            });
            
            console.log('🔧 Parsed features:', features);
            
            // Extract custom features (features not in predefined list)
            const customFeaturesArray: string[] = [];
            const allFeatures = featuresText.split(/[,;]/).map(f => f.trim()).filter(f => f.length > 0);
            allFeatures.forEach(feature => {
              if (!featureKeywords.some(keyword => feature.toLowerCase().includes(keyword.toLowerCase()))) {
                customFeaturesArray.push(feature);
              }
            });
            const customFeatures = customFeaturesArray.join(', ');
            console.log('🎨 Extracted custom features:', customFeatures);
            
            // Validate required fields
            const requiredFields = { address, price, bedrooms, bathrooms, description };
            const missingFields = Object.entries(requiredFields)
              .filter(([key, value]) => !value || (typeof value === 'string' && value.trim() === '') || (typeof value === 'number' && value === 0))
              .map(([key]) => key);
            
            if (missingFields.length > 0) {
              console.error('❌ Missing required fields:', missingFields);
              res.status(400).json({
                error: "Unable to extract property information from the Realtor.ca listing. Missing required fields: " + missingFields.join(', ')
              });
              return;
            }
            
            // Construct the property object matching the manual form structure
            const propertyData = {
              address,
              propertyType,
              status,
              price,
              squareFeet,
              bedrooms,
              bathrooms,
              lotSizeSqFt,
              yearBuilt,
              parking,
              mlsNumber,
              features,
              customFeatures,
              images,
              description
            };
            
            console.log('✅ Successfully extracted property data:', {
              address: propertyData.address,
              price: propertyData.price,
              bedrooms: propertyData.bedrooms,
              bathrooms: propertyData.bathrooms,
              featuresCount: Object.keys(propertyData.features).filter(k => propertyData.features[k]).length,
              customFeatures: propertyData.customFeatures,
              imagesCount: propertyData.images.length
            });
            
            // Return the extracted property data directly
            res.status(200).json({
              success: true,
              message: "Property information extracted successfully from Realtor.ca listing.",
              data: propertyData,
              metadata: {
                timestamp: new Date().toISOString(),
                userId,
                source: 'realtor.ca',
                url: inputText,
                extractionMethod: 'ld+json with fallback'
              }
            });
            return;
            
          } catch (error) {
            console.error('❌ Error fetching Realtor.ca URL:', error);
            res.status(400).json({
              error: "Failed to access the Realtor.ca listing. Please check the URL and try again."
            });
            return;
          }
        } else if (inputText.startsWith('http://') || inputText.startsWith('https://')) {
          // Handle other URLs (non-Realtor.ca)
          console.log('🌐 Detected generic URL, fetching HTML content...');
          
          try {
            console.log('🌐 Starting URL fetch:', inputText);
            const response = await fetch(inputText, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            console.log('🌐 URL fetch response status:', response.status, response.statusText);
            
            if (!response.ok) {
              console.error('❌ URL fetch failed:', response.status, response.statusText);
              res.status(400).json({
                error: "Failed to fetch property listing. Please check the URL and try again."
              });
              return;
            }
            
            const rawHtml = await response.text();
            console.log('✅ HTML fetched successfully, length:', rawHtml.length);
            
            // Extract meaningful text content from HTML using cheerio
            console.log('🧹 Starting HTML parsing with cheerio...');
            const $ = cheerio.load(rawHtml);
            
            // Extract various content sections for generic URLs
            const extractedContent = [
              // Title and main heading
              $('h1, .title, .listing-title, .property-title').text().trim(),
              
              // Price information
              $('.price, .listing-price, .property-price, [class*="price"]').text().trim(),
              
              // Address and location
              $('.address, .location, .property-address, [class*="address"]').text().trim(),
              
              // Property details (bedrooms, bathrooms, etc.)
              $('.property-details, .listing-details, .details, [class*="details"]').text().trim(),
              
              // Description
              $('.description, .listing-description, .property-description, [class*="description"]').text().trim(),
              
              // Features and amenities
              $('.features, .amenities, .property-features, [class*="feature"]').text().trim(),
              
              // General content from main sections
              $('main, .main-content, .content, .listing-content').text().trim(),
              
              // Fallback: extract all text content if specific selectors don't work
              $('body').text().trim()
            ].filter(text => text.length > 0).join('\n\n');
            
            // Clean up the extracted content
            processedContent = extractedContent
              .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
              .replace(/\n\s*\n/g, '\n')  // Remove empty lines
              .trim();
            
            console.log('🧹 Extracted text content length:', processedContent.length);
            console.log('📄 Sample extracted content:', processedContent.substring(0, 500) + '...');
            
          } catch (error) {
            console.error('❌ Error fetching URL:', error);
            res.status(400).json({
              error: "Failed to access the property listing. Please check the URL and try again."
            });
            return;
          }
        } else {
          console.log('📝 Using provided text content directly');
        }

      // Validate processed content
      if (!processedContent || processedContent.trim().length === 0) {
        console.error('❌ No content to process');
        res.status(400).json({
          success: false,
          error: 'No content',
          message: 'No content available for processing',
        });
        return;
      }

      console.log('🤖 Starting OpenAI API call, content length:', processedContent.length);

      // Send to OpenAI for parsing
      console.log('🤖 Sending request to OpenAI...');
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `You are a real estate property formatter. ONLY respond with a JSON object with this exact structure:

{
  "address": "string",
  "city": "string", 
  "province": "string",
  "postalCode": "string",
  "price": number,
  "bedrooms": number,
  "bathrooms": number,
  "squareFootage": number,
  "listingDescription": "string",
  "features": ["string"],
  "imageUrls": ["string"]
}

Do not return markdown, explanation, or commentary — ONLY raw JSON. If a field is not found, use empty string for strings and 0 for numbers.`,
            },
            {
              role: 'user',
              content: processedContent,
            },
          ],
          max_tokens: 1000,
          temperature: 0,
        }),
      });

      console.log('🤖 OpenAI response status:', openaiResponse.status, openaiResponse.statusText);

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("❌ OpenAI API error:", openaiResponse.status, errorText);
        res.status(500).json({
          success: false,
          error: 'AI processing failed',
          message: `OpenAI API error: ${openaiResponse.status}`,
        });
        return;
      }

      console.log('🤖 Parsing OpenAI response...');
      const openaiResult = await openaiResponse.json() as any;
      const aiContent = openaiResult.choices?.[0]?.message?.content;

      if (!aiContent) {
        console.error('❌ No content in OpenAI response:', openaiResult);
        res.status(500).json({
          success: false,
          error: 'AI processing failed',
          message: 'No content received from AI service',
        });
        return;
      }

      console.log('🔍 Raw AI response:', aiContent);

      // Clean the AI response to remove markdown code blocks
      console.log('🧹 Cleaning AI response...');
      const cleanedContent = aiContent
        .replace(/^```json\s*/i, '')   // Remove opening ```json (case-insensitive)
        .replace(/^```\s*/i, '')       // Remove any standalone ```
        .replace(/\s*```$/i, '')       // Remove trailing ```
        .trim();

      console.log('🧹 Cleaned content:', cleanedContent);

      console.log('🔍 Starting JSON parsing...');
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedContent);
        console.log('✅ JSON parsed successfully:', parsedData);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Raw AI content that failed to parse:', aiContent);
        console.error('❌ Cleaned content that failed to parse:', cleanedContent);
        res.status(500).json({
          success: false,
          error: 'Failed to parse AI property data. Please try again.',
          message: 'Failed to parse property data from AI response. Please try again.',
        });
        return;
      }

      // Validate parsed data structure
      if (!parsedData || typeof parsedData !== 'object') {
        console.error('❌ Parsed data is not an object:', parsedData);
        res.status(500).json({
          success: false,
          error: 'Invalid data structure',
          message: 'AI returned invalid data structure',
        });
        return;
      }

      // Validate required fields and types
      console.log('🔍 Validating required fields...');
      const requiredFields = {
        address: 'string',
        city: 'string', 
        province: 'string',
        postalCode: 'string',
        price: 'number',
        bedrooms: 'number',
        bathrooms: 'number',
        squareFootage: 'number',
        listingDescription: 'string',
        features: 'array',
        imageUrls: 'array'
      };

      for (const [field, expectedType] of Object.entries(requiredFields)) {
        if (!(field in parsedData)) {
          console.error(`❌ Missing required field: ${field}`);
          res.status(500).json({
            success: false,
            error: 'Missing required property data',
            message: `Missing required field: ${field}`,
          });
          return;
        }

        const value = parsedData[field];
        if (expectedType === 'array' && !Array.isArray(value)) {
          console.error(`❌ Field ${field} is not an array:`, value);
          res.status(500).json({
            success: false,
            error: 'Invalid data types',
            message: `Field ${field} must be an array`,
          });
          return;
        }

        if (expectedType === 'number' && typeof value !== 'number') {
          console.error(`❌ Field ${field} is not a number:`, value);
          res.status(500).json({
            success: false,
            error: 'Invalid data types',
            message: `Field ${field} must be a number`,
          });
          return;
        }

        if (expectedType === 'string' && typeof value !== 'string') {
          console.error(`❌ Field ${field} is not a string:`, value);
          res.status(500).json({
            success: false,
            error: 'Invalid data types',
            message: `Field ${field} must be a string`,
          });
          return;
        }
      }

      // 🔧 PLACEHOLDER: Property parsing logic should occur here
      // const propertyData = parsePropertyText(processedContent);
      console.log('🔧 Property parsing placeholder - using mock data');
      
      // Create mock property data for now
      const propertyData = {
        address: parsedData.address,
        city: parsedData.city,
        province: parsedData.province,
        postalCode: parsedData.postalCode,
        price: parsedData.price,
        bedrooms: parsedData.bedrooms,
        bathrooms: parsedData.bathrooms,
        sqft: parsedData.squareFootage,
        description: parsedData.listingDescription,
        propertyFeatures: parsedData.features,
        images: parsedData.imageUrls,
        // Additional fields for PropertyForm compatibility
        propertyType: 'Single Family', // Default, user can change
        status: 'Active', // Default, user can change
        lotSize: null,
        yearBuilt: null,
        parking: '',
        mlsNumber: '',
      };

      console.log('✅ Property data processed successfully:', {
        address: propertyData.address,
        price: propertyData.price,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        featuresCount: propertyData.propertyFeatures.length,
        imagesCount: propertyData.images.length
      });

      // ✅ Success response
      console.log('📤 Sending success response...');
      res.status(200).json({
        success: true,
        message: "Import succeeded.",
        data: propertyData,
        metadata: {
          timestamp: new Date().toISOString(),
          userId,
          textLength: inputText.length,
          processedContentLength: processedContent.length,
        },
      });
      return;
      
    } catch (error) {
              console.error("❌ Error importing property:", error);
        res.status(500).json({
          success: false,
          message: 'An unexpected error occurred during property import.',
          timestamp: new Date().toISOString()
        });
        return;
      }
      });
      return;
  }
);


