import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import { Skeleton } from '@/components/ui/Skeleton'

export function PublicBillPage() {
  const { invoiceId } = useParams()
  const [params] = useSearchParams()
  const [html, setHtml] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!invoiceId || !token) {
      setError('This bill link is incomplete.')
      return
    }

    api.get(`/billing/public/invoices/${invoiceId}/html`, {
      params: { token },
      responseType: 'text',
      transformResponse: [(data) => data],
    })
      .then((res) => setHtml(res.data))
      .catch(() => setError('This bill link is invalid or expired.'))
  }, [invoiceId, params])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bill unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!html) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    )
  }

  return <iframe title="Bill" srcDoc={html} className="h-screen w-screen border-0 bg-white" />
}
