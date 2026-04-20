"use client";

import { useEffect, useRef } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function AuthRequiredModalOpener({
  redirectAfterSignIn = "/dashboard",
}) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { loaded, openSignIn } = useClerk();
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!loaded || hasOpenedRef.current) {
      return;
    }

    hasOpenedRef.current = true;

    if (isSignedIn) {
      window.history.replaceState({}, "", redirectAfterSignIn);
      router.replace(redirectAfterSignIn);
      return;
    }

    openSignIn({
      forceRedirectUrl: redirectAfterSignIn,
      fallbackRedirectUrl: redirectAfterSignIn,
      signUpForceRedirectUrl: redirectAfterSignIn,
      signUpFallbackRedirectUrl: redirectAfterSignIn,
    });

    window.history.replaceState({}, "", "/");
  }, [isSignedIn, loaded, openSignIn, redirectAfterSignIn, router]);

  return null;
}
