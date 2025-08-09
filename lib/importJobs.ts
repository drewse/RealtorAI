import { getImportEndpoint } from './importEndpoint';

export interface ImportJobResult {
  status: 'success' | 'error';
  result?: any;
  error?: string;
  retryAfterSeconds?: number;
}

export interface ImportJobStatus {
  jobId: string;
  status: 'queued' | 'working' | 'success' | 'error';
  result?: any;
  error?: string;
  retryAfterSeconds?: number;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Create an import job for the given URL
 */
export async function createImportJob(url: string, userId: string): Promise<{ jobId: string }> {
  console.info('Creating import job...', { url, userId });
  
  const endpoint = getImportEndpoint();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: url, userId }),
  });

  console.info('Job creation response:', response.status);

  if (response.status === 202) {
    const data = await response.json();
    console.info('Job created:', data.jobId);
    return { jobId: data.jobId };
  }

  // Handle non-202 responses as errors
  let errorMessage = `HTTP ${response.status}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData?.error || errorData?.message || errorMessage;
  } catch {
    try {
      errorMessage = await response.text() || errorMessage;
    } catch {
      // Use default HTTP status message
    }
  }

  throw new Error(errorMessage);
}

/**
 * Poll an import job until completion or timeout
 */
export async function pollImportJob(
  jobId: string, 
  onTick: (status: ImportJobStatus) => void,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<ImportJobResult> {
  const { intervalMs = 2000, timeoutMs = 120000 } = opts; // 2s interval, 2min timeout
  const endpoint = getImportEndpoint();
  const startTime = Date.now();

  console.info('Starting job polling...', { jobId, intervalMs, timeoutMs });

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          console.warn('Job polling timeout exceeded');
          reject(new Error('Import job timed out. Please try again.'));
          return;
        }

        // Fetch job status
        const response = await fetch(`${endpoint}?id=${jobId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData?.error || errorData?.message || errorMessage;
          } catch {
            try {
              errorMessage = await response.text() || errorMessage;
            } catch {
              // Use default
            }
          }
          throw new Error(errorMessage);
        }

        const status: ImportJobStatus = await response.json();
        console.info('Status tick:', status.status, { jobId });

        // Notify caller of status update
        onTick(status);

        // Check if job is complete
        if (status.status === 'success') {
          console.info('Done: success', { jobId });
          resolve({
            status: 'success',
            result: status.result
          });
          return;
        }

        if (status.status === 'error') {
          console.info('Done: error', { jobId, error: status.error });
          resolve({
            status: 'error',
            error: status.error,
            retryAfterSeconds: status.retryAfterSeconds
          });
          return;
        }

        // Continue polling for 'queued' or 'working' status
        setTimeout(poll, intervalMs);

      } catch (error) {
        console.error('Job polling error:', error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

// Client-side single-flight deduplication for import jobs
const activeJobs = new Map<string, Promise<ImportJobResult>>();

/**
 * Import a property with single-flight deduplication
 */
export async function importProperty(
  url: string, 
  userId: string,
  onStatusUpdate: (status: ImportJobStatus) => void
): Promise<ImportJobResult> {
  const urlKey = url.trim().toLowerCase();

  // Check if job is already in progress for this URL
  const existingJob = activeJobs.get(urlKey);
  if (existingJob) {
    console.info('Reusing existing job for URL:', urlKey);
    return existingJob;
  }

  // Create new job with single-flight protection
  const jobPromise = (async () => {
    try {
      const { jobId } = await createImportJob(url, userId);
      const result = await pollImportJob(jobId, onStatusUpdate);
      return result;
    } finally {
      // Always clean up active job
      activeJobs.delete(urlKey);
    }
  })();

  activeJobs.set(urlKey, jobPromise);
  return jobPromise;
}