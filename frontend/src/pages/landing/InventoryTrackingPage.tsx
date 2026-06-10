import { LandingTemplate } from '@/components/landing/LandingTemplate'

export default function InventoryTrackingPage() {
  return (
    <LandingTemplate
      title="Precise Inventory Tracking Software"
      description="Eliminate inventory shrinkage and optimize your stock levels. Professional-grade tracking for growing businesses with Dukan Saathi."
      heroTitle="Track Every Item From Procurement to Sale"
      heroText="Stop guessing what's in your warehouse. Dukan Saathi provides granular inventory tracking, including batch numbers, expiry dates, and serial numbers."
      features={[
        {
          title: "Batch & Expiry Tracking",
          text: "Perfect for pharmacy or food businesses. Track batch numbers and get notified before items expire to minimize loss."
        },
        {
          title: "Automated Reordering",
          text: "Let the system do the work. Generate purchase orders automatically based on your sales velocity and lead times."
        },
        {
          title: "Inventory Auditing",
          text: "Perform quick and easy stock audits. Compare physical counts with digital records and identify discrepancies instantly."
        }
      ]}
      faqs={[
        {
          q: "Does this support FIFO and LIFO?",
          a: "Yes, Dukan Saathi supports various inventory valuation and tracking methods including FIFO (First-In, First-Out)."
        },
        {
          q: "Can I import my existing inventory list?",
          a: "Yes, you can easily bulk-upload your products using our CSV or Excel import templates."
        },
        {
          q: "Is there a limit to how many products I can track?",
          a: "Depending on your plan, you can track from thousands to millions of SKUs with no lag in performance."
        }
      ]}
    />
  )
}
