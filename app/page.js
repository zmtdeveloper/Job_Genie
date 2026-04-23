import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import HeroSection from "@/components/hero";
import AuthRequiredModalOpener from "@/components/auth-required-modal-opener";
import SignInModalButton from "@/components/sign-in-modal-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import { features } from "@/data/features";
import { testimonial } from "@/data/testimonial";
import { faqs } from "@/data/faqs";
import { howItWorks } from "@/data/howItWorks";

const footerCtaButtonClass =
  "mt-5 h-11 w-full rounded-full border-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(186,230,253,0.08)_34%,rgba(56,189,248,0.04)_100%),linear-gradient(135deg,rgba(34,211,238,0.54),rgba(14,165,233,0.62)_42%,rgba(30,64,175,0.82))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_18px_34px_-24px_rgba(30,64,175,0.76)] hover:-translate-y-0.5 hover:brightness-105 sm:w-auto";

export default async function LandingPage({ searchParams }) {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const showAuthNotice = resolvedSearchParams?.auth === "required";
  const redirectAfterSignIn = "/dashboard";

  return (
    <>
      <div className="grid-background"></div>
      {showAuthNotice && !userId ? (
        <AuthRequiredModalOpener redirectAfterSignIn={redirectAfterSignIn} />
      ) : null}

      <HeroSection
        isSignedIn={Boolean(userId)}
        signInRedirectUrl={redirectAfterSignIn}
      />

      <section className="w-full py-12 md:py-24 lg:py-28">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
            <p className="brand-kicker">What You Get</p>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight gradient-title sm:text-3xl md:text-5xl">
              Powerful Features for Your Career Growth
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Six focused tools, one clean experience.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="jobs-glow-panel h-full border-border/70 transition-colors duration-300 hover:border-sky-400/30"
              >
                <CardContent className="grid h-full min-h-[132px] place-items-center !p-0 text-center sm:min-h-[142px]">
                  <div className="grid w-full place-items-center gap-2 px-5 text-center sm:px-6">
                    {feature.icon}
                    <h3 className="text-base font-bold sm:text-lg">
                      {feature.title}
                    </h3>
                    <p className="max-w-[18rem] text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="mx-auto mb-8 max-w-3xl text-center md:mb-10">
            <p className="brand-kicker">Why It Feels Better</p>
            <h2 className="mt-3 text-2xl font-semibold gradient-title sm:text-3xl md:text-5xl">
              A cleaner workflow for the modern job hunt
            </h2>
          </div>

          <div className="brand-page-header mx-auto grid max-w-5xl grid-cols-2 gap-5 px-4 py-6 text-center sm:gap-8 sm:px-6 sm:py-8 md:grid-cols-4 md:px-8">
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-3xl font-bold sm:text-4xl">50+</h3>
              <p className="text-muted-foreground">Industries Covered</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-3xl font-bold sm:text-4xl">1000+</h3>
              <p className="text-muted-foreground">Interview Questions</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-3xl font-bold sm:text-4xl">95%</h3>
              <p className="text-muted-foreground">Success Rate</p>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2">
              <h3 className="text-3xl font-bold sm:text-4xl">24/7</h3>
              <p className="text-muted-foreground">AI Support</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
            <p className="brand-kicker">How It Works</p>
            <h2 className="mb-4 mt-3 text-2xl font-semibold gradient-title sm:text-3xl md:text-5xl">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Four simple steps to accelerate your career growth
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center space-y-4"
              >
                <div className="jobs-glow-inner flex h-14 w-14 items-center justify-center rounded-full border border-border/70">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold sm:text-xl">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
            <p className="brand-kicker">Success Stories</p>
            <h2 className="mt-3 text-center text-2xl font-semibold gradient-title sm:text-3xl md:text-5xl">
              What Our Users Say
            </h2>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
            {testimonial.map((item, index) => (
              <Card key={index} className="jobs-glow-panel h-full border-border/70">
                <CardContent className="grid h-full !p-0">
                  <div className="flex h-full flex-col justify-center gap-5 px-5 py-6 sm:px-6 sm:py-7">
                    <div className="flex items-center space-x-4">
                      <div className="relative h-12 w-12 flex-shrink-0">
                        <Image
                          width={40}
                          height={40}
                          src={item.image}
                          alt={item.author}
                          className="rounded-full border-2 border-primary/20 object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{item.author}</p>
                        <p className="text-sm text-muted-foreground">{item.role}</p>
                        <p className="text-sm text-primary">{item.company}</p>
                      </div>
                    </div>

                    <blockquote>
                      <p className="text-sm italic leading-7 text-muted-foreground sm:text-base">
                        &ldquo;{item.quote}&rdquo;
                      </p>
                    </blockquote>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
            <p className="brand-kicker">FAQ</p>
            <h2 className="mb-4 mt-3 text-2xl font-semibold gradient-title sm:text-3xl md:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Find answers to common questions about our platform
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="w-full">
        <div className="gradient mx-auto rounded-[24px] py-14 sm:rounded-[32px] sm:py-20 md:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center space-y-4 px-4 text-center sm:px-6">
            <p className="brand-kicker text-white/55">Start With Job Genie</p>
            <h2 className="gradient-title !pb-0 !pr-0 text-2xl font-bold tracking-tighter text-primary-foreground sm:text-4xl md:text-5xl">
              Ready to Accelerate Your Career?
            </h2>
            <p className="mx-auto max-w-[600px] text-xs leading-5 text-white sm:text-sm sm:leading-6 md:text-lg md:leading-7">
              Join thousands of professionals who are advancing their careers
              with AI-powered guidance.
            </p>

            {userId ? (
              <Button
                asChild
                size="lg"
                className={`${footerCtaButtonClass} animate-bounce [animation-duration:2.6s]`}
              >
                <Link href="/dashboard">
                  Start Your Journey Today{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <SignInModalButton
                size="lg"
                className={`${footerCtaButtonClass} animate-bounce [animation-duration:2.6s]`}
                forceRedirectUrl={redirectAfterSignIn}
                fallbackRedirectUrl={redirectAfterSignIn}
              >
                Start Your Journey Today{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </SignInModalButton>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
