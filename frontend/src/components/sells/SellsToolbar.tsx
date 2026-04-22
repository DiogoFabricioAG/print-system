import * as React from "react"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "./DateRangePicker"

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface SellsToolbarProps {
  onSearch: (term: string) => void
  onRegisterClick: () => void
  searchTerm: string
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  statusFilter: string
  onStatusChange: (status: string) => void
}

export function SellsToolbar({ onSearch, onRegisterClick, searchTerm, dateRange, onDateRangeChange, statusFilter, onStatusChange }: SellsToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full">
      <div className="relative flex-1 w-full flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="text"
            placeholder="Buscar por diseño o cliente"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl border-slate-200 bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 w-full lg:w-auto">
        <DateRangePicker 
          dateRange={dateRange} 
          onDateRangeChange={onDateRangeChange} 
        />
      </div>

      <div className="w-full lg:w-auto">
        <select 
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium shadow-sm w-full lg:w-48 focus:outline-none focus:ring-2 focus:ring-[#30b7ff]"
        >
          <option value="">Todos los Estados</option>
          <option value="Sin Cobrar">Sin Cobrar</option>
          <option value="En Producción">En Producción</option>
          <option value="Completado">Completado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      <Button
        onClick={onRegisterClick}
        className="w-full lg:w-auto h-12 px-6 rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white font-semibold shadow-sm gap-2"
      >
        <Plus className="h-4 w-4" />
        Registrar Venta
      </Button>
    </div>
  )
}