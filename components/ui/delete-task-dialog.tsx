"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Task } from "@/components/board/task-card";

type DeleteTaskDialogProps = {
  open: boolean;
  task: Task | null;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: (taskId: string) => Promise<void>;
};

export default function DeleteTaskDialog({
  open,
  task,
  deleting = false,
  onCancel,
  onConfirm,
}: DeleteTaskDialogProps) {
  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onCancel}
      />

      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-white/20 bg-white/90 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
        <CardContent className="p-0">
          <div className="border-b border-slate-200/70 px-6 py-5">
            <div className="inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium tracking-wide text-rose-700">
              Delete Task
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Are you sure?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              You are about to delete{" "}
              <span className="font-semibold text-slate-900">
                "{task.title}"
              </span>
              . This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={deleting}
              className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={() => onConfirm(task.id)}
              disabled={deleting}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleting ? "Deleting..." : "Delete Task"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}