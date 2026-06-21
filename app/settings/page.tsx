"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  KeyRound,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Board = {
  id: string;
  name: string;
};

type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
  status: "active" | "invited";
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) {
        router.push("/auth/login");
        return;
      }

      const [{ data: profileData }, { data: boardData }, { data: memberData }] =
        await Promise.all([
          supabase
            .from("users")
            .select("id, email, full_name, avatar_url")
            .eq("id", user.id)
            .single(),
          supabase.from("boards").select("id, name"),
          supabase
            .from("team_members")
            .select("id, email, name, role, status")
            .order("created_at", { ascending: true }),
        ]);

      const nextProfile =
        (profileData as UserProfile | null) ??
        ({
          id: user.id,
          email: user.email ?? "",
          full_name: null,
          avatar_url: null,
        } satisfies UserProfile);

      setProfile(nextProfile);
      setFullName(nextProfile.full_name ?? "");
      setAvatarUrl(nextProfile.avatar_url ?? "");
      setBoards((boardData as Board[]) ?? []);
      setMembers((memberData as TeamMember[]) ?? []);
      setLoading(false);
    };

    loadSettings();
  }, []);

  const clearFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    clearFeedback();
    setSavingProfile(true);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setSavingProfile(false);

    if (updateError) {
      setError("Could not update your account details.");
      return;
    }

    setProfile({
      ...profile,
      full_name: fullName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });
    setMessage("Account details updated.");
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);

    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSavingPassword(false);

    if (passwordError) {
      setError(passwordError.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated.");
  };

  const handleSendResetEmail = async () => {
    if (!profile?.email) return;

    clearFeedback();
    setSendingReset(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      profile.email,
      {
        redirectTo: `${window.location.origin}/auth/update-password`,
      }
    );

    setSendingReset(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset email sent.");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    if (!profile?.email || !deletePassword) {
      setError("Enter your current password to delete your account.");
      return;
    }

    clearFeedback();
    setDeletingAccount(true);

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: deletePassword,
    });

    if (verifyError) {
      setDeletingAccount(false);
      setError("Current password is incorrect.");
      return;
    }

    const { error: deleteError } = await supabase.rpc("delete_own_account");

    if (deleteError) {
      setDeletingAccount(false);
      setError(
        "Could not delete account. Make sure supabase/06_account_management.sql has been run."
      );
      return;
    }

    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const closeDeleteAccountDialog = () => {
    if (deletingAccount) return;
    setDeleteAccountDialogOpen(false);
    setDeletePassword("");
    setDeleteConfirm("");
  };

  const handleChangeMemberRole = async (
    member: TeamMember,
    role: TeamMember["role"]
  ) => {
    if (member.role === role) return;

    clearFeedback();
    setUpdatingMemberId(member.id);

    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role })
      .eq("id", member.id);

    setUpdatingMemberId(null);

    if (updateError) {
      setError("Could not update member role.");
      return;
    }

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id ? { ...item, role } : item
      )
    );
    setMessage("Member role updated.");
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    clearFeedback();
    setRemovingMember(true);

    const { error: removeError } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberToRemove.id);

    setRemovingMember(false);

    if (removeError) {
      setError("Could not remove member.");
      return;
    }

    setMembers((current) =>
      current.filter((member) => member.id !== memberToRemove.id)
    );
    setMemberToRemove(null);
    setMessage("Member removed.");
  };

  const displayName = profile?.full_name?.trim() || profile?.email || "Account";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fbff_0%,_#f4f7ff_45%,_#f6fffb_100%)] text-slate-950 lg:flex">
      <AppSidebar />
      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <p className="text-sm font-medium text-indigo-700">Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Manage your account, security, workspace data, and permanent
              account actions.
            </p>
          </div>

          {(message || error) && (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                error
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          {loading ? (
            <div className="h-96 animate-pulse rounded-2xl bg-white" />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-6">
                <Card className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 text-sm font-semibold text-white">
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-5 w-5 text-indigo-600" />
                          <h2 className="text-lg font-semibold">Account</h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Update how your account appears across boards and
                          assignments.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleSaveProfile}
                      className="mt-6 grid gap-4 md:grid-cols-2"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={profile?.email ?? ""}
                          disabled
                          className="h-11 rounded-xl bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full-name">Full name</Label>
                        <Input
                          id="full-name"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="h-11 rounded-xl"
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="avatar-url">Avatar URL</Label>
                        <Input
                          id="avatar-url"
                          value={avatarUrl}
                          onChange={(event) => setAvatarUrl(event.target.value)}
                          className="h-11 rounded-xl"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button
                          disabled={savingProfile}
                          className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          {savingProfile ? "Saving..." : "Save account"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-teal-600" />
                      <h2 className="text-lg font-semibold">Team members</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Review invited users, change roles, or remove members from
                      your workspace.
                    </p>

                    <div className="mt-6 space-y-3">
                      {members.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                          No members yet. Invite registered users from a board.
                        </div>
                      ) : (
                        members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {member.name || member.email}
                              </p>
                              <p className="truncate text-sm text-slate-500">
                                {member.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium capitalize text-indigo-700">
                                  {updatingMemberId === member.id
                                    ? "saving"
                                    : member.role}
                                </span>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                                    member.status === "active"
                                      ? "border-teal-200 bg-teal-50 text-teal-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {member.status}
                                </span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-950"
                                    aria-label={`Open actions for ${
                                      member.name || member.email
                                    }`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleChangeMemberRole(member, "admin")
                                    }
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Make admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleChangeMemberRole(member, "member")
                                    }
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Make member
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setMemberToRemove(member)}
                                    className="cursor-pointer text-rose-600 focus:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-lg font-semibold">Password</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Change your password now or send yourself a secure reset
                      email.
                    </p>

                    <form
                      onSubmit={handleUpdatePassword}
                      className="mt-6 grid gap-4 md:grid-cols-2"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Confirm password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 md:col-span-2">
                        <Button
                          disabled={savingPassword}
                          className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          {savingPassword ? "Updating..." : "Update password"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendResetEmail}
                          disabled={sendingReset}
                          className="rounded-xl"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {sendingReset ? "Sending..." : "Email reset link"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-rose-200 bg-rose-50/80 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                      <h2 className="text-lg font-semibold text-rose-950">
                        Danger zone
                      </h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-rose-800">
                      Deleting your account permanently removes your login,
                      profile, boards, tasks, assignments, and team-member
                      records.
                    </p>
                    <div className="mt-5">
                      <Button
                        type="button"
                        onClick={() => setDeleteAccountDialogOpen(true)}
                        className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-6">
                <Card className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <h2 className="font-semibold">Security status</h2>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Authentication is handled by Supabase Auth. Row Level
                      Security keeps workspace data scoped to signed-in users.
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="font-semibold">Workspace summary</h2>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-indigo-50 p-4">
                        <LayoutDashboard className="h-5 w-5 text-indigo-600" />
                        <p className="mt-3 text-2xl font-semibold">
                          {boards.length}
                        </p>
                        <p className="text-sm text-slate-500">Boards</p>
                      </div>
                      <div className="rounded-2xl bg-teal-50 p-4">
                        <Users className="h-5 w-5 text-teal-600" />
                        <p className="mt-3 text-2xl font-semibold">
                          {members.length}
                        </p>
                        <p className="text-sm text-slate-500">Members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </div>
      </section>

      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close remove member dialog"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setMemberToRemove(null)}
          />
          <Card className="relative z-10 w-full max-w-md rounded-2xl border-white/20 bg-white shadow-2xl">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase text-rose-600">
                Remove member
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Remove {memberToRemove.name || memberToRemove.email}?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                They will no longer appear as an assignee option for your
                workspace. Existing assignment rows for this member will be
                removed by the database cascade.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMemberToRemove(null)}
                  disabled={removingMember}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRemoveMember}
                  disabled={removingMember}
                  className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                >
                  {removingMember ? "Removing..." : "Remove member"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {deleteAccountDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete account dialog"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={closeDeleteAccountDialog}
          />
          <Card className="relative z-10 w-full max-w-lg rounded-2xl border-white/20 bg-white shadow-2xl">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase text-rose-600">
                Permanent action
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Delete your account?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This permanently deletes your login and workspace data. Confirm
                your current password, then type DELETE to continue.
              </p>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-account-password">
                    Current password
                  </Label>
                  <Input
                    id="delete-account-password"
                    type="password"
                    value={deletePassword}
                    onChange={(event) =>
                      setDeletePassword(event.target.value)
                    }
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-account-confirm">
                    Type DELETE to confirm
                  </Label>
                  <Input
                    id="delete-account-confirm"
                    value={deleteConfirm}
                    onChange={(event) =>
                      setDeleteConfirm(event.target.value)
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDeleteAccountDialog}
                  disabled={deletingAccount}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteConfirm !== "DELETE" ||
                    !deletePassword ||
                    deletingAccount
                  }
                  className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                >
                  {deletingAccount ? "Deleting..." : "Confirm delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
