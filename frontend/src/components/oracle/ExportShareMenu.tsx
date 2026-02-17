import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  formatAsText,
  exportAsPdf,
  exportAsImage,
  copyToClipboard,
  downloadAsText,
  downloadAsJson,
} from "@/utils/exportReading";
import { createShareLink, getShareUrl } from "@/utils/shareReading";
import type { ConsultationResult, ExportFormat } from "@/types";

interface ExportShareMenuProps {
  result: ConsultationResult | null;
  readingId?: number | null;
  readingCardId: string;
}

export function ExportShareMenu({
  result,
  readingId,
  readingCardId,
}: ExportShareMenuProps) {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setError(null);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, closeMenu]);

  // Keyboard: Escape closes menu
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, closeMenu]);

  if (!result) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  async function handleExportPdf() {
    setLoading("pdf");
    setError(null);
    try {
      await exportAsPdf(
        readingCardId,
        `oracle-reading-${timestamp}.pdf`,
        i18n.language,
      );
    } catch {
      setError(t("oracle.export_error"));
    } finally {
      setLoading(null);
    }
  }

  async function handleExportImage() {
    setLoading("image");
    setError(null);
    try {
      await exportAsImage(readingCardId, `oracle-reading-${timestamp}.png`);
    } catch {
      setError(t("oracle.export_error"));
    } finally {
      setLoading(null);
    }
  }

  function handleExportText() {
    setLoading("text");
    setError(null);
    try {
      const text = formatAsText(result!, i18n.language);
      downloadAsText(text, `oracle-reading-${timestamp}.txt`);
    } catch {
      setError(t("oracle.export_error"));
    } finally {
      setLoading(null);
    }
  }

  function handleExportJson() {
    setLoading("json");
    setError(null);
    try {
      downloadAsJson(
        result!.data as unknown as Record<string, unknown>,
        `oracle-reading-${timestamp}.json`,
      );
    } catch {
      setError(t("oracle.export_error"));
    } finally {
      setLoading(null);
    }
  }

  async function handleCreateShareLink() {
    if (!readingId) return;
    setLoading("share");
    setError(null);
    try {
      const link = await createShareLink(readingId);
      const fullUrl = getShareUrl(link.token);
      setShareLink(fullUrl);
      await copyToClipboard(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("oracle.share_error"));
    } finally {
      setLoading(null);
    }
  }

  async function handleCopyShareLink() {
    if (!shareLink) return;
    await copyToClipboard(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const menuItems: {
    key: string;
    label: string;
    action: () => void;
    loadingKey?: ExportFormat | "share";
    dividerBefore?: boolean;
  }[] = [
    {
      key: "pdf",
      label: t("oracle.export_pdf"),
      action: handleExportPdf,
      loadingKey: "pdf",
    },
    {
      key: "image",
      label: t("oracle.export_image"),
      action: handleExportImage,
      loadingKey: "image",
    },
    {
      key: "text",
      label: t("oracle.export_text"),
      action: handleExportText,
      loadingKey: "text",
    },
    {
      key: "json",
      label: t("oracle.export_json"),
      action: handleExportJson,
      loadingKey: "json",
    },
  ];

  if (readingId) {
    menuItems.push({
      key: "share",
      label: shareLink ? t("oracle.share_copy") : t("oracle.share_create"),
      action: shareLink ? handleCopyShareLink : handleCreateShareLink,
      loadingKey: "share",
      dividerBefore: true,
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        className="px-2 py-1 text-xs bg-nps-bg-input text-nps-text-dim hover:text-nps-text rounded transition-colors nps-animate-scale-in"
      >
        {t("oracle.export_text")} &#9662;
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label={t("oracle.export_share_options")}
          className="absolute end-0 top-full mt-1 min-w-[180px] bg-nps-bg-card border border-nps-border/40 rounded shadow-lg z-50 py-1"
        >
          {menuItems.map((item) => (
            <div key={item.key}>
              {item.dividerBefore && (
                <div className="border-t border-nps-border/30 my-1" />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={loading !== null}
                onClick={() => {
                  item.action();
                }}
                className="w-full text-start px-3 py-2 text-xs text-nps-text hover:bg-nps-bg-input transition-colors disabled:opacity-50"
              >
                {loading === item.loadingKey ? (
                  <span aria-live="polite">
                    {item.key === "share" ? t("oracle.share_creating") : "..."}
                  </span>
                ) : item.key === "share" && copied ? (
                  <span className="text-green-400">
                    {t("oracle.share_copied")}
                  </span>
                ) : (
                  item.label
                )}
              </button>
            </div>
          ))}

          {shareLink && (
            <div className="px-3 py-1 text-[10px] text-nps-text-dim break-all border-t border-nps-border/30 mt-1">
              {shareLink}
            </div>
          )}

          {error && (
            <div className="px-3 py-1 text-[10px] text-red-400" role="alert">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
