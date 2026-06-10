import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Edit3, ExternalLink, MessageCircle, Receipt, RefreshCw, Search, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatISTDateTime } from '@/lib/utils'
import { buildUpiPaymentUri, shopHasUpi } from '@/lib/upi'
import { analytics } from '@/lib/analytics'

interface Invoice {
  id: string
  invoice_number: string
  customer_name?: string
  grand_total: number
  amount_paid: number
  amount_due: number
  status: string
  payment_methods: string[]
  created_at: string
  customer_phone?: string
  notes?: string
  items: Array<{ product_id: string; name: string; sku: string; quantity: number; unit_price: number; tax_rate: number; discount: number }>
  payments: Array<{ method: string; amount: number }>
}

function normalizeWhatsappPhone(phone?: string) {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits
}

function buildBillMessage(invoice: Invoice) {
  const items = invoice.items
    .map((item, index) => {
      const lineTotal = (item.quantity * item.unit_price) - (item.discount || 0)
      return `${index + 1}. ${item.name} x ${item.quantity} = ${formatCurrency(lineTotal)}`
    })
    .join('\n')

  return [
    `Bill: ${invoice.invoice_number}`,
    invoice.customer_name ? `Customer: ${invoice.customer_name}` : '',
    `Date: ${formatISTDateTime(invoice.created_at, true)}`,
    '',
    items,
    '',
    `Total: ${formatCurrency(invoice.grand_total)}`,
    `Paid: ${formatCurrency(invoice.amount_paid)}`,
    `Due: ${formatCurrency(invoice.amount_due)}`,
    `Status: ${invoice.status.toUpperCase()}`,
    '',
    'Thank you for shopping with us.',
  ].filter(Boolean).join('\n')
}

