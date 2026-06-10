import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { buildUpiPaymentUri, shopHasUpi } from '@/lib/upi'

interface Product {
  id: string
  name: string
  sku: string
  selling_price: number
  quantity: number
  tax_rate: number
}

interface CartItem {
  product_id: string
  name: string
  sku: string
  quantity: number
  unit_price: number
  tax_rate: number
  discount: number
}

interface CustomerOption {
  id: string
  name: string
  phone?: string
  credit_balance?: number
}

interface PaymentQr {
  amount: number
  url: string
}

export function POSPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash')
  const [customer, setCustomer] = useState({ id: '', name: '', phone: '' })
  const [amountReceived, setAmountReceived] = useState('')
  const [stockEdit, setStockEdit] = useState<{ product: Product; quantity: string } | null>(null)
  const [paymentQr, setPaymentQr] = useState<PaymentQr | null>(null)

  const { data: shop } = useQuery({
    queryKey: ['shop'],
    queryFn: async () => (await api.get('/shops/me')).data,
  })

  const [sendBillOnWhatsappOverride, setSendBillOnWhatsappOverride] = useState<boolean | null>(null)
  const sendBillOnWhatsapp = sendBillOnWhatsappOverride ?? shop?.payment?.whatsapp_bill_enabled ?? true
  const setSendBillOnWhatsapp = (val: boolean) => setSendBillOnWhatsappOverride(val)

  const { data: productsData } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => (await api.get('/products', { params: { search, page_size: 50 } })).data,
  })

  const customerSearch = customer.phone.trim() || customer.name.trim()
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'pos-search', customerSearch],
    queryFn: async () => (await api.get('/customers', { params: { search: customerSearch, page_size: 8 } })).data,
    enabled: customerSearch.length >= 2,
  })

  const customerOptions: CustomerOption[] = useMemo(() => customersData?.items || [], [customersData])

  useEffect(() => {
    if (customer.id || !customer.phone.trim() || !customerOptions.length) return
    const exact = customerOptions.find((item) => item.phone === customer.phone.trim())
    if (exact) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomer({ id: exact.id, name: exact.name, phone: exact.phone || '' })
    }
  }, [customer.id, customer.phone, customerOptions])

  const openInvoice = useCallback(async (invoiceId: string) => {
    const res = await api.get(`/billing/invoices/${invoiceId}/html`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }, [])

  const checkout = useMutation({
    mutationFn: async () => {
      const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const tax = cart.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_rate / 100), 0)
      const grand = subtotal + tax
      const paid = amountReceived === '' ? grand : Math.max(0, Math.min(parseFloat(amountReceived) || 0, grand))
      if (grand - paid > 0 && !customer.phone.trim()) {
        throw new Error('Customer mobile number is required for credit bills')
      }
      const { data } = await api.post('/billing/invoices', {
        items: cart,
        customer_id: customer.id || undefined,
        customer_name: customer.name || undefined,
        customer_phone: customer.phone || undefined,
        payments: [{ method: paid > 0 ? paymentMethod : 'credit', amount: paid }],
        is_credit: grand - paid > 0,
      })
      return data as { id: string; invoice_number: string }
    },
    onSuccess: async (invoice) => {
      const customerPhone = customer.phone.trim()
      const shouldSendWhatsapp = customerPhone && sendBillOnWhatsapp && shop?.payment?.whatsapp_bill_enabled !== false
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      try {
        if (shouldSendWhatsapp) {
          const { data } = await api.post<{ recipient?: string }>(`/billing/invoices/${invoice.id}/whatsapp-pdf`)
          const recipient = data?.recipient ? ` +${data.recipient}` : ''
          toast.success(`Sale completed. Bill PDF sent on WhatsApp${recipient}`)
        } else {
          await openInvoice(invoice.id)
          toast.success('Sale completed. Printable invoice opened')
        }
      } catch (error) {
        const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(
          detail || (shouldSendWhatsapp
            ? 'Sale saved, but bill PDF could not be sent on WhatsApp'
            : 'Sale saved, but printable invoice could not be opened')
        )
      }
      setCart([])
      setCustomer({ id: '', name: '', phone: '' })
      setAmountReceived('')
      setPaymentQr(null)
    },
    onError: (error: unknown) => {
      const apiMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      const message = typeof apiMessage === 'string' ? apiMessage : error instanceof Error ? error.message : 'Checkout failed'
      toast.error(message)
    },
  })

  const updateStock = useMutation({
    mutationFn: () => {
      if (!stockEdit) throw new Error('No product selected')
      return api.patch(`/products/${stockEdit.product.id}`, { quantity: Number(stockEdit.quantity || 0) })
    },
    onSuccess: () => {
      toast.success('Stock updated')
      setStockEdit(null)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Failed to update stock'),
  })

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === p.id)
      if (existing) {
        return prev.map((i) =>
          i.product_id === p.id ? { ...i, quantity: Math.min(i.quantity + 1, p.quantity) } : i
        )
      }
      return [...prev, {
        product_id: p.id, name: p.name, sku: p.sku,
        quantity: 1, unit_price: p.selling_price, tax_rate: p.tax_rate, discount: 0,
      }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price - i.discount, 0)
  const taxTotal = cart.reduce((s, i) => s + (i.quantity * i.unit_price - i.discount) * (i.tax_rate / 100), 0)
  const grandTotal = subtotal + taxTotal
  const paidAmount = amountReceived === '' ? grandTotal : Math.max(0, Math.min(parseFloat(amountReceived) || 0, grandTotal))
  const dueAmount = Math.max(0, grandTotal - paidAmount)

  const products: Product[] = productsData?.items || []

  const selectCustomer = (option: CustomerOption) => {
    setCustomer({ id: option.id, name: option.name, phone: option.phone || '' })
  }

  const choosePaymentMethod = (method: 'cash' | 'card' | 'upi') => {
    setPaymentMethod(method)
    setPaymentQr(null)
  }

  const openUpiPaymentQr = useCallback(() => {
    if (!cart.length || paidAmount <= 0) return false
    if (!shopHasUpi(shop)) {
      toast.error('Add your UPI ID in Settings to generate payment QR')
      return true
    }
    const url = buildUpiPaymentUri(shop, paidAmount, 'POS payment')
    if (url) {
      setPaymentQr({ amount: paidAmount, url })
      return true
    }
    return false
  }, [cart.length, paidAmount, shop])

  const handleCompleteSale = useCallback(() => {
    if (paymentMethod === 'upi' && paidAmount > 0) {
      openUpiPaymentQr()
      return
    }
    checkout.mutate()
  }, [checkout, openUpiPaymentQr, paidAmount, paymentMethod])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F2') document.getElementById('pos-search')?.focus()
    if (e.key === 'F12' && cart.length) handleCompleteSale()
  }, [cart.length, handleCompleteSale])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="space-y-3 lg:col-span-2 lg:space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="pos-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or scan barcode (F2)"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-10 pr-4 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>
        <div className="lg:hidden">
          {search.trim() ? (
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-900/80">
              {products.length ? products.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <button
                    onClick={() => addToCart(p)}
                    title="Add this product to the current bill."
                    disabled={p.quantity <= 0}
                    className="min-w-0 flex-1 text-left disabled:opacity-40"
                  >
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku} · Stock {p.quantity}</p>
                  </button>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-indigo-600">{formatCurrency(p.selling_price)}</p>
                    <button
                      onClick={() => setStockEdit({ product: p, quantity: String(p.quantity) })}
                      title="Update this product stock before billing."
                      className="text-xs text-slate-500 underline-offset-2 hover:underline"
                    >
                      Stock
                    </button>
                  </div>
                </div>
              )) : (
                <p className="py-6 text-center text-sm text-slate-400">No products found</p>
              )}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400 dark:border-slate-700">
              Search by product name, SKU, or barcode to add items.
            </p>
          )}
        </div>
        <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <motion.div
              key={p.id}
              whileHover={{ scale: 1.02 }}
              className="glass rounded-xl p-4 transition"
            >
              <button
                onClick={() => addToCart(p)}
                title="Add this product to the current bill."
                disabled={p.quantity <= 0}
                className="w-full text-left disabled:opacity-40"
              >
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-slate-500">{p.sku}</p>
                <p className="mt-2 text-lg font-bold text-indigo-600">{formatCurrency(p.selling_price)}</p>
                <p className="text-xs text-slate-400">Stock: {p.quantity}</p>
              </button>
              <button
                onClick={() => setStockEdit({ product: p, quantity: String(p.quantity) })}
                title="Update this product stock before billing."
                className="mt-3 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Edit stock
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <Card className="lg:sticky lg:top-24 h-fit">
        <h3 className="text-lg font-bold">Cart ({cart.length})</h3>
        <div className="relative mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Input
              label="Customer name"
              value={customer.name}
              onChange={(e) => setCustomer({ id: '', name: e.target.value, phone: customer.phone })}
              placeholder="Walk-in customer"
            />
            <Input
              label="Mobile number"
              value={customer.phone}
              onChange={(e) => setCustomer({ id: '', name: customer.name, phone: e.target.value })}
              placeholder="Optional"
            />
          </div>
          {customer.id && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <span>Linked to existing customer account</span>
              <button onClick={() => setCustomer({ id: '', name: '', phone: '' })} title="Remove the linked customer from this bill." className="font-medium">Clear</button>
            </div>
          )}
          {!customer.id && customerOptions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {customerOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => selectCustomer(option)}
                  title="Use this saved customer for the bill."
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="font-medium">{option.name}</span>
                  <span className="ml-2 text-slate-500">{option.phone || 'No phone'}</span>
                  {Number(option.credit_balance || 0) > 0 && (
                    <span className="ml-2 text-amber-600">Due: {formatCurrency(Number(option.credit_balance || 0))}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(item.unit_price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.product_id, -1)} title="Reduce item quantity by one." className="rounded-lg p-1 hover:bg-slate-200">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-medium">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)} title="Increase item quantity by one." className="rounded-lg p-1 hover:bg-slate-200">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={() => setCart((c) => c.filter((i) => i.product_id !== item.product_id))} title="Remove this item from the bill.">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Tax</span><span>{formatCurrency(taxTotal)}</span></div>
          <div className="flex justify-between text-xl font-bold"><span>Total</span><span>{formatCurrency(grandTotal)}</span></div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => setAmountReceived(grandTotal ? String(grandTotal.toFixed(2)) : '')}
            title="Set received amount equal to the full bill total."
            className="rounded-xl border border-slate-200 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Full paid
          </button>
          <button
            onClick={() => setAmountReceived(grandTotal ? String((grandTotal / 2).toFixed(2)) : '')}
            title="Set received amount to half of the bill total."
            className="rounded-xl border border-slate-200 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Half paid
          </button>
          <button
            onClick={() => setAmountReceived('0')}
            title="Mark this sale as fully unpaid credit."
            className="rounded-xl border border-slate-200 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Credit
          </button>
        </div>

        <div className="mt-3">
          <Input
            label="Amount received"
            type="number"
            min="0"
            max={grandTotal}
            step="0.01"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            placeholder={grandTotal ? grandTotal.toFixed(2) : '0.00'}
          />
          <div className={`mt-2 flex justify-between rounded-xl px-3 py-2 text-sm ${dueAmount > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
            <span>{dueAmount > 0 ? 'Balance due' : 'Fully paid'}</span>
            <strong>{formatCurrency(dueAmount)}</strong>
          </div>
          {dueAmount > 0 && !customer.phone && (
            <p className="mt-2 text-xs text-amber-600">Mobile number is required to save customer credit.</p>
          )}
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
          <input
            type="checkbox"
            checked={sendBillOnWhatsapp}
            onChange={(e) => setSendBillOnWhatsapp(e.target.checked)}
            disabled={shop?.payment?.whatsapp_bill_enabled === false}
          />
          <span>
            Send bill PDF on WhatsApp after sale
            {shop?.payment?.whatsapp_bill_enabled === false ? ' (disabled in shop settings)' : ''}
          </span>
        </label>

        <div className="mt-4 flex gap-2">
          {(['cash', 'card', 'upi'] as const).map((m) => (
            <button
              key={m}
            onClick={() => choosePaymentMethod(m)}
            title={`Use ${m.toUpperCase()} as the payment method for this sale.`}
            className={`flex-1 rounded-xl border py-2 text-sm capitalize ${
                paymentMethod === m ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200'
              }`}
            >
              {m === 'cash' && <Banknote className="mx-auto h-4 w-4 mb-1" />}
              {m === 'card' && <CreditCard className="mx-auto h-4 w-4 mb-1" />}
              {m === 'upi' && <Smartphone className="mx-auto h-4 w-4 mb-1" />}
              {m}
            </button>
          ))}
        </div>

        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={!cart.length || (dueAmount > 0 && !customer.phone.trim())}
          loading={checkout.isPending}
          onClick={handleCompleteSale}
          tooltip="Generate UPI payment QR or complete the bill for cash, card, and credit."
        >
          Complete Sale (F12)
        </Button>
      </Card>
      {stockEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <h3 className="text-lg font-bold">Update Stock</h3>
            <p className="mt-1 text-sm text-slate-500">{stockEdit.product.name}</p>
            <Input
              label="Current stock"
              type="number"
              className="mt-4"
              value={stockEdit.quantity}
              onChange={(e) => setStockEdit({ ...stockEdit, quantity: e.target.value })}
            />
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setStockEdit(null)} tooltip="Close without changing stock.">Cancel</Button>
              <Button loading={updateStock.isPending} onClick={() => updateStock.mutate()} tooltip="Save the new stock quantity for this product.">Save</Button>
            </div>
          </div>
        </div>
      )}
      {paymentQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
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
              <Button variant="secondary" onClick={() => setPaymentQr(null)} tooltip="Close without recording this sale.">Cancel</Button>
              <Button loading={checkout.isPending} onClick={() => checkout.mutate()} tooltip="Record this UPI payment and send the bill or open a printable invoice.">
                Payment received
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
