import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, Package, AlertTriangle, Users, CreditCard, ShoppingBag, CalendarClock, ShieldCheck,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import api from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatISTDateTime, formatNumber, parseBackendDate } from '@/lib/utils'

interface DashboardStats {
  today_sales: number
  today_orders: number
  month_revenue: number
  low_stock_count: number
  total_products: number
  pending_payments: number
  customer_count: number
  recent_transactions: { id: string; invoice_number: string; grand_total: number; created_at: string }[]
  top_products: { name: string; quantity: number; revenue: number }[]
}

interface SubscriptionDetails {
  id?: string
  plan_name?: string
  plan_code?: string
  status?: string
  starts_at?: string
  expires_at?: string | null
  renews_at?: string | null
  grace_until?: string | null
  auto_renew?: boolean
  payment_status?: string
  plan?: {
    name?: string
    code?: string
    price?: number
    currency?: string
    duration_days?: number
    duration_minutes?: number
    plan_type?: string
    features?: string[]
    limits?: Record<string, number | boolean | string | null>
  } | null
  latest_payment?: {
    amount?: number
    currency?: string
    status?: string
    provider?: string
    created_at?: string
    verified_at?: string
  } | null
}

const statCards = [
  { key: 'today_sales', label: "Today's Sales", icon: TrendingUp, format: 'currency' },
  { key: 'today_orders', label: "Today's Orders", icon: ShoppingBag, format: 'number' },
  { key: 'month_revenue', label: 'Month Revenue', icon: CreditCard, format: 'currency' },
  { key: 'low_stock_count', label: 'Low Stock', icon: AlertTriangle, format: 'number' },
  { key: 'total_products', label: 'Products', icon: Package, format: 'number' },
  { key: 'customer_count', label: 'Customers', icon: Users, format: 'number' },
] as const

function statValue(data: DashboardStats | undefined, key: keyof DashboardStats) {
  const value = data?.[key]
  return typeof value === 'number' ? value : 0
}

function currencyTooltip(value: unknown) {
  return formatCurrency(Number(value || 0))
}

function formatDate(value?: string | null) {
  return value ? formatISTDateTime(value, true) : 'Lifetime'
}

