"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, MailPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Invitation = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
  invited_at: string;
};

export function InvitationDialog() {
  const supabase = useMemo(() => createClient(), []);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeInvitation = invitations[0] ?? null;

  const loadInvitations = useCallback(
    async (showLoading = false) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) {
        setInvitations([]);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      const { data, error: inviteError } = await supabase
        .from("team_members")
        .select("id, email, name, role, invited_at")
        .eq("member_user_id", user.id)
        .eq("status", "invited")
        .order("invited_at", { ascending: true });

      if (showLoading) {
        setLoading(false);
      }

      if (inviteError) {
        setError("Could not load workspace invitations.");
        return;
      }

      setInvitations((data as Invitation[]) ?? []);
      setError(null);
    },
    [supabase]
  );

  useEffect(() => {
    loadInvitations(true);

    const intervalId = window.setInterval(() => {
      loadInvitations();
    }, 8000);

    const handleFocus = () => loadInvitations();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadInvitations();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadInvitations();
      }

      if (event === "SIGNED_OUT") {
        setInvitations([]);
      }
    });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [loadInvitations, supabase.auth]);

  const removeInvitation = (id: string) => {
    setInvitations((current) =>
      current.filter((invitation) => invitation.id !== id)
    );
  };

  const acceptInvitation = async () => {
    if (!activeInvitation) return;

    setActionId(activeInvitation.id);
    setError(null);

    const { error: acceptError } = await supabase
      .from("team_members")
      .update({ status: "active" })
      .eq("id", activeInvitation.id);

    setActionId(null);

    if (acceptError) {
      setError(
        "Could not accept this invitation. Make sure supabase/07_invitations.sql has been run."
      );
      return;
    }

    removeInvitation(activeInvitation.id);
    window.dispatchEvent(new Event("workboard:data-changed"));
  };

  const declineInvitation = async () => {
    if (!activeInvitation) return;

    setActionId(activeInvitation.id);
    setError(null);

    const { error: declineError } = await supabase
      .from("team_members")
      .delete()
      .eq("id", activeInvitation.id);

    setActionId(null);

    if (declineError) {
      setError(
        "Could not decline this invitation. Make sure supabase/07_invitations.sql has been run."
      );
      return;
    }

    removeInvitation(activeInvitation.id);
    window.dispatchEvent(new Event("workboard:data-changed"));
  };

  if (!activeInvitation || loading) {
    return null;
  }

  const isWorking = actionId === activeInvitation.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
      <Card className="relative z-10 w-full max-w-md rounded-2xl border-white/30 bg-white shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <MailPlus className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Workspace invitation
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Join this workspace?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                You have been invited as a{" "}
                <span className="font-semibold text-slate-950">
                  {activeInvitation.role}
                </span>
                . Accept to appear as a team member and be available for task
                assignments.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-950">
              {activeInvitation.name || activeInvitation.email}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {activeInvitation.email}
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={declineInvitation}
              disabled={isWorking}
              className="rounded-xl"
            >
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              type="button"
              onClick={acceptInvitation}
              disabled={isWorking}
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Check className="mr-2 h-4 w-4" />
              {isWorking ? "Accepting..." : "Accept invite"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
