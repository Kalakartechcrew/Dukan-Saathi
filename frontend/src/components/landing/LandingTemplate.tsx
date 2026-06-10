import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

interface LandingTemplateProps {
  title: string
  description: string
  heroTitle: string
  heroText: string
  features: { title: string; text: string }[]
  faqs: { q: string; a: string }[]
}

export function LandingTemplate({
  title,
  description,
  heroTitle,
  heroText,
  features,
  faqs
}: LandingTemplateProps) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  }

  return (
    <PublicLayout>
      <SEO 
        title={title} 
        description={description} 
        jsonLd={[faqSchema]}
      />
      
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{heroTitle}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">{heroText}</p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link to="/signup">
                <Button size="lg" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">Get Started Free</Button>
              </Link>
              <Link to="/features" className="text-sm font-semibold leading-6 text-white">Learn more <span aria-hidden="true">→</span></Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-emerald-600">Powerful Capabilities</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to succeed</p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                    <CheckCircle2 className="h-5 w-5 flex-none text-emerald-600" />
                    {feature.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">{feature.text}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 lg:px-8 bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold leading-10 tracking-tight text-slate-900">Frequently Asked Questions</h2>
          <dl className="mt-10 space-y-6 divide-y divide-slate-900/10">
            {faqs.map((faq) => (
              <div key={faq.q} className="pt-6">
                <dt className="text-base font-semibold leading-7 text-slate-900">{faq.q}</dt>
                <dd className="mt-2 text-base leading-7 text-slate-600">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-600 py-16 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to transform your business?</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-emerald-100">
            Join thousands of shopkeepers using Dukan Saathi to grow their retail business.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">Sign Up Now</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
