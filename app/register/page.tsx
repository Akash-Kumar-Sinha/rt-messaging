import { getSessionUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Real-Time Messaging",
  description: "Create a new real-time messaging account",
};

export default async function RegisterPage() {
  const user = await getSessionUserFromCookie();

  if (user) {
    redirect("/chat");
  }

  return <AuthForm initialMode="register" />;
}
