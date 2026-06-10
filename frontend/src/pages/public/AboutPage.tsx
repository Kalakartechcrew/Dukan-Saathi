import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { motion } from 'framer-motion'

export function AboutPage() {
  return (
    <PublicLayout>
      <SEO 
        title="About Us - Our Mission to Empower Shopkeepers" 
        description="Learn about Dukan Saathi's journey, our mission to digitalize retail in India, and the team behind the smart shop management platform."
      />
      
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl lg:mx-0">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl"
            >
              Empowering the backbone of retail.
            </motion.h1>
            <p className="mt-6 text-xl leading-8 text-slate-600">
              Dukan Saathi was born out of a simple observation: while the world was going digital, the local shopkeeper was being left behind with paper ledgers and complex, expensive software.
            </p>
          </div>

          <div className="mx-auto mt-20 max-w-3xl space-y-12 text-base leading-7 text-slate-600">
            <section>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Our Story</h2>
              <p className="mt-6">
                In 2023, we set out to build a tool that was as simple as a notebook but as powerful as an enterprise ERP. We spent months sitting in kirana stores, pharmacies, and clothing boutiques across India to understand the daily struggles of retail management.
              </p>
              <p className="mt-4">
                We saw shopkeepers struggling with GST compliance, losing track of credit given to customers, and being surprised by out-of-stock items. We realized that what they needed wasn't just another billing app—they needed a 'Saathi' (a companion) that could help them manage their entire business from the palm of their hand.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Our Mission</h2>
              <p className="mt-6">
                Our mission is to digitalize 10 million small and medium businesses by providing them with world-class technology that is affordable, accessible, and incredibly easy to use.
              </p>
              <ul className="mt-8 space-y-4 list-disc pl-5">
                <li><strong>Simplicity First:</strong> We believe powerful technology doesn't have to be complicated. Our UI is designed for the non-tech-savvy user.</li>
                <li><strong>Data Ownership:</strong> We believe your business data belongs to you. We provide the tools to analyze it and grow, while keeping it 100% secure.</li>
                <li><strong>Local Impact:</strong> By making local shops more efficient, we help local economies thrive.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Why Dukan Saathi?</h2>
              <p className="mt-6">
                Unlike traditional software that requires heavy installation and expensive hardware, Dukan Saathi is cloud-native. This means:
              </p>
              <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-8">
                  <h3 className="font-semibold text-slate-900">Zero Maintenance</h3>
                  <p className="mt-2 text-sm">No servers to manage or IT guys to hire. We handle all the technical heavy lifting.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-8">
                  <h3 className="font-semibold text-slate-900">Always Connected</h3>
                  <p className="mt-2 text-sm">Access your shop data from your phone while traveling, or from your laptop at the shop.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-8">
                  <h3 className="font-semibold text-slate-900">Scalable Growth</h3>
                  <p className="mt-2 text-sm">Start with one shop and expand to fifty. Our infrastructure grows with you.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-8">
                  <h3 className="font-semibold text-slate-900">Community Driven</h3>
                  <p className="mt-2 text-sm">We build features based on what our users ask for. Your feedback drives our roadmap.</p>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-12">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">The Future of Retail</h2>
              <p className="mt-6 italic">
                "Digitalization is not a luxury anymore; it's a survival necessity. Our goal is to ensure that no small business owner ever has to close shop because they couldn't compete with the efficiency of big e-commerce players."
              </p>
              <p className="mt-4 font-semibold text-slate-900">— The Dukan Saathi Team</p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
