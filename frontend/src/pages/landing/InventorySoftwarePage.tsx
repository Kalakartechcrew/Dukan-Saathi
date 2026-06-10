import { LandingTemplate } from '@/components/landing/LandingTemplate'

export default function InventorySoftwarePage() {
  return (
    <LandingTemplate
      title="Inventory Management Software for Small Business"
      description="Streamline your stock tracking with Dukan Saathi. The best inventory management software for shopkeepers, retailers, and small businesses."
      heroTitle="Master Your Inventory with Dukan Saathi"
      heroText="Stop losing money to stockouts and overstocking. Our intuitive inventory management software gives you real-time visibility into every SKU in your shop."
      features={[
        { title: 'Real-time Stock Tracking', text: 'Know exactly what you have in stock, what is selling fast, and what needs to be reordered.' },
        { title: 'Barcode & SKU Support', text: 'Speed up your workflow with full support for barcode scanning and custom SKU management.' },
        { title: 'Multi-location Management', text: 'Track inventory across multiple shop locations or warehouses from a single dashboard.' },
        { title: 'Low Stock Alerts', text: 'Get automatic notifications when products fall below your set thresholds.' },
        { title: 'Expiry Date Tracking', text: 'Reduce waste by tracking batch numbers and expiry dates for perishable goods.' },
        { title: 'Stock Adjustment Logs', text: 'Maintain a clear audit trail of all manual stock adjustments and corrections.' },
      ]}
      faqs={[
        { q: 'Is this inventory software suitable for retail shops?', a: 'Yes, Dukan Saathi is specifically designed for retail shops, grocery stores, pharmacies, and small businesses.' },
        { q: 'Can I import my existing product list?', a: 'Absolutely. You can bulk upload your entire inventory using our simple CSV import tool.' },
        { q: 'Does it work with barcode scanners?', a: 'Yes, it works with all standard USB and Bluetooth barcode scanners.' },
      ]}
    />
  )
}
