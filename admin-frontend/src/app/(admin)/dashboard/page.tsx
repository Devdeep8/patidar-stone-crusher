"use client";

// src/app/(admin)/dashboard/page.tsx
// Auth guard + header live in the (admin) layout — this is pure page content.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth.store";

export default function DashboardPage() {
  const { admin } = useAuthStore();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in{admin ? ` as ${admin.email}` : ""} — overview stats coming next.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Packages</CardTitle>
            <CardDescription>Manage tour packages</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">—</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>Upcoming trips</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">—</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Blogs</CardTitle>
            <CardDescription>Published posts</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">—</CardContent>
        </Card>
      </div>
    </div>
  );
}
