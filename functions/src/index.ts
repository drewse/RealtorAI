import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

setGlobalOptions({ region: 'us-central1' });
admin.initializeApp();

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
      const result = await response.json();
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
      const result = await response.json();
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
        console.error('❌ OPENAI_KEY validation failed');
        res.status(400).json({
          success: false,
          error: 'Configuration error',
          message: 'OpenAI API key is missing or malformed. Please contact support.',
        });
        return;
      }

      const { content, userId } = req.body;
      
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
          console.log('🌐 Fetching HTML from URL:', content);
          const response = await fetch(content, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000 // 10 second timeout
          });
          
          if (!response.ok) {
            console.error('❌ URL fetch failed:', response.status, response.statusText);
            res.status(400).json({
              success: false,
              error: 'URL fetch failed',
              message: `Failed to fetch URL: ${response.status} ${response.statusText}`,
            });
            return;
          }
          
          processedContent = await response.text();
          console.log('✅ HTML fetched successfully, length:', processedContent.length);
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

      console.log('🤖 Sending to OpenAI for parsing, content length:', processedContent.length);

      // Send to OpenAI for parsing
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
              content: `You are a real estate listing parser. Given raw HTML or a listing description, extract the following fields and respond with valid JSON only:

{
  "address": "full address string",
  "city": "city name",
  "province": "province/state name", 
  "postalCode": "postal/zip code",
  "price": number,
  "bedrooms": number,
  "bathrooms": number,
  "squareFootage": number,
  "listingDescription": "property description text",
  "features": ["array", "of", "feature", "tags"],
  "imageUrls": ["array", "of", "image", "urls"]
}

If a field is not found, use null for strings and 0 for numbers. Ensure the response is valid JSON.`,
            },
            {
              role: 'user',
              content: processedContent,
            },
          ],
          max_tokens: 1000,
          temperature: 0.1,
        }),
      });

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

      const openaiResult = await openaiResponse.json();
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

      let parsedData;
      try {
        parsedData = JSON.parse(aiContent);
        console.log('✅ JSON parsed successfully:', parsedData);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Raw AI content that failed to parse:', aiContent);
        res.status(500).json({
          success: false,
          error: 'Data parsing failed',
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

      // Provide fallback values for missing fields with validation
      const propertyData = {
        address: parsedData.address || 'Address not found',
        city: parsedData.city || '',
        province: parsedData.province || parsedData.state || '',
        postalCode: parsedData.postalCode || '',
        price: typeof parsedData.price === 'number' ? parsedData.price : 0,
        bedrooms: typeof parsedData.bedrooms === 'number' ? parsedData.bedrooms : 0,
        bathrooms: typeof parsedData.bathrooms === 'number' ? parsedData.bathrooms : 0,
        sqft: typeof parsedData.squareFootage === 'number' ? parsedData.squareFootage : 0,
        description: parsedData.listingDescription || '',
        propertyFeatures: Array.isArray(parsedData.features) ? parsedData.features : [],
        images: Array.isArray(parsedData.imageUrls) ? parsedData.imageUrls : [],
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
      });
    }
  }
);


