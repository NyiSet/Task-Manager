"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

export type TeamMember = {
  id: string;
  board_id: string | null;
  owner_id: string;
  member_user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
  status: "active" | "invited";
  invited_at: string;
  created_at: string;
};

export type TaskAssignee = {
  id: string;
  task_id: string;
  team_member_id: string;
  user_id: string;
  created_at: string;
  team_members: TeamMember | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "normal" | "high" | null;
  due_date: string | null;
  board_id: string | null;
  user_id: string;
  created_at: string;
  task_assignees?: TaskAssignee[];
};

type TaskCardProps = {
  task: Task;
  cardTint: string;
  isUpdating?: boolean;
  canManageTasks?: boolean;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
};

function getPriorityClasses(priority: Task["priority"]) {
  switch (priority) {
    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50";
    case "normal":
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100";
  }
}

function getDueDateState(dueDate: string | null) {
  if (!dueDate) return null;

  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffMs = due.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: "Overdue",
      className: "bg-rose-500/15 text-rose-700 hover:bg-rose-500/15",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      className: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
    };
  }

  if (diffDays <= 3) {
    return {
      label: "Due soon",
      className: "bg-orange-500/15 text-orange-700 hover:bg-orange-500/15",
    };
  }

  return {
    label: dueDate,
    className: "bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/10",
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getMemberDisplayName(member: TeamMember) {
  return member.name?.trim() || member.email;
}

export default function TaskCard({
  task,
  cardTint,
  isUpdating = false,
  canManageTasks = true,
  onEditTask,
  onDeleteTask,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !canManageTasks,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDateState = getDueDateState(task.due_date);
  const assignees =
    task.task_assignees
      ?.map((item) => item.team_members)
      .filter((member): member is TeamMember => Boolean(member)) ?? [];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${cardTint} ${
        isDragging
          ? "scale-[1.02] opacity-70 ring-2 ring-indigo-300 shadow-[0_20px_40px_-20px_rgba(79,70,229,0.45)]"
          : ""
      } ${isUpdating ? "opacity-60" : ""}`}
    >
      <CardContent className="p-4">
        <div
          {...attributes}
          {...(canManageTasks ? listeners : {})}
          className={canManageTasks ? "cursor-grab active:cursor-grabbing" : ""}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold leading-5 text-slate-950">
              {task.title}
            </p>

            {canManageTasks && (
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask?.(task);
                  }}
                  aria-label={`Edit ${task.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask?.(task);
                  }}
                  aria-label={`Delete ${task.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {task.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
              {task.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {task.priority && (
              <Badge
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getPriorityClasses(
                  task.priority
                )}`}
              >
                {task.priority}
              </Badge>
            )}

            {dueDateState && (
              <Badge
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${dueDateState.className}`}
              >
                <CalendarDays className="mr-1 h-3 w-3" />
                {dueDateState.label}
              </Badge>
            )}
          </div>

          {assignees.length > 0 && (
            <div className="mt-4 flex items-center justify-end">
              <div className="flex -space-x-2">
                {assignees.slice(0, 3).map((member) => (
                  <div
                    key={member.id}
                    title={getMemberDisplayName(member)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-semibold text-white shadow-sm"
                  >
                    {getInitials(getMemberDisplayName(member))}
                  </div>
                ))}

                {assignees.length > 3 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
