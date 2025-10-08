/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Allow production builds to complete even if there are type errors
    // In production, you should fix these instead
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even if there are ESLint errors
    // In production, you should fix these instead
    ignoreDuringBuilds: true,
  },
  // Enable experimental features for Shopify App development
  experimental: {
    serverActions: {
      allowedOrigins: ['*.shopify.com', '*.myshopify.com'],
    },
  },
  // Configure headers for Shopify App Bridge
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*.shopify.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Shopify-*',
          },
        ],
      },
      {
        source: '/dashboard',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' *.shopify.com *.myshopify.com;",
          },
        ],
      },
      {
        source: '/storefront/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
  // Image optimization for wig images from Shopify CDN
  images: {
    domains: ['cdn.shopify.com', 'shopify.com'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Webpack configuration for better bundle analysis
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Important: return the modified config
    return config;
  },
  // Environment variables to expose to the browser
  env: {
    APP_NAME: process.env.APP_NAME || 'Chiquel Wig Matcher',
  },
  // Redirects for cleaner URLs
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  // API route configuration
  async rewrites() {
    return [
      {
        source: '/storefront/:path*',
        destination: '/storefront/:path*',
      },
    ];
  },
};

module.exports = nextConfig;










