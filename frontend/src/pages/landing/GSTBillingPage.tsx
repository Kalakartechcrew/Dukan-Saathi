import { LandingTemplate } from '@/components/landing/LandingTemplate'

export default function GSTBillingPage() {
  return (
    <LandingTemplate
      title="GST Billing Software for Small Businesses"
      description="Simplify your GST compliance with Dukan Saathi's easy-to-use billing software. Generate invoices, track taxes, and stay compliant effortlessly."
      heroTitle="Automated GST Billing Software for Your Business"
      heroText="Stop worrying about complex tax calculations. Dukan Saathi automates your GST invoices, filing preparations, and tax tracking so you can focus on growing your shop."
      features={[
        {
          title: "Easy GST Invoicing",
          text: "Generate professional GST-compliant invoices in seconds. Support for multi-rate GST, HSN codes, and digital signatures."
        },
        {
          title: "GST Returns Made Simple",
          text: "Export your sales and purchase data in GSTR-1, GSTR-3B, and GSTR-9 formats ready for filing."
        },
        {
          title: "Automatic Tax Calculation",
          text: "No more manual math. Our system automatically calculates CGST, SGST, and IGST based on your location and item categories."
        }
      ]}
      faqs={[
        {
          q: "Do I need technical knowledge to use Dukan Saathi for GST?",
          a: "Not at all! We've designed our interface to be intuitive. If you can use a smartphone, you can generate GST invoices with Dukan Saathi."
        },
        {
          q: "Can I customize my invoices?",
          a: "Yes, you can add your logo, business details, and customize terms and conditions on every invoice."
        },
        {
          q: "Does it support HSN/SAC codes?",
          a: "Absolutely. You can save HSN/SAC codes for all your products and services for quick billing."
        }
      ]}
    />
  )
}
