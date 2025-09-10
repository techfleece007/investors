import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env, getNetworkConfig } from '@/lib/config/environment'

export function createClient() {
  const cookieStore = cookies()
  const networkConfig = getNetworkConfig()

  return createServerClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            // Mobile-friendly cookie options
            const mobileFriendlyOptions = {
              ...options,
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false // Allow client-side access for mobile compatibility
            }
            cookieStore.set(name, value, mobileFriendlyOptions)
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            const mobileFriendlyOptions = {
              ...options,
              maxAge: 0,
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false
            }
            cookieStore.set(name, '', mobileFriendlyOptions)
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
