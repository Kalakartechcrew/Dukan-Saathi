import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { analytics } from '@/lib/analytics'

export function useTracking() {
  const location = useLocation()

  useEffect(() => {
    // Initialize analytics once
    analytics.init()
  }, [])

  useEffect(() => {
    // Track page views on route change
    analytics.pageView(location.pathname + location.search)

    // Capture UTM parameters
    const params = new URLSearchParams(location.search)
    const utms = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
    }

    // Save found UTMs to sessionStorage for lead attribution
    Object.entries(utms).forEach(([key, value]) => {
      if (value) {
        sessionStorage.setItem(key, value)
      }
    })
  }, [location])
}
