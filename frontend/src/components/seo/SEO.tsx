import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogType?: 'website' | 'article' | 'product'
  ogImage?: string
  twitterHandle?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>[]
}

export function SEO({
  title,
  description = "Dukan Saathi — Smart Inventory, Billing & POS Management Software for shopkeepers and businesses. Streamline your retail operations with ease.",
  canonical,
  ogType = 'website',
  ogImage = '/og-image.png', // Placeholder for actual image
  twitterHandle = '@DukanSaathi',
  noindex = false,
  jsonLd = [],
}: SEOProps) {
  const siteName = 'Dukan Saathi'
  const fullTitle = title ? `${title} | ${siteName}` : siteName
  const url = canonical || 'https://dukansaathi.shop' // Replace with actual production URL if known

  const defaultJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: url,
    logo: `${url}/favicon.svg`,
    sameAs: [
      'https://twitter.com/DukanSaathi',
      'https://linkedin.com/company/dukan-saathi',
    ],
  }

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content={twitterHandle} />

      {/* Structured Data */}
      {[defaultJsonLd, ...jsonLd].map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  )
}
