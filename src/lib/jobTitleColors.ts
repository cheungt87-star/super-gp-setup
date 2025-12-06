export function getJobTitleColors(jobTitleName: string | null | undefined): string {
  const lowerName = (jobTitleName ?? "").toLowerCase();
  
  if (lowerName.includes("gp partner")) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (lowerName.includes("salaried gp") || lowerName === "gp") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  if (lowerName.includes("manager")) {
    return "bg-purple-100 text-purple-700 border-purple-200";
  }
  if (lowerName.includes("nurse")) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  if (lowerName.includes("healthcare assistant") || lowerName === "hca") {
    return "bg-teal-100 text-teal-700 border-teal-200";
  }
  if (lowerName.includes("receptionist") || lowerName.includes("admin")) {
    return "bg-rose-100 text-rose-700 border-rose-200";
  }
  
  return "bg-gray-100 text-gray-700 border-gray-200";
}
