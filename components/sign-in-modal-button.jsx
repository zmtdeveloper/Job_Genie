"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function SignInModalButton({
  children = "Sign In",
  forceRedirectUrl = "/dashboard",
  fallbackRedirectUrl = "/dashboard",
  signUpForceRedirectUrl,
  signUpFallbackRedirectUrl,
  ...buttonProps
}) {
  return (
    <SignInButton
      mode="modal"
      forceRedirectUrl={forceRedirectUrl}
      fallbackRedirectUrl={fallbackRedirectUrl}
      signUpForceRedirectUrl={signUpForceRedirectUrl || forceRedirectUrl}
      signUpFallbackRedirectUrl={
        signUpFallbackRedirectUrl || fallbackRedirectUrl
      }
    >
      <Button {...buttonProps}>{children}</Button>
    </SignInButton>
  );
}
