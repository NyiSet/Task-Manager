"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import TaskCard, {
  type Task,
  type TaskStatus,
} from "@/components/board/task-card";

type BoardColumnProps = {
  id: TaskStatus;
  title: string;
  accent: string;
  badgeClass: string;
  columnBg: string;
  cardTint: string;
  tasks: Task[];
  updatingTaskId?: string | null;
  canManageTasks?: boolean;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
};

export default function BoardColumn({
  id,
  title,
  accent,
  badgeClass,
  columnBg,
  cardTint,
  tasks,
  updatingTaskId,
  canManageTasks = true,
  onEditTask,
  onDeleteTask,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "column",
      columnId: id,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`w-[320px] shrink-0 rounded-2xl border p-3 shadow-sm transition xl:w-auto ${
        isOver ? "ring-2 ring-slate-300" : ""
      } ${columnBg}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
          <h2 className="text-sm font-semibold tracking-wide text-slate-900">
            {title}
          </h2>
        </div>

        <Badge
          className={`min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
        >
          {tasks.length}
        </Badge>
      </div>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-[360px] space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 text-center">
              <p className="text-sm font-medium text-slate-600">No tasks yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Drag a task here or create a new one.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                cardTint={cardTint}
                isUpdating={updatingTaskId === task.id}
                canManageTasks={canManageTasks}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
