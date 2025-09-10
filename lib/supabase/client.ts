import { createBrowserClient } from '@supabase/ssr'
import { env, getNetworkConfig } from '@/lib/config/environment'

export function createClient() {
  const networkConfig = getNetworkConfig()
  
  return createBrowserClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {}
      },
      global: {
        headers: {
          'X-Client-Info': 'trading-dashboard-client',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...networkConfig.headers
        }
      }
    }
  )
}