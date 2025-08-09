import { onRequest } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as logger from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';
import { PubSub } from '@google-cloud/pubsub';

// Global type extension for cold start logging
declare global {
  var scraperUrlLogged: boolean | undefined;
}

// SCRAPER_URL will be defined inside the handler to avoid module-load issues

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

      const finalPrompt = prompt || `Generate a ${followUpTone || 'professional'} real estate follow-up for ${safeClientName} based on the following transcript:

"${transcript}"

Consider the following context:
${speakerSeparation ? '- The transcript has speaker separation.' : ''}
${sentimentAnalysis ? '- Perform sentiment analysis on the client statements.' : ''}
${keywordExtraction ? '- Identify key themes or keywords.' : ''}
${generatePersona ? '- Optionally generate insights into the client persona.' : ''}
${generateVoiceSummary ? '- Prepare a short spoken version of the follow-up.' : ''}

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
}`.trim();

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



// Helper functions for the worker are now inline in makeScraperRequestWithTimeout

export const importPropertyFromText = onRequest({ region: 'us-central1' }, async (req, res) => {
  // --- HARD CORS (TEMP) ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // TEMP: open wide so the browser cannot block
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Expose-Headers', 'X-Debug-Cors,X-Received-Origin');
  res.setHeader('X-Debug-Cors', '1');
  res.setHeader('X-Received-Origin', req.get('Origin') || '');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  // --- END HARD CORS ---

  try {
    // GET endpoint for job status
    if (req.method === 'GET') {
      const jobId = req.query.id as string;
      if (!jobId) {
        res.status(400).json({ error: 'Missing job ID' });
        return;
      }

      const docRef = admin.firestore().collection('imports').doc(jobId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const data = doc.data();
      res.status(200).json({
        jobId,
        status: data?.status,
        result: data?.result,
        error: data?.error,
        retryAfterSeconds: data?.retryAfterSeconds,
        createdAt: data?.createdAt,
        updatedAt: data?.updatedAt
      });
      return;
    }

    // POST endpoint for job creation
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    
    // CORS test probe
    if (req.query?.corsTest === '1' || body?.corsTest === true) {
      res.status(200).json({
        ok: true,
        msg: 'CORS ok',
        origin: req.get('Origin') || null,
        note: 'Temporary probe bypasses scraper',
      });
      return;
    }

    const { text, userId } = body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "text"' });
      return;
    }

    // Create import job document
    const docRef = admin.firestore().collection('imports').doc();
    const jobData = {
      url: text,
      userId: userId || null,
      status: 'queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.set(jobData);

    // Publish to Pub/Sub for background processing
    const pubsubMessage = {
      id: docRef.id,
      url: text,
      userId: userId || null
    };

    const pubsub = new PubSub();
    const topic = pubsub.topic('import-jobs');
    await topic.publishMessage({
      json: pubsubMessage
    });

    // Return job ID immediately (202 Accepted)
    res.status(202).json({
      jobId: docRef.id,
      status: 'queued'
    });
    return;

  } catch (err: any) {
    logger.error('importPropertyFromText failed', { error: err?.message, stack: err?.stack });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err?.message || 'Unknown error'
    });
    return;
  }
});

