import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

setGlobalOptions({ region: 'us-central1' });
admin.initializeApp();

console.log('🚀 Firebase Functions module loaded');
console.log('🔧 Node.js version:', process.version);
console.log('🔧 Environment:', process.env.NODE_ENV || 'production');

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
    try {
      console.log("🔁 Function started");
      console.log("🌐 Request method: " + req.method);
      console.log("🧠 Headers: " + JSON.stringify(req.headers));
      
      // Health check endpoint for Cloud Run
      if (req.path === '/health' || req.path === '/') {
        console.log('🏥 Health check request received');
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          function: 'importPropertyFromText'
        });
        return;
      }
      
      // Handle CORS for Vercel frontend
      res.set('Access-Control-Allow-Origin', 'https://realtor-ai-mu.vercel.app');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        console.log('✅ CORS preflight request handled');
        res.status(200).send('');
        return;
      }

      console.log('🔧 Starting main function logic...');
      
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

      const { content, userId } = req.body;
      console.log('📝 Request body received:', { contentLength: content?.length, userId });
      
      // Validate required fields
      if (!content || typeof content !== 'string') {
        console.error('❌ Invalid content provided:', { content, type: typeof content });
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          message: 'Content must be a non-empty string',
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
        contentLength: content.length, 
        userId,
        isUrl: content.startsWith('http')
      });

      let processedContent = content;

      // Check if content is a URL and fetch HTML
      if (content.startsWith('http://') || content.startsWith('https://')) {
        try {
          console.log('🌐 Starting URL fetch:', content);
          const response = await fetch(content, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          console.log('🌐 URL fetch response status:', response.status, response.statusText);
          
          if (!response.ok) {
            console.error('❌ URL fetch failed:', response.status, response.statusText);
            res.status(400).json({
              success: false,
              error: 'URL fetch failed',
              message: `Failed to fetch URL: ${response.status} ${response.statusText}`,
            });
            return;
          }
          
          const rawHtml = await response.text();
          console.log('✅ HTML fetched successfully, length:', rawHtml.length);
          
          // Extract meaningful text content from HTML using cheerio
          console.log('🧹 Starting HTML parsing with cheerio...');
          const $ = cheerio.load(rawHtml);
          
          // Extract various content sections
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
            success: false,
            error: 'URL fetch error',
            message: `Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          return;
        }
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

      // Create property data object with validated fields
      console.log('🔧 Creating property data object...');
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

      // Only send success response after all validations pass
      console.log('📤 Sending success response...');
      res.status(200).json({
        success: true,
        data: propertyData,
        metadata: {
          timestamp: new Date().toISOString(),
          userId,
          contentLength: content.length,
          processedContentLength: processedContent.length,
        },
      });
      
    } catch (error) {
      console.error("❌ Unexpected error in importPropertyFromText:", error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  }
);


