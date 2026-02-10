"""Location service — static data + geocoding via Nominatim + IP detection via ipapi.co."""

import json
import logging
import threading
import time
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_USER_AGENT = "NPS-Oracle/4.0"
_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_IPAPI_URL = "https://ipapi.co/{ip}/json/"

# ─── Static Data ─────────────────────────────────────────────────────────────

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _load_json(filename: str) -> Any:
    """Load a JSON file from the data directory."""
    path = _DATA_DIR / filename
    with open(path, encoding="utf-8") as f:
        return json.load(f)


try:
    _COUNTRIES: list[dict[str, Any]] = _load_json("countries.json")
    _CITIES: dict[str, list[dict[str, Any]]] = _load_json("cities_by_country.json")
except FileNotFoundError:
    logger.error("Static location data files not found in %s", _DATA_DIR)
    _COUNTRIES = []
    _CITIES = {}

# Index for fast lookup
_COUNTRY_BY_CODE: dict[str, dict[str, Any]] = {c["code"]: c for c in _COUNTRIES}

# ─── Caches ─────────────────────────────────────────────────────────────────

_CITY_CACHE_TTL = 30 * 86400  # 30 days
_IP_CACHE_TTL = 7 * 86400  # 7 days

_city_cache: dict[str, dict[str, Any]] = {}
_ip_cache: dict[str, dict[str, Any]] = {}
_cache_lock = threading.Lock()

# Rate limiting for Nominatim (1 req/sec)
_nominatim_lock = threading.Lock()
_last_nominatim_request = 0.0


def reset_caches() -> None:
    """Clear all location caches."""
    with _cache_lock:
        _city_cache.clear()
        _ip_cache.clear()


def _get_timezone(lat: float, lon: float) -> str | None:
    """Get timezone from coordinates using timezonefinder (optional dep)."""
    try:
        from timezonefinder import TimezoneFinder

        tf = TimezoneFinder()
        return tf.timezone_at(lat=lat, lng=lon)
    except ImportError:
        return None
    except Exception:
        return None


# ─── Location Service ───────────────────────────────────────────────────────


