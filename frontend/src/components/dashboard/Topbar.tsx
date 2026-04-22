import * as React from "react";
import { ArrowBigLeftDash, Info, LogOut, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigate } from "astro/virtual-modules/transitions-router.js";
interface TopbarProps {
  userName: string;
}

export function Topbar({
  userName,
  inHomePage,
}: TopbarProps & { inHomePage: boolean }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 mb-5 md:py-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Panel Comercial
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
          Bienvenido, {userName}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl cursor-pointer h-11 w-11 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          title="Información del Sistema"
        >
          <Info className="h-5 w-5" />
        </Button>

        <a
          href="https://docs.google.com/spreadsheets/d/12dk7iA95nKlTA8-84oJt7WhjyzLdkQGNQMScdg-sa8A/edit?pli=1&gid=0#gid=0"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl h-11 w-11 border  text-green-700/80 hover:bg-green-200/20 hover:border-green-400/40  transition-colors"
          title="Abrir Sheets"
        >
          <Table className="h-5 w-5" />
        </a>

        <Button
          variant="outline"
          size="icon"
          className="rounded-xl cursor-pointer h-11 w-11 border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
          title={inHomePage ? "Cerrar sesión" : "Volver"}
          onClick={
            inHomePage
              ? () => {
                  console.log(1);
                }
              : () => navigate("/")
          }
        >
          {inHomePage ? (
            <LogOut className="h-5 w-5" />
          ) : (
            <ArrowBigLeftDash className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
