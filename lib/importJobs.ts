import { getImportEndpoint } from './importEndpoint';

/**
 * Get the dedicated status endpoint for polling
 */
export function getImportStatusEndpoint(): string {
  const url = process.env.NEXT_PUBLIC_IMPORT_STATUS_ENDPOINT;
  if (!url) {
    // Build-time + runtime guard 
    throw new Error(
      'NEXT_PUBLIC_IMPORT_STATUS_ENDPOINT is not set. ' +
      'Add it in Vercel (Production/Preview/Development) and redeploy.'
    );
  }
  return url;
}

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

// Module-level single-flight deduplication for job creation
const activeJobs = new Map<string, Promise<{ jobId: string }>>();

/**
 * Create an import job for the given URL (with client-side single-flight)
 */
export async function createImportJob(url: string, userId: string): Promise<{ jobId: string }> {
  const jobKey = `${userId}:${url.trim().toLowerCase()}`;
  
  // Check if job creation is already in progress
  const existingJob = activeJobs.get(jobKey);
  if (existingJob) {
    console.info('Reusing active job creation', { key: jobKey });
    return existingJob;
  }

  console.info('Creating import job...', { key: jobKey, url, userId });
  
  // Create new job creation promise with single-flight protection
  const jobPromise = (async () => {
    try {
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
    } finally {
      // Always clean up active job
      activeJobs.delete(jobKey);
    }
  })();

  activeJobs.set(jobKey, jobPromise);
  return jobPromise;
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

        // Fetch job status from dedicated status endpoint
        const statusEndpoint = getImportStatusEndpoint();
        const response = await fetch(`${statusEndpoint}?id=${jobId}`, {
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

/**
 * Import a property (simplified - createImportJob now handles single-flight)
 */
export async function importProperty(
  url: string, 
  userId: string,
  onStatusUpdate: (status: ImportJobStatus) => void
): Promise<ImportJobResult> {
  const { jobId } = await createImportJob(url, userId);
  const result = await pollImportJob(jobId, onStatusUpdate);
  return result;
}