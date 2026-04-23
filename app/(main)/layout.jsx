import Link from "next/link";
import { redirect } from "next/navigation";
import { checkUser } from "@/lib/checkUser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MainLayout = async ({ children }) => {
  let user = null;
  let accountLoadError = "";

  try {
    user = await checkUser();
  } catch (error) {
    accountLoadError =
      error?.message || "Unable to load your account right now.";
  }

  if (accountLoadError) {
    return (
      <div className="pb-8 pt-24">
        <div className="container mx-auto px-3 sm:px-4 md:px-5">
          <Card className="jobs-glow-panel mx-auto max-w-2xl border-border/70">
            <CardHeader>
              <p className="brand-kicker">Account status</p>
              <CardTitle className="text-2xl gradient-title">
                Unable to load your account
              </CardTitle>
              <CardDescription>{accountLoadError}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/">Back Home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Try Again</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/?auth=required");
  }

  return (
    <div className="pb-8 pt-24">
      <div className="container mx-auto px-3 sm:px-4 md:px-5">{children}</div>
    </div>
  );
};

export default MainLayout;
