"use client";

import { Button } from "./ui/button";
import Link from "next/link";

import {
  PenBox,
  LayoutDashboard,
  FileText,
  GraduationCap,
  ChevronDown,
  StarsIcon,
  // assume you have a chatbot icon if needed, else use FileText
} from "lucide-react";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

const growthTools = [
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

export default function Header() {
  return (
    <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <Image
            src={"/JobGenie.png"}
            alt="JOB GENEI Logo"
            width={118}
            height={60}
            className="h-[60px] w-auto object-contain"
          />
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-4">
          <Show when="signed-in">
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="hidden md:inline-flex items-center gap-2 shrink-0"
              >
                <LayoutDashboard className="h-4 w-4" />
                Industry Insights
              </Button>
              <Button variant="ghost" className="md:hidden w-10 h-10 p-0 shrink-0">
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </Link>
          </Show>

          <Show when="signed-in">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2 shrink-0">
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
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <Button variant="outline">Sign In</Button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
            />
          </Show>
        </div>
      </nav>
    </header>
  );
}
