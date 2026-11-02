import type { Metadata } from "next";
import { ReportsView } from "@/views/ReportsView";

export const metadata: Metadata = {
  title: "Reports | Patidar Stone Crusher",
  description: "Monthly sales, income, expenses and pending udhaar at a glance",
};

export default function ReportsPage() {
  return <ReportsView />;
}
