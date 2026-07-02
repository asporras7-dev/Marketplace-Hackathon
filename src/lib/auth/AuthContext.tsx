// prettier-ignore
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { normalizeRole } from '@/lib/auth/roles'

export const FWD_STORAGE_KEYS = {
  PROJECTS: 'fwd_projects',
  APPLICATIONS: 'fwd_applications',
  COMPANIES: 'fwd_companies',
  STUDENT_SKILLS: 'fwd_student_skills',
  STUDENT_PORTFOLIO: 'fwd_student_portfolio',
  ROLE: 'fwd_role',
} as const

interface AuthContextType {
  currentUser: User | null
  userRole: UserRole | null
  displayName: string | null
  avatarUrl: string | null
  setUserRole: (role: UserRole) => void
  resetAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  initialRole = null,
}: {
  children: React.ReactNode
  initialRole?: UserRole | null
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userRole, setUserRoleState] = useState<UserRole | null>(initialRole)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Rol autoritativo provisto por el servidor (layout raíz). Se re-afirma
  // cuando cambia entre navegaciones para ganar sobre el valor en memoria o el
  // almacenado localmente, de modo que el rol real del servidor siempre prime.
  // Si el servidor devuelve null (sin rol), se limpia el caché local para no
  // pintar la UI de egresado/empresario a un usuario sin onboarding.
  useEffect(() => {
    setUserRoleState(initialRole)
    if (initialRole === null) {
      localStorage.removeItem(FWD_STORAGE_KEYS.ROLE)
      if (typeof window !== 'undefined') {
        document.cookie =
          'fwd_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    }
  }, [initialRole])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      setCurrentUser(user)
      if (user) {
        const { data: roleRaw } = await supabase.rpc('get_my_role')
        const role = normalizeRole(roleRaw)
        setUserRoleState(role)
        if (!role) {
          localStorage.removeItem(FWD_STORAGE_KEYS.ROLE)
        }

        const { data: profile } = await supabase
          .from('usuarios')
          .select('nombre, apellido_1, foto_perfil')
          .eq('id_usuario', user.id)
          .maybeSingle()

        if (profile) {
          setDisplayName(`${profile.nombre} ${profile.apellido_1}`.trim())
          setAvatarUrl(profile.foto_perfil ?? null)
        }
      } else {
        setUserRoleState(null)
        setDisplayName(null)
        setAvatarUrl(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userRole) return
    localStorage.setItem(FWD_STORAGE_KEYS.ROLE, userRole)
    if (typeof window !== 'undefined') {
      document.cookie = `fwd_role=${userRole}; path=/; max-age=31536000; SameSite=Lax`
    }
  }, [userRole])

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role)
  }

  const resetAuth = () => {
    const supabase = createSupabaseBrowserClient()
    void supabase.auth.signOut().then(() => {
      Object.values(FWD_STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key),
      )
      if (typeof window !== 'undefined') {
        document.cookie =
          'fwd_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
      setCurrentUser(null)
      setUserRoleState(null)
      setDisplayName(null)
      setAvatarUrl(null)
    })
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        displayName,
        avatarUrl,
        setUserRole,
        resetAuth,
      }}
    >
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