class LocationService:
    """Geocoding + IP-based location detection with caching + static data."""

    # ─── Static data methods ────────────────────────────────────────────

    def get_countries(self, lang: str = "en") -> list[dict[str, Any]]:
        """Return all countries sorted alphabetically by name in requested language.

        Args:
            lang: 'en' for English names, 'fa' for Persian names.

        Returns:
            List of dicts with keys: code, name, latitude, longitude, timezone,
            timezone_offset_hours, timezone_offset_minutes.
        """
        name_key = "name_fa" if lang == "fa" else "name_en"
        result = [
            {
                "code": c["code"],
                "name": c[name_key],
                "latitude": c["latitude"],
                "longitude": c["longitude"],
                "timezone": c["timezone"],
                "timezone_offset_hours": c["timezone_offset_hours"],
                "timezone_offset_minutes": c["timezone_offset_minutes"],
            }
            for c in _COUNTRIES
        ]
        result.sort(key=lambda x: x["name"])
        return result

    def get_cities(self, country_code: str, lang: str = "en") -> list[dict[str, Any]]:
        """Return cities for a country, sorted alphabetically.

        Args:
            country_code: ISO 3166-1 alpha-2 code (e.g., 'IR', 'US').
            lang: 'en' or 'fa'.

        Returns:
            List of city dicts with keys: name, latitude, longitude, timezone.
            Empty list if country_code not found.
        """
        cities = _CITIES.get(country_code.upper(), [])
        name_key = "name_fa" if lang == "fa" else "name_en"
        result = [
            {
                "name": c[name_key],
                "latitude": c["latitude"],
                "longitude": c["longitude"],
                "timezone": c["timezone"],
            }
            for c in cities
        ]
        result.sort(key=lambda x: x["name"])
        return result

    def get_timezone(
        self, country_code: str, city_name: str | None = None
    ) -> dict[str, Any] | None:
        """Get timezone info for a country/city.

        If city_name provided, looks up the specific city's timezone.
        Otherwise returns the country's default timezone.

        Returns:
            Dict with keys: timezone (IANA), offset_hours, offset_minutes.
            None if country_code not found.
        """
        country = _COUNTRY_BY_CODE.get(country_code.upper())
        if not country:
            return None

        if city_name:
            cities = _CITIES.get(country_code.upper(), [])
            for c in cities:
                if c["name_en"].lower() == city_name.lower() or c["name_fa"] == city_name:
                    return {
                        "timezone": c["timezone"],
                        "offset_hours": country["timezone_offset_hours"],
                        "offset_minutes": country["timezone_offset_minutes"],
                    }

        return {
            "timezone": country["timezone"],
            "offset_hours": country["timezone_offset_hours"],
            "offset_minutes": country["timezone_offset_minutes"],
        }

    def search_cities(
        self,
        query: str,
        country_code: str | None = None,
        lang: str = "en",
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Search cities by name prefix across all countries or within one.

        Searches both EN and FA names regardless of lang parameter.
        Returns results in the requested language.

        Args:
            query: Search string (minimum 1 character).
            country_code: Optional ISO code to limit search to one country.
            lang: 'en' or 'fa' for result name language.
            limit: Maximum results to return (default 10, max 50).

        Returns:
            List of matching city dicts.
        """
        query_lower = query.lower().strip()
        if not query_lower:
            return []

        limit = min(limit, 50)
        name_key = "name_fa" if lang == "fa" else "name_en"
        results: list[dict[str, Any]] = []

        search_countries = [country_code.upper()] if country_code else list(_CITIES.keys())

        for code in search_countries:
            cities = _CITIES.get(code, [])
            country = _COUNTRY_BY_CODE.get(code)
            if not country:
                continue

            for city in cities:
                if city["name_en"].lower().startswith(query_lower) or city["name_fa"].startswith(
                    query
                ):
                    results.append(
                        {
                            "name": city[name_key],
                            "country_code": code,
                            "country_name": country[name_key],
                            "latitude": city["latitude"],
                            "longitude": city["longitude"],
                            "timezone": city["timezone"],
                        }
                    )
                    if len(results) >= limit:
                        return results

        return results

    # ─── Static lookup helper ───────────────────────────────────────────

    def _lookup_static(self, city: str, country: str | None = None) -> dict[str, Any] | None:
        """Try to find city in static data. Returns None if not found."""
        city_lower = city.lower().strip()

        if country:
            # Find country code from name
            code = None
            for c in _COUNTRIES:
                if c["name_en"].lower() == country.lower() or c["name_fa"] == country:
                    code = c["code"]
                    break
            if code:
                for c_city in _CITIES.get(code, []):
                    if c_city["name_en"].lower() == city_lower or c_city["name_fa"] == city:
                        return {
                            "city": c_city["name_en"],
                            "country": country,
                            "latitude": c_city["latitude"],
                            "longitude": c_city["longitude"],
                            "timezone": c_city["timezone"],
                            "cached": False,
                        }
        else:
            # Search all countries
            for code, cities in _CITIES.items():
                for c_city in cities:
                    if c_city["name_en"].lower() == city_lower or c_city["name_fa"] == city:
                        country_data = _COUNTRY_BY_CODE.get(code)
                        return {
                            "city": c_city["name_en"],
                            "country": (country_data["name_en"] if country_data else None),
                            "latitude": c_city["latitude"],
                            "longitude": c_city["longitude"],
                            "timezone": c_city["timezone"],
                            "cached": False,
                        }

        return None

    # ─── Geocoding methods (existing, enhanced) ─────────────────────────

    def get_coordinates(self, city: str, country: str | None = None) -> dict | None:
        """Look up city coordinates — checks static data first, then Nominatim.

        Returns dict with keys: city, country, latitude, longitude, timezone, cached.
        Returns None if city not found.
        """
        # Check static data first (instant, no network)
        static_result = self._lookup_static(city, country)
        if static_result:
            return static_result

        cache_key = f"{city}:{country or ''}"

        with _cache_lock:
            if cache_key in _city_cache:
                entry = _city_cache[cache_key]
                if time.monotonic() - entry["ts"] < _CITY_CACHE_TTL:
                    return {**entry["result"], "cached": True}
                del _city_cache[cache_key]

        # Rate limit Nominatim (1 req/sec)
        global _last_nominatim_request
        with _nominatim_lock:
            elapsed = time.monotonic() - _last_nominatim_request
            if elapsed < 1.0:
                time.sleep(1.0 - elapsed)
            _last_nominatim_request = time.monotonic()

        query = city
        if country:
            query = f"{city}, {country}"

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    _NOMINATIM_URL,
                    params={"q": query, "format": "json", "limit": 1},
                    headers={"User-Agent": _USER_AGENT},
                )
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError:
            logger.warning("Nominatim request failed for %s", query, exc_info=True)
            return None

        if not data:
            return None

        item = data[0]
        lat = float(item["lat"])
        lon = float(item["lon"])
        tz = _get_timezone(lat, lon)

        result = {
            "city": city,
            "country": (
                item.get("display_name", "").split(", ")[-1] if country is None else country
            ),
            "latitude": lat,
            "longitude": lon,
            "timezone": tz,
            "cached": False,
        }

        with _cache_lock:
            _city_cache[cache_key] = {"result": result, "ts": time.monotonic()}

        return result

    def detect_location(self, ip: str) -> dict | None:
        """Detect location from IP address via ipapi.co.

        Returns dict with keys: ip, city, country, country_code, latitude,
        longitude, timezone, cached.
        Returns None on failure.
        """
        with _cache_lock:
            if ip in _ip_cache:
                entry = _ip_cache[ip]
                if time.monotonic() - entry["ts"] < _IP_CACHE_TTL:
                    return {**entry["result"], "cached": True}
                del _ip_cache[ip]

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    _IPAPI_URL.format(ip=ip),
                    headers={"User-Agent": _USER_AGENT},
                )
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError:
            logger.warning("ipapi.co request failed for %s", ip, exc_info=True)
            return None

        if data.get("error"):
            return None

        result = {
            "ip": ip,
            "city": data.get("city"),
            "country": data.get("country_name"),
            "country_code": data.get("country_code"),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
            "timezone": data.get("timezone"),
            "cached": False,
        }

        with _cache_lock:
            _ip_cache[ip] = {"result": result, "ts": time.monotonic()}

        return result
