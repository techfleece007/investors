// Simple authentication system for two users (Shady and Tamer)
// No external dependencies, works offline, easy to access from anywhere

export interface User {
  id: string
  name: string
  email: string
  role: 'investor'
  profitShare: number // percentage
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Predefined users
const USERS: User[] = [
  {
    id: 'shady',
    name: 'Shady',
    email: 'prvyit@gmail.com',
    role: 'investor',
    profitShare: 80
  },
  {
    id: 'tamer',
    name: 'Tamer', 
    email: 'qudaih.tamer@gmail.com',
    role: 'investor',
    profitShare: 20
  }
]

// Simple credentials (in a real app, these would be hashed)
const CREDENTIALS = {
  'prvyit@gmail.com': 'prvyit007',
  'qudaih.tamer@gmail.com': 'tamer1234'
}

export class SimpleAuth {
  private static instance: SimpleAuth
  private listeners: Set<(state: AuthState) => void> = new Set()
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false
  }

  private constructor() {
    // Check for existing session on initialization
    this.checkExistingSession()
  }

  static getInstance(): SimpleAuth {
    if (!SimpleAuth.instance) {
      SimpleAuth.instance = new SimpleAuth()
    }
    return SimpleAuth.instance
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    // Immediately call with current state
    listener(this.state)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  // Update state and notify listeners
  private setState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState }
    this.notifyListeners()
  }

  // Check for existing session in localStorage
  private checkExistingSession() {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      this.setState({ isLoading: false })
      return
    }

    try {
      const storedUser = localStorage.getItem('trading-dashboard-user')
      if (storedUser) {
        const user = JSON.parse(storedUser) as User
        // Verify user still exists in our user list
        const validUser = USERS.find(u => u.id === user.id)
        if (validUser) {
          this.setState({
            user: validUser,
            isAuthenticated: true,
            isLoading: false
          })
        } else {
          this.clearSession()
        }
      } else {
        this.setState({ isLoading: false })
      }
    } catch (error) {
      console.error('Error checking existing session:', error)
      this.clearSession()
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true })

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check credentials
      const storedPassword = CREDENTIALS[email as keyof typeof CREDENTIALS]
      if (!storedPassword || storedPassword !== password) {
        this.setState({ isLoading: false })
        return { success: false, error: 'Invalid email or password' }
      }

      // Find user
      const user = USERS.find(u => u.email === email)
      if (!user) {
        this.setState({ isLoading: false })
        return { success: false, error: 'User not found' }
      }

      // Store session
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading-dashboard-user', JSON.stringify(user))
      }
      
      this.setState({
        user,
        isAuthenticated: true,
        isLoading: false
      })

      return { success: true }
    } catch (error) {
      this.setState({ isLoading: false })
      return { success: false, error: 'An error occurred during sign in' }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    this.clearSession()
  }

  // Clear session
  private clearSession() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trading-dashboard-user')
    }
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    })
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.state.user
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  // Get current state
  getState(): AuthState {
    return { ...this.state }
  }
}

// Export singleton instance
export const auth = SimpleAuth.getInstance()
