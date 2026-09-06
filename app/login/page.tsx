import { getSessionUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Real-Time Messaging",
  description: "Sign in to your real-time messaging account",
};

export default async function LoginPage() {
  const user = await getSessionUserFromCookie();

  if (user) {
    redirect("/chat");
  }

  return <AuthForm initialMode="login" />;
}
