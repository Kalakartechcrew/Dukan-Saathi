import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { motion } from 'framer-motion'
import { Shield, Lock, Server, RefreshCcw, EyeOff, UserCheck } from 'lucide-react'

export function SecurityPage() {
  const securityFeatures = [
    {
      title: 'End-to-End Encryption',
      description: 'Your data is encrypted both in transit (using TLS 1.3) and at rest (using AES-256). This means your sales, customer, and financial data is unreadable to anyone but you.',
      icon: Lock
    },
    {
      title: 'Real-time Backups',
      description: 'We never lose your data. Every transaction is backed up across multiple geographically isolated servers in real-time. If one server fails, another takes over instantly.',
      icon: RefreshCcw
    },
    {
      title: 'Access Control',
      description: 'Granular permissions allow you to control exactly what your employees can see and do. Restrict access to profit reports, settings, or delete functions.',
      icon: UserCheck
    },
    {
      title: 'Audit Logs',
      description: 'Every action in the system is logged. See who created a bill, modified a stock entry, or accessed a report, along with the exact time and date.',
      icon: Server
    },
    {
      title: 'Privacy by Design',
      description: 'We do not sell your data. Your business information is used strictly to provide you with the services you signed up for. We are GDPR and DP compliant.',
      icon: EyeOff
    },
    {
      title: 'Regular Security Audits',
      description: 'Our systems undergo frequent penetration testing and security audits by third-party experts to ensure we stay ahead of potential threats.',
      icon: Shield
    }
  ]

  return (
    <PublicLayout>
      <SEO 
        title="Security & Data Protection - Your Business is Safe" 
        description="Discover how Sathi protects your shop data with enterprise-grade encryption, secure cloud infrastructure, and real-time backups."
      />
      
      <div className="relative isolate bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base font-semibold leading-7 text-indigo-600"
            >
              Enterprise-Grade Security
            </motion.h1>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              We take the safety of your business personally
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Running a business is hard enough without worrying about data loss or theft. Sathi uses the same security standards as global banks to ensure your data is always protected.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {securityFeatures.map((feature) => (
                <div key={feature.title} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-slate-900">
                    <feature.icon className="h-6 w-6 flex-none text-indigo-600" aria-hidden="true" />
                    {feature.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Cloud Infrastructure Section */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Reliable Cloud Infrastructure</h2>
              <div className="mt-10 space-y-8 text-slate-300">
                <div>
                  <h3 className="text-xl font-semibold text-white">99.99% Uptime Guarantee</h3>
                  <p className="mt-2">Our infrastructure is hosted on world-class data centers (AWS/Google Cloud) with multi-region redundancy. Your business never stops, and neither does Sathi.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">DDoS Protection</h3>
                  <p className="mt-2">We employ advanced shield protection to mitigate distributed denial-of-service (DDoS) attacks, ensuring your shop remains accessible even during massive traffic spikes.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Automated Disaster Recovery</h3>
                  <p className="mt-2">In the unlikely event of a major regional failure, our automated disaster recovery protocols can restore the entire platform in minutes from isolated backups.</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-indigo-500/10 blur-2xl" />
              <div className="relative rounded-2xl bg-slate-800 p-8 border border-slate-700">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-4 font-mono text-sm text-indigo-400">
                  <p>{">"} initializing_secure_handshake...</p>
                  <p>{">"} verifying_ssl_certificates... [OK]</p>
                  <p>{">"} aes_256_encryption_active</p>
                  <p>{">"} firewall_status: active</p>
                  <p>{">"} intrusion_detection: monitoring</p>
                  <p className="text-slate-400">{">"} scanning for vulnerabilities...</p>
                  <p>{">"} 0 threats detected.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
