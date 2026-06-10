/**
 * Google Tag Manager Utility
 * Handles initialization and script injection
 */

export const GTM_ID = import.meta.env.VITE_GTM_ID

export function initializeGTM() {
  if (typeof window === 'undefined' || !GTM_ID) return

  // Avoid multiple initializations
  if ((window as any).gtmInitialized) return

  // Google Tag Manager script injection
  ;(function (w: any, d: any, s: string, l: string, i: string) {
    w[l] = w[l] || []
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
    const f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l !== 'dataLayer' ? '&l=' + l : ''
    j.async = true
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
    f.parentNode.insertBefore(j, f)
  })(window, document, 'script', 'dataLayer', GTM_ID)

  // Noscript fallback injection
  const noscript = document.createElement('noscript')
  const iframe = document.createElement('iframe')
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`
  iframe.height = '0'
  iframe.width = '0'
  iframe.style.display = 'none'
  iframe.style.visibility = 'hidden'
  noscript.appendChild(iframe)
  document.body.insertBefore(noscript, document.body.firstChild)

  ;(window as any).gtmInitialized = true
  
  if (import.meta.env.DEV) {
    console.log(`🚀 GTM Initialized: ${GTM_ID}`)
  }
}
