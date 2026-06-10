import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, ExternalLink, Receipt, Users, Plus, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatISTDateTime } from '@/lib/utils'
import { buildUpiPaymentUri, shopHasUpi } from '@/lib/upi'
import { analytics } from '@/lib/analytics'

interface Customer {
  id: string
  name: string
  phone?: string
  total_spent: number
  order_count: number
  credit_balance: number
}

interface LedgerInvoice {
  id: string
  invoice_number: string
  grand_total: number
  amount_paid: number
  amount_due: number
  status: string
  created_at: string
  items: Array<{ name: string; quantity: number; line_total: number }>
}

interface LedgerPayment {
  id: string
  receipt_number: string
  amount: number
  method: string
  remaining_balance: number
  created_at: string
}

export function CustomersPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [payment, setPayment] = useState({ customerId: '', amount: '', method: 'cash' })
  const [upiQr, setUpiQr] = useState<{ amount: number; url: string } | null>(null)
  const [selected, setSelected] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
  })

  const ledger = useQuery({
    queryKey: ['customer-ledger', selected?.id],
    queryFn: async () => (await api.get(`/customers/${selected?.id}/ledger`)).data as { invoices: LedgerInvoice[]; payments: LedgerPayment[] },
    enabled: Boolean(selected?.id),
  })

  const { data: shop } = useQuery({
    queryKey: ['shop'],
    queryFn: async () => (await api.get('/shops/me')).data,
  })

  const [sendReceiptOnWhatsappOverride, setSendReceiptOnWhatsappOverride] = useState<boolean | null>(null)
  const sendReceiptOnWhatsapp = sendReceiptOnWhatsappOverride ?? shop?.payment?.whatsapp_bill_enabled ?? true
  const setSendReceiptOnWhatsapp = (val: boolean) => setSendReceiptOnWhatsappOverride(val)

  const create = useMutation({
    mutationFn: () => api.post('/customers', { name, phone }),
    onSuccess: () => {
      toast.success('Customer added')
      analytics.trackEvent('customer_created', { name, phone })
      setName('')
      setPhone('')
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const recordPayment = useMutation({
    mutationFn: () => api.post(`/customers/${payment.customerId}/payments`, {
      amount: parseFloat(payment.amount),
      method: payment.method,
    }),
    onSuccess: async (res) => {
      const paymentDoc = res.data?.payment
      const paymentId = paymentDoc?.id
      const phone = paymentDoc?.customer_phone
      toast.success('Payment recorded')
      setUpiQr(null)
      setPayment({ customerId: '', amount: '', method: 'cash' })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-ledger', payment.customerId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (paymentId && phone && sendReceiptOnWhatsapp && shop?.payment?.whatsapp_bill_enabled !== false) {
        try {
          const share = await api.post<{ recipient?: string }>(`/customers/payments/${paymentId}/whatsapp-pdf`)
          toast.success(`Payment receipt sent on WhatsApp to +${share.data?.recipient || phone}`)
          analytics.trackEvent('whatsapp_click', { type: 'customer_payment_receipt', payment_id: paymentId })
        } catch (error) {
          const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          toast.error(detail || 'Payment saved, but receipt could not be sent on WhatsApp')
        }
      }
      if (paymentId) {
        try {
          const receipt = await api.get(`/customers/payments/${paymentId}/html`, { responseType: 'blob' })
          const url = URL.createObjectURL(new Blob([receipt.data], { type: 'text/html' }))
          window.open(url, '_blank')
          window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
        } catch {
          toast.error('Payment saved, but receipt could not open')
        }
      }
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(typeof msg === 'string' ? msg : 'Could not record payment')
    },
  })

  const openInvoice = async (invoiceId: string) => {
    const res = await api.get(`/billing/invoices/${invoiceId}/html`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  const openPaymentReceipt = async (paymentId: string) => {
    const res = await api.get(`/customers/payments/${paymentId}/html`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  const customers: Customer[] = data?.items || []

  const choosePaymentMethod = (method: string, customerName: string) => {
    setPayment((prev) => ({ ...prev, method }))
    if (method !== 'upi') {
      setUpiQr(null)
      return
    }
    const amount = Number(payment.amount || 0)
    if (amount <= 0) {
      toast.error('Enter payment amount first')
      return
    }
    if (!shopHasUpi(shop)) {
      toast.error('Add your UPI ID in Settings to generate payment QR')
      return
    }
    const url = buildUpiPaymentUri(shop, amount, `Due payment ${customerName}`)
    if (url) setUpiQr({ amount, url })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customers</h2>
      <Card className="flex flex-wrap gap-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[200px]" />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 min-w-[200px]" />
        <div className="flex items-end">
          <Button onClick={() => create.mutate()} loading={create.isPending} tooltip="Create a new customer account for tracking orders and dues."><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? null : customers.length ? (
          customers.map((c) => (
            <Card key={c.id}>
              <button className="w-full text-left" onClick={() => setSelected(c)} title="Open this customer's profile, orders, and payment history.">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-slate-500">{c.phone || 'No phone'}</p>
                <p className="mt-2 text-sm">{c.order_count} orders · {formatCurrency(c.total_spent)}</p>
              </button>
              <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${c.credit_balance > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
                Outstanding: <strong>{formatCurrency(c.credit_balance || 0)}</strong>
              </div>
              {c.credit_balance > 0 && (
                payment.customerId === c.id ? (
                  <div className="mt-3 space-y-2">
                    <Input
                      label="Payment amount"
                      type="number"
                      max={c.credit_balance}
                      value={payment.amount}
                      onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                    />
                    <select
                      value={payment.method}
                      onChange={(e) => choosePaymentMethod(e.target.value, c.name)}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900/80"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                    </select>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={sendReceiptOnWhatsapp}
                        onChange={(e) => setSendReceiptOnWhatsapp(e.target.checked)}
                        disabled={shop?.payment?.whatsapp_bill_enabled === false}
                      />
                      <span>
                        Send payment receipt on WhatsApp
                        {shop?.payment?.whatsapp_bill_enabled === false ? ' (disabled in shop settings)' : ''}
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" loading={recordPayment.isPending} onClick={() => recordPayment.mutate()} tooltip="Record this customer's due payment and generate a receipt.">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setPayment({ customerId: '', amount: '', method: 'cash' })} tooltip="Close the payment form without saving.">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setPayment({ customerId: c.id, amount: String(c.credit_balance), method: 'cash' })}
                    tooltip="Enter a payment received from this customer against outstanding dues."
                  >
                    <CreditCard className="h-4 w-4" /> Record payment
                  </Button>
                )
              )}
            </Card>
          ))
        ) : (
          <Card className="col-span-full py-12 text-center text-slate-400">
            <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />No customers yet
          </Card>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{selected.name}</h3>
                <p className="text-sm text-slate-500">{selected.phone || 'No mobile number'}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)} tooltip="Close this customer profile."><X className="h-4 w-4" /></Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">Total orders</p>
                <p className="mt-1 text-2xl font-bold">{selected.order_count}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">Total purchased</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(selected.total_spent)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">Outstanding</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(selected.credit_balance || 0)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_.9fr]">
              <Card hover={false}>
                <div className="mb-4 flex items-center gap-2 font-semibold">
                  <Receipt className="h-5 w-5 text-indigo-500" /> Order History
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {ledger.isLoading ? (
                    <p className="text-sm text-slate-400">Loading orders...</p>
                  ) : ledger.data?.invoices?.length ? (
                    <div className="space-y-3">
                      {ledger.data.invoices.map((invoice) => (
                        <div key={invoice.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{invoice.invoice_number}</p>
                              <p className="text-xs text-slate-500">{formatISTDateTime(invoice.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(invoice.grand_total)}</p>
                              <p className="text-xs text-slate-500">Due {formatCurrency(invoice.amount_due)}</p>
                            </div>
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-slate-500">
                            {invoice.items?.slice(0, 4).map((item, index) => (
                              <div key={`${invoice.id}-${index}`} className="flex justify-between gap-3">
                                <span>{item.name} x {item.quantity}</span>
                                <span>{formatCurrency(item.line_total)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize dark:bg-slate-800">{invoice.status}</span>
                            <Button size="sm" variant="ghost" onClick={() => openInvoice(invoice.id)} tooltip="Open the printable bill for this order.">
                              <ExternalLink className="h-4 w-4" /> Invoice
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400">No orders found for this customer.</p>
                  )}
                </div>
              </Card>

              <Card hover={false}>
                <div className="mb-4 flex items-center gap-2 font-semibold">
                  <CreditCard className="h-5 w-5 text-emerald-500" /> Payments
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {ledger.isLoading ? (
                    <p className="text-sm text-slate-400">Loading payments...</p>
                  ) : ledger.data?.payments?.length ? (
                    <div className="space-y-3">
                      {ledger.data.payments.map((pay) => (
                        <div key={pay.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-semibold">{pay.receipt_number}</p>
                              <p className="text-xs text-slate-500">{formatISTDateTime(pay.created_at)}</p>
                            </div>
                            <p className="font-bold">{formatCurrency(pay.amount)}</p>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Method: {pay.method} · Balance: {formatCurrency(pay.remaining_balance || 0)}</p>
                          <Button size="sm" variant="ghost" className="mt-3" onClick={() => openPaymentReceipt(pay.id)} tooltip="Open the printable receipt for this payment.">
                            <ExternalLink className="h-4 w-4" /> Receipt
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400">No payment records yet.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
      {upiQr && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">UPI Payment</h3>
                <p className="text-sm text-slate-500">Scan to pay {formatCurrency(upiQr.amount)}</p>
              </div>
              <Button variant="ghost" onClick={() => setUpiQr(null)} tooltip="Close UPI payment QR."><X className="h-4 w-4" /></Button>
            </div>
            <div className="mt-5 flex justify-center rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700">
              <QRCodeSVG value={upiQr.url} size={240} level="M" includeMargin />
            </div>
            <p className="mt-3 break-all text-center text-xs text-slate-500">{shop?.payment?.upi_id}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setUpiQr(null)} tooltip="Close without recording this payment.">Cancel</Button>
              <Button loading={recordPayment.isPending} onClick={() => recordPayment.mutate()} tooltip="Record this UPI payment and open the receipt.">Payment received</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
