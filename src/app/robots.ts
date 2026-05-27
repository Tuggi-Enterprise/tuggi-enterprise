import { MetadataRoute } from 'next';

// AI crawlers we explicitly welcome — both retrieval/search AND training — to
// maximize the chance of TUGGI being read and cited by AI assistants.
// (Older Anthropic UAs "anthropic-ai"/"Claude-Web" are deprecated; the current
// ones are ClaudeBot / Claude-SearchBot / Claude-User.)
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',        // OpenAI
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',    // Anthropic
  'PerplexityBot', 'Perplexity-User',                // Perplexity
  'Google-Extended',                                 // Gemini / AI Overviews grounding
  'Applebot', 'Applebot-Extended',                   // Apple
  'Amazonbot', 'Bingbot', 'CCBot', 'Meta-ExternalAgent', 'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        // Explicitly allow AI crawlers. Redundant with '*', but documents the
        // intent and guards against a future broad disallow.
        userAgent: AI_BOTS,
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: 'https://www.tuggi.app/sitemap.xml',
  };
}
