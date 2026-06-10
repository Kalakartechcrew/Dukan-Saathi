/**
 * Dukan Saathi Unified Analytics Wrapper
 * Supports GA4, GTM, and standardized event payloads
 */

import { initializeGTM } from './gtm'

type EventParams = Record<string, unknown>

class Analytics {
  private isInitialized = false

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return
    
    // Initialize GTM
    initializeGTM()

    // Google Analytics 4 (Dual tracking or via GTM)
    const GA_ID = import.meta.env.VITE_GA4_ID
    if (GA_ID && !window.gtag) {
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
    }

    this.isInitialized = true
    if (import.meta.env.DEV) {
      console.log('📊 Analytics layer initialized')
    }
  }

  pageView(url: string, title?: string) {
    if (typeof window === 'undefined') return
    
    // Standard GTM/GA4 Page View
    this.trackEvent('page_view', {
      page_path: url,
      page_title: title || document.title,
      page_location: window.location.href,
    })
  }

  /**
   * Primary tracking method
   * Pushes to GTM dataLayer and GA4 gtag
   */
  trackEvent(eventName: string, params: EventParams = {}) {
    if (typeof window === 'undefined') return
    
    // Standardized Payload as per requirements
    const payload = {
      event: eventName,
      timestamp: Date.now(),
      source: 'dukansaathi',
      ...params,
    }

    // Push to DataLayer (GTM)
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(payload)

    // Direct GA4 track (if gtag available)
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params)
    }

    // Debugging (Dev only) - No console logs in production
    if (import.meta.env.DEV) {
      console.groupCollapsed(`[Analytics] ${eventName}`)
      console.log('Payload:', payload)
      console.groupEnd()
    }
  }

  // Legacy alias for compatibility
  track(event: string, params: EventParams = {}) {
    this.trackEvent(event, params)
  }

  // Specialized Events
  trackSignUp(method: string) {
    this.trackEvent('sign_up', { method })
  }

  trackLogin(method: string) {
    this.trackEvent('login', { method })
  }

  trackLogout() {
    this.trackEvent('logout')
  }

  trackPurchase(planId: string, amount: number, currency: string, transactionId?: string) {
    this.trackEvent('purchase', {
      transaction_id: transactionId || `TXN_${Date.now()}`,
      value: amount,
      currency: currency,
      plan_name: planId,
      items: [{ item_id: planId, item_name: planId }]
    })
  }
}

// Global declaration for window.gtag and dataLayer
declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
    gtmInitialized?: boolean
  }
}

export const analytics = new Analytics()
export default analytics
