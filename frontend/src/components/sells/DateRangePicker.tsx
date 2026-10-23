import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangePickerProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return "Fechas"
    return format(date, "dd MMM", { locale: es })
  }

  const displayText = () => {
    if (dateRange.from && dateRange.to) {
      return `${formatDateDisplay(dateRange.from)} - ${formatDateDisplay(dateRange.to)}`
    }
    if (dateRange.from) {
      return `${formatDateDisplay(dateRange.from)} - ...`
    }
    return "Rango de Fechas"
  }

  const handleLimpiar = () => {
    onDateRangeChange({ from: undefined, to: undefined })
    setIsOpen(false)
  }

  const handleAplicar = () => {
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
          className={cn(buttonVariants({ variant: "outline" }), `h-12 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium shadow-sm gap-2 justify-start w-full lg:w-auto ${dateRange.from || dateRange.to ? 'border-sky-700 text-sky-700' : ''}`)}
        >
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          <span className="hidden sm:inline truncate max-w-[150px]">{displayText()}</span>
          <span className="sm:hidden truncate max-w-[80px]">{displayText()}</span>
          {(dateRange.from || dateRange.to) && (
            <X 
              className="h-3 w-3 ml-auto lg:ml-0 text-sky-700"
              onClick={(e) => {
                e.stopPropagation()
                onDateRangeChange({ from: undefined, to: undefined })
              }}
            />
          )}
          <ChevronDown className="h-4 w-4 text-slate-400 ml-auto lg:ml-0" />
        </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white rounded-xl border-slate-200 shadow-lg" align="start">
        <Calendar
          mode="range"
          defaultMonth={dateRange.from}
          selected={dateRange}
          onSelect={(range) => {
            if (range) {
              onDateRangeChange({ from: range.from, to: range.to })
            }
          }}
          numberOfMonths={2}
          locale={es}
          className="rounded-xl"
        />
        <div className="flex justify-end gap-2 p-3 border-t border-slate-100">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLimpiar}
            className="text-slate-500 hover:text-slate-700"
          >
            Limpiar
          </Button>
          <Button 
            size="sm" 
            onClick={handleAplicar}
            className="bg-sky-700 hover:bg-sky-800 text-white"
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
