"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    "email" | "password" | "repeatPassword" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const clearError = () => {
    setError(null);
    setErrorField(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    clearError();

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setErrorField("repeatPassword");
      setRepeatPassword("");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not create account";
      const normalizedMessage = message.toLowerCase();
      setError(message);
      setErrorField(
        normalizedMessage.includes("password") ? "password" : "email"
      );
      if (normalizedMessage.includes("password")) {
        setPassword("");
        setRepeatPassword("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Alex Morgan"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearError();
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                  }}
                  placeholder={
                    errorField === "email" && error ? error : "m@example.com"
                  }
                  aria-invalid={errorField === "email"}
                  className={
                    errorField === "email"
                      ? "border-rose-300 placeholder:text-rose-500 focus-visible:ring-rose-100"
                      : undefined
                  }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  placeholder={
                    errorField === "password" && error
                      ? error
                      : "Create a password"
                  }
                  aria-invalid={errorField === "password"}
                  className={
                    errorField === "password"
                      ? "border-rose-300 placeholder:text-rose-500 focus-visible:ring-rose-100"
                      : undefined
                  }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => {
                    setRepeatPassword(e.target.value);
                    clearError();
                  }}
                  placeholder={
                    errorField === "repeatPassword" && error
                      ? error
                      : "Repeat your password"
                  }
                  aria-invalid={errorField === "repeatPassword"}
                  className={
                    errorField === "repeatPassword"
                      ? "border-rose-300 placeholder:text-rose-500 focus-visible:ring-rose-100"
                      : undefined
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
