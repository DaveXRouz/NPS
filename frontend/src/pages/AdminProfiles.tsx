import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ProfileTable } from "@/components/admin/ProfileTable";
import { useAdminProfiles, useDeleteProfile } from "@/hooks/useAdmin";
import { FadeIn } from "@/components/common/FadeIn";
import type { ProfileSortField, SortOrder } from "@/types";

export default function AdminProfiles() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ProfileSortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const { data, isLoading, error } = useAdminProfiles({
    limit: pageSize,
    offset: page * pageSize,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    include_deleted: includeDeleted || undefined,
  });

  const deleteMutation = useDeleteProfile();

  const handleSort = useCallback(
    (field: ProfileSortField) => {
      if (field === sortBy) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
      setPage(0);
    },
    [sortBy],
  );

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(0);
  }, []);

  const handleDelete = useCallback(
    (id: number) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  if (error) {
    return (
      <FadeIn delay={0}>
        <div className="text-center py-8 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl text-red-400">
          {t("admin.error_load_profiles")}
        </div>
      </FadeIn>
    );
  }

  return (
    <div>
      <FadeIn delay={0}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--nps-text-bright)]">
            {t("admin.profiles_title")}
          </h2>
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--nps-text-dim)] bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg cursor-pointer hover:border-[var(--nps-accent)]/40 transition-all duration-200">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(0);
              }}
              className="rounded border-[var(--nps-glass-border)] accent-[var(--nps-accent)]"
            />
            {t("admin.show_deleted")}
          </label>
        </div>
      </FadeIn>
      <FadeIn delay={80}>
        <ProfileTable
          profiles={data?.profiles || []}
          total={data?.total || 0}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onSearch={handleSearch}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
          onDelete={handleDelete}
        />
      </FadeIn>
    </div>
  );
}
