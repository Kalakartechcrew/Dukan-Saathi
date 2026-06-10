/**
 * Dukan Saathi Unified Analytics Wrapper
 * Supports GA4, GTM, Meta Pixel, and Custom BI
 */

type EventParams = Record<string, unknown>

class Analytics {
  private isInitialized = false

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return
    
    // Google Analytics 4 (Placeholder ID)
    const GA_ID = 'G-XXXXXXXXXX'
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    script.async = true
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    window.gtag = function (...args: unknown[]) {
      window.dataLayer.push(args)
    }
    window.gtag('js', new Date())
    window.gtag('config', GA_ID, { send_page_view: true })

    // Meta Pixel (Placeholder)
    // Add initialization logic here if needed

    this.isInitialized = true
    console.log('📊 Analytics initialized')
  }

  pageView(url: string) {
    if (typeof window === 'undefined') return
    window.gtag?.('event', 'page_view', { page_path: url })
  }

  track(event: string, params: EventParams = {}) {
    if (typeof window === 'undefined') return
    
    // Track in GA4
    window.gtag?.('event', event, params)

    // Track in custom BI if needed
    console.log(`[Analytics] ${event}`, params)
  }

  // Specialized Events
  trackSignUp(method: string) {
    this.track('sign_up', { method })
  }

  trackLogin(method: string) {
    this.track('login', { method })
  }

  trackPurchase(planId: string, amount: number, currency: string) {
    this.track('purchase', {
      transaction_id: `TXN_${Date.now()}`,
      value: amount,
      currency: currency,
      items: [{ item_id: planId, item_name: planId }]
    })
  }
}

// Global declaration for window.gtag
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

export const analytics = new Analytics()
