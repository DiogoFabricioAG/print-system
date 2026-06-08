import * as React from "react";
import { ShoppingBag, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navigate } from "astro/virtual-modules/transitions-router.js";

export function NavigationPanel() {
  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-slate-800">
          Accesos Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          onClick={() => navigate("/ventas")}
          className="w-full h-14 text-sm justify-start gap-3 bg-[#30b7ff] hover:bg-[#209fdf] text-white rounded-xl shadow-sm transition-all"
        >
          <div className="bg-white/20 p-2 rounded-lg">
            <ShoppingBag className="h-4 w-4" />
          </div>
          Ver Ventas
        </Button>
        <Button
          onClick={() => navigate("/clientes")}
          className="w-full bg-white h-14 text-sm justify-start gap-3 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all"
        >
          <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
            <Users className="h-4 w-4" />
          </div>
          Ver Clientes
        </Button>
        <Button
          onClick={() => navigate("/compras")}
          className="w-full bg-white h-14 text-sm justify-start gap-3 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all"
        >
          <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
            <Package className="h-4 w-4" />
          </div>
          Ver Compras
        </Button>
      </CardContent>
    </Card>
  );
}
