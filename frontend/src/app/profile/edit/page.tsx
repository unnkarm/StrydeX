"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEditRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portfolio");
  }, [router]);
  return <div className="px-6 py-16 text-muted">Redirecting...</div>;
}
