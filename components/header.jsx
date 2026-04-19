import { auth } from "@clerk/nextjs/server";
import HeaderClient from "./header-client";

export default async function Header() {
  const { userId } = await auth();

  return <HeaderClient isSignedIn={Boolean(userId)} />;
}
