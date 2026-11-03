import type { Metadata } from "next";
import { OldPaymentsView } from "@/views/OldPaymentsView";

export const metadata: Metadata = {
  title: "Old Payments | Patidar Stone Crusher",
  description: "Money received for old (pre-app) orders — recorded by day",
};

export default function OldPaymentsPage() {
  return <OldPaymentsView />;
}
