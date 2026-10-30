"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    turnstile?: { reset: (el?: string | HTMLElement) => void };
    cnTurnstileOk?: (token: string) => void;
    cnTurnstileFim?: () => void;
  }
}

export function Turnstile({
  siteKey,
  aoMudar,
}: {
  siteKey: string;
  aoMudar: (pronto: boolean) => void;
}) {
  useEffect(() => {
    window.cnTurnstileOk = () => aoMudar(true);
    window.cnTurnstileFim = () => aoMudar(false);
    return () => {
      delete window.cnTurnstileOk;
      delete window.cnTurnstileFim;
    };
  }, [aoMudar]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-language="pt"
        data-appearance="interaction-only"
        data-callback="cnTurnstileOk"
        data-expired-callback="cnTurnstileFim"
        data-error-callback="cnTurnstileFim"
      />
    </>
  );
}
