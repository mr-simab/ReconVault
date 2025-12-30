export function calculateRisk(analysis) {
  if (analysis.critical.length > 0) return "Critical";
  if (analysis.exposureCount > 3) return "High";
  if (analysis.exposureCount > 1) return "Medium";
  return "Low";
}
