"use client";

import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";

export function RootAuthClient() {
  const router = useRouter();

  return (
    <AuthForm
      onSuccess={() => {
        router.push("/chat");
        router.refresh();
      }}
    />
  );
}
