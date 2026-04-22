import * as React from "react";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClientsToolbarProps {
  onSearch: (term: string) => void;
  onRegisterClick: () => void;
}

export function ClientsToolbar({
  onSearch,
  onRegisterClick,
}: ClientsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div className="relative flex-1 w-full flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="text"
            placeholder="Nombre del Cliente"
            className="pl-10 h-12 rounded-xl border-slate-200 bg-white"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <Button
        onClick={onRegisterClick}
        className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Registrar Cliente
      </Button>
    </div>
  );
}
