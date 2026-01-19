/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // React Strict Mode for better development experience
  reactStrictMode: true,

  // Enable experimental features
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['d3-sankey', 'd3-shape', 'd3-scale', 'd3-interpolate'],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
    ],
  },

  // Webpack configuration for library optimization
  webpack: (config, { isServer }) => {
    // Optimize D3 modules - only include what we need
    config.resolve.alias = {
      ...config.resolve.alias,
      // Prevent full d3 bundle from being included
      'd3': false,
    };

    return config;
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // Cache static assets
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/documentation',
        destination: '/docs',
        permanent: true,
      },
    ];
  },

  // Output configuration
  output: 'standalone',

  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // TypeScript configuration
  typescript: {
    // Type checking is done separately in CI
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Run ESLint on these directories during build
    dirs: ['src'],
  },

  // Enable source maps in production for debugging
  productionBrowserSourceMaps: false,

  // Trailing slashes
  trailingSlash: false,

  // Power by header
  poweredByHeader: false,
};

module.exports = withBundleAnalyzer(nextConfig);
