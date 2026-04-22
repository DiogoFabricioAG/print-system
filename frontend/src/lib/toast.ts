import { toast } from "sonner"

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      style: {
        background: "#dcfce7",
        border: "#86efac",
        color: "#15803d",
        fontSize: "16px",
        fontWeight: 500,
        padding: "16px 20px",
        minWidth: "280px",
      },
      duration: 4000,
    })
  },
  error: (message: string) => {
    toast.error(message, {
      style: {
        background: "#fef2f2",
        border: "#fecaca",
        color: "#e11d48",
        fontSize: "16px",
        fontWeight: 500,
        padding: "16px 20px",
        minWidth: "280px",
      },
      duration: 4000,
    })
  },
  info: (message: string) => {
    toast.info(message, {
      style: {
        background: "#dbeafe",
        border: "#93c5fd",
        color: "#1d4ed8",
        fontSize: "16px",
        fontWeight: 500,
        padding: "16px 20px",
        minWidth: "280px",
      },
      duration: 4000,
    })
  },
}