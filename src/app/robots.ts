import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        // Block AI training, but allow AI search (browser-based)
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'Claude-Web', 'cohere-ai'],
        disallow: '/',
      },
      {
        // Explicitly allow search engines that LLMs use to find current info
        userAgent: ['ChatGPT-User', 'PerplexityBot', 'OAI-SearchBot', 'Bingbot', 'Googlebot'],
        allow: '/',
      }
    ],
    sitemap: 'https://tuggi.app/sitemap.xml',
  };
}
