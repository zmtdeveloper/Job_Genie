"use client";

import {
  CircleDot,
  Globe2,
  Layers3,
  RefreshCcw,
  Search,
} from "lucide-react";
import {
  JOB_MARKET_OPTIONS,
  JOB_PROVIDER_OPTIONS,
} from "@/lib/jobs/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function JobsFilterBar({
  values,
  onChange,
  onSubmit,
  onReset,
  isSearching,
  providerOptions = JOB_PROVIDER_OPTIONS,
}) {
  return (
    <Card className="jobs-glow-panel overflow-hidden rounded-[28px] border border-border/70 bg-background/95 shadow-none backdrop-blur-md">
      <CardContent className="p-3.5 md:p-4">
        <form
          onSubmit={onSubmit}
          className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_190px_190px_auto]"
        >
          <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-card/80 p-2.5 shadow-none sm:col-span-2 xl:col-span-1">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                <CircleDot className="h-3.5 w-3.5" />
                <span>Role</span>
              </div>
              <p className="hidden text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80 md:block">
                Search instantly
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_152px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={values.query}
                  onChange={(event) => onChange("query", event.target.value)}
                  placeholder="Search by role, e.g. Product Designer"
                  className="jobs-glow-inner h-10 rounded-[16px] border-border/70 bg-background/80 pl-10 shadow-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSearching}
                className="jobs-glow-button jobs-glow-button-primary h-10 rounded-[16px] px-4 text-sm font-semibold"
              >
                <Search className="h-4 w-4" />
                {isSearching ? "Searching..." : "Search Jobs"}
              </Button>
            </div>
          </div>

          <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-card/80 p-2.5 shadow-none">
            <div className="mb-2.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              <span>Provider</span>
            </div>
            <Select
              value={values.provider}
              onValueChange={(nextValue) => onChange("provider", nextValue)}
            >
              <SelectTrigger className="jobs-glow-inner h-10 rounded-[16px] border-border/70 bg-background/80 shadow-none">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="jobs-glow-inner rounded-[24px] border border-border/70 bg-card/80 p-2.5 shadow-none">
            <div className="mb-2.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              <span>Market</span>
            </div>
            <Select
              value={values.locality}
              onValueChange={(nextValue) => onChange("locality", nextValue)}
            >
              <SelectTrigger className="jobs-glow-inner h-10 rounded-[16px] border-border/70 bg-background/80 shadow-none">
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                {JOB_MARKET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 xl:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              className="jobs-glow-button h-10 rounded-[16px] border border-border/70 bg-card/70 px-4 text-sm font-medium hover:bg-accent/60"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
