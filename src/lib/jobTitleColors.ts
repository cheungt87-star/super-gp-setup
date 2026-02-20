// Dynamic color palette for job title badges (10 distinct sets)
const JOB_TITLE_PALETTE = [
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-lime-100 text-lime-700 border-lime-200",
  "bg-sky-100 text-sky-700 border-sky-200",
];

/**
 * Returns a 2-letter abbreviation for a job title.
 * Multi-word titles with a short first word (≤3 chars) use initials: "GP Partner" -> "GP"
 * Otherwise uses first 2 characters: "Surgeon" -> "SU"
 */
export function getJobTitleAbbreviation(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "??";

  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words[0].length <= 3) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

/**
 * Returns Tailwind classes for a job title based on its index in a sorted list.
 * Cycles through the palette deterministically.
 */
export function getJobTitleColorByIndex(index: number): string {
  return JOB_TITLE_PALETTE[index % JOB_TITLE_PALETTE.length];
}

// Legacy function kept for backward compatibility in other components
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
