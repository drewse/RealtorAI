// lib/importEndpoint.ts
export function getImportEndpoint() {
  const url = process.env.NEXT_PUBLIC_IMPORT_ENDPOINT;
  if (!url) {
    // Build-time + runtime guard so we don't silently POST to the current page (405)
    throw new Error(
      'NEXT_PUBLIC_IMPORT_ENDPOINT is not set. ' +
      'Add it in Vercel (Production/Preview/Development) and redeploy.'
    );
  }
  return url;
}