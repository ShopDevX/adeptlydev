/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a minimal standalone server bundle for npm distribution.
  // After `next build`, .next/standalone/ contains everything needed
  // (server.js + minimal node_modules); .next/static needs to be
  // copied into .next/standalone/.next/static post-build.
  output: "standalone",
};

export default nextConfig;
