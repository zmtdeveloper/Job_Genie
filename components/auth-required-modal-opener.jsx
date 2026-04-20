"use client";

import { useEffect, useRef } from "react";
import { useClerk } from "@clerk/nextjs";

export default function AuthRequiredModalOpener({
  redirectAfterSignIn = "/dashboard",
}) {
  const { loaded, openSignIn } = useClerk();
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!loaded || hasOpenedRef.current) {
      return;
    }

    hasOpenedRef.current = true;

    openSignIn({
      forceRedirectUrl: redirectAfterSignIn,
      fallbackRedirectUrl: redirectAfterSignIn,
      signUpForceRedirectUrl: redirectAfterSignIn,
      signUpFallbackRedirectUrl: redirectAfterSignIn,
    });

    window.history.replaceState({}, "", "/");
  }, [loaded, openSignIn, redirectAfterSignIn]);

  return null;
}
