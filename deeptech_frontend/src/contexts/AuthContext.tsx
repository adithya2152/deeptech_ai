import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi } from '@/lib/api'

// Helper to normalize role from backend
const normalizeRole = (role: string): 'buyer' | 'expert' | 'admin' => {
  if (role === 'user') return 'buyer'
  return role as 'buyer' | 'expert' | 'admin'
}

// Use 'buyer' in the frontend interface to keep your components happy
interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'buyer' | 'expert' | 'admin'
  email_verified: boolean
  created_at: string
}

interface AuthContextType {
  user: any | null
  profile: Profile | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role: 'buyer' | 'expert', domains?: string[]) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void>  
  updateProfile: (profile: { displayName?: string; photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  const processUserData = (data: any) => {
    if (!data) return null
    // Transform backend 'user' role to 'buyer' for frontend consistency
    return {
      ...data,
      role: normalizeRole(data.role)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')
      if (savedToken) {
        try {
          console.log('🔄 Initializing auth with saved token...')
          const response = await authApi.getProfile(savedToken)
          
          if (response.success && response.data) {
            const userData = processUserData(response.data)
            console.log('✅ Profile loaded:', userData)
            setUser(userData)
            setProfile(userData)
            setToken(savedToken)
          } else {
            console.warn('⚠️ Profile fetch failed:', response)
            handleLogout()
          }
        } catch (err) {
          console.error('❌ Auth initialization error:', err)
          handleLogout()
        }
      } else {
        console.log('ℹ️ No saved token found')
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const handleLogout = () => {
    console.log('🚪 Logging out...')
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setProfile(null)
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting login...')
    const response = await authApi.login(email, password);

    // Backend returns: { success: true, data: { user, tokens: { accessToken, ... } } }
    if (response.success && response.data) {
      const { user, tokens } = response.data;
      const enrichedUser = processUserData(user);

      console.log('✅ Login successful:', { email, role: enrichedUser?.role })
      localStorage.setItem('token', tokens.accessToken);
      setToken(tokens.accessToken);
      setUser(enrichedUser);
      setProfile(enrichedUser);
    } else {
      console.error('❌ Login failed:', response)
      throw new Error(response.message || 'Login failed');
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'buyer' | 'expert',
    domains?: string[]
  ) => {
    const nameParts = name.trim().split(' ')
    const response = await authApi.register({
      email,
      password,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' ') || '',
      role,
      domains: domains || []
    })

    if (response.success && response.data && response.data.tokens && response.data.tokens.accessToken) {
      const userData = processUserData(response.data.user)
      console.log('✅ Registration successful:', { email, role: userData?.role })
      localStorage.setItem('token', response.data.tokens.accessToken)
      setToken(response.data.tokens.accessToken)
      setUser(userData)
      setProfile(userData)
    } else {
      console.error('❌ Registration failed:', response)
      throw new Error(response.message || 'Registration failed')
    }
  }

  const signOut = async () => {
    try {
      if (token) {
        console.log('📡 Calling logout API...')
        await authApi.logout(token)
      }
    } catch (err) {
      console.error('⚠️ Logout API error (continuing anyway):', err)
    } finally {
      handleLogout()
    }
  }

  const updateProfile = async (profileUpdates: { displayName?: string; photoURL?: string }) => {
    if (!token) throw new Error('Not authenticated');
    // You may need to adjust this according to your backend API
    const response = await authApi.updateProfile(token, profileUpdates);
    if (response.success && response.data) {
      const updatedUser = processUserData(response.data);
      setUser(updatedUser);
      setProfile(updatedUser);
    } else {
      throw new Error(response.message || 'Profile update failed');
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, token, isLoading, isAuthenticated: !!token,
      signIn, signUp, signOut, logout: signOut, updateProfile
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}