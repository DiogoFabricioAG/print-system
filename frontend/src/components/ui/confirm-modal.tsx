import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
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
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            No, editar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white shadow-sm"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}