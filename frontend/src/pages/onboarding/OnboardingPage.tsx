import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { analytics } from '@/lib/analytics'

const STEPS = ['Business', 'Location', 'Tax', 'Done']

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    business_type: 'general_store',
    currency: 'INR',
    address: '',
    city: '',
    state: '',
    country: 'IN',
    phone: '',
    gst_number: '',
    default_tax_rate: '0',
    invoice_prefix: 'INV',
    terms: 'Goods once sold can be returned only as per shop policy.',
    footer_note: 'Thank you for shopping with us.',
    primary_color: '#4f46e5',
    accent_color: '#14b8a6',
  })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await api.post('/shops/setup', {
        business_type: form.business_type,
        currency: form.currency,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        phone: form.phone,
        tax: { gst_enabled: true, gst_number: form.gst_number, default_tax_rate: parseFloat(form.default_tax_rate) },
        branding: { primary_color: form.primary_color, accent_color: form.accent_color },
      })
      await api.patch('/shops/me', {
        invoice: {
          prefix: form.invoice_prefix,
          next_number: 1,
          template_id: 'modern',
          terms: form.terms,
          footer_note: form.footer_note,
        },
      })
      toast.success('Shop setup complete!')
      analytics.trackEvent('start_trial')
      navigate('/dashboard')
    } catch {
      toast.error('Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
          ))}
        </div>
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {step === 0 && (
            <>
              <h2 className="text-xl font-bold">Business details</h2>
              <div className="mt-4 space-y-4">
                <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Invoice prefix" value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })} />
                  <Input label="Primary color" type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
                </div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">Location</h2>
              <div className="mt-4 space-y-4">
                <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold">Tax settings</h2>
              <div className="mt-4 space-y-4">
                <Input label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
                <Input label="Default tax %" type="number" value={form.default_tax_rate} onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })} />
                <Input label="Invoice terms" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
                <Input label="Invoice footer" value={form.footer_note} onChange={(e) => setForm({ ...form, footer_note: e.target.value })} />
              </div>
            </>
          )}
          {step === 3 && (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold gradient-text">You're all set!</h2>
              <p className="mt-2 text-slate-500">Start adding products and making sales</p>
            </div>
          )}
        </motion.div>
        <div className="mt-6 flex gap-3">
          {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)} tooltip="Go back to the previous setup step.">Back</Button>}
          {step < 3 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)} tooltip="Continue to the next shop setup step.">Continue</Button>
          ) : (
            <Button className="flex-1" loading={loading} onClick={submit} tooltip="Save shop setup and open the dashboard.">Go to Dashboard</Button>
          )}
        </div>
      </Card>
    </div>
  )
}
