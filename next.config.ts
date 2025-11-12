import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable react strict mode for improved error handling
  reactStrictMode: true,
  
  // Enable compression to reduce bandwidth usage
  compress: true,
  
  // Enable image optimization
  images: {
    domains: ['localhost', 'assistant.kynex.dev'],
  },
  
  // Configure headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
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
    ];
  },
  
  // Configure redirects if needed
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;