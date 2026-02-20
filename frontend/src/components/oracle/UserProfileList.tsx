import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OracleUser, OracleUserCreate } from "@/types";
import {
  useOracleUsers,
  useCreateOracleUser,
  useUpdateOracleUser,
  useDeleteOracleUser,
} from "@/hooks/useOracleUsers";
import { UserCard } from "./UserCard";
import { UserForm } from "./UserForm";

interface UserProfileListProps {
  onSelectUser?: (user: OracleUser) => void;
  selectedUserId?: number | null;
}

export function UserProfileList({
  onSelectUser,
  selectedUserId,
}: UserProfileListProps) {
  const { t } = useTranslation();
  const { data: users, isLoading, isError, refetch } = useOracleUsers();
  const createMutation = useCreateOracleUser();
  const updateMutation = useUpdateOracleUser();
  const deleteMutation = useDeleteOracleUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<OracleUser | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filtered = (users ?? []).filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.name_persian ?? "").includes(searchQuery) ||
      (u.country ?? "").toLowerCase().includes(q) ||
      (u.city ?? "").toLowerCase().includes(q)
    );
  });

  function handleCreate(data: OracleUserCreate) {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreateForm(false),
    });
  }

  function handleUpdate(data: OracleUserCreate) {
    if (!editingUser) return;
    updateMutation.mutate(
      { id: editingUser.id, data },
      { onSuccess: () => setEditingUser(null) },
    );
  }

  function handleDelete(user: OracleUser) {
    deleteMutation.mutate(user.id);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="profile-list-loading">
        <div className="h-8 bg-nps-bg-input rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-nps-bg-card border border-nps-border rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-8" data-testid="profile-list-error">
        <p className="text-nps-error text-sm mb-3">
          {t("oracle.error_loading_profiles")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1.5 text-sm bg-nps-bg-input border border-nps-border rounded hover:bg-nps-bg-hover text-nps-text transition-colors"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("oracle.search_profiles")}
          className="flex-1 bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text placeholder:text-nps-text-dim nps-input-focus"
          data-testid="profile-search"
        />
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="px-3 py-2 text-sm bg-nps-oracle-accent text-nps-bg font-medium rounded hover:bg-nps-oracle-accent/80 transition-colors shrink-0"
          data-testid="add-profile-btn"
        >
          {t("oracle.add_new_profile")}
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12" data-testid="profile-list-empty">
          <p className="text-nps-text-dim text-sm mb-3">
            {searchQuery
              ? t("oracle.no_profiles_match")
              : t("oracle.no_profiles")}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="px-3 py-1.5 text-sm bg-nps-oracle-accent text-nps-bg rounded hover:bg-nps-oracle-accent/80 transition-colors"
            >
              {t("oracle.create_first_profile")}
            </button>
          )}
        </div>
      )}

      {/* Card grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={setEditingUser}
              onDelete={handleDelete}
              onSelect={onSelectUser}
              isSelected={selectedUserId === user.id}
            />
          ))}
        </div>
      )}

      {/* Create form modal */}
      {showCreateForm && (
        <UserForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          isSubmitting={createMutation.isPending}
          serverError={
            createMutation.isError
              ? (createMutation.error as Error).message
              : null
          }
        />
      )}

      {/* Edit form modal */}
      {editingUser && (
        <UserForm
          user={editingUser}
          onSubmit={handleUpdate}
          onCancel={() => setEditingUser(null)}
          onDelete={() => handleDelete(editingUser)}
          isSubmitting={updateMutation.isPending}
          serverError={
            updateMutation.isError
              ? (updateMutation.error as Error).message
              : null
          }
        />
      )}
    </div>
  );
}
