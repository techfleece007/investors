// Mobile-specific utilities for better compatibility

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android/.test(navigator.userAgent)
}

export function getMobileBrowserInfo(): { browser: string; version: string } {
  if (typeof window === 'undefined') return { browser: 'unknown', version: 'unknown' }
  
  const userAgent = navigator.userAgent
  
  if (userAgent.includes('Chrome')) {
    return { browser: 'Chrome', version: userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown' }
  }
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return { browser: 'Safari', version: userAgent.match(/Version\/(\d+)/)?.[1] || 'unknown' }
  }
  if (userAgent.includes('Firefox')) {
    return { browser: 'Firefox', version: userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown' }
  }
  
  return { browser: 'unknown', version: 'unknown' }
}

export function logMobileInfo(): void {
  if (typeof window === 'undefined') return
  
  const mobileInfo = {
    isMobile: isMobileDevice(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    browser: getMobileBrowserInfo(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    cookiesEnabled: navigator.cookieEnabled,
    online: navigator.onLine
  }
  
  console.log('Mobile Device Info:', mobileInfo)
}

export function setupMobileErrorHandling(): void {
  if (typeof window === 'undefined') return
  
  // Log mobile info on load
  logMobileInfo()
  
  // Handle online/offline events
  window.addEventListener('online', () => {
    console.log('Device came online')
    // Optionally refresh data
    window.dispatchEvent(new CustomEvent('mobile-online'))
  })
  
  window.addEventListener('offline', () => {
    console.log('Device went offline')
    // Optionally show offline message
    window.dispatchEvent(new CustomEvent('mobile-offline'))
  })
  
  // Handle visibility change (app switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('App became visible')
      // Optionally refresh data when app becomes visible
      window.dispatchEvent(new CustomEvent('mobile-visible'))
    }
  })
}

export function getMobileCookieSettings(): {
  sameSite: 'lax' | 'strict' | 'none'
  secure: boolean
  domain?: string
} {
  const isProduction = typeof window !== 'undefined' && 
    window.location.hostname === 'investors-ashen.vercel.app'
  
  const isHttps = typeof window !== 'undefined' && 
    window.location.protocol === 'https:'
  
  return {
    sameSite: 'lax', // More mobile-friendly
    secure: isProduction && isHttps,
    domain: isProduction ? '.vercel.app' : undefined
  }
}
