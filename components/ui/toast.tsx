'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning"
  duration?: number
  onClose?: () => void
}

export function Toast({ title, description, variant = "default", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed z-50 w-full max-w-sm rounded-sm border bg-background shadow-md animate-fade-in",
        {
          "border-border": variant === "default",
          "border-green-500/50 bg-green-500/10": variant === "success",
          "border-destructive bg-destructive/10": variant === "error",
          "border-yellow-500/50 bg-yellow-500/10": variant === "warning",
        }
      )}
    >
      <div className="p-4">
        {title && (
          <div className={cn("font-semibold text-foreground")}>
            {title}
          </div>
        )}
        {description && (
          <div className={cn("text-sm mt-1 text-muted-foreground")}>
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

// Toast Provider Context
interface ToastContextType {
  toasts: Array<ToastProps & { id: string }>
  addToast: (toast: ToastProps) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: string }>>([])

  const addToast = React.useCallback((toast: ToastProps) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = React.useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
