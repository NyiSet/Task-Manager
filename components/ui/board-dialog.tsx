"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CreateBoardValues = {
  name: string;
  description: string | null;
};

type BoardDialogProps = {
  open: boolean;
  creating?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBoard: (values: CreateBoardValues) => Promise<void>;
};

export default function BoardDialog({
  open,
  creating = false,
  onOpenChange,
  onCreateBoard,
}: BoardDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    await onCreateBoard({
      name: name.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <Card className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border-white/20 bg-white shadow-2xl">
        <CardContent className="p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase text-slate-500">
              New Board
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Create a board
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Separate product work, client projects, departments, or personal workflows.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board name</Label>
              <Input
                id="board-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Marketing launch"
                className="h-11 rounded-xl border-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-description">Description</Label>
              <textarea
                id="board-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this board is for..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              >
                {creating ? "Creating..." : "Create Board"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
