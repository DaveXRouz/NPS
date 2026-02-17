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
      className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
      style={{
        background:
          "linear-gradient(135deg, rgba(15, 26, 46, 0.9) 0%, rgba(79, 195, 247, 0.08) 100%)",
      }}
      data-testid="welcome-banner"
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-2xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-nps-text-bright truncate">
            {welcomeText}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-nps-text-dim">
            <p className="text-sm lg:text-base">{dateText}</p>
            <span className="text-nps-oracle-accent opacity-40">•</span>
            <time className="text-sm lg:text-base font-mono tabular-nums">
              {currentTime}
            </time>
          </div>
        </div>
        <div className="ms-4 shrink-0">
          <MoonPhaseWidget moonData={moonData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
