/**
 * Next.js Configuration for Desktop Renderer
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Static export for Electron
  distDir: '../app', // Nextron requires this to find the build output
  images: {
    unoptimized: true, // Static export requires unoptimized images
  },
  webpack: (config) => {
    // Allow importing from shared frontend code
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../../frontend'),
      '@components': path.resolve(__dirname, '../../frontend/components'),
      '@lib': path.resolve(__dirname, '../../frontend/lib'),
    };
    return config;
  },
};

const path = require('path');

module.exports = nextConfig;
