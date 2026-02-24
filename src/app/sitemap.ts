import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tuggi.app';
  
  // Rotas principais do site
  const routes = [
    '',
    '/drive',
    '/enterprise/city-os',
    '/enterprise/fleets',
    '/technology',
    '/purpose',
    '/contact',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  routes.forEach((route) => {
    // Adiciona a rota padrão (Inglês sem prefixo se for o default, ou com /en)
    sitemapEntries.push({
      url: `${baseUrl}/en${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: route === '' ? 1 : 0.8,
    });

    // Adiciona os outros idiomas
    ['es', 'pt-br', 'pt-pt'].forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '' ? 1 : 0.8,
      });
    });
  });

  return sitemapEntries;
}
