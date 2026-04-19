"use client";

import {
  Building2,
  Layers3,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  JOB_MARKET_OPTIONS,
  JOB_PROVIDER_OPTIONS,
} from "@/lib/jobs/constants";
import { Badge } from "@/components/ui/badge";
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
  onOpenSearch,
  isSearching,
  savedCount,
  providerOptions = JOB_PROVIDER_OPTIONS,
}) {
  return (
    <Card className="sticky top-20 z-20 border border-border/70 bg-background/95 shadow-lg backdrop-blur-md">
      <CardContent className="space-y-3 p-3.5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Live role search</Badge>
              <Badge variant="outline">
                {providerOptions.length > 1
                  ? "Multi-provider"
                  : providerOptions[0]?.label || "Jobs"}
              </Badge>
              <Badge variant="outline">{savedCount} tracked jobs</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Search by role first, switch provider when needed, and move strong roles straight into your tracker.
            </p>
          </div>

          <Button
            variant="outline"
            type="button"
            onClick={onOpenSearch}
            className="h-10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Focus Search
          </Button>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid gap-3 lg:grid-cols-[1.45fr_1fr_160px_180px_auto_auto]"
        >
          <Input
            value={values.query}
            onChange={(event) => onChange("query", event.target.value)}
            placeholder="Search by role, e.g. Web Developer"
            className="h-10"
          />

          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={values.company}
              onChange={(event) => onChange("company", event.target.value)}
              placeholder="Company filter optional"
              className="h-10 pl-9"
            />
          </div>

          <Select
            value={values.provider}
            onValueChange={(nextValue) => onChange("provider", nextValue)}
          >
            <SelectTrigger className="h-10">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Provider" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={values.locality}
            onValueChange={(nextValue) => onChange("locality", nextValue)}
          >
            <SelectTrigger className="h-10">
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

          <Button type="submit" disabled={isSearching} className="h-10">
            <Search className="h-4 w-4" />
            {isSearching ? "Searching..." : "Search"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="h-10"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
