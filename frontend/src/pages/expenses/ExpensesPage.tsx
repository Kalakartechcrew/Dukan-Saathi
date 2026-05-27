import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatISTDate } from '@/lib/utils'

const categories = ['rent', 'salary', 'electricity', 'transport', 'purchase', 'maintenance', 'food', 'marketing', 'general']

interface Expense {
  id: string
  title: string
  category: string
  amount: number
  payment_method: string
  vendor?: string
  expense_date: string
  created_at: string
}

export function ExpensesPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    amount: '',
    payment_method: 'cash',
    vendor: '',
    notes: '',
    expense_date: new Date().toISOString().slice(0, 10),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => (await api.get('/expenses', { params: { page_size: 50 } })).data,
  })

  const createExpense = useMutation({
    mutationFn: () => api.post('/expenses', {
      ...form,
      amount: parseFloat(form.amount),
      expense_date: new Date(`${form.expense_date}T12:00:00`).toISOString(),
    }),
    onSuccess: () => {
      toast.success('Expense added')
      setForm({ title: '', category: 'general', amount: '', payment_method: 'cash', vendor: '', notes: '', expense_date: new Date().toISOString().slice(0, 10) })
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: () => toast.error('Could not add expense'),
  })

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success('Expense deleted')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const expenses: Expense[] = data?.items || []
  const today = new Date().toISOString().slice(0, 10)
  const todayTotal = expenses
    .filter((item) => item.expense_date.slice(0, 10) === today)
    .reduce((sum, item) => sum + item.amount, 0)
  const monthTotal = expenses.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Daily Expenses</h2>
          <p className="text-slate-500">Record every rupee spent so monthly profit/loss stays accurate.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Today spent</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(todayTotal)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Recent listed total</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(monthTotal)}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 font-semibold">Add Expense</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Where spent / remark" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tea, rent, delivery, repair..." />
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Date" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900/80">
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Payment</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900/80">
              <option value="cash">cash</option>
              <option value="upi">upi</option>
              <option value="card">card</option>
              <option value="bank">bank</option>
            </select>
          </div>
          <Input label="Vendor / person" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          <Input label="Extra note" className="md:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex items-end">
            <Button className="w-full" loading={createExpense.isPending} disabled={!form.title || !form.amount} onClick={() => createExpense.mutate()} tooltip="Save today's expense so it appears in monthly profit and loss reports.">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold">Recent Expenses</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 dark:border-slate-700">
                <th className="pb-3">Date</th>
                <th className="pb-3">Remark</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6}><Skeleton className="h-12" /></td></tr>
              ) : expenses.length ? expenses.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 text-slate-500">{formatISTDate(item.expense_date)}</td>
                  <td className="py-3 font-medium">{item.title}<p className="text-xs text-slate-400">{item.vendor || ''}</p></td>
                  <td className="py-3 capitalize">{item.category}</td>
                  <td className="py-3 uppercase">{item.payment_method}</td>
                  <td className="py-3 text-right font-semibold">{formatCurrency(item.amount)}</td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => deleteExpense.mutate(item.id)} tooltip="Delete this expense from the monthly report.">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Wallet className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    No expenses added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
