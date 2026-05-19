import { indicators, getActualYTD, getStatus } from "../data/hospitalIndicators";
import { MonthlyEntry } from "../types";

export function getDepartmentFeedbackData(monthlyData: MonthlyEntry[]) {
  const depts = Array.from(new Set(indicators.map(i => i.programArea)));
  return depts.map(dept => {
    const deptInds = indicators.filter(i => i.programArea === dept);
    let totalPct = 0;
    
    const details = deptInds.map(ind => {
      const actual = getActualYTD(ind.code, monthlyData);
      const percent = ind.target === 0 ? 0 : Math.round((actual / ind.target) * 100);
      const status = getStatus(percent);
      totalPct += percent;
      
      return {
        code: ind.code,
        indicator: ind.indicator,
        target: ind.target,
        actual,
        percent,
        status
      };
    });

    const avgPercent = deptInds.length > 0 ? Math.round(totalPct / deptInds.length) : 0;
    const status = getStatus(avgPercent);

    return {
      area: dept,
      avgPercent,
      status,
      details
    };
  });
}

export function getPeriodicPerformanceFeedback(
  monthlyData: MonthlyEntry[], 
  periodType: "monthly" | "quarterly" | "semiannual" | "annual"
) {
  const depts = Array.from(new Set(indicators.map(i => i.programArea)));
  
  return depts.map(dept => {
    const deptInds = indicators.filter(i => i.programArea === dept);
    
    let totalTarget = 0;
    let totalActual = 0;
    
    const mappedInds = deptInds.map(ind => {
      const actualVal = getActualYTD(ind.code, monthlyData);
      const targetVal = ind.target;
      
      totalTarget += targetVal;
      totalActual += actualVal;
      
      const variancePercent = targetVal === 0 
        ? 0 
        : Math.round(((actualVal - targetVal) / targetVal) * 100);
        
      const status = getStatus(targetVal === 0 ? 0 : Math.round((actualVal / targetVal) * 100));
      const hasIssue = variancePercent < -15;
      
      return {
        code: ind.code,
        indicator: ind.indicator,
        target: targetVal,
        actual: actualVal,
        variancePercent,
        status,
        hasIssue,
        severity: variancePercent < -25 ? ("critical" as const) : ("normal" as const)
      };
    });
    
    const avgTarget = deptInds.length > 0 ? (totalTarget / deptInds.length) : 0;
    const avgActual = deptInds.length > 0 ? (totalActual / deptInds.length) : 0;
    const variancePercent = avgTarget === 0 
      ? 0 
      : Math.round(((avgActual - avgTarget) / avgTarget) * 100);
      
    const status = getStatus(avgTarget === 0 ? 0 : Math.round((avgActual / avgTarget) * 100));
    const hasIssue = variancePercent < -15;
    const criticalCount = mappedInds.filter(i => i.severity === "critical").length;
    
    let recommendation = "Performance is stable. Maintain current surveillance metrics and supply chains.";
    if (variancePercent < -20) {
      recommendation = "Critical deficit warned. Host a departmental review to reallocate clinical staff or request additional medical supplies immediately.";
    } else if (variancePercent < 0) {
      recommendation = "Service slightly trailing. Focus on tracking dropout rates and performing outreach campaigns to restore targets.";
    } else if (variancePercent > 10) {
      recommendation = "Excellent coverage results. Document operational protocols to share best practices across regional hospital bureaus.";
    }

    return {
      area: dept,
      period: periodType,
      target: avgTarget,
      actual: avgActual,
      variancePercent,
      status,
      hasIssue,
      recommendation,
      criticalCount,
      indicators: mappedInds
    };
  });
}

export function exportToPDF(title: string, headers: string[], rows: any[][], filename: string) {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.map(h => `"${h}"`).join(","), ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.map(h => `"${h}"`).join(","), ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(sheets: Array<{ name: string, data: any[] }>, filename: string) {
  const excelFallbackText = sheets.map(sheet => {
    if (sheet.data.length === 0) return `--- ${sheet.name} (No Data) ---`;
    const headers = Object.keys(sheet.data[0]);
    return `--- ${sheet.name} ---\n` + [headers.join(","), ...sheet.data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(","))].join("\n");
  }).join("\n\n");
  
  const blob = new Blob([excelFallbackText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
