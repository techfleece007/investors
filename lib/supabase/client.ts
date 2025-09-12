import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration. Please check your environment variables.')
    throw new Error('Supabase configuration is missing')
  }

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
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    }
  )
}
