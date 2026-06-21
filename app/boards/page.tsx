"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import TaskDialog, { type CreateTaskValues } from "@/components/ui/task-dialog";
import BoardDialog, {
  type CreateBoardValues,
} from "@/components/ui/board-dialog";
import { AppSidebar } from "@/components/app-sidebar";
import TeamMemberDialog, {
  type CreateTeamMemberValues,
} from "@/components/ui/team-member-dialog";
import TaskDetailsDialog, {
  type UpdateTaskValues,
} from "@/components/ui/task-details-dialog";
import DeleteTaskDialog from "@/components/ui/delete-task-dialog";
import BoardColumn from "@/components/board/board-column";
import TaskCard, {
  getMemberDisplayName,
  type Task,
  type TaskStatus,
  type TeamMember,
} from "@/components/board/task-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";

type Board = {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

const columns: {
  id: TaskStatus;
  title: string;
  accent: string;
  badgeClass: string;
  columnBg: string;
  cardTint: string;
}[] = [
  {
    id: "todo",
    title: "To Do",
    accent: "bg-sky-500",
    badgeClass: "bg-sky-500/15 text-sky-700 hover:bg-sky-500/15",
    columnBg: "border-slate-200 bg-slate-50",
    cardTint: "hover:ring-sky-400/20",
  },
  {
    id: "in_progress",
    title: "In Progress",
    accent: "bg-amber-500",
    badgeClass: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
    columnBg: "border-slate-200 bg-slate-50",
    cardTint: "hover:ring-amber-400/20",
  },
  {
    id: "in_review",
    title: "In Review",
    accent: "bg-violet-500",
    badgeClass: "bg-violet-500/15 text-violet-700 hover:bg-violet-500/15",
    columnBg: "border-slate-200 bg-slate-50",
    cardTint: "hover:ring-violet-400/20",
  },
  {
    id: "done",
    title: "Done",
    accent: "bg-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15",
    columnBg: "border-slate-200 bg-slate-50",
    cardTint: "hover:ring-emerald-400/20",
  },
];

function isTaskOverdue(dueDate: string | null) {
  if (!dueDate) return false;

  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return due.getTime() < todayStart.getTime();
}

function isTaskDueSoon(dueDate: string | null) {
  if (!dueDate) return false;

  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffMs = due.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 3;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function BoardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [creatingMember, setCreatingMember] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "low" | "normal" | "high"
  >("all");
  const [assigneeFilter, setAssigneeFilter] = useState<
    "all" | "me" | "unassigned"
  >("all");
  const [dueFilter, setDueFilter] = useState<"all" | "soon" | "overdue">(
    "all"
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? null;
  const boardIdFromUrl = searchParams.get("board");
  const currentBoardMembership =
    teamMembers.find((member) => member.member_user_id === currentUserId) ??
    null;
  const currentBoardRole =
    activeBoard?.user_id === currentUserId
      ? "owner"
      : currentBoardMembership?.role ?? "member";
  const canManageBoard =
    currentBoardRole === "owner" || currentBoardRole === "admin";

  const fetchBoards = async (userId: string) => {
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setActionError(
        "Boards are not ready yet. Run supabase/05_boards.sql, then refresh."
      );
      setBoards([]);
      return null;
    }

    let nextBoards = (data as Board[]) ?? [];

    if (nextBoards.length === 0) {
      const { data: createdBoard, error: createError } = await supabase
        .from("boards")
        .insert({
          name: "Main board",
          description: "Default workspace board.",
          user_id: userId,
        })
        .select()
        .single();

      if (createError || !createdBoard) {
        setActionError("Could not create your first board. Please try again.");
        return null;
      }

      nextBoards = [createdBoard as Board];
    }

    const requestedBoard = nextBoards.find((board) => board.id === boardIdFromUrl);
    const nextActiveBoardId = requestedBoard?.id ?? nextBoards[0]?.id ?? null;

    setBoards(nextBoards);
    setActiveBoardId((current) => current ?? nextActiveBoardId);
    return nextActiveBoardId;
  };

  const selectBoard = (boardId: string) => {
    setActiveBoardId(boardId);
    router.push(`/boards?board=${boardId}`);
  };

  const fetchTeamMembers = async (boardId = activeBoardId) => {
    if (!boardId) {
      setTeamMembers([]);
      return;
    }

    const { data, error } = await supabase
      .from("team_members")
      .select(
        "id, board_id, owner_id, member_user_id, email, name, avatar_url, role, status, invited_at, created_at"
      )
      .eq("board_id", boardId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch team members error:", error.message);
      return;
    }

    setTeamMembers((data as TeamMember[]) ?? []);
  };

  const fetchTasks = async (boardId = activeBoardId) => {
    setLoading(true);
    setFetchError(null);

    if (!boardId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignees (
          id,
          task_id,
          team_member_id,
          user_id,
          created_at,
          team_members (
            id,
            board_id,
            owner_id,
            member_user_id,
            email,
            name,
            avatar_url,
            role,
            status,
            invited_at,
            created_at
          )
        )
      `)
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError("Could not load your tasks. Please try again.");
      setTasks([]);
    } else {
      setTasks((data as Task[]) ?? []);
    }

    setLoading(false);
  };

  const handleCreateTeamMember = async (values: CreateTeamMemberValues) => {
    setCreatingMember(true);
    setActionError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setActionError("Please sign in again before inviting a member.");
      setCreatingMember(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url")
      .ilike("email", values.email)
      .maybeSingle();

    if (profileError || !profile) {
      setActionError(
        "That email is not registered yet. Ask them to create an account first, then invite them."
      );
      setCreatingMember(false);
      return;
    }

    if (profile.id === user.id) {
      setActionError("You are already the workspace owner.");
      setCreatingMember(false);
      return;
    }

    if (!activeBoardId) {
      setActionError("Choose a board before inviting a member.");
      setCreatingMember(false);
      return;
    }

    const { error } = await supabase.from("team_members").insert({
      board_id: activeBoardId,
      owner_id: activeBoard?.user_id ?? user.id,
      user_id: activeBoard?.user_id ?? user.id,
      member_user_id: profile.id,
      email: profile.email,
      name: profile.full_name ?? profile.email,
      avatar_url: profile.avatar_url,
      role: values.role,
      status: "invited",
    });

    if (error) {
      setActionError(
        error.code === "23505"
          ? "This member is already on your workspace."
          : "Could not invite team member. Please try again."
      );
      setCreatingMember(false);
      return;
    }

    setMemberDialogOpen(false);
    await fetchTeamMembers(activeBoardId);
    setCreatingMember(false);
  };

  const handleRemoveTeamMember = async () => {
    if (!memberToRemove) return;

    setRemovingMember(true);
    setActionError(null);

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberToRemove.id);

    if (error) {
      setActionError("Could not remove team member. Please try again.");
      setRemovingMember(false);
      return;
    }

    setTeamMembers((current) =>
      current.filter((member) => member.id !== memberToRemove.id)
    );
    setMemberToRemove(null);

    await Promise.all([
      fetchTeamMembers(),
      activeBoardId ? fetchTasks(activeBoardId) : Promise.resolve(),
    ]);

    setRemovingMember(false);
  };

  const handleCreateBoard = async (values: CreateBoardValues) => {
    setCreatingBoard(true);
    setActionError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setActionError("Please sign in again before creating a board.");
      setCreatingBoard(false);
      return;
    }

    const createdBoard: Board = {
      id: crypto.randomUUID(),
      name: values.name,
      description: values.description,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("boards").insert(createdBoard);

    if (error) {
      console.error("Create board error:", error);
      setActionError(
        `Could not create board${
          error.message ? `: ${error.message}` : ". Please try again."
        }`
      );
      setCreatingBoard(false);
      return;
    }

    setBoards((current) => [...current, createdBoard]);
    selectBoard(createdBoard.id);
    setTasks([]);
    setBoardDialogOpen(false);
    setCreatingBoard(false);
  };

  const handleCreateTask = async (values: CreateTaskValues) => {
    setCreating(true);
    setActionError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setActionError("Please sign in again before creating a task.");
      setCreating(false);
      return;
    }

    if (!activeBoardId) {
      setActionError("Create or select a board before adding tasks.");
      setCreating(false);
      return;
    }

    const { data: createdTask, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: values.title,
        description: values.description,
        status: "todo",
        priority: values.priority,
        due_date: values.due_date,
        board_id: activeBoardId,
        user_id: activeBoard?.user_id ?? user.id,
      })
      .select()
      .single();

    if (taskError || !createdTask) {
      setActionError("Could not create task. Please try again.");
      setCreating(false);
      return;
    }

    if (values.assignee_ids.length > 0) {
      const assigneeRows = values.assignee_ids.map((memberId) => ({
        task_id: createdTask.id,
        team_member_id: memberId,
        user_id: activeBoard?.user_id ?? user.id,
      }));

      const { error: assigneeError } = await supabase
        .from("task_assignees")
        .insert(assigneeRows);

      if (assigneeError) {
        console.error("Create task assignees error:", assigneeError);
        setActionError(
          `Task created, but assignees could not be saved: ${assigneeError.message}`
        );
        setCreating(false);
        await fetchTasks(activeBoardId);
        return;
      }
    }

    setDialogOpen(false);
    await fetchTasks(activeBoardId);
    setCreating(false);
  };

  const handleUpdateTask = async (taskId: string, values: UpdateTaskValues) => {
    setSavingTask(true);
    setActionError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setActionError("Please sign in again before saving changes.");
      setSavingTask(false);
      return;
    }

    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        title: values.title,
        description: values.description,
        priority: values.priority,
        due_date: values.due_date,
      })
      .eq("id", taskId);

    if (taskError) {
      setActionError("Could not update task. Please try again.");
      setSavingTask(false);
      return;
    }

    const { error: deleteAssigneesError } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId);

    if (deleteAssigneesError) {
      console.error("Delete task assignees error:", deleteAssigneesError);
      setActionError(
        `Could not update assignees: ${deleteAssigneesError.message}`
      );
      setSavingTask(false);
      return;
    }

    if (values.assignee_ids.length > 0) {
      const assigneeRows = values.assignee_ids.map((memberId) => ({
        task_id: taskId,
        team_member_id: memberId,
        user_id: activeBoard?.user_id ?? user.id,
      }));

      const { error: insertAssigneesError } = await supabase
        .from("task_assignees")
        .insert(assigneeRows);

      if (insertAssigneesError) {
        console.error("Insert task assignees error:", insertAssigneesError);
        setActionError(
          `Could not update assignees: ${insertAssigneesError.message}`
        );
        setSavingTask(false);
        return;
      }
    }

    setDetailsDialogOpen(false);
    setSelectedTask(null);
    await fetchTasks(activeBoardId);
    setSavingTask(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTask(true);
    setActionError(null);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      setActionError("Could not delete task. Please try again.");
      setDeletingTask(false);
      return;
    }

    setDeleteDialogOpen(false);
    setDetailsDialogOpen(false);
    setSelectedTask(null);
    setTaskToDelete(null);
    await fetchTasks(activeBoardId);
    setDeletingTask(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const previousTasks = tasks;
    setActionError(null);
    setUpdatingTaskId(taskId);

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      setActionError("Could not move task. Please try again.");
      setTasks(previousTasks);
    }

    setUpdatingTaskId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!canManageBoard) return;

    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    if (!canManageBoard) return;

    const { active, over } = event;
    if (!over) return;

    const activeTaskData = active.data.current?.task as Task | undefined;
    if (!activeTaskData) return;

    let newStatus: TaskStatus | null = null;

    const overType = over.data.current?.type;

    if (overType === "column") {
      newStatus = over.id as TaskStatus;
    } else if (overType === "task") {
      const overTask = over.data.current?.task as Task | undefined;
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (!newStatus || newStatus === activeTaskData.status) return;

    await updateTaskStatus(activeTaskData.id, newStatus);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setDetailsDialogOpen(true);
  };

  const handleDeleteTaskClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user || user.is_anonymous) {
        router.push("/auth/login");
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email ?? null);
      const boardId = await fetchBoards(user.id);
      await Promise.all([fetchTasks(boardId), fetchTeamMembers(boardId)]);
      setAuthChecking(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setBoardDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeBoardId || authChecking) return;
    fetchTasks(activeBoardId);
    fetchTeamMembers(activeBoardId);
  }, [activeBoardId]);

  useEffect(() => {
    if (authChecking || !currentUserId) return;

    const channel = supabase
      .channel(`boards-page-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boards" },
        async () => {
          await fetchBoards(currentUserId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authChecking, currentUserId]);

  useEffect(() => {
    if (authChecking || !currentUserId) return;

    const refreshBoards = () => fetchBoards(currentUserId);
    const intervalId = window.setInterval(refreshBoards, 10000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshBoards();
      }
    };

    window.addEventListener("focus", refreshBoards);
    window.addEventListener("workboard:data-changed", refreshBoards);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshBoards);
      window.removeEventListener("workboard:data-changed", refreshBoards);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [authChecking, currentUserId]);

  useEffect(() => {
    if (authChecking || !activeBoardId) return;

    const refreshBoardData = async () => {
      await Promise.all([
        fetchTasks(activeBoardId),
        fetchTeamMembers(activeBoardId),
      ]);
    };

    const channel = supabase
      .channel(`board-live-${activeBoardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        refreshBoardData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        refreshBoardData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        refreshBoardData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authChecking, activeBoardId]);

  useEffect(() => {
    if (!boardIdFromUrl || boards.length === 0) return;
    const boardExists = boards.some((board) => board.id === boardIdFromUrl);

    if (boardExists && boardIdFromUrl !== activeBoardId) {
      setActiveBoardId(boardIdFromUrl);
    }
  }, [boardIdFromUrl, boards, activeBoardId]);

  useEffect(() => {
    if (!selectedTask) return;

    const latestTask = tasks.find((task) => task.id === selectedTask.id);

    if (latestTask) {
      setSelectedTask(latestTask);
    }
  }, [tasks, selectedTask]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.description?.toLowerCase().includes(normalizedQuery);

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      const taskAssignees =
        task.task_assignees
          ?.map((item) => item.team_members)
          .filter((member): member is TeamMember => Boolean(member)) ?? [];

      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && taskAssignees.length === 0) ||
        (assigneeFilter === "me" &&
          taskAssignees.some(
            (member) => member.member_user_id === currentUserId
          ));

      const matchesDue =
        dueFilter === "all" ||
        (dueFilter === "soon" && isTaskDueSoon(task.due_date)) ||
        (dueFilter === "overdue" && isTaskOverdue(task.due_date));

      return matchesSearch && matchesPriority && matchesAssignee && matchesDue;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter, dueFilter, currentUserId]);

  const groupedTasks = useMemo(() => {
    return {
      todo: filteredTasks.filter((task) => task.status === "todo"),
      in_progress: filteredTasks.filter((task) => task.status === "in_progress"),
      in_review: filteredTasks.filter((task) => task.status === "in_review"),
      done: filteredTasks.filter((task) => task.status === "done"),
    };
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "done").length;
    const overdue = tasks.filter((task) => isTaskOverdue(task.due_date)).length;
    const dueSoon = tasks.filter((task) => isTaskDueSoon(task.due_date)).length;
    const highPriority = tasks.filter((task) => task.priority === "high").length;
    const completionRate =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, overdue, dueSoon, highPriority, completionRate };
  }, [tasks]);

  const activeColumn = activeTask
    ? columns.find((column) => column.id === activeTask.status)
    : null;

  if (authChecking) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_55%,_#f8fafc_100%)] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="overflow-hidden rounded-3xl border-white/50 bg-white/70 shadow-[0_20px_80px_-20px_rgba(79,70,229,0.25)] backdrop-blur-xl">
            <CardContent className="space-y-4 p-6">
              <div className="h-4 w-28 animate-pulse rounded-full bg-indigo-100" />
              <div className="h-9 w-56 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
            </CardContent>
          </Card>
          <div className="grid gap-5 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-80 rounded-3xl border border-slate-200/70 bg-white/60 p-4"
              >
                <div className="mb-5 h-5 w-28 animate-pulse rounded bg-slate-200" />
                <div className="space-y-3">
                  <div className="h-24 animate-pulse rounded-2xl bg-white" />
                  <div className="h-24 animate-pulse rounded-2xl bg-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fbff_0%,_#f4f7ff_45%,_#f6fffb_100%)] text-slate-950 lg:flex">
        <AppSidebar />
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <Badge className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium tracking-wide text-indigo-700 hover:bg-indigo-50">
                    <LayoutDashboard className="mr-1 h-3.5 w-3.5" />
                    Product Workspace
                  </Badge>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                      {activeBoard?.name ?? "Team board"}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                      {activeBoard?.description ??
                        "Plan, assign, and move work through a focused workspace built for registered teams."}
                    </p>
                    {currentUserEmail && (
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        Signed in as {currentUserEmail} · {currentBoardRole}
                      </p>
                    )}
                  </div>
                </div>

                {canManageBoard && (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setMemberDialogOpen(true)}
                      className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>

                    <Button
                      onClick={() => setDialogOpen(true)}
                      className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Task
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Team</p>
                  <p className="text-xs text-slate-500">
                    {teamMembers.length} member{teamMembers.length === 1 ? "" : "s"}
                  </p>
                </div>

                {teamMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/50 p-4 text-sm text-slate-500">
                    No team members yet. Invite a registered user to start assigning work.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm"
                      >
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={getMemberDisplayName(member)}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 text-xs font-semibold text-white">
                            {getInitials(getMemberDisplayName(member))}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {getMemberDisplayName(member)}
                          </p>
                          <p className="text-xs capitalize text-slate-500">
                            {member.role}
                          </p>
                        </div>

                        {canManageBoard && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                                aria-label={`Open actions for ${getMemberDisplayName(
                                  member
                                )}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem
                                onClick={() => setMemberToRemove(member)}
                                className="cursor-pointer text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="rounded-2xl border-slate-200 bg-indigo-50/50 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        Open tasks
                      </p>
                      <CircleDot className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {stats.total - stats.completed}
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-emerald-50/50 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        Completed
                      </p>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {stats.completed}
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-amber-50/50 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        Due soon
                      </p>
                      <Clock3 className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {stats.dueSoon}
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-rose-50/50 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        Overdue
                      </p>
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-rose-600">
                      {stats.overdue}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Search
                  </label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks by title or description..."
                    className="h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Priority
                  </label>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 shadow-sm hover:bg-white"
                      >
                        <span>
                          {priorityFilter === "all"
                            ? "All priorities"
                            : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                        </span>
                        <span className="text-slate-400">▼</span>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="start"
                      className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl"
                    >
                      <DropdownMenuCheckboxItem
                        checked={priorityFilter === "all"}
                        onCheckedChange={() => setPriorityFilter("all")}
                      >
                        All priorities
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        checked={priorityFilter === "low"}
                        onCheckedChange={() => setPriorityFilter("low")}
                      >
                        Low
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        checked={priorityFilter === "normal"}
                        onCheckedChange={() => setPriorityFilter("normal")}
                      >
                        Normal
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuCheckboxItem
                        checked={priorityFilter === "high"}
                        onCheckedChange={() => setPriorityFilter("high")}
                      >
                        High
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "All dates",
                    active: dueFilter === "all",
                    onClick: () => setDueFilter("all" as const),
                  },
                  {
                    label: "Due soon",
                    active: dueFilter === "soon",
                    onClick: () => setDueFilter("soon" as const),
                  },
                  {
                    label: "Overdue",
                    active: dueFilter === "overdue",
                    onClick: () => setDueFilter("overdue" as const),
                  },
                  {
                    label: "Assigned to me",
                    active: assigneeFilter === "me",
                    onClick: () =>
                      setAssigneeFilter(
                        assigneeFilter === "me" ? "all" : "me"
                      ),
                  },
                  {
                    label: "Unassigned",
                    active: assigneeFilter === "unassigned",
                    onClick: () =>
                      setAssigneeFilter(
                        assigneeFilter === "unassigned" ? "all" : "unassigned"
                      ),
                  },
                ].map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={filter.onClick}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      filter.active
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {fetchError && (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm text-rose-700">
                  Could not load your tasks. Please try again.
                </p>
                <Button variant="outline" onClick={() => fetchTasks(activeBoardId)}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {actionError && (
            <Card className="border-amber-200 bg-amber-50/80">
              <CardContent className="p-4">
                <p className="text-sm text-amber-800">{actionError}</p>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Card className="rounded-2xl border-white/50 bg-white/70 shadow-sm backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-3xl border border-slate-200/70 bg-white/70 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                          <div className="h-6 w-8 animate-pulse rounded-full bg-slate-200" />
                        </div>

                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                              <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-5 xl:grid xl:min-w-0 xl:grid-cols-4">
                  {columns.map((column) => (
                    <BoardColumn
                      key={column.id}
                      id={column.id}
                      title={column.title}
                      accent={column.accent}
                      badgeClass={column.badgeClass}
                      columnBg={column.columnBg}
                      cardTint={column.cardTint}
                      tasks={groupedTasks[column.id]}
                      updatingTaskId={updatingTaskId}
                      canManageTasks={canManageBoard}
                      onEditTask={canManageBoard ? handleEditTask : undefined}
                      onDeleteTask={
                        canManageBoard ? handleDeleteTaskClick : undefined
                      }
                    />
                  ))}
                </div>
              </div>

              <DragOverlay>
                {activeTask && activeColumn ? (
                  <div className="rotate-1">
                    <TaskCard
                      task={activeTask}
                      cardTint={activeColumn.cardTint}
                      canManageTasks={canManageBoard}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
        </section>
      </main>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateTask={handleCreateTask}
        creating={creating}
        teamMembers={teamMembers}
      />

      <BoardDialog
        open={boardDialogOpen}
        onOpenChange={setBoardDialogOpen}
        onCreateBoard={handleCreateBoard}
        creating={creatingBoard}
      />

      <TeamMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        onCreateTeamMember={handleCreateTeamMember}
        creating={creatingMember}
      />

      <TaskDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={(open) => {
          setDetailsDialogOpen(open);
          if (!open) setSelectedTask(null);
        }}
        task={selectedTask}
        teamMembers={teamMembers}
        onUpdateTask={handleUpdateTask}
        onRequestDeleteTask={(task) => {
          setDetailsDialogOpen(false);
          setTaskToDelete(task);
          setDeleteDialogOpen(true);
        }}
        saving={savingTask}
        deleting={deletingTask}
      />

      <DeleteTaskDialog
        open={deleteDialogOpen}
        task={taskToDelete}
        deleting={deletingTask}
        onCancel={() => {
          if (deletingTask) return;
          setDeleteDialogOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleDeleteTask}
      />

      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close remove member dialog"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => {
              if (!removingMember) setMemberToRemove(null);
            }}
          />
          <Card className="relative z-10 w-full max-w-md rounded-2xl border-white/20 bg-white shadow-2xl">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase text-rose-600">
                Remove member
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Remove {getMemberDisplayName(memberToRemove)}?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This removes them from this board and clears their current task
                assignments on this board. You can invite them again later.
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
                  onClick={handleRemoveTeamMember}
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
    </>
  );
}

export default function BoardsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fbff_0%,_#f4f7ff_45%,_#f6fffb_100%)] text-slate-950 lg:flex">
          <AppSidebar />
          <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="h-52 animate-pulse rounded-2xl bg-white" />
              <div className="grid gap-5 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-80 animate-pulse rounded-2xl bg-white"
                  />
                ))}
              </div>
            </div>
          </section>
        </main>
      }
    >
      <BoardsPageContent />
    </Suspense>
  );
}
