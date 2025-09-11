import { createBrowserClient } from '@supabase/ssr'
import { env, getNetworkConfig } from '@/lib/config/environment'

export function createClient() {
  const networkConfig = getNetworkConfig()
  
  // Validate environment variables
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    console.error('Missing Supabase configuration. Please check your environment variables.')
    throw new Error('Supabase configuration is missing')
  }

  // Ensure Supabase URL is properly formatted
  const supabaseUrl = env.supabaseUrl.endsWith('/') 
    ? env.supabaseUrl.slice(0, -1) 
    : env.supabaseUrl

  return createBrowserClient(
    supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const cookies = document.cookie.split(';')
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`))
          return cookie ? cookie.split('=')[1] : undefined
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          const cookieOptions = [
            `path=${options?.path || '/'}`,
            `max-age=${options?.maxAge || 60 * 60 * 24 * 7}`,
            `samesite=${options?.sameSite || 'lax'}`,
            ...(options?.secure ? ['secure'] : []),
            ...(options?.domain ? [`domain=${options.domain}`] : [])
          ].join('; ')
          document.cookie = `${name}=${value}; ${cookieOptions}`
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          const cookieOptions = [
            `path=${options?.path || '/'}`,
            'max-age=0',
            `samesite=${options?.sameSite || 'lax'}`,
            ...(options?.secure ? ['secure'] : []),
            ...(options?.domain ? [`domain=${options.domain}`] : [])
          ].join('; ')
          document.cookie = `${name}=; ${cookieOptions}`
        }
      },
      auth: {
        // Mobile-friendly auth settings
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Prevent issues with mobile browsers
        flowType: 'pkce' // More secure and mobile-friendly
      },
      global: {
        headers: {
          'X-Client-Info': 'trading-dashboard-client',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...networkConfig.headers
        }
      },
      // Add database configuration for better connection handling
      db: {
        schema: 'public'
      },
      // Add realtime configuration
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  )
}
