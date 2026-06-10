import { LandingTemplate } from '@/components/landing/LandingTemplate'

export default function RetailManagementPage() {
  return (
    <LandingTemplate
      title="All-in-One Retail Management System"
      description="From POS to employee management, Dukan Saathi is the complete operating system for your retail business. Scale faster with data-driven insights."
      heroTitle="Master Your Retail Empire with Dukan Saathi"
      heroText="Run your entire retail operation from a single app. Manage sales, customers, inventory, and staff without breaking a sweat. Perfect for single shops or chains."
      features={[
        {
          title: "Powerful Cloud POS",
          text: "A fast, reliable Point of Sale system that works on any device. Handle transactions quickly even during peak hours."
        },
        {
          title: "Customer Loyalty Programs",
          text: "Build lasting relationships with built-in CRM features. Track purchase history and run personalized reward programs."
        },
        {
          title: "Comprehensive Analytics",
          text: "Gain deep insights into your best-selling products, busiest hours, and profit margins with beautiful reports."
        }
      ]}
      faqs={[
        {
          q: "Is Dukan Saathi suitable for a small grocery store?",
          a: "Yes, our software is designed to scale from small mom-and-pop shops to large retail chains."
        },
        {
          q: "Can I access my data from home?",
          a: "Absolutely. Dukan Saathi is cloud-based, so you can check your sales and inventory from anywhere in the world on any device."
        },
        {
          q: "How secure is my customer data?",
          a: "We use enterprise-grade encryption and secure cloud servers to ensure your and your customers' data is always protected."
        }
      ]}
    />
  )
}
