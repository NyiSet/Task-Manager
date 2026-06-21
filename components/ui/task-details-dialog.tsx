"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import {
  getMemberDisplayName,
  type Task,
  type TeamMember,
} from "@/components/board/task-card";

export type UpdateTaskValues = {
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high";
  due_date: string | null;
  assignee_ids: string[];
};

type TaskDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  teamMembers: TeamMember[];
  onUpdateTask: (taskId: string, values: UpdateTaskValues) => Promise<void>;
  onRequestDeleteTask: (task: Task) => void;
  saving?: boolean;
  deleting?: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  teamMembers,
  onUpdateTask,
  onRequestDeleteTask,
  saving = false,
  deleting = false,
}: TaskDetailsDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!task || !open) return;

    setTitle(task.title ?? "");
    setDescription(task.description ?? "");
    setPriority(task.priority ?? "normal");
    setDueDate(task.due_date ?? "");
    setAssigneeIds(
      task.task_assignees?.map((item) => item.team_member_id) ?? []
    );
  }, [task, open]);

  const formattedPriority =
    priority.charAt(0).toUpperCase() + priority.slice(1);

  const selectedMembers = useMemo(
    () => teamMembers.filter((member) => assigneeIds.includes(member.id)),
    [teamMembers, assigneeIds]
  );

  const toggleAssignee = (memberId: string, checked: boolean) => {
    setAssigneeIds((current) => {
      if (checked) {
        return current.includes(memberId) ? current : [...current, memberId];
      }
      return current.filter((id) => id !== memberId);
    });
  };

  if (!open || !task) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onUpdateTask(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      assignee_ids: assigneeIds,
    });
  };

  const assigneeButtonLabel =
    selectedMembers.length === 0
      ? "Select team members"
      : selectedMembers.length === 1
      ? getMemberDisplayName(selectedMembers[0])
      : `${selectedMembers.length} members selected`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <Card className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border-white/20 bg-white/90 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
        <CardContent className="p-0">
          <div className="border-b border-slate-200/70 px-6 py-5">
            <div className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium tracking-wide text-indigo-700">
              Task Details
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Edit task
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Update task details, manage assignees, or delete this task.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label
                htmlFor="task-details-title"
                className="text-sm font-medium text-slate-700"
              >
                Title
              </Label>
              <Input
                id="task-details-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl border-slate-200 bg-white py-6 text-sm text-slate-900 focus-visible:ring-indigo-100"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="task-details-description"
                className="text-sm font-medium text-slate-700"
              >
                Description
              </Label>
              <textarea
                id="task-details-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Priority
                </Label>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-between rounded-2xl border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 shadow-sm hover:bg-slate-50"
                    >
                      <span>{formattedPriority}</span>
                      <span className="text-slate-400">▼</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl"
                  >
                    <DropdownMenuCheckboxItem
                      checked={priority === "low"}
                      onCheckedChange={() => setPriority("low")}
                    >
                      Low
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={priority === "normal"}
                      onCheckedChange={() => setPriority("normal")}
                    >
                      Normal
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={priority === "high"}
                      onCheckedChange={() => setPriority("high")}
                    >
                      High
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Due date
                </Label>
                <DatePicker
                  value={dueDate || null}
                  onChange={(date) => setDueDate(date || "")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Assignees
              </Label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full justify-between rounded-2xl border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 shadow-sm hover:bg-slate-50"
                  >
                    <span className="truncate">{assigneeButtonLabel}</span>
                    <span className="text-slate-400">▼</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl"
                >
                  {teamMembers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      No team members yet
                    </div>
                  ) : (
                    teamMembers.map((member) => (
                      <DropdownMenuCheckboxItem
                        key={member.id}
                        checked={assigneeIds.includes(member.id)}
                        onCheckedChange={(checked) =>
                          toggleAssignee(member.id, checked === true)
                        }
                      >
                        {getMemberDisplayName(member)}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
                    >
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={getMemberDisplayName(member)}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                          {getInitials(getMemberDisplayName(member))}
                        </div>
                      )}

                      <span className="text-xs font-medium text-slate-700">
                        {getMemberDisplayName(member)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setAssigneeIds((current) =>
                            current.filter((id) => id !== member.id)
                          )
                        }
                        className="text-slate-400 transition hover:text-slate-600"
                        aria-label={`Remove ${getMemberDisplayName(member)}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/70 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onRequestDeleteTask(task)}
                disabled={deleting || saving}
                className="rounded-xl border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              >
                Delete Task
              </Button>

              <div className="flex items-center gap-3">
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
                  disabled={saving || deleting}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
