import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SaleItem {
  id: string;
  client: string;
  amount: number;
  status: string;
  date: string;
}

interface UnpaidSalesCarouselProps {
  sales?: SaleItem[];
}

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    "Debe": "bg-[#ff9f43]/10 text-[#ff9f43] hover:bg-[#ff9f43]/20",
    "En Producción": "bg-[#30b7ff]/10 text-[#30b7ff] hover:bg-[#30b7ff]/20",
  };
  return styles[status] || "bg-slate-100 text-slate-600";
};

export function UnpaidSalesCarousel({ sales = [] }: UnpaidSalesCarouselProps) {
  const displaySales =
    sales.length > 0
      ? sales
      : [
          {
            id: "V-001",
            client: "Cargando...",
            amount: 0,
            status: "Debe",
            date: "2026-04-21",
          },
        ];

  return (
    <Card className="h-full border-slate-200 shadow-sm bg-white flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-800">
          Ultimas Ventas
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Acciones pendientes de pago
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center px-10 relative">
        <Carousel className="w-full" opts={{ align: "start", loop: false }}>
          <CarouselContent className="-ml-4">
            {displaySales.map((sale) => (
              <CarouselItem
                key={sale.id}
                className="pl-4 select-none md:basis-1/2 lg:basis-1/3"
              >
                <div className="flex flex-col  justify-between p-4 border border-slate-200 bg-slate-50/50 rounded-xl h-32 hover:border-[#30b7ff]/40 hover:shadow-sm transition-all group">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-700 text-sm truncate group-hover:text-slate-900">
                      {sale.client}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] uppercase tracking-wider font-bold ${getStatusBadge(sale.status)}`}
                    >
                      {sale.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-400 font-medium">
                      {sale.date}
                    </span>
                    <span className="font-bold text-lg text-slate-800 tabular-nums">
                      S/ {sale.amount.toLocaleString("es-PE")}
                    </span>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute -left-8 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50" />
          <CarouselNext className="absolute -right-8 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50" />
        </Carousel>
      </CardContent>
    </Card>
  );
}
