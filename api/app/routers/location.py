"""Location endpoints — geocoding, IP detection, static country/city data."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status

from app.middleware.auth import require_scope
from app.models.location import (
    CityListResponse,
    CityResponse,
    CoordinatesResponse,
    CountryListResponse,
    CountryResponse,
    LocationDetectResponse,
    TimezoneResponse,
)
from app.services.location_service import LocationService

logger = logging.getLogger(__name__)

router = APIRouter()

_svc = LocationService()

_LOCAL_IPS = {"127.0.0.1", "::1", "localhost", "testclient"}


# ─── Static data endpoints ──────────────────────────────────────────────────


@router.get(
    "/countries",
    response_model=CountryListResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def list_countries(
    lang: str = Query("en", pattern=r"^(en|fa)$"),
):
    """List all countries with bilingual names."""
    countries = _svc.get_countries(lang=lang)
    return CountryListResponse(
        countries=[CountryResponse(**c) for c in countries],
        total=len(countries),
    )


@router.get(
    "/countries/{country_code}/cities",
    response_model=CityListResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def list_cities(
    country_code: str = Path(..., min_length=2, max_length=2),
    lang: str = Query("en", pattern=r"^(en|fa)$"),
):
    """List top cities for a country."""
    cities = _svc.get_cities(country_code, lang=lang)
    return CityListResponse(
        cities=[CityResponse(**c) for c in cities],
        country_code=country_code.upper(),
        total=len(cities),
    )


@router.get(
    "/timezone",
    response_model=TimezoneResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def get_timezone_endpoint(
    country_code: str = Query(..., min_length=2, max_length=2),
    city: str | None = Query(None),
):
    """Get timezone for a country/city combination."""
    result = _svc.get_timezone(country_code, city)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Country '{country_code}' not found",
        )
    return TimezoneResponse(**result)


# ─── Geocoding endpoints (existing) ─────────────────────────────────────────


@router.get(
    "/coordinates",
    response_model=CoordinatesResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def get_coordinates(
    city: str = Query(..., min_length=1),
    country: str | None = Query(None),
):
    """Look up city coordinates via geocoding."""
    result = _svc.get_coordinates(city, country)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City '{city}' not found",
        )
    return CoordinatesResponse(**result)


@router.get(
    "/detect",
    response_model=LocationDetectResponse,
    dependencies=[Depends(require_scope("oracle:read"))],
)
def detect_location(request: Request):
    """Detect location from client IP address."""
    ip = request.client.host if request.client else None
    if not ip or ip in _LOCAL_IPS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot detect location for local/test IP addresses",
        )

    try:
        result = _svc.detect_location(ip)
    except Exception:
        logger.warning("IP geolocation failed for %s", ip)
        result = None

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IP geolocation service not available in this environment",
        )
    return LocationDetectResponse(**result)
