import * as React from "react"
import { toast as sonnerToast, Toast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function toast({ title, description, variant = "default" }: ToastProps) {
  sonnerToast[variant === "destructive" ? "error" : "success"](title, {
    description,
  })
}

export function useToast() {
  return {
    toast: toast,
    dismiss: sonnerToast.dismiss,
  }
} 