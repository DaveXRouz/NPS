import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { DailyReadingCard } from "@/components/dashboard/DailyReadingCard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentReadings } from "@/components/dashboard/RecentReadings";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FadeIn } from "@/components/common/FadeIn";
import {
  useDashboardStats,
  useRecentReadings,
  useDailyReading,
} from "@/hooks/useDashboard";

interface DailyInsight {
  date: string;
  summary: string;
  fc60_stamp?: string;
  advice?: string[];
}

function parseDailyInsight(raw: unknown): DailyInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    date: String(obj.date ?? ""),
    summary: String(obj.summary ?? ""),
    fc60_stamp: typeof obj.fc60_stamp === "string" ? obj.fc60_stamp : undefined,
    advice: Array.isArray(obj.advice) ? (obj.advice as string[]) : undefined,
  };
}

export default function Dashboard() {
  const { t } = useTranslation();
  usePageTitle("dashboard.title");
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const {
    data: recent,
    isLoading: recentLoading,
    isError: recentError,
    refetch: retryRecent,
  } = useRecentReadings();
  const {
    data: daily,
    isLoading: dailyLoading,
    isError: dailyError,
    refetch: retryDaily,
  } = useDailyReading();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <h2 className="sr-only">{t("dashboard.title")}</h2>
      <FadeIn delay={0} className="lg:col-span-12">
        <WelcomeBanner
          isLoading={dailyLoading}
          moonData={
            ((daily as Record<string, unknown> | undefined)?.moon_phase as
              | import("@/types").MoonPhaseInfo
              | null) ?? null
          }
          userName={localStorage.getItem("nps_username") ?? undefined}
        />
      </FadeIn>
      <FadeIn delay={80} className="lg:col-span-8">
        <DailyReadingCard
          dailyReading={parseDailyInsight(daily)}
          isLoading={dailyLoading}
          isError={dailyError}
          onRetry={() => retryDaily()}
        />
      </FadeIn>
      <FadeIn delay={160} className="lg:col-span-4">
        <QuickActions />
      </FadeIn>
      <FadeIn delay={240} className="lg:col-span-12">
        <StatsCards stats={stats} isLoading={statsLoading} />
      </FadeIn>
      <FadeIn delay={320} className="lg:col-span-12">
        <RecentReadings
          readings={recent?.readings ?? []}
          isLoading={recentLoading}
          isError={recentError}
          total={recent?.total ?? 0}
          onRetry={() => retryRecent()}
        />
      </FadeIn>
    </div>
  );
}
