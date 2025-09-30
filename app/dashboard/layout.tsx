'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Package, 
  ShoppingCart, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  FileText,
  Menu, 
  X,
  LogOut
} from 'lucide-react'

const navigation = [
  { name: 'Products', href: '/dashboard', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Shipments', href: '/dashboard/shipments', icon: Truck },
  { name: 'Expenses', href: '/dashboard/expenses', icon: DollarSign },
  { name: 'Profits', href: '/dashboard/profits', icon: TrendingUp },
  { name: 'Notes', href: '/dashboard/notes', icon: FileText },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h1 className="text-xl font-bold text-foreground">Trading Dashboard</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-card border-r border-border">
          <div className="flex items-center p-4 border-b border-border">
            <h1 className="text-xl font-bold text-foreground">Trading Dashboard</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
