import type { ProductionSummary } from "./api";

export const PRODUCTION_STATES = ["Impreso", "Planchado", "Procesado", "Terminado"] as const;

export function getProductionStep(production: ProductionSummary): 0 | 1 | 2 | 3 {
  if (production.historica_terminada || production.registradas.includes(3)) return 3;
  if (production.registradas.some((orden) => orden >= 2)) return 2;
  if (production.registradas.includes(1)) return 1;
  return 0;
}
