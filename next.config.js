// Safety: fail build if env var is missing in prod
const requiredEnv = ['NEXT_PUBLIC_IMPORT_ENDPOINT'];
requiredEnv.forEach((k) => {
  if (!process.env[k] && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var: ${k}`);
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  typescript: {
    // ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
