"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SignInModalButton from "@/components/sign-in-modal-button";

const heroMetrics = [
  { label: "Search", value: "Faster role matching" },
  { label: "Coach", value: "Live AI guidance" },
  { label: "Apply", value: "Cleaner workflow" },
];

const heroChips = ["Smart Search", "AI Guidance", "Fast Apply"];
const heroPreviewClassName =
  "group/hero-preview rounded-[26px] border border-border/70 p-2.5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-400/45 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.16),0_24px_50px_-30px_rgba(37,99,235,0.8)] sm:p-3.5";
const heroCardClassName =
  "group/hero-card rounded-[18px] border border-border/70 bg-background/55 text-left shadow-none transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-400/45 hover:bg-background/72 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.14),0_18px_38px_-24px_rgba(37,99,235,0.7)]";
const heroFloatingCardClassName =
  "group/hero-card rounded-[22px] border border-border/70 text-left transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-400/45 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.16),0_22px_44px_-26px_rgba(37,99,235,0.72)]";

const HeroSection = ({ isSignedIn = false, signInRedirectUrl = "/dashboard" }) => {
  const imageRef = useRef(null);

  useEffect(() => {
    const imageElement = imageRef.current;

    if (!imageElement) {
      return undefined;
    }

    const handleScroll = () => {
      if (window.scrollY > 100) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="flex w-full items-start pb-14 pt-[5.4rem] sm:pb-16 sm:pt-24 md:pb-20 md:pt-28 lg:min-h-[calc(100svh-4.5rem)] lg:items-center">
      <div className="container mx-auto w-full px-3 sm:px-4 md:px-6">
        <div className="brand-page-header mt-[70px] overflow-visible px-4 py-7 sm:px-6 sm:py-8 md:px-8 md:py-10">
          <div className="relative z-10 grid gap-10 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:items-center xl:gap-12">
            <div className="space-y-6 sm:space-y-7">
              <Badge
                variant="outline"
                className="w-fit max-w-full border-sky-300/18 bg-background/18 px-4 py-1.5 text-[10px] tracking-[0.22em] text-white/78"
              >
                AI Career Counselling &amp; Smart Job Recommendation System
              </Badge>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl font-semibold leading-[0.9] tracking-[-0.07em] md:text-5xl lg:text-6xl xl:text-[4.7rem]">
                  <span className="block bg-[linear-gradient(135deg,#f6fdff_0%,#dffbff_45%,#93efff_100%)] bg-clip-text text-transparent">
                    One sharp workspace
                  </span>
                  <span className="block bg-[linear-gradient(135deg,#e4fdff_0%,#8eeaff_50%,#4ecfff_100%)] bg-clip-text text-transparent">
                    for every move in your
                  </span>
                  <span className="block bg-[linear-gradient(135deg,#c8f9ff_0%,#59d8ff_48%,#3b8fff_100%)] bg-clip-text text-transparent">
                    career journey.
                  </span>
                </h1>

                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8 md:text-lg">
                  Search roles, ask AI, prepare for interviews, and handle
                  applications in one cleaner flow that stays fast on every
                  screen.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                {isSignedIn ? (
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/dashboard">Get Started</Link>
                  </Button>
                ) : (
                  <SignInModalButton
                    size="lg"
                    className="w-full sm:w-auto"
                    forceRedirectUrl={signInRedirectUrl}
                    fallbackRedirectUrl={signInRedirectUrl}
                    signUpForceRedirectUrl={signInRedirectUrl}
                    signUpFallbackRedirectUrl={signInRedirectUrl}
                  >
                    Get Started
                  </SignInModalButton>
                )}

                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/career-chat">
                    <MessageSquare className="h-4 w-4" />
                    Career Chat
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {heroChips.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="border-sky-300/18 bg-background/18 px-3 py-1 text-[10px] tracking-[0.22em] text-white/76"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="hero-image-wrapper xl:pl-6">
              <div ref={imageRef} className="hero-image relative">
                <div className="absolute inset-x-8 -top-6 -z-10 h-28 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.26),transparent_70%)] blur-3xl" />

                <div className={`jobs-glow-panel ${heroPreviewClassName}`}>
                  <div className="jobs-glow-inner rounded-[22px] border border-border/70 p-2 transition-all duration-300 group-hover/hero-preview:border-sky-300/35 group-hover/hero-preview:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.1)]">
                    <Image
                      src="/banner.jpeg"
                      width={1280}
                      height={720}
                      alt="Job Genie workspace preview"
                      className="mx-auto rounded-[18px] border border-white/8 transition-transform duration-500 ease-out group-hover/hero-preview:scale-[1.015]"
                      priority
                    />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {heroMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className={`jobs-glow-inner ${heroCardClassName} p-3`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors duration-300 group-hover/hero-card:text-sky-100/70">
                          {metric.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white transition-colors duration-300 group-hover/hero-card:text-sky-50">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`jobs-glow-inner absolute -left-4 top-7 hidden max-w-[190px] px-4 py-3 xl:block ${heroFloatingCardClassName}`}>
                  <p className="brand-kicker text-white/55 transition-colors duration-300 group-hover/hero-card:text-sky-100/72">
                    Focused Flow
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white transition-colors duration-300 group-hover/hero-card:text-sky-50">
                    Cleaner layouts, tighter decisions, and less visual noise.
                  </p>
                </div>

                <div className={`jobs-glow-active absolute -bottom-5 right-4 hidden max-w-[230px] px-4 py-3 text-white xl:block ${heroFloatingCardClassName}`}>
                  <p className="brand-kicker text-white/60 transition-colors duration-300 group-hover/hero-card:text-sky-100/78">
                    Smart Assist
                  </p>
                  <p className="mt-2 text-sm font-semibold transition-colors duration-300 group-hover/hero-card:text-white">
                    Search, chat, and apply without breaking your momentum.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/80 transition-colors duration-300 group-hover/hero-card:text-sky-100">
                    Explore workflow
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
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
