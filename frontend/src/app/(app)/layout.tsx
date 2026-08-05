"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import AppTopbar from "@/components/AppTopbar";
import AppSidebar from "@/components/AppSidebar";
import MobileAppNav from "@/components/MobileAppNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) router.push("/login");
  }, [loading, me, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppTopbar />
      <MobileAppNav />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
