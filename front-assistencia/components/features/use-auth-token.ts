"use client";

import { useEffect, useState } from "react";
import { getStoredAuth } from "@/lib/api";

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
  }, []);

  return token;
}
