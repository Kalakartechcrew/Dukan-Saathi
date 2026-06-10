import { LandingTemplate } from '@/components/landing/LandingTemplate'

export default function ShopManagementPage() {
  return (
    <LandingTemplate
      title="Effortless Shop Management Software"
      description="Simplify your daily shop operations. Manage accounts, staff, and daily registers with Dukan Saathi's intuitive shop management tool."
      heroTitle="The Only App Your Shop Needs to Succeed"
      heroText="Dukan Saathi takes the complexity out of shopkeeping. Digitalize your bahi-khata, manage employee attendance, and track daily expenses in one place."
      features={[
        {
          title: "Digital Bahi-Khata",
          text: "Replace your physical ledgers with a secure digital record. Track credit (Udhaar) and send automated reminders to customers."
        },
        {
          title: "Expense Management",
          text: "Keep track of every rupee. Categorize your shop expenses—rent, electricity, cleaning—and see your true net profit."
        },
        {
          title: "Staff Management",
          text: "Manage staff attendance, shifts, and performance. Assign specific permissions to ensure data security."
        }
      ]}
      faqs={[
        {
          q: "Can I use this for multiple shops?",
          a: "Yes, our 'Multi-Shop' plan allows you to manage several businesses under one account with aggregated reporting."
        },
        {
          q: "Does it work offline?",
          a: "Yes, our POS and core features have offline capabilities, syncing data back to the cloud once you're back online."
        },
        {
          q: "How do I send payment reminders?",
          a: "You can send professional payment reminders to customers via WhatsApp or SMS directly from the app."
        }
      ]}
    />
  )
}
