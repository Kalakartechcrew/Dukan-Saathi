import { Link } from 'react-router-dom'

const navigation = {
  products: [
    { name: 'Fast POS', href: '/pos' },
    { name: 'Inventory Management', href: '/inventory' },
    { name: 'Billing & Invoicing', href: '/invoices' },
    { name: 'Reports & Analytics', href: '/reports' },
  ],
  solutions: [
    { name: 'Inventory Software', href: '/inventory-management-software' },
    { name: 'Billing Software', href: '/billing-software' },
    { name: 'GST Billing Software', href: '/gst-billing-software' },
    { name: 'Stock Management', href: '/stock-management-software' },
    { name: 'Retail Management', href: '/retail-management-software' },
    { name: 'Shop Management', href: '/shop-management-software' },
    { name: 'Inventory Tracking', href: '/inventory-tracking-software' },
  ],
  resources: [
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Help Center', href: '/help-center' },
    { name: 'Security', href: '/security' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/privacy' }, // Reusing privacy for now or placeholder
    { name: 'Contact', href: '/help-center' },
  ],
}

export function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-500/20">
                <span className="text-xl font-bold text-white">S</span>
              </div>
              <span className="text-xl font-bold text-white">Sathi</span>
            </Link>
            <p className="text-sm leading-6">
              Smart inventory and billing management for modern shopkeepers. Streamline your retail business with Sathi.
            </p>
            <div className="flex space-x-6">
              {/* Social icons could go here */}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Solutions</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.solutions.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 hover:text-white">{item.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Products</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.products.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 hover:text-white">{item.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Resources</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.resources.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 hover:text-white">{item.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Company</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 hover:text-white">{item.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-slate-400">&copy; {new Date().getFullYear()} Dukan Saathi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
