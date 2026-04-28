"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  PenBox,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignInModalButton from "@/components/sign-in-modal-button";

const primaryPages = [
  {
    href: "/dashboard",
    label: "Industry Insights",
    icon: LayoutDashboard,
  },
  {
    href: "/resume",
    label: "Build Resume",
    icon: FileText,
  },
  {
    href: "/jobs",
    label: "Jobs Hub",
    icon: Search,
  },
];

const growthTools = [
  {
    href: "/career-chat",
    label: "Career Chat",
    icon: MessageSquare,
  },
  {
    href: "/ai-cover-letter",
    label: "Cover Letter",
    icon: PenBox,
  },
  {
    href: "/interview",
    label: "Interview Prep",
    icon: GraduationCap,
  },
];

const mobileExploreItems = [
  {
    href: "/dashboard",
    label: "Industry Insights",
    icon: LayoutDashboard,
  },
  {
    href: "/resume",
    label: "Build Resume",
    icon: FileText,
  },
  {
    href: "/jobs",
    label: "Jobs Hub",
    icon: Search,
  },
  {
    href: "/career-chat",
    label: "Career Chat",
    icon: MessageSquare,
  },
  {
    href: "/ai-cover-letter",
    label: "Cover Letter",
    icon: PenBox,
  },
  {
    href: "/interview",
    label: "Interview Prep",
    icon: GraduationCap,
  },
];

const headerButtonClass =
  "h-10 rounded-full border-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(186,230,253,0.18)_34%,rgba(56,189,248,0.08)_100%),linear-gradient(135deg,rgba(103,232,249,0.8),rgba(56,189,248,0.9)_42%,rgba(37,99,235,0.92))] px-4 text-[13px] font-semibold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_16px_30px_-24px_rgba(37,99,235,0.62)] hover:brightness-105";
const growthToolsButtonClass =
  "h-11 border border-cyan-300/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(125,211,252,0.12)_18%,rgba(8,15,29,0.16)_40%,rgba(2,6,23,0.08)_100%),linear-gradient(135deg,rgba(5,12,24,0.98),rgba(7,28,48,0.97)_48%,rgba(10,83,116,0.96))] px-5 text-[13px] font-extrabold tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_0_1px_rgba(34,211,238,0.1),0_24px_46px_-22px_rgba(8,145,178,0.88)] hover:-translate-y-0.5 hover:border-cyan-200/44 hover:brightness-110";
const growthDropdownItemClass =
  "group rounded-[16px] border border-transparent px-3.5 py-3 text-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300/26 hover:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(14,43,68,0.92))] hover:text-white hover:shadow-[0_16px_28px_-24px_rgba(34,211,238,0.95)] focus:-translate-y-0.5 focus:border-sky-300/26 focus:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(14,43,68,0.92))] focus:text-white";
const headerLogoShellClass = "group flex min-w-0 items-center gap-2.5";
const headerLogoWordmarkShellClass =
  "group/wordmark relative overflow-hidden rounded-full bg-[linear-gradient(135deg,rgba(34,211,238,0.9),rgba(56,189,248,0.52)_34%,rgba(37,99,235,0.96)_100%)] p-[1.25px] shadow-[0_20px_38px_-28px_rgba(37,99,235,0.88)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(37,99,235,0.98)]";
const headerLogoWordmarkClass =
  "bg-[linear-gradient(135deg,#f8fdff_0%,#d9fbff_16%,#88efff_48%,#42cfff_72%,#2563eb_100%)] bg-clip-text text-[1rem] font-black tracking-[0.2em] text-transparent sm:text-[1.12rem]";

function isActivePath(pathname, href) {
  if (!pathname || !href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function HeaderClient({ isSignedIn }) {
  const pathname = usePathname();
  const growthToolsActive = growthTools.some((item) =>
    isActivePath(pathname, item.href)
  );

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/8 bg-[#07111d]/84 shadow-[0_16px_40px_-34px_rgba(2,6,23,0.96)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#07111d]/70">
      <nav className="container mx-auto flex h-[64px] items-center justify-between gap-2 px-3 sm:h-[70px] sm:gap-3 sm:px-4 md:px-6">
        <Link
          href="/"
          className={headerLogoShellClass}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(186,230,253,0.16)_34%,rgba(56,189,248,0.05)_100%),linear-gradient(135deg,rgba(103,232,249,0.88),rgba(56,189,248,0.92)_42%,rgba(37,99,235,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_22px_32px_-24px_rgba(37,99,235,0.88)] sm:h-11 sm:w-11">
            <span
              aria-hidden="true"
              className="absolute inset-[1px] rounded-[17px] bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.32),transparent_44%)]"
            />
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border border-white/16 bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.68)]"
            />
            <Sparkles className="relative h-4.5 w-4.5 text-slate-950 sm:h-5 sm:w-5" />
          </div>

          <div className={headerLogoWordmarkShellClass}>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover/wordmark:opacity-100"
            >
              <span className="absolute -left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-cyan-300/24 blur-xl" />
              <span className="absolute right-0 top-0 h-10 w-10 rounded-full bg-blue-500/26 blur-xl" />
            </span>

            <div className="relative flex min-w-0 items-center gap-1.5 rounded-full bg-[linear-gradient(145deg,rgba(7,17,29,0.96),rgba(8,19,34,0.93)_58%,rgba(6,13,24,0.98))] px-3 py-2 sm:px-3.5">
              <span className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-white/88 sm:text-[0.72rem]">
                JOB
              </span>
              <span className={headerLogoWordmarkClass}>GENIE</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 lg:flex">
            {primaryPages.map(({ href, label, icon: Icon }) => {
              const isActive = isActivePath(pathname, href);

              return (
                <Button
                  key={href}
                  asChild
                  className={cn(
                    headerButtonClass,
                    isActive &&
                      "scale-[1.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_18px_34px_-22px_rgba(37,99,235,0.76)]"
                  )}
                >
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </Button>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                    headerButtonClass,
                    growthToolsButtonClass,
                    growthToolsActive &&
                      "scale-[1.02] border-cyan-200/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_0_0_1px_rgba(103,232,249,0.18),0_28px_50px_-22px_rgba(8,145,178,0.98)]"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Growth Tools
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Growth Tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {growthTools.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild className={growthDropdownItemClass}>
                    <Link href={href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={cn(headerButtonClass, "h-9 px-3 text-sm lg:hidden sm:h-10 sm:px-4")}>
                <Sparkles className="h-4 w-4" />
                <span className="sm:hidden">Menu</span>
                <span className="hidden sm:block">Explore</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {mobileExploreItems.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild className={growthDropdownItemClass}>
                  <Link href={href} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 sm:w-10 sm:h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
            />
          ) : (
            <SignInModalButton
              className={cn(headerButtonClass, "h-9 px-4 text-sm sm:h-10")}
            >
              Sign In
            </SignInModalButton>
          )}
        </div>
      </nav>
    </header>
  );
}
