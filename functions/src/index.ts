import { onRequest } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as logger from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';
import { PubSub } from '@google-cloud/pubsub';
import crypto from 'crypto';

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

// Utility functions for idempotent job creation
function createStableId(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

// Module-level single-flight publish guard
const publishingKeys = new Set<string>();



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

    const queueAt = Date.now();
    logger.info('job.create.request', { userId, url: text, queueAt });

    // Compute stable job ID based on user + URL
    const jobKey = `${userId}:${text.trim().toLowerCase()}`;
    const jobId = createStableId(jobKey);
    const docRef = admin.firestore().collection('imports').doc(jobId);

    // One-active-job-per-user check (soft limit, 2 minutes)
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const activeJobsQuery = await admin.firestore()
      .collection('imports')
      .where('userId', '==', userId)
      .where('status', 'in', ['queued', 'working'])
      .where('queueAt', '>', twoMinutesAgo)
      .limit(5)
      .get();

    for (const activeJob of activeJobsQuery.docs) {
      const data = activeJob.data();
      if (data.url === text) {
        // Same URL, return existing job
        logger.info('job.create.idempotent_hit', { jobId: activeJob.id, userId, url: text });
        res.status(202).json({
          jobId: activeJob.id,
          status: data.status
        });
        return;
      } else {
        // Different URL, reject
        logger.warn('job.create.too_many_active', { userId, activeJobId: activeJob.id, activeUrl: data.url, newUrl: text });
        res.status(429).json({
          error: 'TOO_MANY_ACTIVE_JOBS',
          message: 'Finish current import before starting another.'
        });
        return;
      }
    }

    // Idempotent job creation with transaction
    const result = await admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      
      if (doc.exists) {
        const data = doc.data()!;
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        
        // If job is active, don't republish
        if (['queued', 'working'].includes(data.status)) {
          logger.info('job.create.idempotent_hit', { jobId, userId, url: text, status: data.status });
          return { jobId, status: data.status, shouldPublish: false };
        }
        
        // If job completed recently, don't republish
        if (['success', 'error'].includes(data.status) && data.updatedAt && data.updatedAt.toMillis() > tenMinutesAgo) {
          logger.info('job.create.idempotent_hit', { jobId, userId, url: text, status: data.status });
          return { jobId, status: data.status, shouldPublish: false };
        }
      }
      
      // Create/overwrite job
      const jobData = {
        url: text,
        userId: userId || null,
        status: 'queued',
        queueAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      transaction.set(docRef, jobData);
      logger.info('job.create.new', { jobId, userId, url: text });
      return { jobId, status: 'queued', shouldPublish: true };
    });

    // Single-flight publish guard
    if (result.shouldPublish) {
      if (publishingKeys.has(jobKey)) {
        logger.info('job.publish.skip_inflight', { jobId, jobKey });
      } else {
        publishingKeys.add(jobKey);
        try {
          const pubsubMessage = {
            id: jobId,
            url: text,
            userId: userId || null
          };

          const pubsub = new PubSub();
          const topic = pubsub.topic('import-jobs');
          await topic.publishMessage({
            json: pubsubMessage
          });
          logger.info('job.publish.ok', { jobId });
        } finally {
          publishingKeys.delete(jobKey);
        }
      }
    }

    // Return job ID immediately (202 Accepted)
    res.status(202).json({
      jobId: result.jobId,
      status: result.status
    });
    return;

  } catch (err: any) {
    const { text, userId } = req.body || {};
    logger.error('job.create.error', { userId, url: text, err: err?.message });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err?.message || 'Unknown error'
    });
    return;
  }
});

