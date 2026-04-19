"use client";

import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import {
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
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

const growthTools = [
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
    label: "Chatbot",
    icon: FileText,
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
    <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image
              src="/JobGenie.png"
              alt="JOB GENEI Logo"
              width={118}
              height={60}
              className="h-[60px] w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isSignedIn ? (
            <>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="hidden shrink-0 items-center gap-2 md:inline-flex"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Industry Insights
                </Button>
                <Button
                  variant="ghost"
                  className="h-10 w-10 shrink-0 p-0 md:hidden"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex shrink-0 items-center gap-2">
                    <StarsIcon className="h-4 w-4" />
                    <span className="md:hidden">Menu</span>
                    <span className="hidden md:block">Growth Tools</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {growthTools.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                    userButtonPopoverCard: "shadow-xl",
                    userPreviewMainIdentifier: "font-semibold",
                  },
                }}
              />
            </>
          ) : (
            <Link href="/sign-in">
              <Button variant="outline">Sign In</Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
