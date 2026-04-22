import { atom } from "nanostores"

export interface User {
  id: number
  username: string
}

export const $user = atom<User | null>(null)
export const $isAuthenticated = atom<boolean>(false)

export function setUser(user: User | null) {
  $user.set(user)
  $isAuthenticated.set(!!user)
  if (user) {
    localStorage.setItem("printsystem_user", JSON.stringify(user))
  } else {
    localStorage.removeItem("printsystem_user")
  }
}

export function initAuth() {
  const stored = localStorage.getItem("printsystem_user")
  if (stored) {
    try {
      const user = JSON.parse(stored)
      setUser(user)
    } catch {
      setUser(null)
    }
  }
}

export function logout() {
  setUser(null)
  window.location.href = "/login"
}
