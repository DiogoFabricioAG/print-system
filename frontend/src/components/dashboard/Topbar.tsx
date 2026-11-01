import * as React from "react";
import { ArrowBigLeftDash, Info, LogOut, Table, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigate } from "astro/virtual-modules/transitions-router.js";
import { authApi } from "@/lib/api";
import { setUser } from "@/lib/auth";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface TopbarProps {
  inHomePage?: boolean;
}

export function Topbar({ inHomePage = false }: TopbarProps) {
  const [userName, setUserName] = React.useState<string>("");
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  async function logout() {
    await authApi.logout().catch(() => undefined);
    setUser(null);
    window.location.replace("/login");
  }

  React.useEffect(() => {
    const stored = localStorage.getItem("printsystem_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setUserName(user.username || "");
      } catch {
        setUserName("");
      }
    }
  }, []);

  const displayName = React.useMemo(() => {
    if (!userName) return "Usuario";
    return userName.replace(/\d+$/, "");
  }, [userName]);

  return (
    <><div className="flex flex-col gap-4 bg-white rounded-2xl px-4 py-4 mb-5 border border-slate-200 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 md:py-6">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Panel Comercial
        </span>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
          Bienvenido, {displayName}
        </h1>
      </div>

      <div className="relative flex items-center justify-end gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl h-11 w-11 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          title="Buscador de Archivos"
          onClick={() => navigate("/buscador")}
        >
          <SearchIcon className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="rounded-xl h-11 w-11 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          title="Información del Sistema"
        >
          <Info className="h-5 w-5" />
        </Button>

        <a
          href="https://docs.google.com/spreadsheets/d/12dk7iA95nKlTA8-84oJt7WhjyzLdkQGNQMScdg-sa8A/edit?pli=1&gid=0#gid=0"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl h-11 w-11 bg-green-600 hover:bg-green-700 text-white transition-colors"
          title="Abrir Sheets"
        >
          <Table className="h-5 w-5" />
        </a>

        <Button
          variant="outline"
          size="icon"
          className={`rounded-xl h-11 w-11 border-slate-200 transition-colors ${inHomePage ? "text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" : "text-slate-600 hover:bg-slate-100"}`}
          title={inHomePage ? "Cerrar sesión" : "Volver a inicio"}
          aria-label={inHomePage ? "Cerrar sesión" : "Volver a inicio"}
          onClick={
            inHomePage
              ? () => setLogoutOpen(true)
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
    <ConfirmModal
      isOpen={logoutOpen}
      onClose={() => setLogoutOpen(false)}
      onConfirm={logout}
      title="¿Cerrar sesión?"
      message="Vas a salir de tu cuenta. Tendrás que iniciar sesión de nuevo para continuar."
      confirmText="Cerrar sesión"
      cancelText="Cancelar"
    /></>
  );
}
