"use client";

import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import {
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  PenBox,
  Search,
  StarsIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignInModalButton from "@/components/sign-in-modal-button";

const featurePages = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: Search,
  },
  {
    href: "/resume",
    label: "Build Resume",
    icon: FileText,
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

export default function HeaderClient({ isSignedIn }) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/8 bg-[#070b12]/86 backdrop-blur-xl supports-[backdrop-filter]:bg-[#070b12]/76">
      <nav className="container mx-auto flex h-[74px] items-center justify-between gap-3 px-4 md:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 transition-all hover:border-sky-400/35 hover:bg-white/[0.05]"
        >
          <Image
            src="/JobGenie.png"
            alt="JOB GENEI Logo"
            width={118}
            height={60}
            className="h-[42px] w-auto object-contain"
          />

          <div className="hidden min-w-0 sm:block">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
              Career OS
            </p>
            <p className="truncate text-sm font-semibold text-white/88">
              Focused AI guidance for every application step
            </p>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {featurePages.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                asChild
                variant="ghost"
                className="h-9 rounded-full px-4 text-white/72 hover:bg-white/8 hover:text-white"
              >
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex shrink-0 items-center gap-2 lg:hidden">
                <StarsIcon className="h-4 w-4" />
                <span className="md:hidden">Menu</span>
                <span className="hidden md:block">All Features</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {featurePages.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
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
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
            />
          ) : (
            <SignInModalButton variant="outline">Sign In</SignInModalButton>
          )}
        </div>
      </nav>
    </header>
  );
}
