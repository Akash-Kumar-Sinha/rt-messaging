import { getSessionUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getSessionUserFromCookie();

  if (user) {
    redirect("/chat");
  }

  redirect("/login");
}


