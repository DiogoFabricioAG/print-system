import { useEffect, useState } from "react"
import { initAuth, $isAuthenticated, logout } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initAuth()
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!loading && !$isAuthenticated.get()) {
      window.location.href = "/login"
    }
  }, [loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Verificando sesión...</div>
      </div>
    )
  }

  if (!$isAuthenticated.get()) {
    return null
  }

  return <>{children}</>
}

export function LogoutButton() {
  const handleLogout = () => {
    logout()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-slate-500 hover:text-slate-700 text-sm font-medium"
    >
      Salir
    </button>
  )
}
