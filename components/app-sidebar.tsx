"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Settings,
  SquareKanban,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Board = {
  id: string;
  name: string;
};

type Profile = {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

function AppSidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const activeBoardId = searchParams.get("board");
  const [boards, setBoards] = useState<Board[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [boardsOpen, setBoardsOpen] = useState(true);

  const loadBoards = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.is_anonymous) return;

    const [{ data: boardData }, { data: profileData }] = await Promise.all([
      supabase
        .from("boards")
        .select("id, name")
        .order("created_at", { ascending: true }),
      supabase
        .from("users")
        .select("email, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    setBoards((boardData as Board[]) ?? []);
    setProfile(
      (profileData as Profile | null) ?? {
        email: user.email ?? "",
        full_name: null,
        avatar_url: null,
      }
    );
  }, [supabase]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    const channel = supabase
      .channel("sidebar-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boards" },
        loadBoards
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        loadBoards
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBoards, supabase]);

  useEffect(() => {
    const intervalId = window.setInterval(loadBoards, 10000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        loadBoards();
      }
    };

    window.addEventListener("focus", loadBoards);
    window.addEventListener("workboard:data-changed", loadBoards);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadBoards);
      window.removeEventListener("workboard:data-changed", loadBoards);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadBoards]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const displayName = profile?.full_name?.trim() || "Account";
  const displayEmail = profile?.email || "";
  const initials = (displayName || displayEmail || "U").slice(0, 2).toUpperCase();

  return (
    <aside
      className="border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r"
    >
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-sm shadow-indigo-200">
            <SquareKanban className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">WorkBoard</p>
            <p className="text-xs text-slate-500">Team workspace</p>
          </div>
        </Link>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto lg:mt-5 lg:flex-col lg:overflow-visible">
        <Link
          href="/"
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
            pathname === "/"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
              : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Home</span>
        </Link>

        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setBoardsOpen((current) => !current)}
            className={`inline-flex h-10 w-full shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
              pathname.startsWith("/boards") && !activeBoardId
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
            }`}
          >
            <SquareKanban className="h-4 w-4" />
            <span>Boards</span>
            <ChevronDown
              className={`ml-auto h-4 w-4 transition ${
                boardsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {boardsOpen && (
            <div className="mt-1 space-y-1 pl-6">
              {boards.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">No boards yet</p>
              ) : (
                boards.slice(0, 8).map((board) => (
                  <Link
                    key={board.id}
                    href={`/boards?board=${board.id}`}
                    className={`block truncate rounded-lg px-3 py-2 text-sm transition ${
                      activeBoardId === board.id
                        ? "bg-teal-50 font-medium text-teal-700 ring-1 ring-teal-200"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                    title={board.name}
                  >
                    {board.name}
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <Link
          href="/settings"
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
            pathname.startsWith("/settings")
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
              : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="mt-6 border-t border-slate-200 pt-4 lg:absolute lg:bottom-4 lg:left-4 lg:right-4 lg:mt-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-100"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 text-xs font-semibold text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-950">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {displayEmail}
                </p>
              </div>
              <MoreVertical className="h-4 w-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{displayEmail}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer"
            >
              <UserRound className="h-4 w-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

export function AppSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-8 space-y-2">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </aside>
      }
    >
      <AppSidebarContent />
    </Suspense>
  );
}
