import * as React from "react";
import { Info, Edit2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export interface ClientData {
  id: string;
  name: string;
  phone: string;
  description: string;
}

interface ClientsTableProps {
  clients: ClientData[];
  onViewClient: (client: ClientData) => void;
  onEditClient: (client: ClientData) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function ClientsTable({
  clients,
  onViewClient,
  onEditClient,
  hasMore,
  onLoadMore,
}: ClientsTableProps) {
  const observerTarget = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, onLoadMore]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="w-[300px] font-semibold text-slate-700 py-4 px-6">
                Nombre
              </TableHead>
              <TableHead className="font-semibold text-slate-700 py-4 px-6">
                Telefono
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700 py-4 px-6">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.id}
                className="border-slate-100 hover:bg-slate-50/50 transition-colors"
              >
                <TableCell className="font-medium text-slate-900 py-4 px-6">
                  {client.name}
                </TableCell>
                <TableCell className="text-slate-600 py-4 px-6">
                  {client.phone == "" ? (
                    <span className="text-slate-400 italic">Sin teléfono</span>
                  ) : (
                    client.phone
                  )}
                </TableCell>

                <TableCell className="text-right py-4 px-6">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onViewClient(client)}
                      title="Ver detalles"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                      onClick={() => onEditClient(client)}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-slate-500"
                >
                  No se encontraron clientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-full px-5 py-2 shadow-sm animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-[#30b7ff]" />
            Cargando más clientes...
          </div>
        </div>
      )}
    </div>
  );
}
