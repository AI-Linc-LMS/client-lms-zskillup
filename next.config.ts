import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required for Amplify Hosting SSR (compute) deployments
  output: 'standalone',
};

export default nextConfig;