async function fetchInvoicePdf(invoiceId: string, invoiceNumber: string) {
  const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: 'blob' })
  const blob = new Blob([res.data], { type: 'application/pdf' })
  return new File([blob], `${invoiceNumber || 'invoice'}.pdf`, { type: 'application/pdf' })
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function InvoicesPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [paymentQr, setPaymentQr] = useState<{ amount: number; url: string } | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status],
    queryFn: async () => (await api.get('/billing/invoices', { params: { status: status || undefined } })).data,
  })
  const { data: shop } = useQuery({
    queryKey: ['shop'],
    queryFn: async () => (await api.get('/shops/me')).data,
  })

  const invoices: Invoice[] = data?.items || []

  const openInvoice = async (invoiceId: string) => {
    const res = await api.get(`/billing/invoices/${invoiceId}/html`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  const shareOnWhatsapp = async (invoiceId: string) => {
    if (shop?.payment?.whatsapp_bill_enabled === false) {
      toast.error('WhatsApp bill sharing is turned off in shop settings')
      return
    }
    const { data: invoice } = await api.get<Invoice>(`/billing/invoices/${invoiceId}`)
    const phone = normalizeWhatsappPhone(invoice.customer_phone)
    if (!phone) {
      toast.error('Customer mobile number is required to share on WhatsApp')
      return
    }
    try {
      const res = await api.post<{ recipient?: string }>(`/billing/invoices/${invoiceId}/whatsapp-pdf`)
      toast.success(`Bill PDF sent on WhatsApp to +${res.data?.recipient || phone}`)

      // Track WhatsApp Success
      analytics.trackEvent('whatsapp_click', { type: 'invoice_share', invoice_id: invoiceId })
      return
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status !== 503 && status !== 502) {
        const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(detail || 'Could not send bill PDF on WhatsApp')
        return
      }
    }
    const pdf = await fetchInvoicePdf(invoice.id, invoice.invoice_number)
    const text = buildBillMessage(invoice)
    const shareData = { title: invoice.invoice_number, text, files: [pdf] }
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
    if (navigator.share && (!nav.canShare || nav.canShare(shareData))) {
      await navigator.share(shareData)
      analytics.trackEvent('whatsapp_click', { type: 'native_share', invoice_id: invoiceId })
      return
    }
    downloadFile(pdf)
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
    analytics.trackEvent('whatsapp_click', { type: 'wa_me_link', invoice_id: invoiceId })
    toast('WhatsApp API is not connected. PDF downloaded; attach it manually in WhatsApp.')
  }

  const downloadPdf = async (invoiceId: string) => {
    const { data: invoice } = await api.get<Invoice>(`/billing/invoices/${invoiceId}`)
    const pdf = await fetchInvoicePdf(invoice.id, invoice.invoice_number)
    downloadFile(pdf)
    toast.success('Invoice PDF downloaded')
  }

  const openEdit = async (invoiceId: string) => {
    const { data: invoice } = await api.get<Invoice>(`/billing/invoices/${invoiceId}`)
    setEditing({
      ...invoice,
      customer_name: invoice.customer_name || '',
      customer_phone: invoice.customer_phone || '',
      notes: invoice.notes || '',
      payments: invoice.payments?.length ? invoice.payments : [{ method: invoice.payment_methods?.[0] || 'cash', amount: invoice.amount_paid }],
    })
  }

  const editTotals = editing ? (() => {
    const subtotal = editing.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const lineDiscount = editing.items.reduce((sum, item) => sum + (item.discount || 0), 0)
    const tax = editing.items.reduce((sum, item) => sum + ((item.quantity * item.unit_price - (item.discount || 0)) * ((item.tax_rate || 0) / 100)), 0)
    const total = subtotal + tax - lineDiscount
    const paid = editing.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return { subtotal, tax, total, paid, due: Math.max(0, total - paid) }
  })() : null

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return
      if (editTotals && editTotals.due > 0 && !editing.customer_phone?.trim()) {
        throw new Error('Mobile number is required when invoice has due amount')
      }
      return api.patch(`/billing/invoices/${editing.id}`, {
        items: editing.items,
        customer_name: editing.customer_name || undefined,
        customer_phone: editing.customer_phone || undefined,
        notes: editing.notes || undefined,
        payments: editing.payments.map((p) => ({ method: p.method, amount: Number(p.amount || 0) })),
        is_credit: Boolean(editTotals && editTotals.due > 0),
      })
    },
    onSuccess: () => {
      toast.success('Invoice corrected')
      setEditing(null)
      setPaymentQr(null)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(typeof msg === 'string' ? msg : 'Could not update invoice')
    },
  })

  const reconcileDues = useMutation({
    mutationFn: () => api.post('/billing/reconcile-dues'),
    onSuccess: (res) => {
      toast.success(`Synced ${res.data?.reconciled_payments || 0} payment records`)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Could not sync dues'),
  })

  const chooseEditPaymentMethod = (method: string) => {
    if (!editing) return
    const amount = Number(editing.payments[0]?.amount || 0)
    setEditing({ ...editing, payments: [{ ...(editing.payments[0] || { amount: 0 }), method }] })
    if (method !== 'upi') {
      setPaymentQr(null)
      return
    }
    if (amount <= 0) {
      toast.error('Enter payment amount first')
      return
    }
    if (!shopHasUpi(shop)) {
      toast.error('Add your UPI ID in Settings to generate payment QR')
      return
    }
    const url = buildUpiPaymentUri(shop, amount, `Invoice ${editing.invoice_number}`)
    if (url) setPaymentQr({ amount, url })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-slate-500">Receipts, payment status, and printable invoice HTML</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            loading={reconcileDues.isPending}
            onClick={() => reconcileDues.mutate()}
            tooltip="Sync customer payments with unpaid and partially paid invoices."
          >
            <RefreshCw className="h-4 w-4" /> Sync dues
          </Button>
          <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
            {['', 'paid', 'partial', 'pending'].map((item) => (
              <button
                key={item || 'all'}
                onClick={() => setStatus(item)}
                title={item ? `Show only ${item} invoices` : 'Show all invoices'}
                className={`rounded-lg px-3 py-1.5 text-sm capitalize ${status === item ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}
              >
                {item || 'all'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          Latest invoices from POS and billing
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 dark:border-slate-700">
                <th className="pb-3">Invoice</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Due</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Date</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7}><Skeleton className="h-12" /></td></tr>
              ) : invoices.length ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-medium">{invoice.invoice_number}</td>
                    <td className="py-3 text-slate-500">{invoice.customer_name || 'Walk-in'}</td>
                    <td className="py-3">{formatCurrency(invoice.grand_total)}</td>
                    <td className="py-3">{formatCurrency(invoice.amount_due)}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize dark:bg-slate-800">{invoice.status}</span>
                    </td>
                    <td className="py-3 text-slate-500">{formatISTDateTime(invoice.created_at)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(invoice.id)} tooltip="Correct this bill and update stock or customer dues.">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => shareOnWhatsapp(invoice.id)}
                          disabled={shop?.payment?.whatsapp_bill_enabled === false}
                          tooltip={shop?.payment?.whatsapp_bill_enabled === false ? 'Turn on WhatsApp bill sharing in Settings first.' : 'Share this bill PDF with the customer.'}
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadPdf(invoice.id)} tooltip="Download this bill as a PDF.">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openInvoice(invoice.id)} tooltip="Open the printable bill preview.">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    No invoices yet. Complete a POS sale to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && editTotals && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Edit {editing.invoice_number}</h3>
                <p className="text-sm text-slate-500">Use this only for correction of mistakes. Stock and customer due will be adjusted.</p>
              </div>
              <Button variant="ghost" onClick={() => setEditing(null)} tooltip="Close the correction window."><X className="h-4 w-4" /></Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Input label="Customer name" value={editing.customer_name || ''} onChange={(e) => setEditing({ ...editing, customer_name: e.target.value })} />
              <Input label="Mobile number" value={editing.customer_phone || ''} onChange={(e) => setEditing({ ...editing, customer_phone: e.target.value })} />
              <Input label="Notes" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 dark:border-slate-700">
                    <th className="pb-3">Item</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Rate</th>
                    <th className="pb-3">Discount</th>
                    <th className="pb-3">Tax %</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {editing.items.map((item, index) => (
                    <tr key={`${item.product_id}-${index}`} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku}</p>
                      </td>
                      {(['quantity', 'unit_price', 'discount', 'tax_rate'] as const).map((field) => (
                        <td key={field} className="py-3 pr-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item[field] || 0}
                            onChange={(e) => {
                              const items = [...editing.items]
                              items[index] = { ...items[index], [field]: Number(e.target.value || 0) }
                              setEditing({ ...editing, items })
                            }}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                          />
                        </td>
                      ))}
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing({ ...editing, items: editing.items.filter((_, i) => i !== index) })}
                          tooltip="Remove this item from the corrected bill."
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Payment amount"
                  type="number"
                  min="0"
                  max={editTotals.total}
                  value={String(editing.payments[0]?.amount ?? 0)}
                  onChange={(e) => setEditing({ ...editing, payments: [{ ...(editing.payments[0] || { method: 'cash' }), amount: Number(e.target.value || 0) }] })}
                />
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Payment method</label>
                  <select
                    value={editing.payments[0]?.method || 'cash'}
                    onChange={(e) => chooseEditPaymentMethod(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900/80"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                <div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(editTotals.subtotal)}</strong></div>
                <div className="mt-2 flex justify-between"><span>Tax</span><strong>{formatCurrency(editTotals.tax)}</strong></div>
                <div className="mt-2 flex justify-between text-lg"><span>Total</span><strong>{formatCurrency(editTotals.total)}</strong></div>
                <div className="mt-2 flex justify-between"><span>Paid</span><strong>{formatCurrency(editTotals.paid)}</strong></div>
                <div className="mt-2 flex justify-between text-amber-600"><span>Due</span><strong>{formatCurrency(editTotals.due)}</strong></div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)} tooltip="Discard these correction changes.">Cancel</Button>
              <Button loading={saveEdit.isPending} onClick={() => saveEdit.mutate()} tooltip="Save the corrected bill and update dues and stock.">Save correction</Button>
            </div>
          </div>
        </div>
      )}
      {paymentQr && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">UPI Payment</h3>
                <p className="text-sm text-slate-500">Scan to pay {formatCurrency(paymentQr.amount)}</p>
              </div>
              <Button variant="ghost" onClick={() => setPaymentQr(null)} tooltip="Close UPI payment QR."><X className="h-4 w-4" /></Button>
            </div>
            <div className="mt-5 flex justify-center rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700">
              <QRCodeSVG value={paymentQr.url} size={240} level="M" includeMargin />
            </div>
            <p className="mt-3 break-all text-center text-xs text-slate-500">{shop?.payment?.upi_id}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setPaymentQr(null)} tooltip="Close without saving this correction.">Cancel</Button>
              <Button loading={saveEdit.isPending} onClick={() => saveEdit.mutate()} tooltip="Record this UPI payment and save the corrected bill.">Payment received</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
