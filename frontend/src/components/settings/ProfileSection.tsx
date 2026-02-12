import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ProfileSection() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const username = localStorage.getItem("nps_username") || "User";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: t("settings.password_too_short") });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: t("settings.password_mismatch") });
      return;
    }

    setLoading(true);
    try {
      const token =
        localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY;
      const resp = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!resp.ok) {
        const data = await resp
          .json()
          .catch(() => ({ detail: resp.statusText }));
        if (resp.status === 400) {
          setMessage({ type: "error", text: t("settings.password_wrong") });
        } else {
          setMessage({ type: "error", text: data.detail || "Error" });
        }
        return;
      }

      setMessage({ type: "success", text: t("settings.password_changed") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage({ type: "error", text: t("common.error") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-nps-text-dim">
          {t("settings.display_name")}
        </label>
        <p className="text-sm text-nps-text-bright font-medium">{username}</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-3">
        <h4 className="text-xs font-semibold text-nps-text-bright uppercase tracking-wider">
          {t("settings.change_password")}
        </h4>
        <input
          type="password"
          placeholder={t("settings.current_password")}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-nps-bg-main border border-nps-border rounded text-nps-text-bright placeholder-nps-text-dim focus:outline-none focus:border-nps-accent"
          required
        />
        <input
          type="password"
          placeholder={t("settings.new_password")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-nps-bg-main border border-nps-border rounded text-nps-text-bright placeholder-nps-text-dim focus:outline-none focus:border-nps-accent"
          required
          minLength={8}
        />
        <input
          type="password"
          placeholder={t("settings.confirm_password")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-nps-bg-main border border-nps-border rounded text-nps-text-bright placeholder-nps-text-dim focus:outline-none focus:border-nps-accent"
          required
          minLength={8}
        />
        {message && (
          <p
            className={`text-xs ${
              message.type === "success" ? "text-green-400" : "text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-nps-accent text-white rounded hover:bg-nps-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("settings.change_password")}
        </button>
      </form>
    </div>
  );
}
