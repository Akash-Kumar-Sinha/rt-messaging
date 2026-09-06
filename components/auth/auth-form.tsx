"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { SessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo/logo";
import { Loader2, Lock, Mail, User, Sparkles, AlertCircle } from "lucide-react";

interface AuthFormProps {
  initialMode?: "login" | "register";
  onSuccess?: (user: SessionUser, token: string) => void;
}

export function AuthForm({ initialMode = "login", onSuccess }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleAuthSuccess = (user: SessionUser, token: string) => {
    if (onSuccess) {
      onSuccess(user, token);
    } else {
      router.push("/chat");
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: email.trim(), password }),
        });
        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error || "Login failed. Please check your credentials.";
          setError(errMsg);
          toast.add({
            title: "Login Failed",
            description: errMsg,
            type: "error",
          });
          return;
        }

        toast.add({
          title: "Welcome back",
          description: `Logged in as ${data.user.displayName}`,
          type: "success",
        });
        handleAuthSuccess(data.user, data.token);
      } else {
        if (!username.trim() || !displayName.trim()) {
          const errMsg = "Username and Display Name are required.";
          setError(errMsg);
          toast.add({
            title: "Validation Error",
            description: errMsg,
            type: "warning",
          });
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            username: username.trim(),
            displayName: displayName.trim(),
            password,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error || "Registration failed.";
          setError(errMsg);
          toast.add({
            title: "Registration Failed",
            description: errMsg,
            type: "error",
          });
          return;
        }

        toast.add({
          title: "Account Created",
          description: `Welcome to SignalPulse RT, ${data.user.displayName}`,
          type: "success",
        });
        handleAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      console.error("Auth error:", err);
      const networkMsg = "Network error occurred. Please try again.";
      setError(networkMsg);
      toast.add({
        title: "Network Error",
        description: networkMsg,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-background p-4 font-sans selection:bg-primary/20 selection:text-primary">
      {/* Background Ambient Glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[320px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-7 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Anchor & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-muted/50 p-2 text-primary shadow-xs">
            <Logo className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {mode === "login" ? "Welcome Back" : "Create an Account"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login"
              ? "Sign in to access your real-time conversations"
              : "Register your credentials to start messaging"}
          </p>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="my-5 grid grid-cols-2 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`cursor-pointer rounded-md py-1.5 text-xs font-medium transition-all ${
              mode === "login"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`cursor-pointer rounded-md py-1.5 text-xs font-medium transition-all ${
              mode === "register"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Display Name
                </label>
                <div className="relative">
                  <Sparkles className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground/70" />
                  <Input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Akash"
                    className="h-9 rounded-lg pl-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground/70" />
                  <Input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. akash"
                    className="h-9 rounded-lg pl-8 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              {mode === "login" ? "Email or Username" : "Email Address"}
            </label>
            <div className="relative">
              <Mail className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground/70" />
              <Input
                type={mode === "login" ? "text" : "email"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "login" ? "user@example.com or username" : "user@example.com"}
                className="h-9 rounded-lg pl-8 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground/70" />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 rounded-lg pl-8 text-xs"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-9 w-full rounded-lg text-xs font-medium shadow-xs"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Quick toggle link */}
          <div className="mt-2 text-center text-xs text-muted-foreground">
            <span>
              {mode === "login" ? "Don't have an account yet?" : "Already have an account?"}{" "}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="cursor-pointer font-medium text-foreground hover:underline"
            >
              {mode === "login" ? "Create one now" : "Sign in here"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

