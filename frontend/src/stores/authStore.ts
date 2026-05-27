import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
  tenant_id?: string
  permissions: string[]
  is_verified: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  lastActivityAt: number | null
  setAuth: (user: User, access: string, refresh: string) => void
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  touchActivity: () => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      lastActivityAt: null,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken, lastActivityAt: Date.now() }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken, lastActivityAt: Date.now() }),
      setUser: (user) => set({ user }),
      touchActivity: () => set({ lastActivityAt: Date.now() }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, lastActivityAt: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'sathi-auth' }
  )
)
