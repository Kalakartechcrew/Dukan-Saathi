import { LandingTemplate } from '@/components/landing/LandingTemplate'

export default function StockManagementPage() {
  return (
    <LandingTemplate
      title="Advanced Stock Management Software"
      description="Take full control of your warehouse and shop floor. Track every unit, reduce wastage, and never run out of stock again with Dukan Saathi."
      heroTitle="Smart Stock Management for Modern Retailers"
      heroText="Dukan Saathi provides real-time visibility into your inventory levels across multiple locations. Automate reordering and eliminate manual counting errors."
      features={[
        {
          title: "Real-time Stock Tracking",
          text: "Monitor your inventory levels as they change with every sale and purchase. Get instant updates on your dashboard."
        },
        {
          title: "Low Stock Alerts",
          text: "Receive automatic notifications when items are running low. Set custom reorder points for every product."
        },
        {
          title: "Multi-Location Support",
          text: "Manage stock across multiple warehouses or retail outlets from a single, centralized dashboard."
        }
      ]}
      faqs={[
        {
          q: "Can I track stock using barcodes?",
          a: "Yes, Dukan Saathi integrates seamlessly with most barcode scanners to make stock-taking fast and accurate."
        },
        {
          q: "How does the low stock alert work?",
          a: "You can set a minimum quantity for each item. When stock falls below that level, you'll see a warning on your dashboard and receive an email/app alert."
        },
        {
          q: "Can I manage returns and damages?",
          a: "Yes, the system allows you to easily record customer returns and mark items as damaged to keep your stock levels accurate."
        }
      ]}
    />
  )
}
