'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, AuthState, User } from './simple-auth'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  getCurrentUser: () => User | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  })

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = auth.subscribe((state) => {
      setAuthState(state)
    })

    // Cleanup subscription on unmount
    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    return await auth.signIn(email, password)
  }

  const signOut = async () => {
    await auth.signOut()
  }

  const getCurrentUser = () => {
    return auth.getCurrentUser()
  }

  const value: AuthContextType = {
    ...authState,
    signIn,
    signOut,
    getCurrentUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
