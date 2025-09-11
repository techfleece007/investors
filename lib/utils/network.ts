// Network utility functions for handling connectivity issues

export interface NetworkStatus {
  isOnline: boolean
  connectionType?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
}

export function getNetworkStatus(): NetworkStatus {
  if (typeof navigator === 'undefined') {
    return { isOnline: true }
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  return {
    isOnline: navigator.onLine,
    connectionType: connection?.type,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt
  }
}

export function isSlowConnection(): boolean {
  const status = getNetworkStatus()
  return status.effectiveType === 'slow-2g' || status.effectiveType === '2g' || (status.downlink ? status.downlink < 1 : false)
}


export function setupNetworkMonitoring(callback: (status: NetworkStatus) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleOnline = () => callback(getNetworkStatus())
  const handleOffline = () => callback(getNetworkStatus())

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Also listen for connection changes
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (connection) {
    connection.addEventListener('change', () => callback(getNetworkStatus()))
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (connection) {
      connection.removeEventListener('change', () => callback(getNetworkStatus()))
    }
  }
}

export function getNetworkErrorMessage(error: any): string {
  if (error.name === 'AbortError') {
    return 'Request timeout. Please check your internet connection.'
  }
  
  if (error.message?.includes('fetch')) {
    return 'Network error. Please check your internet connection or try using a VPN.'
  }
  
  if (error.message?.includes('Failed to fetch')) {
    return 'Unable to connect to the server. Please check your internet connection or try using a VPN.'
  }
  
  if (error.message?.includes('NetworkError')) {
    return 'Network error. Please check your connection and try again.'
  }
  
  if (error.message?.includes('CORS')) {
    return 'Cross-origin request blocked. Please try using a VPN or contact support.'
  }
  
  return error.message || 'An unexpected network error occurred.'
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, error)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
