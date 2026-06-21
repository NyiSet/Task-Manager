"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export type CreateTeamMemberValues = {
  email: string;
  role: "admin" | "member";
};

type TeamMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeamMember: (values: CreateTeamMemberValues) => Promise<void>;
  creating?: boolean;
};

export default function TeamMemberDialog({
  open,
  onOpenChange,
  onCreateTeamMember,
  creating = false,
}: TeamMemberDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  useEffect(() => {
    if (!open) {
      setName("");
      setRole("member");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    await onCreateTeamMember({
      email: name.trim().toLowerCase(),
      role,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <Card className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border-white/20 bg-white/90 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
        <CardContent className="p-0">
          <div className="border-b border-slate-200/70 px-6 py-5">
            <div className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium tracking-wide text-indigo-700">
              Team Invite
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Invite a registered member
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Only users who already have an account can be added to your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label
                htmlFor="team-member-email"
                className="text-sm font-medium text-slate-700"
              >
                Member email
              </Label>
              <Input
                id="team-member-email"
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="email"
                placeholder="teammate@example.com"
                className="rounded-2xl border-slate-200 bg-white py-6 text-sm text-slate-900 focus-visible:ring-indigo-100"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="team-member-role"
                className="text-sm font-medium text-slate-700"
              >
                Role
              </Label>
              <div className="grid grid-cols-2 gap-2" id="team-member-role">
                {(["member", "admin"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium capitalize transition ${
                      role === item
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                {creating ? "Inviting..." : "Invite Member"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
