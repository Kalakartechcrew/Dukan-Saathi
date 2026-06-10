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
  ogImage = '/logo-512.png',
  twitterHandle = '@DukanSaathi',
  noindex = false,
  jsonLd = [],
}: SEOProps) {
  const siteName = 'Dukan Saathi'
  const fullTitle = title ? `${title} | ${siteName}` : siteName
  const url = canonical || 'https://dukansaathi.shop'

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://dukansaathi.shop/#organization',
    name: siteName,
    url: 'https://dukansaathi.shop',
    logo: `${url}/logo-512.png`,
    description: 'All-in-one POS, inventory, and billing software designed for modern shopkeepers.',
    sameAs: [
      'https://twitter.com/DukanSaathi',
      'https://linkedin.com/company/dukan-saathi',
    ],
  }

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://dukansaathi.shop/#website',
    name: siteName,
    url: 'https://dukansaathi.shop',
    publisher: { '@id': 'https://dukansaathi.shop/#organization' },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://dukansaathi.shop/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  }

  const softwareApplicationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Dukan Saathi',
    operatingSystem: 'Windows, macOS, Android, iOS, Web',
    applicationCategory: 'BusinessApplication',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1250'
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR'
    }
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
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:locale" content="en_IN" />
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
      <meta name="twitter:creator" content={twitterHandle} />

      {/* Structured Data */}
      {[organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd, ...jsonLd].map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  )
}
