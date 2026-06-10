/**
 * Dukan Saathi Unified Analytics Wrapper
 * Supports GA4, GTM, and standardized event payloads
 */

import { analytics as libAnalytics } from '@/lib/analytics'

export const trackEvent = (eventName: string, params: Record<string, unknown> = {}) => {
  libAnalytics.trackEvent(eventName, params)
}

export const initializeAnalytics = () => {
  libAnalytics.init()
}

export default {
  trackEvent,
  initializeAnalytics,
}
