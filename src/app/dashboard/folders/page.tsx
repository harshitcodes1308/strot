"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { motion } from "motion/react";
import { FolderSimple, Plus, Trash, Pencil } from "@phosphor-icons/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function FoldersPage() {
  const { data: folders, isLoading, refetch } = trpc.folders.list.useQuery();
  const createMutation = trpc.folders.create.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.folders.delete.useMutation({ onSuccess: () => refetch() });

  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    await createMutation.mutateAsync({ name: newFolderName, color: "#3B82F6" });
    setNewFolderName("");
    setIsCreating(false);
  };

  return (
    <ErrorBoundary>
      <div className="p-8 max-w-[1200px] w-full mx-auto" style={{ paddingBottom: 120 }}>
        {/* Header */}
        <header className="mb-8" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: 8 }}>
              Folders
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Organize your saved leads into custom folders.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreating(true)}
            style={{ gap: 6 }}
          >
            <Plus size={16} weight="bold" />
            New Folder
          </button>
        </header>

        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]"
            style={{ display: "flex", gap: 12, alignItems: "center" }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Folder Name..."
              className="input"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button className="btn btn-ghost" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
          </motion.div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading folders...</div>
        ) : folders?.length === 0 ? (
          <div className="empty-state">
            <FolderSimple size={48} weight="duotone" color="var(--primary)" />
            <h3>No folders yet</h3>
            <p>Create a folder to organize your leads.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {folders?.map((folder) => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="card p-5 hover-lift"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  borderLeft: `4px solid ${folder.color || "var(--primary)"}`
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: 8, 
                      background: "var(--primary-subtle)", 
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--primary)" 
                    }}>
                      <FolderSimple size={24} weight="duotone" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 500, color: "var(--text)" }}>
                        {folder.name}
                      </h3>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                        {/* @ts-ignore - _count exists in the query payload */}
                        {folder._count?.leads || 0} leads
                      </p>
                    </div>
                  </div>
                  <button
                    className="icon-btn text-error hover-bg-error"
                    title="Delete Folder"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this folder? Leads inside will not be deleted, just removed from the folder.")) {
                        deleteMutation.mutate({ id: folder.id });
                      }
                    }}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
