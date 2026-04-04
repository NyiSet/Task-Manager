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
      className={`w-[320px] shrink-0 rounded-3xl border p-4 backdrop-blur-xl shadow-[0_10px_40px_-18px_rgba(15,23,42,0.25)] transition xl:w-auto ${
        isOver ? "bg-indigo-50/30 ring-2 ring-indigo-300/70" : ""
      } ${columnBg}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${accent}`} />
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
        <div className="min-h-[120px] space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/50 p-5 text-center">
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