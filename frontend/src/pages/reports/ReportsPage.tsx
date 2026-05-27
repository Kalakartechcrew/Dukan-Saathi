import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, BarChart3, FileText, LineChart } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatNumber } from '@/lib/utils'

function currencyTooltip(value: unknown) {
  return formatCurrency(Number(value || 0))
}

export function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const sales = useQuery({
    queryKey: ['reports', 'sales'],
    queryFn: async () => (await api.get('/reports/sales')).data,
  })
  const inventory = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: async () => (await api.get('/reports/inventory')).data,
  })
  const profit = useQuery({
    queryKey: ['reports', 'profit-loss'],
    queryFn: async () => (await api.get('/reports/profit-loss')).data,
  })
  const insights = useQuery({
    queryKey: ['insights', 'reorder'],
    queryFn: async () => (await api.get('/insights/reorder-suggestions')).data,
  })
  const monthly = useQuery({
    queryKey: ['reports', 'monthly-business', month],
    queryFn: async () => (await api.get('/reports/monthly-business', { params: { month } })).data,
  })

  const trend = sales.data?.daily_trend?.map((item: { _id: string; revenue: number; orders: number }) => ({
    date: item._id.slice(5),
    revenue: item.revenue,
    orders: item.orders,
  })) || []
  const valuation = inventory.data?.valuation || {}
  const reorder = insights.data || []
  const report = monthly.data

  const openPrintableReport = async () => {
    const res = await api.get('/reports/monthly-business.html', { params: { month }, responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-slate-500">Monthly profit/loss, expenses, cash flow, and business advice</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/80"
          />
          <Button variant="secondary" onClick={openPrintableReport} tooltip="Open a colourful printable monthly report with charts and business summary.">
            <FileText className="h-4 w-4" /> Printable Report
          </Button>
        </div>
      </div>

      <Card className={report?.status === 'loss' ? 'border-red-200 dark:border-red-900/60' : 'border-emerald-200 dark:border-emerald-900/60'}>
        {monthly.isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Business result for {report?.month}</p>
                <h3 className={`text-2xl font-bold ${report?.status === 'loss' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {report?.status === 'loss' ? 'Loss' : 'Profit'}: {formatCurrency(Math.abs(report?.net_profit || 0))}
                </h3>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
                Net margin: <strong>{report?.net_margin_percent || 0}%</strong>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">Sales</p><p className="font-bold">{formatCurrency(report?.sales?.revenue || 0)}</p></div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">Collected</p><p className="font-bold">{formatCurrency(report?.sales?.collected || 0)}</p></div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">Pending dues</p><p className="font-bold text-amber-600">{formatCurrency(report?.sales?.pending || 0)}</p></div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">Expenses</p><p className="font-bold">{formatCurrency(report?.expenses?.total || 0)}</p></div>
            </div>
            <div>
              <p className="mb-2 font-semibold">CA-style recommendations</p>
              <div className="grid gap-2">
                {report?.recommendations?.map((item: string, index: number) => (
                  <p key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">{item}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Inventory value</p>
          <p className="mt-2 text-xl font-bold">{formatCurrency(valuation.selling_value || 0)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Cost basis</p>
          <p className="mt-2 text-xl font-bold">{formatCurrency(valuation.buying_value || 0)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Net profit</p>
          <p className="mt-2 text-xl font-bold">{formatCurrency(profit.data?.net_profit || 0)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Stock units</p>
          <p className="mt-2 text-xl font-bold">{formatNumber(valuation.units || 0)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2 font-semibold"><LineChart className="h-5 w-5 text-indigo-500" /> Revenue Trend</div>
          <div className="h-64">
            {sales.isLoading ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={currencyTooltip} />
                  <Area dataKey="revenue" type="monotone" stroke="#4f46e5" fill="#4f46e533" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-violet-500" /> Orders Trend</div>
          <div className="h-64">
            {sales.isLoading ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-rose-500" /> Expense Breakdown</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {report?.expenses?.by_category?.length ? report.expenses.by_category.map((item: { category: string; amount: number; count: number }) => (
            <div key={item.category} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="font-medium capitalize">{item.category}</p>
              <p className="mt-2 text-xl font-bold">{formatCurrency(item.amount)}</p>
              <p className="text-xs text-slate-500">{item.count} entries</p>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No expenses recorded for this month.</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5 text-amber-500" /> Smart Reorder Suggestions</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reorder.length ? reorder.map((item: { id: string; name: string; sku: string; quantity: number; suggested_order_qty: number }) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-slate-500">{item.sku}</p>
              <p className="mt-3 text-sm">Stock: <span className="font-semibold">{item.quantity}</span></p>
              <p className="text-sm">Suggested order: <span className="font-semibold">{formatNumber(item.suggested_order_qty)}</span></p>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No reorder suggestions right now.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
