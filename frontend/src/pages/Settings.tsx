import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { OracleSettingsSection } from "@/components/settings/OracleSettingsSection";
import { ApiKeySection } from "@/components/settings/ApiKeySection";
import { AboutSection } from "@/components/settings/AboutSection";

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-bold text-nps-text-bright">
        {t("settings.title")}
      </h2>

      <SettingsSection
        title={t("settings.profile")}
        description={t("settings.profile_desc")}
        defaultOpen
      >
        <ProfileSection />
      </SettingsSection>

      <SettingsSection
        title={t("settings.preferences")}
        description={t("settings.preferences_desc")}
      >
        <PreferencesSection />
      </SettingsSection>

      <SettingsSection
        title={t("settings.oracle")}
        description={t("settings.oracle_desc")}
      >
        <OracleSettingsSection />
      </SettingsSection>

      <SettingsSection
        title={t("settings.api_keys")}
        description={t("settings.api_keys_desc")}
      >
        <ApiKeySection />
      </SettingsSection>

      <SettingsSection
        title={t("settings.about")}
        description={t("settings.about_desc")}
      >
        <AboutSection />
      </SettingsSection>
    </div>
  );
}
