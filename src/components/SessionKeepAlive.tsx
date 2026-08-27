"use client";

import { useEffect } from "react";

// Access token lasts 15 minutes; refresh well before that so it's silent.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Mounted globally (works whether or not there's a session — with no
 * session the refresh call just 401s harmlessly and is ignored). Keeps a
 * logged-in lawyer's session alive while the tab stays open, instead of
 * forcing a full password+OTP re-login every 15 minutes.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
