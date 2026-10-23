import type { ProductionSummary } from "./api";

export const PRODUCTION_STATES = ["Impreso", "Planchado", "Procesado"] as const;

export function getProductionStep(production: ProductionSummary): 0 | 1 | 2 {
  if (production.registradas.some((orden) => orden >= 2)) return 2;
  if (production.registradas.includes(1)) return 1;
  return 0;
}

export function getProductionLabel(production: ProductionSummary): string {
  return production.historica_terminada ? "Terminado" : PRODUCTION_STATES[getProductionStep(production)];
}