// Dedicated fast status endpoint for job polling
export const importJobStatus = onRequest({ 
  region: 'us-central1', 
  timeoutSeconds: 15, 
  memory: '256MiB' 
}, async (req, res) => {
  // --- HARD CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Debug-Cors', '1');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  // --- END HARD CORS ---

  try {
    // Only GET allowed
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Validate id query param
    const jobId = req.query.id as string;
    if (!jobId) {
      res.status(400).json({ error: 'Missing job ID' });
      return;
    }

    // Fetch job status from Firestore
    const docRef = admin.firestore().collection('imports').doc(jobId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const data = doc.data();
    logger.info('job.status.get', { id: jobId, status: data?.status || 'missing' });
    
    res.status(200).json({
      status: data?.status,
      result: data?.result,
      error: data?.error,
      retryAfterSeconds: data?.retryAfterSeconds
    });
    return;

  } catch (err: any) {
    logger.error('importJobStatus failed', { error: err?.message });
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

  const startAt = Date.now();
  
  const docRef = admin.firestore().collection('imports').doc(id);
  
  try {
    // Get Cloud Run URL
    const SCRAPER_URL = defineString('SCRAPER_URL');
    const cloudRunUrl = SCRAPER_URL.value() || process.env.SCRAPER_URL;
    if (!cloudRunUrl) {
      throw new Error('SCRAPER_URL not configured');
    }

    // Guardrail: Check if SCRAPER_URL is misconfigured
    if (/cloudfunctions\.net/.test(cloudRunUrl)) {
      const errMsg = 'SCRAPER_URL misconfigured (cloudfunctions.net). Must be Cloud Run (a.run.app).';
      logger.error('worker.config.invalid_scraper_url', { id, cloudRunUrl });
      await docRef.set({
        status: 'error',
        error: errMsg,
        endAt: Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return;
    }

    logger.info('worker.pickup', { id, url, userId, hasScraperUrl: !!cloudRunUrl, startAt });

    // Update status to working
    await docRef.set({
      status: 'working',
      startAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Call scraper with polling for 202 responses
    const payload = { text: url, userId };
    const { data, status } = await makeScraperRequestWithPolling(cloudRunUrl, payload, id);

    if (status === 200) {
      // Success
      const endAt = Date.now();
      logger.info('worker.done.success', { id, totalMs: endAt - startAt });
      await docRef.set({
        status: 'success',
        result: data,
        endAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else if (status === 429) {
      // Rate limited
      const retryAfterSeconds = data?.retryAfterSeconds || 60;
      const endAt = Date.now();
      logger.warn('worker.done.rate_limited', { id, totalMs: endAt - startAt, retryAfterSeconds });
      await docRef.set({
        status: 'error',
        error: data?.message || 'Rate limited',
        retryAfterSeconds,
        endAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      // Other error
      const errorMessage = typeof data === 'object' && data && 'error' in data ? (data as any).error : 
                          typeof data === 'string' ? data : 
                          `Scraper returned ${status}`;
      
      const endAt = Date.now();
      logger.error('worker.done.error', { id, totalMs: endAt - startAt, error: errorMessage, status });
      await docRef.set({
        status: 'error',
        error: errorMessage,
        endAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

  } catch (error: any) {
    const endAt = Date.now();
    let errorMessage = error?.message || 'Unknown error';
    let retryAfterSeconds: number | undefined;
    
    if (error?.message === 'UPSTREAM_TIMEOUT') {
      errorMessage = 'Scraper took too long. Please try again.';
    }
    
    logger.error('worker.done.error', { id, totalMs: endAt - startAt, error: errorMessage, status: null });
    
    await docRef.set({
      status: 'error',
      error: errorMessage,
      retryAfterSeconds,
      endAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
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
  let attempt = 0;
  const t0 = Date.now();
  
  logger.info('worker.upstream.request', { id: jobId, target: cloudRunUrl });
  
  // Make initial request
  let { data, status } = await makeScraperRequestWithTimeout(cloudRunUrl, payload, 120000);
  const dt = Date.now() - t0;
  logger.info('worker.upstream.response', { id: jobId, attempt, status, ms: dt });
  
  // Handle immediate success or error responses
  if (status !== 202) {
    return { data, status };
  }
  
  // Handle 202 - scraper is processing asynchronously, need to poll
  logger.info('worker.upstream.poll.wait', { id: jobId, attempt, waitMs: pollingIntervalMs });
  
  let pollAttempt = 0;
  while (pollAttempt < maxPollingRetries) {
    pollAttempt++;
    attempt = pollAttempt; // Update global attempt counter
    
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
    
    try {
      // Poll the scraper for completion
      const pollT0 = Date.now();
      const pollResult = await makeScraperRequestWithTimeout(cloudRunUrl, payload, 30000); // Shorter timeout for polls
      const pollDt = Date.now() - pollT0;
      
      logger.info('worker.upstream.response', { id: jobId, attempt, status: pollResult.status, ms: pollDt });
      
      if (pollResult.status === 200) {
        return { data: pollResult.data, status: 200 };
      } else if (pollResult.status === 202) {
        logger.info('worker.upstream.poll.wait', { id: jobId, attempt, waitMs: pollingIntervalMs });
        // Continue polling
      } else if (pollResult.status === 429) {
        // Extract retry-after for 429s during polling
        const retryAfterSeconds = pollResult.data?.retryAfterSeconds || 60;
        logger.warn('worker.upstream.rate_limited', { id: jobId, attempt, retryAfter: retryAfterSeconds });
        return { data: pollResult.data, status: pollResult.status };
      } else {
        // Non-200, non-202, non-429 response during polling
        return { data: pollResult.data, status: pollResult.status };
      }
    } catch (error: any) {
      if (error?.message === 'UPSTREAM_TIMEOUT') {
        logger.error('worker.upstream.timeout', { id: jobId, attempt });
      }
      
      // If this is the last attempt, throw the error
      if (pollAttempt >= maxPollingRetries) {
        throw error;
      }
      // Otherwise continue to next poll attempt
    }
  }
  
  // If we reach here, polling timed out
  logger.error('worker.upstream.timeout', { id: jobId, attempt: pollAttempt });
  return {
    data: { error: 'Scraper timed out after polling', message: 'The scraper is taking too long to complete. Please try again.' },
    status: 504
  };
}