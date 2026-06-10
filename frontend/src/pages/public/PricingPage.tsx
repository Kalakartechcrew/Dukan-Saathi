import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Starter',
    price: '₹499',
    duration: 'month',
    description: 'Perfect for small shops starting their digital journey.',
    features: ['Up to 500 Products', '1,000 Invoices/month', 'Basic Reporting', 'WhatsApp Sharing', 'Single User'],
    cta: 'Start for Free',
    highlighted: false,
  },
  {
    name: 'Business',
    price: '₹999',
    duration: 'month',
    description: 'Advanced tools for growing retail businesses.',
    features: ['Unlimited Products', '5,000 Invoices/month', 'Advanced Inventory', 'Multi-user Access', 'Expense Tracking', 'GST Reports'],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    duration: 'year',
    description: 'Tailored solutions for large retail chains.',
    features: ['Multiple Locations', 'API Access', 'Custom Invoices', 'Priority Support', 'Dedicated Account Manager'],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

export function PricingPage() {
  return (
    <PublicLayout>
      <SEO 
        title="Pricing Plans — Choose the Best for Your Shop"
        description="Affordable pricing for Dukan Saathi inventory and billing software. Choose from Starter, Business, or Enterprise plans."
      />
      <section className="bg-slate-50 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-emerald-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Plans for every stage of your business</p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Simple, transparent pricing. No hidden fees. Start with a free trial and upgrade as you grow.
          </p>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`flex flex-col justify-between rounded-3xl p-8 ring-1 ring-slate-200 xl:p-10 ${
                plan.highlighted ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-900'
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold leading-8">{plan.name}</h3>
                <p className={`mt-4 text-sm leading-6 ${plan.highlighted ? 'text-slate-300' : 'text-slate-600'}`}>
                  {plan.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm font-semibold leading-6">/{plan.duration}</span>
                </p>
                <ul role="list" className={`mt-8 space-y-3 text-sm leading-6 ${plan.highlighted ? 'text-slate-300' : 'text-slate-600'}`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className={`h-6 w-5 flex-none ${plan.highlighted ? 'text-emerald-400' : 'text-emerald-600'}`} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/signup" className="mt-8">
                <Button 
                  className={`w-full ${
                    plan.highlighted ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}
