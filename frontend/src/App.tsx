import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useTracking } from '@/hooks/useTracking'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })))
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage').then((m) => ({ default: m.SignUpPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const POSPage = lazy(() => import('@/pages/pos/POSPage').then((m) => ({ default: m.POSPage })))
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const InvoicesPage = lazy(() => import('@/pages/invoices/InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const SubscribePage = lazy(() => import('@/pages/subscriptions/SubscribePage').then((m) => ({ default: m.SubscribePage })))
const PlanPage = lazy(() => import('@/pages/subscriptions/PlanPage').then((m) => ({ default: m.PlanPage })))
const PublicBillPage = lazy(() => import('@/pages/public/PublicBillPage').then((m) => ({ default: m.PublicBillPage })))
const LandingPage = lazy(() => import('@/pages/public/LandingPage').then((m) => ({ default: m.LandingPage })))
const AboutPage = lazy(() => import('@/pages/public/AboutPage').then((m) => ({ default: m.AboutPage })))
const FeaturesPage = lazy(() => import('@/pages/public/FeaturesPage').then((m) => ({ default: m.FeaturesPage })))
const PricingPage = lazy(() => import('@/pages/public/PricingPage').then((m) => ({ default: m.PricingPage })))
const SecurityPage = lazy(() => import('@/pages/public/SecurityPage').then((m) => ({ default: m.SecurityPage })))
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const FAQPage = lazy(() => import('@/pages/public/FAQPage').then((m) => ({ default: m.FAQPage })))
const HelpCenterPage = lazy(() => import('@/pages/public/HelpCenterPage').then((m) => ({ default: m.HelpCenterPage })))
const BlogIndexPage = lazy(() => import('@/pages/blog/BlogIndexPage').then((m) => ({ default: m.BlogIndexPage })))
const BlogPostPage = lazy(() => import('@/pages/blog/BlogPostPage').then((m) => ({ default: m.BlogPostPage })))

// Landing Pages
const InventorySoftwarePage = lazy(() => import('@/pages/landing/InventorySoftwarePage'))
const BillingSoftwarePage = lazy(() => import('@/pages/landing/BillingSoftwarePage'))
const GSTBillingPage = lazy(() => import('@/pages/landing/GSTBillingPage'))
const StockManagementPage = lazy(() => import('@/pages/landing/StockManagementPage'))
const RetailManagementPage = lazy(() => import('@/pages/landing/RetailManagementPage'))
const ShopManagementPage = lazy(() => import('@/pages/landing/ShopManagementPage'))
const InventoryTrackingPage = lazy(() => import('@/pages/landing/InventoryTrackingPage'))

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated())
  return isAuth ? <>{children}</> : <Navigate to="/" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated())
  const user = useAuthStore((s) => s.user)
  const home = user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/dashboard'
  return isAuth ? <Navigate to={home} replace /> : <>{children}</>
}

function HomeRoute() {
  const isAuth = useAuthStore((s) => s.isAuthenticated())
  const user = useAuthStore((s) => s.user)
  const home = user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/dashboard'
  return isAuth ? <Navigate to={home} replace /> : <LandingPage />
}

function PageFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function App() {
  const theme = useThemeStore((s) => s.theme)
  useTracking()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
            <Route path="/verify-email" element={<ProtectedRoute><VerifyEmailPage /></ProtectedRoute>} />
            <Route path="/" element={<HomeRoute />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/help-center" element={<HelpCenterPage />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            
            {/* Landing Pages */}
            <Route path="/inventory-management-software" element={<InventorySoftwarePage />} />
            <Route path="/billing-software" element={<BillingSoftwarePage />} />
            <Route path="/gst-billing-software" element={<GSTBillingPage />} />
            <Route path="/stock-management-software" element={<StockManagementPage />} />
            <Route path="/retail-management-software" element={<RetailManagementPage />} />
            <Route path="/shop-management-software" element={<ShopManagementPage />} />
            <Route path="/inventory-tracking-software" element={<InventoryTrackingPage />} />

            <Route path="/bill/:invoiceId" element={<PublicBillPage />} />
            <Route path="/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-800 dark:text-white' }} />
    </QueryClientProvider>
  )
}
