import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'

export function PrivacyPage() {
  const lastUpdated = 'October 24, 2023'

  return (
    <PublicLayout>
      <SEO 
        title="Privacy Policy - How We Handle Your Data" 
        description="Read the Dukan Saathi Privacy Policy to understand how we collect, use, and protect your business and personal information."
      />
      
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">Privacy Policy</h1>
          <p className="mt-4 text-slate-500 italic text-sm">Last Updated: {lastUpdated}</p>
          
          <div className="mt-12 prose prose-slate max-w-none text-slate-600 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-900">1. Introduction</h2>
              <p>
                Dukan Saathi ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application and services.
              </p>
              <p>
                By accessing or using Dukan Saathi, you agree to the terms of this Privacy Policy. If you do not agree with the terms of this privacy policy, please do not access the application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900">2. Information We Collect</h2>
              <p>We collect information that you provide directly to us when you create an account, use our services, or communicate with us. This includes:</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li><strong>Personal Identifiable Information:</strong> Name, email address, phone number, and business address.</li>
                <li><strong>Business Data:</strong> Inventory lists, sales transactions, customer details (as entered by you), supplier information, and expense records.</li>
                <li><strong>Financial Information:</strong> Payment details (processed via secure third-party payment gateways; we do not store your full card details).</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and usage patterns.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Provide, operate, and maintain our services.</li>
                <li>Process transactions and send related information including billing and confirmations.</li>
                <li>Improve, personalize, and expand our services.</li>
                <li>Understand and analyze how you use our services.</li>
                <li>Develop new products, services, features, and functionality.</li>
                <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the service.</li>
                <li>Send you emails or SMS reminders for your business operations (e.g., low stock alerts).</li>
                <li>Find and prevent fraud.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900">4. Data Sharing and Disclosure</h2>
              <p>
                We do not sell, trade, or rent your personal or business data to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li><strong>Service Providers:</strong> We may share your information with third-party vendors who provide services on our behalf (e.g., cloud hosting, payment processing, email delivery).</li>
                <li><strong>Legal Obligations:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
                <li><strong>Business Transfers:</strong> If we are involved in a merger, acquisition, or asset sale, your information may be transferred.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900">5. Data Security</h2>
              <p>
                We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900">6. Your Data Rights</h2>
              <p>Depending on your location, you may have the following rights regarding your data:</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>The right to access and receive a copy of your data.</li>
                <li>The right to rectify inaccurate data.</li>
                <li>The right to request the deletion of your data (Right to be Forgotten).</li>
                <li>The right to data portability.</li>
                <li>The right to withdraw consent at any time.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900">7. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900">8. Contact Us</h2>
              <p>
                If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at <strong>privacy@dukansaathi.shop</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
