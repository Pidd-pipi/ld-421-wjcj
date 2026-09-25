import { Tag } from "antd";

const colorMap: Record<string, string> = {
  Available: "green",
  Approved: "green",
  Returned: "green",
  Pass: "green",
  Pending: "gold",
  InUse: "blue",
  Maintenance: "orange",
  NeedsFollowUp: "orange",
  Rejected: "red",
  Overdue: "red",
  Lost: "red",
  Fail: "red",
  Retired: "default",
  Cancelled: "default"
};

export function StatusBadge({ value }: { value: string }) {
  return <Tag color={colorMap[value] ?? "default"}>{value}</Tag>;
}
