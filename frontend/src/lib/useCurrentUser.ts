"use client";

import { useEffect, useState } from "react";
import { api, getToken, clearToken } from "./api";
import type { Me } from "./types";

export function useCurrentUser() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((data) => setMe(data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  return { me, loading, setMe };
}
