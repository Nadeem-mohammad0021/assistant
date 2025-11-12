import { NextResponse } from 'next/server';

export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://assistant.kynex.dev/api/sitemap

# Additional rules for specific crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

# Prevent crawling of reset password page
User-agent: *
Disallow: /reset-password`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}