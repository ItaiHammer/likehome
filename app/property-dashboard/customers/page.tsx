import type { Metadata } from "next";
import { PropertyDashboardShell } from "../_components/PropertyDashboardShell";
import { CustomersDashboard } from "./CustomersDashboard";

export const metadata: Metadata = { title: "Customers — LikeHome" };

export default function CustomersPage() {
  return (
    <PropertyDashboardShell title="Customers" description="Understand your guests across the properties you own." active="customers">
      <CustomersDashboard />
    </PropertyDashboardShell>
  );
}
