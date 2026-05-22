import { toast } from "sonner"

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      style: {
        background: "#dcfce7",
        borderColor: "#86efac",
        color: "#15803d",
      },
    })
  },
  error: (message: string) => {
    toast.error(message, {
      style: {
        background: "#fef2f2",
        borderColor: "#fecaca",
        color: "#e11d48",
      },
    })
  },
  info: (message: string) => {
    toast.info(message, {
      style: {
        background: "#dbeafe",
        borderColor: "#93c5fd",
        color: "#1d4ed8",
      },
    })
  },
}