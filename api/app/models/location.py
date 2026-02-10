"""Location request/response models."""

from pydantic import BaseModel


class CoordinatesResponse(BaseModel):
    city: str
    country: str | None = None
    latitude: float
    longitude: float
    timezone: str | None = None
    cached: bool = False


class LocationDetectResponse(BaseModel):
    ip: str
    city: str | None = None
    country: str | None = None
    country_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None
    cached: bool = False


class CountryResponse(BaseModel):
    code: str
    name: str
    latitude: float
    longitude: float
    timezone: str
    timezone_offset_hours: int
    timezone_offset_minutes: int


class CountryListResponse(BaseModel):
    countries: list[CountryResponse]
    total: int


class CityResponse(BaseModel):
    name: str
    latitude: float
    longitude: float
    timezone: str


class CityListResponse(BaseModel):
    cities: list[CityResponse]
    country_code: str
    total: int


class TimezoneResponse(BaseModel):
    timezone: str
    offset_hours: int
    offset_minutes: int


class CitySearchResponse(BaseModel):
    name: str
    country_code: str
    country_name: str
    latitude: float
    longitude: float
    timezone: str
