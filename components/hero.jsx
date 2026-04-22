"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SignInModalButton from "@/components/sign-in-modal-button";

const HeroSection = ({ isSignedIn = false, signInRedirectUrl = "/dashboard" }) => {
  const imageRef = useRef(null);

  useEffect(() => {
    const imageElement = imageRef.current;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 100;

      if (scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="w-full pb-14 pt-36 md:pt-44">
      <div className="container mx-auto px-4 md:px-6">
        <div className="brand-page-header px-6 py-8 md:px-10 md:py-10">
          <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-center">
            <div className="space-y-6">
              <Badge
                variant="outline"
                className="w-fit border-sky-400/25 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/72"
              >
                Job discovery, career chat, resume, and prep
              </Badge>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] md:text-6xl lg:text-7xl xl:text-[5.25rem] gradient-title">
                  One sharp workspace for every move in your career journey.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                  JOB GENEI blends smart job matching, focused career chat,
                  resume building, and interview practice into a fast interface
                  built to keep you moving.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isSignedIn ? (
                  <Button asChild size="lg" className="px-8">
                    <Link href="/dashboard">Open Workspace</Link>
                  </Button>
                ) : (
                  <SignInModalButton
                    size="lg"
                    className="px-8"
                    forceRedirectUrl={signInRedirectUrl}
                    fallbackRedirectUrl={signInRedirectUrl}
                  >
                    Open Workspace
                  </SignInModalButton>
                )}

                <Button asChild size="lg" variant="outline" className="px-8">
                  <a
                    href="https://www.youtube.com/roadsidecoder"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch Demo
                  </a>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Logo-driven brand styling with fast glass surfaces",
                  "Jobs UI confidence blended with the clarity of career chat",
                  "Shared system across the full app without heavy effects",
                ].map((item) => (
                  <div
                    key={item}
                    className="jobs-glow-inner rounded-[24px] border border-border/70 px-4 py-3 text-sm leading-6 text-white/80"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-image-wrapper mt-2 lg:mt-0">
              <div ref={imageRef} className="hero-image relative">
                <div className="jobs-glow-panel rounded-[30px] border border-border/70 p-3">
                  <div className="jobs-glow-inner rounded-[24px] border border-border/70 p-2">
                    <Image
                      src="/banner.jpeg"
                      width={1280}
                      height={720}
                      alt="Dashboard Preview"
                      className="rounded-[18px] border border-white/8 mx-auto"
                      priority
                    />
                  </div>
                </div>

                <div className="jobs-glow-inner absolute -left-4 top-6 hidden max-w-[190px] rounded-[22px] border border-border/70 px-4 py-3 text-left xl:block">
                  <p className="brand-kicker text-white/55">Jobs</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    Track roles, ATS fit, and next steps in one flow.
                  </p>
                </div>

                <div className="jobs-glow-active absolute -bottom-5 right-4 hidden max-w-[220px] rounded-[24px] border border-white/12 px-4 py-3 text-left text-white xl:block">
                  <p className="brand-kicker text-white/60">Career Chat</p>
                  <p className="mt-2 text-sm font-semibold">
                    Ask role-specific questions without leaving your workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
