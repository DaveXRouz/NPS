import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/hooks/useSettings";

const EXPIRY_OPTIONS = [
  { label: "api_key_never", value: undefined },
  { label: "api_key_30_days", value: 30 },
  { label: "api_key_90_days", value: 90 },
  { label: "api_key_1_year", value: 365 },
] as const;

export function ApiKeySection() {
  const { t } = useTranslation();
  const { data: keys, isLoading } = useApiKeys();
  const { mutate: createKey, isPending: creating } = useCreateApiKey();
  const { mutate: revokeKey } = useRevokeApiKey();

  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiryDays, setExpiryDays] = useState<number | undefined>(undefined);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const handleCreate = () => {
    if (!keyName.trim()) return;
    createKey(
      { name: keyName.trim(), expires_in_days: expiryDays },
      {
        onSuccess: (data) => {
          setNewKeyValue(data.key ?? null);
          setShowForm(false);
          setKeyName("");
          setExpiryDays(undefined);
        },
      },
    );
  };

  const handleCopy = async () => {
    if (newKeyValue) {
      await navigator.clipboard.writeText(newKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = (keyId: string) => {
    revokeKey(keyId, {
      onSuccess: () => setConfirmRevoke(null),
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-12 bg-nps-bg-card rounded" />
        <div className="h-12 bg-nps-bg-card rounded" />
      </div>
    );
  }

  const keyList = Array.isArray(keys) ? keys : [];

  return (
    <div className="space-y-3">
      {/* Newly created key banner */}
      {newKeyValue && (
        <div
          className="rounded p-3 space-y-2 border"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--nps-status-degraded) 15%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--nps-status-degraded) 50%, transparent)",
          }}
        >
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--nps-status-degraded)" }}
          >
            {t("settings.api_key_warning")}
          </p>
          <code
            className="block text-xs bg-nps-bg-card p-2 rounded break-all"
            style={{
              color:
                "color-mix(in srgb, var(--nps-status-degraded) 80%, white)",
            }}
          >
            {newKeyValue}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1 text-xs text-white rounded transition-colors"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--nps-status-degraded) 70%, black)",
            }}
          >
            {copied ? t("settings.api_key_copied") : t("settings.api_key_copy")}
          </button>
        </div>
      )}

      {/* Key list */}
      {keyList.length === 0 && !showForm && (
        <p className="text-sm text-nps-text-dim">
          {t("settings.api_key_empty")}
        </p>
      )}

      {keyList.map((k) => (
        <div
          key={k.id}
          className="flex items-center justify-between bg-nps-bg-card border border-nps-border rounded p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-nps-text-bright font-medium truncate">
              {k.name}
            </p>
            <p className="text-xs text-nps-text-dim">
              {t("settings.api_key_created_at")}:{" "}
              {new Date(k.created_at).toLocaleDateString()}
              {k.last_used && (
                <>
                  {" · "}
                  {t("settings.api_key_last_used")}:{" "}
                  {new Date(k.last_used).toLocaleDateString()}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 ms-2">
            {confirmRevoke === k.id ? (
              <>
                <button
                  type="button"
                  onClick={() => handleRevoke(k.id)}
                  className="px-2 py-1 text-xs text-white rounded"
                  style={{ backgroundColor: "var(--nps-status-unhealthy)" }}
                >
                  {t("common.confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(null)}
                  className="px-2 py-1 text-xs bg-nps-border text-nps-text-dim rounded hover:bg-nps-border/80"
                >
                  {t("common.cancel")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRevoke(k.id)}
                className="px-2 py-1 text-xs rounded border"
                style={{
                  color: "var(--nps-status-unhealthy)",
                  borderColor:
                    "color-mix(in srgb, var(--nps-status-unhealthy) 40%, transparent)",
                }}
              >
                {t("settings.api_key_revoke")}
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Create form */}
      {showForm ? (
        <div className="bg-nps-bg-card border border-nps-border rounded p-3 space-y-2">
          <input
            type="text"
            placeholder={t("settings.api_key_name")}
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="nps-input-focus w-full px-3 py-2 text-sm bg-nps-bg-card border border-nps-border rounded text-nps-text-bright placeholder-nps-text-dim"
          />
          <div>
            <label className="text-xs text-nps-text-dim mb-1 block">
              {t("settings.api_key_expires")}
            </label>
            <div className="flex gap-2 flex-wrap">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setExpiryDays(opt.value)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    expiryDays === opt.value
                      ? "bg-nps-accent text-white border-nps-accent"
                      : "bg-nps-bg-card text-nps-text-dim border-nps-border hover:border-nps-accent"
                  }`}
                >
                  {t(`settings.${opt.label}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !keyName.trim()}
              className="px-4 py-1.5 text-sm bg-nps-accent text-white rounded hover:bg-nps-accent/90 transition-colors disabled:opacity-50"
            >
              {creating ? t("common.loading") : t("settings.api_key_create")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setKeyName("");
              }}
              className="px-4 py-1.5 text-sm text-nps-text-dim border border-nps-border rounded hover:bg-nps-bg-card"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setNewKeyValue(null);
          }}
          className="w-full px-4 py-2 text-sm text-nps-accent border border-dashed border-nps-accent/50 rounded hover:bg-nps-accent/10 transition-colors"
        >
          + {t("settings.api_key_create")}
        </button>
      )}
    </div>
  );
}
