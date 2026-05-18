import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Sí, confirmar"
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isConfirming) onClose()
    }}>
      <DialogContent className="sm:max-w-[400px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Overlay de carga */}
        {isConfirming && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#30b7ff] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Procesando...</p>
            </div>
          </div>
        )}

        <div className="p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 font-display">
              {title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">{message}</p>
        </div>
        <DialogFooter className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            No, editar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white shadow-sm disabled:opacity-50"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}