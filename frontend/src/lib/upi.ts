interface UpiShop {
  name?: string
  currency?: string
  payment?: {
    upi_id?: string | null
    upi_name?: string | null
  } | null
}

export function buildUpiPaymentUri(shop: UpiShop | undefined, amount: number, note: string) {
  const upiId = shop?.payment?.upi_id?.trim()
  if (!upiId || amount <= 0) return ''
  const params = new URLSearchParams({
    pa: upiId,
    pn: shop?.payment?.upi_name || shop?.name || 'Shop',
    am: amount.toFixed(2),
    cu: shop?.currency || 'INR',
    tn: note,
  })
  return `upi://pay?${params.toString()}`
}

export function shopHasUpi(shop: UpiShop | undefined) {
  return Boolean(shop?.payment?.upi_id?.trim())
}
