import { getSessionUserFromCookie, TOKEN_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatProvider } from "@/components/chat/chat-context";
import { ChatLayoutShell } from "@/components/chat/chat-layout-shell";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUserFromCookie();
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value || null;

  if (!user) {
    redirect("/");
  }

  return (
    <ChatProvider initialUser={user} initialToken={token}>
      <ChatLayoutShell>{children}</ChatLayoutShell>
    </ChatProvider>
  );
}
