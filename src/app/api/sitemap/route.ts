import { NextResponse } from 'next/server';

// Define your site's pages with their priorities and change frequencies
const pages = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: 'chat', priority: 0.8, changefreq: 'weekly' },
  { path: 'notes', priority: 0.7, changefreq: 'weekly' },
  { path: 'reminders', priority: 0.7, changefreq: 'weekly' },
  { path: 'settings', priority: 0.5, changefreq: 'monthly' },
  { path: 'help', priority: 0.6, changefreq: 'monthly' },
  { path: 'reset-password', priority: 0.3, changefreq: 'yearly' },
];

export async function GET() {
  const baseUrl = 'https://assistant.kynex.dev';
  const currentDate = new Date().toISOString().split('T')[0];

  // Generate the sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.path ? '/' + page.path : ''}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}