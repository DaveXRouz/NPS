import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MoonPhaseWidget } from "./MoonPhaseWidget";
import { toJalaali } from "jalaali-js";

interface MoonPhaseInfo {
  phase_name: string;
  illumination: number;
  emoji: string;
}

interface WelcomeBannerProps {
  userName?: string;
  moonData?: MoonPhaseInfo | null;
  isLoading?: boolean;
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "dashboard.welcome_morning";
  if (hour < 18) return "dashboard.welcome_afternoon";
  return "dashboard.welcome_evening";
}

function formatDate(locale: string): string {
  const now = new Date();
  if (locale === "fa") {
    const jDate = toJalaali(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    );
    return `${jDate.jy}/${String(jDate.jm).padStart(2, "0")}/${String(jDate.jd).padStart(2, "0")}`;
  }
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(locale: string): string {
  const now = new Date();
  if (locale === "fa") {
    return now.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function WelcomeBanner({
  userName,
  moonData,
  isLoading,
}: WelcomeBannerProps) {
  const { t, i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(() =>
    formatTime(i18n.language),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatTime(i18n.language));
    }, 60_000);
    return () => clearInterval(interval);
  }, [i18n.language]);

  const greeting = t(getGreetingKey());
  const welcomeText = userName
    ? t("dashboard.welcome_user", { greeting, name: userName })
    : t("dashboard.welcome_explorer", { greeting });
  const dateText = t("dashboard.today_date", {
    date: formatDate(i18n.language),
  });

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 lg:p-8 nps-card-hover"
      style={{
        background: "var(--nps-gradient-hero)",
        backdropFilter: "blur(var(--nps-glass-blur-md))",
        border: "1px solid var(--nps-glass-border-std)",
        boxShadow: "var(--nps-glow-xs)",
      }}
      data-testid="welcome-banner"
    >
      {/* Orbital ring SVG — decorative */}
      <svg
        className="absolute end-6 top-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.06] nps-animate-orbit-slow pointer-events-none"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="100"
          cy="100"
          r="80"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-[var(--nps-accent)]"
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          stroke="currentColor"
          strokeWidth="0.3"
          className="text-[var(--nps-stat-readings)]"
        />
      </svg>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <>
              <div className="h-8 w-64 bg-nps-bg-elevated rounded animate-pulse" />
              <div className="flex items-center gap-3 mt-3">
                <div className="h-4 w-40 bg-nps-bg-elevated rounded animate-pulse" />
                <div className="h-4 w-16 bg-nps-bg-elevated rounded animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <h1
                className="text-2xl lg:text-3xl font-bold text-nps-text-bright truncate"
                style={{ fontFamily: "var(--nps-font-display)" }}
              >
                {welcomeText}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-nps-text-dim">
                <p className="text-sm lg:text-base">{dateText}</p>
                <span className="text-[var(--nps-accent)] opacity-40">•</span>
                <time
                  className="text-sm lg:text-base tabular-nums"
                  style={{ fontFamily: "var(--nps-font-mono)" }}
                >
                  {currentTime}
                </time>
              </div>
            </>
          )}
        </div>
        <div className="ms-4 shrink-0">
          <MoonPhaseWidget moonData={moonData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
