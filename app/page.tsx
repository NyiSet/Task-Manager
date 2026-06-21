"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  SquareKanban,
  Trash2,
  Users,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import BoardDialog, {
  type CreateBoardValues,
} from "@/components/ui/board-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Board = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Task = {
  id: string;
  status: string;
  due_date: string | null;
  priority: string | null;
  board_id: string | null;
};

type TeamMember = {
  id: string;
};

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due.getTime() < todayStart.getTime();
}

function isDueSoon(dueDate: string | null) {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((due.getTime() - todayStart.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 3;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [boardToRename, setBoardToRename] = useState<Board | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.is_anonymous) {
      router.push("/auth/login");
      return;
    }

    const [boardResult, taskResult, memberResult] = await Promise.all([
      supabase
        .from("boards")
        .select("id, name, description, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("tasks")
        .select("id, status, due_date, priority, board_id")
        .order("created_at", { ascending: false }),
      supabase.from("team_members").select("id"),
    ]);

    setBoards((boardResult.data as Board[]) ?? []);
    setTasks((taskResult.data as Task[]) ?? []);
    setMembers((memberResult.data as TeamMember[]) ?? []);
    setActionError(null);
    setLoading(false);
  }, [router, supabase]);

  const handleCreateBoard = async (values: CreateBoardValues) => {
    setCreatingBoard(true);
    setActionError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.is_anonymous) {
      router.push("/auth/login");
      return;
    }

    const createdBoard: Board = {
      id: crypto.randomUUID(),
      name: values.name,
      description: values.description,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("boards").insert({
      id: createdBoard.id,
      name: createdBoard.name,
      description: createdBoard.description,
      user_id: user.id,
    });

    setCreatingBoard(false);

    if (error) {
      console.error("Create board error:", error);
      setActionError(
        `Could not create board${
          error.message ? `: ${error.message}` : ". Please try again."
        }`
      );
      return;
    }

    setBoards((current) => [...current, createdBoard]);
    setBoardDialogOpen(false);
    await loadDashboard();
  };

  const openRenameBoard = (board: Board) => {
    setBoardToRename(board);
    setRenameName(board.name);
    setRenameDescription(board.description ?? "");
  };

  const handleRenameBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!boardToRename || !renameName.trim()) return;

    setRenamingBoard(true);
    setActionError(null);

    const { data, error } = await supabase
      .from("boards")
      .update({
        name: renameName.trim(),
        description: renameDescription.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", boardToRename.id)
      .select("id, name, description, created_at")
      .single();

    setRenamingBoard(false);

    if (error || !data) {
      setActionError("Could not rename board. Please try again.");
      return;
    }

    setBoards((current) =>
      current.map((board) =>
        board.id === boardToRename.id ? (data as Board) : board
      )
    );
    setBoardToRename(null);
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;

    setDeletingBoard(true);
    setActionError(null);

    const { error } = await supabase
      .from("boards")
      .delete()
      .eq("id", boardToDelete.id);

    setDeletingBoard(false);

    if (error) {
      setActionError("Could not delete board. Please try again.");
      return;
    }

    setBoards((current) =>
      current.filter((board) => board.id !== boardToDelete.id)
    );
    setTasks((current) =>
      current.filter((task) => task.board_id !== boardToDelete.id)
    );
    setBoardToDelete(null);
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boards" },
        loadDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        loadDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        loadDashboard
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        loadDashboard
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard, supabase]);

  useEffect(() => {
    const intervalId = window.setInterval(loadDashboard, 10000);
    const refresh = () => loadDashboard();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        loadDashboard();
      }
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("workboard:data-changed", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("workboard:data-changed", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "done").length;
    const overdue = tasks.filter((task) => isOverdue(task.due_date)).length;
    const dueSoon = tasks.filter((task) => isDueSoon(task.due_date)).length;
    const highPriority = tasks.filter((task) => task.priority === "high").length;
    const completionRate =
      tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

    return { completed, overdue, dueSoon, highPriority, completionRate };
  }, [tasks]);

  const boardSummaries = boards.map((board) => {
    const boardTasks = tasks.filter((task) => task.board_id === board.id);
    const done = boardTasks.filter((task) => task.status === "done").length;
    const rate =
      boardTasks.length === 0 ? 0 : Math.round((done / boardTasks.length) * 100);

    return { board, total: boardTasks.length, done, rate };
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fbff_0%,_#f4f7ff_45%,_#f6fffb_100%)] text-slate-950 lg:flex">
      <AppSidebar />

      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Home</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Workspace Overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                A quick view of your boards, priorities, deadlines, and team activity.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-w-56 justify-between rounded-xl border-slate-200 bg-white px-3 text-sm font-medium"
                  >
                    <span>Open board</span>
                    <ChevronDown className="ml-3 h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl"
                >
                  {boards.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      No boards yet
                    </div>
                  ) : (
                    boards.map((board) => (
                      <DropdownMenuCheckboxItem
                        key={board.id}
                        checked={false}
                        onCheckedChange={() =>
                          router.push(`/boards?board=${board.id}`)
                        }
                      >
                        {board.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                onClick={() => setBoardDialogOpen(true)}
                className="h-10 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New board
              </Button>
            </div>
          </div>

          {actionError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="h-80 animate-pulse rounded-2xl bg-white" />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Boards", value: boards.length, icon: SquareKanban },
                  { label: "Tasks", value: tasks.length, icon: CheckCircle2 },
                  { label: "Due soon", value: stats.dueSoon, icon: Clock3 },
                  { label: "Overdue", value: stats.overdue, icon: AlertTriangle },
                  { label: "Members", value: members.length, icon: Users },
                ].map((item) => (
                  <Card key={item.label} className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">{item.label}</p>
                        <item.icon className="h-4 w-4 text-slate-500" />
                      </div>
                      <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <Card className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold">Boards</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Track each workstream separately.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {boardSummaries.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                          Run `05_boards.sql`, then create your first board.
                        </div>
                      ) : (
                        boardSummaries.map(({ board, total, done, rate }) => (
                          <div
                            key={board.id}
                            className="group relative rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/50 p-4 transition hover:border-indigo-200 hover:bg-white"
                          >
                            <div className="flex items-start justify-between gap-3 pr-9">
                              <div>
                                <Link
                                  href={`/boards?board=${board.id}`}
                                  className="font-medium transition hover:text-slate-700"
                                >
                                  {board.name}
                                </Link>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                  {board.description || "No description"}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                {rate}%
                              </span>
                            </div>
                            <div className="absolute right-3 top-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-950"
                                    aria-label={`Open actions for ${board.name}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem
                                    onClick={() => openRenameBoard(board)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setBoardToDelete(board)}
                                    className="cursor-pointer text-rose-600 focus:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="mt-4 h-2 rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                              {done} of {total} tasks complete
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="font-semibold">Health</h2>
                    <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">
                          Overall completion
                        </p>
                        <p className="font-semibold">{stats.completionRate}%</p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-teal-500"
                          style={{ width: `${stats.completionRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">High priority</span>
                        <span className="font-medium">{stats.highPriority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Completed</span>
                        <span className="font-medium">{stats.completed}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </section>

      <BoardDialog
        open={boardDialogOpen}
        onOpenChange={setBoardDialogOpen}
        onCreateBoard={handleCreateBoard}
        creating={creatingBoard}
      />

      {boardToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close rename board dialog"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setBoardToRename(null)}
          />
          <Card className="relative z-10 w-full max-w-xl rounded-2xl border-white/20 bg-white shadow-2xl">
            <CardContent className="p-0">
              <div className="border-b border-slate-200 px-6 py-5">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Board
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Rename board
                </h2>
              </div>
              <form onSubmit={handleRenameBoard} className="space-y-5 px-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="rename-board-name">Board name</Label>
                  <Input
                    id="rename-board-name"
                    value={renameName}
                    onChange={(event) => setRenameName(event.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rename-board-description">Description</Label>
                  <textarea
                    id="rename-board-description"
                    value={renameDescription}
                    onChange={(event) =>
                      setRenameDescription(event.target.value)
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBoardToRename(null)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={renamingBoard}
                    className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {renamingBoard ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {boardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete board dialog"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setBoardToDelete(null)}
          />
          <Card className="relative z-10 w-full max-w-md rounded-2xl border-white/20 bg-white shadow-2xl">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase text-rose-600">
                Delete board
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Delete {boardToDelete.name}?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This will delete the board and its tasks. This action cannot be
                undone.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBoardToDelete(null)}
                  disabled={deletingBoard}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteBoard}
                  disabled={deletingBoard}
                  className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                >
                  {deletingBoard ? "Deleting..." : "Delete board"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
