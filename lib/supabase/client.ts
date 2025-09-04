import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          'X-Client-Info': 'mobile-friendly-client'
        }
      }
    }
  )
}