function daysRemaining(value?: string | null) {
  if (!value) return 'No expiry'
  const diff = parseBackendDate(value).getTime() - Date.now()
  const days = Math.ceil(diff / 86_400_000)
  if (days < 0) return 'Expired'
  if (days === 0) return 'Expires today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

function planDuration(plan?: SubscriptionDetails['plan']) {
  if (plan?.duration_minutes) return `${plan.duration_minutes} minutes`
  if (plan?.plan_type === 'lifetime') return 'Lifetime'
  return plan?.duration_days ? `${plan.duration_days} days` : 'Lifetime'
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardStats>('/billing/dashboard')).data,
    refetchInterval: 30000,
  })
  const subscription = useQuery({
    queryKey: ['subscription-current'],
    queryFn: async () => (await api.get<SubscriptionDetails>('/subscriptions/me')).data,
    refetchInterval: 60000,
  })

  const chartData = data?.top_products?.map((p) => ({ name: p.name.slice(0, 12), revenue: p.revenue })) || []
  const subscriptionData = subscription.data
  const plan = subscriptionData?.plan
  const limits = plan?.limits || {}
  const latestPayment = subscriptionData?.latest_payment
  const subscriptionStatus = subscriptionData?.status || 'pending'
  const paymentStatus = latestPayment?.status || subscriptionData?.payment_status || 'unpaid'
  const revenueTrend = [
    { day: 'Mon', sales: (data?.today_sales || 0) * 0.6 },
    { day: 'Tue', sales: (data?.today_sales || 0) * 0.8 },
    { day: 'Wed', sales: (data?.today_sales || 0) * 0.5 },
    { day: 'Thu', sales: (data?.today_sales || 0) * 0.9 },
    { day: 'Fri', sales: data?.today_sales || 0 },
    { day: 'Sat', sales: (data?.today_sales || 0) * 1.2 },
    { day: 'Sun', sales: (data?.today_sales || 0) * 0.7 },
  ]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-slate-500">Welcome back</p>
        <h2 className="text-2xl font-bold">Shop Overview</h2>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card, i) => (
          <Card key={card.key} delay={i * 0.05} className="!p-4">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <card.icon className="h-5 w-5 text-indigo-500" />
                </div>
                <p className="mt-2 text-xs text-slate-500">{card.label}</p>
                <p className="text-xl font-bold">
                  {card.format === 'currency'
                    ? formatCurrency(statValue(data, card.key))
                    : formatNumber(statValue(data, card.key))}
                </p>
              </>
            )}
          </Card>
        ))}
      </div>

      <Card delay={0.08}>
        {subscription.isLoading ? (
          <Skeleton className="h-36 w-full" />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Subscription</span>
              </div>
              <h3 className="mt-2 text-2xl font-bold">{subscriptionData?.plan_name || plan?.name || 'No active plan'}</h3>
              <p className="mt-1 text-sm capitalize text-slate-500">
                {plan?.plan_type || subscriptionData?.plan_code || 'Plan'} · {subscriptionStatus.replace(/_/g, ' ')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-emerald-50 px-2 py-1 font-medium capitalize text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{subscriptionStatus}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{paymentStatus}</span>
                <span className="rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{daysRemaining(subscriptionData?.expires_at)}</span>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <SubscriptionRow label="Started" value={formatDate(subscriptionData?.starts_at)} />
              <SubscriptionRow label="Expires" value={formatDate(subscriptionData?.expires_at)} highlight />
              <SubscriptionRow label="Access ends" value={formatDate(subscriptionData?.expires_at)} />
              <SubscriptionRow label="Auto renew" value={subscriptionData?.auto_renew ? 'Enabled' : 'Disabled'} />
            </div>

            <div className="grid gap-3 text-sm">
              <SubscriptionRow label="Plan price" value={formatCurrency(Number(plan?.price || latestPayment?.amount || 0), plan?.currency || latestPayment?.currency || 'INR')} />
              <SubscriptionRow label="Duration" value={planDuration(plan)} />
              <SubscriptionRow label="Products limit" value={limits.products === undefined || limits.products === -1 ? 'Unlimited' : formatNumber(Number(limits.products || 0))} />
              <SubscriptionRow label="Invoices/month" value={limits.monthly_invoices === undefined || limits.monthly_invoices === -1 ? 'Unlimited' : formatNumber(Number(limits.monthly_invoices || 0))} />
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Revenue Trend</h3>
          <div className="h-64 w-full min-h-[256px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={currencyTooltip} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card delay={0.1}>
          <h3 className="mb-4 font-semibold">Top Products</h3>
          <div className="h-64 w-full min-h-[256px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={currencyTooltip} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-slate-400">No sales data yet</p>
            )}
          </div>
        </Card>
      </div>

      <Card delay={0.2}>
        <h3 className="mb-4 font-semibold">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                <th className="pb-3 pr-4">Invoice</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3}><Skeleton className="h-10 w-full" /></td></tr>
              ) : data?.recent_transactions?.length ? (
                data.recent_transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-medium">{tx.invoice_number}</td>
                    <td className="py-3">{formatCurrency(tx.grand_total)}</td>
                    <td className="py-3 text-slate-500">{formatISTDateTime(tx.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="py-8 text-center text-slate-400">No transactions yet. Create your first sale in POS.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function SubscriptionRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
      <span className="flex items-center gap-2 text-slate-500">
        {highlight && <CalendarClock className="h-4 w-4 text-amber-500" />}
        {label}
      </span>
      <strong className="text-right">{value}</strong>
    </div>
  )
}
