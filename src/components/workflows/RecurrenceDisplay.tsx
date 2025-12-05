interface RecurrenceDisplayProps {
  pattern: "daily" | "weekly" | "monthly" | "custom";
  intervalDays?: number | null;
}

const RecurrenceDisplay = ({ pattern, intervalDays }: RecurrenceDisplayProps) => {
  switch (pattern) {
    case "daily":
      return <span>Daily</span>;
    case "weekly":
      return <span>Weekly</span>;
    case "monthly":
      return <span>Monthly</span>;
    case "custom":
      return <span>Every {intervalDays || 1} days</span>;
    default:
      return <span>{pattern}</span>;
  }
};

export default RecurrenceDisplay;
