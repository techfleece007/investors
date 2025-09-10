// Environment configuration for different deployment scenarios

export interface EnvironmentConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  isDevelopment: boolean
  isProduction: boolean
  baseUrl: string
  apiTimeout: number
  retryAttempts: number
  retryDelay: number
}

function getEnvironmentConfig(): EnvironmentConfig {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Get Supabase configuration from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  // Determine base URL based on environment
  let baseUrl = 'http://localhost:3000'
  if (isProduction) {
    baseUrl = 'https://investors-nu.vercel.app'
  }
  
  // Configuration for different environments
  const config: EnvironmentConfig = {
    supabaseUrl,
    supabaseAnonKey,
    isDevelopment,
    isProduction,
    baseUrl,
    apiTimeout: isDevelopment ? 30000 : 15000, // Longer timeout in development
    retryAttempts: isDevelopment ? 5 : 3, // More retries in development
    retryDelay: isDevelopment ? 1000 : 2000, // Shorter delay in development
  }
  
  return config
}

export const env = getEnvironmentConfig()

// Validate required environment variables
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!env.supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  
  if (!env.supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  }
  
  if (env.supabaseUrl && !env.supabaseUrl.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must use HTTPS')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Get network configuration based on environment
export function getNetworkConfig() {
  return {
    timeout: env.apiTimeout,
    retryAttempts: env.retryAttempts,
    retryDelay: env.retryDelay,
    // Add additional headers for production
    headers: {
      'X-Environment': env.isProduction ? 'production' : 'development',
      'X-App-Version': process.env.npm_package_version || '1.0.0',
    }
  }
}

// Log environment information (only in development)
export function logEnvironmentInfo() {
  if (env.isDevelopment) {
    console.log('Environment Configuration:', {
      environment: env.isProduction ? 'production' : 'development',
      baseUrl: env.baseUrl,
      supabaseUrl: env.supabaseUrl,
      hasAnonKey: !!env.supabaseAnonKey,
      apiTimeout: env.apiTimeout,
      retryAttempts: env.retryAttempts,
    })
  }
}
