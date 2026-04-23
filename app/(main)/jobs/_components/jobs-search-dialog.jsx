"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, Layers3, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobSearchSchema } from "@/app/lib/schema";
import { JOB_PROVIDER_OPTIONS } from "@/lib/jobs/constants";

export default function JobsSearchDialog({
  open,
  onOpenChange,
  defaults,
  profileSummary,
  providerOptions = JOB_PROVIDER_OPTIONS,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobSearchSchema),
    defaultValues: defaults,
  });
  const providerValue = useWatch({
    control,
    name: "provider",
  });

  useEffect(() => {
    register("provider");
  }, [register]);

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const onSubmit = handleSubmit((values) => {
    const params = new URLSearchParams();

    Object.entries({
      query: values.query,
      provider: values.provider,
      locality: defaults.locality,
    }).forEach(([key, value]) => {
      const normalizedValue = value?.trim?.() ?? value;

      if (normalizedValue) {
        params.set(key, normalizedValue);
      }
    });

    params.set("start", "1");

    startTransition(() => {
      onOpenChange(false);
      router.push(`/jobs?${params.toString()}`);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="jobs-glow-panel border-border/70 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-title">
            Find Recommended Jobs
          </DialogTitle>
          <DialogDescription>
            Start with the role you want, then switch providers only when you need broader coverage.
          </DialogDescription>
        </DialogHeader>

        <div className="jobs-glow-inner rounded-[20px] border border-border/70 bg-background/45 p-3.5">
          <p className="text-sm font-medium">
            Your current profile context: {profileSummary.industry || "Career"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {profileSummary.skills?.length
              ? `Top skills: ${profileSummary.skills.slice(0, 5).join(", ")}`
              : "Add more skills in onboarding to improve recommendation quality."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Desired Role</Label>
            <div className="relative">
              <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="query"
                placeholder="Frontend Developer"
                className="pl-9"
                {...register("query")}
              />
            </div>
            {errors.query && (
              <p className="text-sm text-red-500">{errors.query.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={providerValue || defaults.provider}
              onValueChange={(nextValue) =>
                setValue("provider", nextValue, { shouldValidate: true })
              }
            >
              <SelectTrigger id="provider" className="h-10">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Choose provider" />
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
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Jobs...
                </>
              ) : (
                "Show Matches"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
