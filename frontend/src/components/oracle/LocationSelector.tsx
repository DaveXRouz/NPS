import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LocationData } from "@/types";
import {
  getCurrentPosition,
  fetchCountries,
  fetchCities,
} from "@/utils/geolocationHelpers";
import type { Country, City } from "@/utils/geolocationHelpers";

interface LocationSelectorProps {
  value: LocationData | null;
  onChange: (data: LocationData) => void;
}

export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "fa" ? "fa" : "en";

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    setIsLoadingCountries(true);
    fetchCountries(lang)
      .then(setCountries)
      .finally(() => setIsLoadingCountries(false));
  }, [lang]);

  // Fetch cities when country changes
  useEffect(() => {
    if (value?.countryCode) {
      setIsLoadingCities(true);
      fetchCities(value.countryCode, lang)
        .then(setCities)
        .finally(() => setIsLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [value?.countryCode, lang]);

  async function handleAutoDetect() {
    setIsDetecting(true);
    setDetectError(null);
    try {
      const coords = await getCurrentPosition();
      onChange({ ...coords, country: undefined, city: undefined });
    } catch {
      setDetectError(t("oracle.location_detect_error"));
    } finally {
      setIsDetecting(false);
    }
  }

  function handleCountrySelect(code: string) {
    if (!code) return;
    const country = countries.find((c) => c.code === code);
    if (country) {
      onChange({
        lat: country.latitude,
        lon: country.longitude,
        country: country.name,
        countryCode: country.code,
        timezone: country.timezone,
      });
    }
  }

  function handleCitySelect(cityName: string) {
    if (!cityName || !value) return;
    const city = cities.find((c) => c.name === cityName);
    if (city) {
      onChange({
        ...value,
        lat: city.latitude,
        lon: city.longitude,
        city: city.name,
        timezone: city.timezone,
      });
    }
  }

  function handleManualLat(latStr: string) {
    const lat = parseFloat(latStr);
    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      onChange({ ...(value ?? { lat: 0, lon: 0 }), lat });
    }
  }

  function handleManualLon(lonStr: string) {
    const lon = parseFloat(lonStr);
    if (!isNaN(lon) && lon >= -180 && lon <= 180) {
      onChange({ ...(value ?? { lat: 0, lon: 0 }), lon });
    }
  }

  return (
    <div>
      {/* Label + Auto-detect inline */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-nps-text-dim">
          {t("oracle.location_label")}
        </span>
        <button
          type="button"
          onClick={handleAutoDetect}
          disabled={isDetecting}
          aria-busy={isDetecting}
          className="text-xs text-nps-oracle-accent hover:underline disabled:opacity-50"
        >
          {isDetecting ? (
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 border-2 border-nps-oracle-accent border-t-transparent rounded-full animate-spin" />
              {t("oracle.location_detecting")}
            </span>
          ) : (
            t("oracle.location_auto_detect")
          )}
        </button>
      </div>

      {detectError && (
        <p role="alert" className="text-nps-error text-xs mb-1">
          {detectError}
        </p>
      )}

      {/* Country + City — side by side on desktop */}
      {isLoadingCountries ? (
        <p className="text-xs text-nps-text-dim">
          {t("oracle.location_loading_countries")}
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={value?.countryCode ?? ""}
            onChange={(e) => handleCountrySelect(e.target.value)}
            dir="auto"
            className="flex-1 bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
            aria-label={t("oracle.location_country")}
          >
            <option value="">{t("oracle.location_country")}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          {value?.countryCode && (
            <>
              {isLoadingCities ? (
                <p className="flex-1 text-xs text-nps-text-dim self-center">
                  {t("oracle.location_loading_cities")}
                </p>
              ) : cities.length > 0 ? (
                <select
                  value={value?.city ?? ""}
                  onChange={(e) => handleCitySelect(e.target.value)}
                  dir="auto"
                  className="flex-1 bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
                  aria-label={t("oracle.location_select_city")}
                >
                  <option value="">{t("oracle.location_select_city")}</option>
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="flex-1 text-xs text-nps-text-dim self-center">
                  {t("oracle.location_no_cities")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Manual coordinates toggle */}
      <button
        type="button"
        onClick={() => setShowManualCoords(!showManualCoords)}
        className="mt-1 text-xs text-nps-oracle-accent hover:underline"
      >
        {t("oracle.location_manual_coords")}
      </button>

      {showManualCoords && (
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          <div className="flex-1">
            <label className="block text-xs text-nps-text-dim mb-0.5">
              {t("oracle.location_latitude")}
            </label>
            <input
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={value?.lat ?? ""}
              onChange={(e) => handleManualLat(e.target.value)}
              dir="ltr"
              className="w-full bg-nps-bg-input border border-nps-border rounded px-3 py-1.5 text-sm text-nps-text font-mono focus:outline-none focus:border-nps-oracle-accent"
              aria-label={t("oracle.location_latitude")}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-nps-text-dim mb-0.5">
              {t("oracle.location_longitude")}
            </label>
            <input
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={value?.lon ?? ""}
              onChange={(e) => handleManualLon(e.target.value)}
              dir="ltr"
              className="w-full bg-nps-bg-input border border-nps-border rounded px-3 py-1.5 text-sm text-nps-text font-mono focus:outline-none focus:border-nps-oracle-accent"
              aria-label={t("oracle.location_longitude")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
