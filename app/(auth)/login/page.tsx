'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react'
import Image from 'next/image'
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Simple online/offline detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Test network connectivity first
      if (!isOnline) {
        setError('No internet connection. Please check your network and try again.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        // Provide specific error messages
        if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.')
        } else if (error.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a few minutes before trying again.')
        } else if (error.message.includes('Failed to fetch')) {
          setError('Network error. Please check your internet connection and try again.')
        } else {
          setError(error.message || 'Login failed. Please try again.')
        }
      } else if (data?.user) {
        router.push('/dashboard')
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError('Network error. Please check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src="/logo.svg"
              alt="Trading Dashboard"
              width={64}
              height={64}
              className="w-16 h-16"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Trading Dashboard
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
          
          {/* Network Status Indicator */}
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm">
            {isOnline ? (
              <div className="flex items-center space-x-1 text-green-600">
                <Wifi className="h-4 w-4" />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-input bg-background rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-input bg-background rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !isOnline}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : !isOnline ? (
                <div className="flex items-center space-x-2">
                  <WifiOff className="h-5 w-5" />
                  <span>No connection</span>
                </div>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign in
                </>
              )}
            </button>
          </div>


        </form>
      </div>
    </div>
  )
}
