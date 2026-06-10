import { LandingTemplate } from '@/components/landing/LandingTemplate'

export default function BillingSoftwarePage() {
  return (
    <LandingTemplate
      title="Billing & Invoicing Software for Retail Shops"
      description="Generate professional invoices in seconds with Dukan Saathi billing software. Digital receipts, GST support, and WhatsApp integration."
      heroTitle="Fast & Professional Billing for Your Shop"
      heroText="Simplify your checkout process. Create beautiful invoices, manage taxes, and share receipts digitally with Dukan Saathi."
      features={[
        { title: 'Lightning Fast POS', text: 'Create bills in seconds with keyboard shortcuts and quick product search.' },
        { title: 'Digital Invoices', text: 'Send PDF receipts via WhatsApp or email, saving paper and printing costs.' },
        { title: 'QR Code Payments', text: 'Generate dynamic UPI QR codes for instant, contactless payments.' },
      ]}
      faqs={[{ q: 'Can I print receipts?', a: 'Yes, we support all standard thermal and laser printers.' }]}
    />
  )
}
