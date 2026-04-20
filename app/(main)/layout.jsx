import { redirect } from "next/navigation";
import { checkUser } from "@/lib/checkUser";

const MainLayout = async ({ children }) => {
  const user = await checkUser();

  if (!user) {
    redirect("/?auth=required");
  }

  return <div className="container mx-auto pb-8 pt-24">{children}</div>;
};

export default MainLayout;
