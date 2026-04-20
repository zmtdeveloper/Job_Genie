"use client";

import {
  Building2,
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
    <Card className="jobs-glow-panel sticky top-20 z-20 overflow-hidden rounded-[32px] border border-border/70 bg-background/95 shadow-none backdrop-blur-md">
      <CardContent className="p-4 md:p-5">
        <form
          onSubmit={onSubmit}
          className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_210px_210px_190px_170px]"
        >
          <div className="jobs-glow-inner rounded-[26px] border border-border/70 bg-card/80 p-3 shadow-none">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <CircleDot className="h-3.5 w-3.5" />
              <span>Role</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={values.query}
                onChange={(event) => onChange("query", event.target.value)}
                placeholder="Search by role, e.g. Product Designer"
                className="jobs-glow-inner h-12 rounded-[20px] border-border/70 bg-background/80 pl-10 shadow-none"
              />
            </div>
          </div>

          <div className="jobs-glow-inner rounded-[26px] border border-border/70 bg-card/80 p-3 shadow-none">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>Company</span>
            </div>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={values.company}
                onChange={(event) => onChange("company", event.target.value)}
                placeholder="Optional company filter"
                className="jobs-glow-inner h-12 rounded-[20px] border-border/70 bg-background/80 pl-10 shadow-none"
              />
            </div>
          </div>

          <div className="jobs-glow-inner rounded-[26px] border border-border/70 bg-card/80 p-3 shadow-none">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              <span>Provider</span>
            </div>
            <Select
              value={values.provider}
              onValueChange={(nextValue) => onChange("provider", nextValue)}
            >
              <SelectTrigger className="jobs-glow-inner h-12 rounded-[20px] border-border/70 bg-background/80 shadow-none">
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

          <div className="jobs-glow-inner rounded-[26px] border border-border/70 bg-card/80 p-3 shadow-none">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              <span>Market</span>
            </div>
            <Select
              value={values.locality}
              onValueChange={(nextValue) => onChange("locality", nextValue)}
            >
              <SelectTrigger className="jobs-glow-inner h-12 rounded-[20px] border-border/70 bg-background/80 shadow-none">
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

          <Button
            type="submit"
            disabled={isSearching}
            className="jobs-glow-button jobs-glow-active h-full min-h-[104px] rounded-[26px] px-6 text-base"
          >
            <Search className="h-4 w-4" />
            {isSearching ? "Searching..." : "Search Roles"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="jobs-glow-button h-full min-h-[104px] rounded-[26px] border border-border/70 bg-card/70 px-6 text-base hover:bg-accent/60"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear Filters
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
