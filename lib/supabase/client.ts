import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Validate environment variables
  if (!supabaseAnonKey) {
    console.error('Missing Supabase configuration. Please check your environment variables.')
    throw new Error('Supabase configuration is missing')
  }

  // Use relative URL for the proxy - this works in both dev (localhost:3000) and production
  // In dev: http://localhost:3000/api/supabase
  // In prod: https://investors-nu.vercel.app/api/supabase
  const supabaseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/supabase`
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Ensure Supabase URL is properly formatted
  const formattedUrl = supabaseUrl.endsWith('/') 
    ? supabaseUrl.slice(0, -1) 
    : supabaseUrl

  return createBrowserClient(
    formattedUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const cookies = document.cookie.split(';')
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`))
          if (!cookie) return undefined
          // Handle cookies with '=' in the value (like JWTs)
          const eqIndex = cookie.indexOf('=')
          return eqIndex !== -1 ? cookie.substring(eqIndex + 1) : undefined
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          // Don't set secure flag on localhost
          const isLocalhost = typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          
          const cookieOptions = [
            `path=${options?.path || '/'}`,
            `max-age=${options?.maxAge || 60 * 60 * 24 * 7}`,
            `samesite=${options?.sameSite || 'lax'}`,
            ...(!isLocalhost && options?.secure ? ['secure'] : []),
          ].join('; ')
          document.cookie = `${name}=${value}; ${cookieOptions}`
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          const cookieOptions = [
            `path=${options?.path || '/'}`,
            'max-age=0',
            `samesite=${options?.sameSite || 'lax'}`,
          ].join('; ')
          document.cookie = `${name}=; ${cookieOptions}`
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit'
      }
    }
  )
}
