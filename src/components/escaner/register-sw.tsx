"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/escaner/sw.js", { scope: "/escaner" }).catch(() => {});
    }
  }, []);
  return null;
}
