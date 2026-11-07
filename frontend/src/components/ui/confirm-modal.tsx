import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  cancelText?: string
  children?: React.ReactNode
  confirmDisabled?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Sí, confirmar",
  cancelText = "No, editar",
  children,
  confirmDisabled = false,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    if (isConfirming || confirmDisabled) return
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
      <DialogContent showCloseButton={!isConfirming} className="sm:max-w-[400px] max-h-[calc(100dvh-2rem)] grid-rows-[minmax(0,1fr)_auto] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Overlay de carga */}
        {isConfirming && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-[#30b7ff] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Procesando...</p>
            </div>
          </div>
        )}

        <div className="min-h-0 overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 font-display">
              {title}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-base text-slate-600">{message}</DialogDescription>
          {children}
        </div>
        <DialogFooter className="mx-0 bg-slate-50 px-8 py-4 border-t border-slate-100 flex gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
            className="min-h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || confirmDisabled}
            className="min-h-11 rounded-xl bg-sky-700 hover:bg-sky-800 text-white disabled:opacity-50"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
