import { INITIAL_INDICATORS, ETHIOPIAN_MONTHS } from "./initialData";
import { MonthlyEntry } from "../types";

export type { MonthlyEntry };

export interface HospitalIndicator {
  code: string;
  programArea: string;
  subProgram: string;
  indicator: string;
  unit: string;
  baseline: number;
  target: number;
  department: string;
}

// Map INITIAL_INDICATORS to the structure used by the user's templates
export const indicators = INITIAL_INDICATORS.map(ind => ({
  code: ind.code,
  programArea: ind.department, // maps to department
  subProgram: ind.category,    // maps to category
  indicator: ind.name,         // maps to name
  unit: ind.unit,
  baseline: ind.perf2017,
  target: ind.plan2018,
  department: ind.department
}));

export const MONTHS = ETHIOPIAN_MONTHS;

export function getActualYTD(code: string, monthlyData: MonthlyEntry[]): number {
  const reports = monthlyData.filter(e => e.code === code && e.actual !== null);
  if (reports.length === 0) return 0;
  const sum = reports.reduce((acc, curr) => acc + (curr.actual || 0), 0);
  return Math.round(sum / reports.length);
}

export function getStatus(percent: number): "green" | "yellow" | "red" {
  if (percent >= 90) return "green";
  if (percent >= 70) return "yellow";
  return "red";
}

export function getProgramAreas(): string[] {
  // Extract unique departments/program areas
  const areas = new Set(INITIAL_INDICATORS.map(ind => ind.department));
  return Array.from(areas);
}
