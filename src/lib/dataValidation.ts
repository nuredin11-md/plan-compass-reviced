import { MonthlyEntry } from "../types";

export function shouldGenerateFeedback(
  indicatorsList: any[],
  monthlyData: MonthlyEntry[],
  timePeriod: string,
  minDataPoints: number = 0,
  completenessRatio: number = 0.7
) {
  const expectedCount = indicatorsList.length;
  if (expectedCount === 0) {
    return {
      shouldGenerate: false,
      reason: "No active indicators assigned to this department unit."
    };
  }

  // Check how many of these indicators have at least one reported value across any month
  let submittedCount = 0;
  indicatorsList.forEach(ind => {
    const hasSubmissions = monthlyData.some(e => e.code === ind.code && e.actual !== null);
    if (hasSubmissions) {
      submittedCount++;
    }
  });

  const ratio = expectedCount > 0 ? (submittedCount / expectedCount) : 0;
  if (ratio < completenessRatio) {
    return {
      shouldGenerate: false,
      reason: `Insufficient monthly submissions recorded. Only ${submittedCount} of ${expectedCount} indicators have values (${Math.round(ratio * 100)}% completeness, need ${Math.round(completenessRatio * 100)}%).`
    };
  }

  return {
    shouldGenerate: true,
    reason: ""
  };
}

export function validateDepartmentData(monthlyData: MonthlyEntry[]) {
  return { valid: true, errors: [] as string[] };
}