// Background worker to process import jobs
export const runImportWorker = onMessagePublished({ 
  topic: 'import-jobs',
  region: 'us-central1', 
  timeoutSeconds: 540, 
  memory: '512MiB' 
}, async (event) => {
  const messageData = event.data.message.json;
  const { id, url, userId } = messageData;

  logger.info('Processing import job', { id, url, userId });

  const docRef = admin.firestore().collection('imports').doc(id);
  
  try {
    // Update status to working
    await docRef.update({
      status: 'working',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get Cloud Run URL
    const SCRAPER_URL = defineString('SCRAPER_URL');
    const cloudRunUrl = SCRAPER_URL.value() || process.env.SCRAPER_URL;
    if (!cloudRunUrl) {
      throw new Error('SCRAPER_URL not configured');
    }

    // Call scraper with polling for 202 responses
    const payload = { text: url, userId };
    const { data, status } = await makeScraperRequestWithPolling(cloudRunUrl, payload, id);

    if (status === 200) {
      // Success
      await docRef.update({
        status: 'success',
        result: data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info('Import job completed successfully', { id });
    } else if (status === 429) {
      // Rate limited
      const retryAfterSeconds = data?.retryAfterSeconds || 60;
      await docRef.update({
        status: 'error',
        error: data?.message || 'Rate limited',
        retryAfterSeconds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.warn('Import job rate limited', { id, retryAfterSeconds });
    } else {
      // Other error
      const errorMessage = typeof data === 'object' && data && 'error' in data ? (data as any).error : 
                          typeof data === 'string' ? data : 
                          `Scraper returned ${status}`;
      
      await docRef.update({
        status: 'error',
        error: errorMessage,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.error('Import job failed', { id, status, error: errorMessage });
    }

  } catch (error: any) {
    logger.error('Import worker failed', { id, error: error?.message, stack: error?.stack });
    
    let errorMessage = error?.message || 'Unknown error';
    let retryAfterSeconds: number | undefined;
    
    if (error?.message === 'UPSTREAM_TIMEOUT') {
      errorMessage = 'Scraper took too long. Please try again.';
    }
    
    await docRef.update({
      status: 'error',
      error: errorMessage,
      retryAfterSeconds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
});

// Helper function for worker with longer timeout
async function makeScraperRequestWithTimeout(cloudRunUrl: string, payload: any, timeoutMs: number): Promise<{ data: any; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const upstream = await fetch(cloudRunUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const ct = upstream.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await upstream.json() : await upstream.text();

    return { data, status: upstream.status };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('UPSTREAM_TIMEOUT');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Helper function for worker that handles 202 polling
async function makeScraperRequestWithPolling(cloudRunUrl: string, payload: any, jobId: string): Promise<{ data: any; status: number }> {
  const maxPollingRetries = 30;
  const pollingIntervalMs = 2000; // 2 seconds
  
  logger.info('Making initial scraper request', { jobId, url: cloudRunUrl });
  
  // Make initial request
  let { data, status } = await makeScraperRequestWithTimeout(cloudRunUrl, payload, 120000);
  
  // Handle immediate success or error responses
  if (status !== 202) {
    logger.info('Scraper returned non-202 status immediately', { jobId, status });
    return { data, status };
  }
  
  // Handle 202 - scraper is processing asynchronously, need to poll
  logger.info('Scraper returned 202, starting polling', { jobId, maxRetries: maxPollingRetries });
  
  let pollAttempt = 0;
  while (pollAttempt < maxPollingRetries) {
    pollAttempt++;
    
    logger.info('Polling scraper for completion', { jobId, attempt: pollAttempt, maxRetries: maxPollingRetries });
    
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
    
    try {
      // Poll the scraper for completion
      const pollResult = await makeScraperRequestWithTimeout(cloudRunUrl, payload, 30000); // Shorter timeout for polls
      
      if (pollResult.status === 200) {
        logger.info('Scraper polling successful', { jobId, attempt: pollAttempt });
        return { data: pollResult.data, status: 200 };
      } else if (pollResult.status === 202) {
        logger.info('Scraper still processing', { jobId, attempt: pollAttempt });
        // Continue polling
      } else {
        // Non-200, non-202 response during polling
        logger.warn('Scraper polling returned error status', { jobId, attempt: pollAttempt, status: pollResult.status });
        return { data: pollResult.data, status: pollResult.status };
      }
    } catch (error: any) {
      logger.warn('Scraper polling attempt failed', { jobId, attempt: pollAttempt, error: error?.message });
      
      // If this is the last attempt, throw the error
      if (pollAttempt >= maxPollingRetries) {
        throw error;
      }
      // Otherwise continue to next poll attempt
    }
  }
  
  // If we reach here, polling timed out
  logger.error('Scraper polling timed out after all retries', { jobId, attempts: pollAttempt });
  return {
    data: { error: 'Scraper timed out after polling', message: 'The scraper is taking too long to complete. Please try again.' },
    status: 504
  };
}