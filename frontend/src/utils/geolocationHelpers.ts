/** Request browser geolocation with timeout */
export function getCurrentPosition(
  timeout = 10000,
): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lon: Math.round(pos.coords.longitude * 10000) / 10000,
        }),
      (err) => reject(err),
      { timeout, enableHighAccuracy: false },
    );
  });
}

/** Country from location API */
export interface Country {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset_hours: number;
  timezone_offset_minutes: number;
}

/** City from location API */
export interface City {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** Build auth headers for API requests (matches api.ts pattern) */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token =
    localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Fetch all countries from the location API */
export async function fetchCountries(lang: string = "en"): Promise<Country[]> {
  const resp = await fetch(`/api/location/countries?lang=${lang}`, {
    headers: authHeaders(),
  });
  if (!resp.ok) throw new Error(`Failed to fetch countries: ${resp.status}`);
  const data = await resp.json();
  return data.countries;
}

/** Fetch cities for a country from the location API */
export async function fetchCities(
  countryCode: string,
  lang: string = "en",
): Promise<City[]> {
  const resp = await fetch(
    `/api/location/countries/${countryCode}/cities?lang=${lang}`,
    { headers: authHeaders() },
  );
  if (!resp.ok) throw new Error(`Failed to fetch cities: ${resp.status}`);
  const data = await resp.json();
  return data.cities;
}
