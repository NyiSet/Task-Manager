"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { useGuestAuth } from "@/hooks/use-guest-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import TaskDialog, { type CreateTaskValues } from "@/components/ui/task-dialog";
import TeamMemberDialog, {
  type CreateTeamMemberValues,
} from "@/components/ui/team-member-dialog";
import TaskDetailsDialog, {
  type UpdateTaskValues,
} from "@/components/ui/task-details-dialog";
import DeleteTaskDialog from "@/components/ui/delete-task-dialog";
import BoardColumn from "@/components/board/board-column";
import TaskCard, {
  type Task,
  type TaskStatus,
  type TeamMember,
} from "@/components/board/task-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    columnBg:
      "border-sky-200/60 bg-gradient-to-b from-sky-50/80 to-white/60",
    cardTint: "hover:ring-sky-400/20",
  },
  {
    id: "in_progress",
    title: "In Progress",
    accent: "bg-amber-500",
    badgeClass: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
    columnBg:
      "border-amber-200/60 bg-gradient-to-b from-amber-50/80 to-white/60",
    cardTint: "hover:ring-amber-400/20",
  },
  {
    id: "in_review",
    title: "In Review",
    accent: "bg-violet-500",
    badgeClass: "bg-violet-500/15 text-violet-700 hover:bg-violet-500/15",
    columnBg:
      "border-violet-200/60 bg-gradient-to-b from-violet-50/80 to-white/60",
    cardTint: "hover:ring-violet-400/20",
  },
  {
    id: "done",
    title: "Done",
    accent: "bg-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15",
    columnBg:
      "border-emerald-200/60 bg-gradient-to-b from-emerald-50/80 to-white/60",
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Home() {
  useGuestAuth();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingMember, setCreatingMember] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "low" | "normal" | "high"
  >("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch team members error:", error.message);
      return;
    }

    setTeamMembers((data as TeamMember[]) ?? []);
  };

  const fetchTasks = async () => {
    setLoading(true);
    setFetchError(null);

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
            name,
            avatar_url,
            user_id,
            created_at
          )
        )
      `)
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
      setActionError("Could not verify your guest session.");
      setCreatingMember(false);
      return;
    }

    const { error } = await supabase.from("team_members").insert({
      name: values.name,
      avatar_url: values.avatar_url,
      user_id: user.id,
    });

    if (error) {
      setActionError("Could not create team member. Please try again.");
      setCreatingMember(false);
      return;
    }

    setMemberDialogOpen(false);
    await fetchTeamMembers();
    setCreatingMember(false);
  };

  const handleCreateTask = async (values: CreateTaskValues) => {
    setCreating(true);
    setActionError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setActionError("Could not verify your guest session.");
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
        user_id: user.id,
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
        user_id: user.id,
      }));

      const { error: assigneeError } = await supabase
        .from("task_assignees")
        .insert(assigneeRows);

      if (assigneeError) {
        setActionError("Task created, but assignees could not be saved.");
        setCreating(false);
        await fetchTasks();
        return;
      }
    }

    setDialogOpen(false);
    await fetchTasks();
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
      setActionError("Could not verify your guest session.");
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
      setActionError("Could not update assignees. Please try again.");
      setSavingTask(false);
      return;
    }

    if (values.assignee_ids.length > 0) {
      const assigneeRows = values.assignee_ids.map((memberId) => ({
        task_id: taskId,
        team_member_id: memberId,
        user_id: user.id,
      }));

      const { error: insertAssigneesError } = await supabase
        .from("task_assignees")
        .insert(assigneeRows);

      if (insertAssigneesError) {
        setActionError("Could not update assignees. Please try again.");
        setSavingTask(false);
        return;
      }
    }

    setDetailsDialogOpen(false);
    setSelectedTask(null);
    await fetchTasks();
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
    await fetchTasks();
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

  const handleDragStart = (event: any) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

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
    fetchTasks();
    fetchTeamMembers();
  }, []);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.description?.toLowerCase().includes(normalizedQuery);

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

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

    return { total, completed, overdue };
  }, [tasks]);

  const activeColumn = activeTask
    ? columns.find((column) => column.id === activeTask.status)
    : null;

  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <Card className="overflow-hidden rounded-3xl border-white/50 bg-white/70 shadow-[0_20px_80px_-20px_rgba(79,70,229,0.35)] backdrop-blur-xl">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <Badge className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium tracking-wide text-indigo-700 hover:bg-indigo-500/10">
                    Personal Workflow
                  </Badge>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                      Task Board
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                      Organize your work with a clean visual workflow inspired by
                      modern product tools.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMemberDialogOpen(true)}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Add Member
                  </Button>

                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                  >
                    Add Task
                  </Button>
                </div>
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
                    No team members yet. Add one to start assigning work.
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
                            alt={member.name}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                            {getInitials(member.name)}
                          </div>
                        )}

                        <span className="text-sm font-medium text-slate-700">
                          {member.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="rounded-2xl border-white/50 bg-white/70 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total Tasks
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {stats.total}
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-white/50 bg-white/70 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Completed
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {stats.completed}
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-white/50 bg-white/70 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Overdue
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-rose-600">
                      {stats.overdue}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Search
                  </label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks by title or description..."
                    className="h-12 rounded-2xl border-slate-200 bg-white"
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
                        className="h-12 w-full justify-between rounded-2xl border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 shadow-sm hover:bg-slate-50"
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
            </CardContent>
          </Card>

          {fetchError && (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm text-rose-700">
                  Could not load your tasks. Please try again.
                </p>
                <Button variant="outline" onClick={fetchTasks}>
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
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTaskClick}
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
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateTask={handleCreateTask}
        creating={creating}
        teamMembers={teamMembers}
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
    </>
  );
}