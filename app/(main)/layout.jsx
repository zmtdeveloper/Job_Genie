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
      <div className="container mx-auto pb-8 pt-24">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Unable to load your account</CardTitle>
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
    );
  }

  if (!user) {
    redirect("/?auth=required");
  }

  return <div className="container mx-auto pb-8 pt-24">{children}</div>;
};

export default MainLayout;
