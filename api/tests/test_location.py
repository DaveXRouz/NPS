"""Tests for location endpoints."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.location_service import LocationService, reset_caches

COORDINATES_URL = "/api/location/coordinates"
DETECT_URL = "/api/location/detect"
COUNTRIES_URL = "/api/location/countries"
TIMEZONE_URL = "/api/location/timezone"


@pytest.fixture(autouse=True)
def _reset_location_caches():
    """Reset location caches before each test."""
    reset_caches()
    yield
    reset_caches()


def _mock_nominatim_success():
    """Create a mock httpx response for successful Nominatim lookup."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {
            "lat": "35.6892",
            "lon": "51.3890",
            "display_name": "Tehran, Tehran Province, Iran",
        }
    ]
    mock_resp.raise_for_status = MagicMock()
    return mock_resp


def _mock_nominatim_empty():
    """Create a mock httpx response for city not found."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = []
    mock_resp.raise_for_status = MagicMock()
    return mock_resp


def _mock_ipapi_success():
    """Create a mock httpx response for successful IP lookup."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "ip": "8.8.8.8",
        "city": "Mountain View",
        "country_name": "United States",
        "country_code": "US",
        "latitude": 37.386,
        "longitude": -122.0838,
        "timezone": "America/Los_Angeles",
    }
    mock_resp.raise_for_status = MagicMock()
    return mock_resp


# ─── GET /coordinates ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_coordinates_success(client):
    mock_resp = _mock_nominatim_success()
    with patch("app.services.location_service.httpx.Client") as MockClient:
        mock_client_instance = MagicMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp = await client.get(COORDINATES_URL, params={"city": "Tehran"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["city"] == "Tehran"
        assert data["latitude"] == 35.6892
        assert data["longitude"] == 51.389
        assert data["cached"] is False


@pytest.mark.asyncio
async def test_coordinates_with_country(client):
    mock_resp = _mock_nominatim_success()
    with patch("app.services.location_service.httpx.Client") as MockClient:
        mock_client_instance = MagicMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp = await client.get(COORDINATES_URL, params={"city": "Tehran", "country": "Iran"})
        assert resp.status_code == 200
        assert resp.json()["country"] == "Iran"


@pytest.mark.asyncio
async def test_coordinates_city_not_found_404(client):
    mock_resp = _mock_nominatim_empty()
    with patch("app.services.location_service.httpx.Client") as MockClient:
        mock_client_instance = MagicMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp = await client.get(COORDINATES_URL, params={"city": "Nonexistentville"})
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_coordinates_service_error(client):
    """When city is not in static data and Nominatim fails, return 404."""
    import httpx as httpx_mod

    with patch("app.services.location_service.httpx.Client") as MockClient:
        mock_client_instance = MagicMock()
        mock_client_instance.get.side_effect = httpx_mod.ConnectError("timeout")
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp = await client.get(COORDINATES_URL, params={"city": "Smalltown123"})
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_coordinates_cache_second_call(client):
    """Test Nominatim cache: use a city NOT in static data so Nominatim is actually called."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {"lat": "50.0755", "lon": "14.4378", "display_name": "Prague, Czechia"}
    ]
    mock_resp.raise_for_status = MagicMock()

    with patch("app.services.location_service.httpx.Client") as MockClient:
        mock_client_instance = MagicMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp1 = await client.get(
            COORDINATES_URL, params={"city": "Smallville", "country": "Nowhere"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["cached"] is False

        resp2 = await client.get(
            COORDINATES_URL, params={"city": "Smallville", "country": "Nowhere"}
        )
        assert resp2.status_code == 200
        assert resp2.json()["cached"] is True


@pytest.mark.asyncio
async def test_coordinates_missing_city_422(client):
    resp = await client.get(COORDINATES_URL)
    assert resp.status_code == 422


# ─── GET /detect ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_detect_local_ip_400(client):
    """Testclient IP is 'testclient' — should return 400."""
    resp = await client.get(DETECT_URL)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_detect_ipapi_success(client):
    mock_resp = _mock_ipapi_success()
    with (
        patch("app.services.location_service.httpx.Client") as MockClient,
        patch("app.routers.location._LOCAL_IPS", set()),
    ):
        mock_client_instance = MagicMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp = await client.get(DETECT_URL)
        assert resp.status_code == 200
        data = resp.json()
        assert data["city"] == "Mountain View"
        assert data["country"] == "United States"
        assert data["timezone"] == "America/Los_Angeles"


@pytest.mark.asyncio
async def test_detect_ipapi_error_502(client):
    import httpx as httpx_mod

    with (
        patch("app.services.location_service.httpx.Client") as MockClient,
        patch("app.routers.location._LOCAL_IPS", set()),
    ):
        mock_client_instance = MagicMock()
        mock_client_instance.get.side_effect = httpx_mod.ConnectError("fail")
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp = await client.get(DETECT_URL)
        assert resp.status_code == 502


@pytest.mark.asyncio
async def test_detect_cache_second_call(client):
    mock_resp = _mock_ipapi_success()
    with (
        patch("app.services.location_service.httpx.Client") as MockClient,
        patch("app.routers.location._LOCAL_IPS", set()),
    ):
        mock_client_instance = MagicMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp1 = await client.get(DETECT_URL)
        assert resp1.status_code == 200
        assert resp1.json()["cached"] is False

        resp2 = await client.get(DETECT_URL)
        assert resp2.status_code == 200
        assert resp2.json()["cached"] is True


# ─── Auth ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_coordinates_readonly_allowed(readonly_client):
    mock_resp = _mock_nominatim_success()
    with patch("app.services.location_service.httpx.Client") as MockClient:
        mock_client_instance = MagicMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        MockClient.return_value = mock_client_instance

        resp = await readonly_client.get(COORDINATES_URL, params={"city": "Tehran"})
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_coordinates_unauthenticated_401(unauth_client):
    resp = await unauth_client.get(COORDINATES_URL, params={"city": "Tehran"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_detect_readonly_allowed(readonly_client):
    """Readonly can access detect, but will get 400 due to testclient IP."""
    resp = await readonly_client.get(DETECT_URL)
    assert resp.status_code == 400


# ─── GET /countries ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_countries_list_returns_all(client):
    """GET /api/location/countries returns 249+ countries."""
    resp = await client.get(COUNTRIES_URL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 249
    assert len(data["countries"]) >= 249
    first = data["countries"][0]
    assert "code" in first
    assert "name" in first
    assert "latitude" in first
    assert "timezone" in first


@pytest.mark.asyncio
async def test_countries_list_fa(client):
    """GET /api/location/countries?lang=fa returns Persian names."""
    resp = await client.get(f"{COUNTRIES_URL}?lang=fa")
    assert resp.status_code == 200
    data = resp.json()
    iran = next((c for c in data["countries"] if c["code"] == "IR"), None)
    assert iran is not None
    assert iran["name"] == "\u0627\u06cc\u0631\u0627\u0646"


@pytest.mark.asyncio
async def test_countries_sorted_alphabetically(client):
    """Countries should be sorted by name."""
    resp = await client.get(COUNTRIES_URL)
    data = resp.json()
    names = [c["name"] for c in data["countries"]]
    assert names == sorted(names)


@pytest.mark.asyncio
async def test_countries_unauthenticated_401(unauth_client):
    """Unauthenticated requests to countries return 401."""
    resp = await unauth_client.get(COUNTRIES_URL)
    assert resp.status_code == 401


# ─── GET /countries/{code}/cities ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cities_iran(client):
    """GET /api/location/countries/IR/cities returns Iranian cities."""
    resp = await client.get(f"{COUNTRIES_URL}/IR/cities")
    assert resp.status_code == 200
    data = resp.json()
    assert data["country_code"] == "IR"
    assert data["total"] >= 5
    names = [c["name"] for c in data["cities"]]
    assert any("Tehran" in n for n in names)


@pytest.mark.asyncio
async def test_cities_iran_fa(client):
    """Cities returned in Persian when lang=fa."""
    resp = await client.get(f"{COUNTRIES_URL}/IR/cities?lang=fa")
    data = resp.json()
    names = [c["name"] for c in data["cities"]]
    assert "\u062a\u0647\u0631\u0627\u0646" in names


@pytest.mark.asyncio
async def test_cities_unknown_country(client):
    """Unknown country code returns empty list (not 404)."""
    resp = await client.get(f"{COUNTRIES_URL}/ZZ/cities")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["cities"] == []


@pytest.mark.asyncio
async def test_cities_have_coordinates(client):
    """Each city has valid latitude and longitude."""
    resp = await client.get(f"{COUNTRIES_URL}/US/cities")
    data = resp.json()
    for city in data["cities"]:
        assert -90 <= city["latitude"] <= 90
        assert -180 <= city["longitude"] <= 180


# ─── GET /timezone ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_timezone_iran(client):
    """GET /api/location/timezone?country_code=IR returns Asia/Tehran."""
    resp = await client.get(TIMEZONE_URL, params={"country_code": "IR"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["timezone"] == "Asia/Tehran"
    assert data["offset_hours"] == 3
    assert data["offset_minutes"] == 30


@pytest.mark.asyncio
async def test_timezone_with_city(client):
    """Timezone lookup with city name."""
    resp = await client.get(TIMEZONE_URL, params={"country_code": "US", "city": "Los Angeles"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["timezone"] == "America/Los_Angeles"


@pytest.mark.asyncio
async def test_timezone_unknown_country_404(client):
    """Unknown country code returns 404."""
    resp = await client.get(TIMEZONE_URL, params={"country_code": "ZZ"})
    assert resp.status_code == 404


# ─── Static fallback ─────────────────────────────────────────────────────────


def test_coordinates_static_fallback():
    """get_coordinates finds Tehran in static data without Nominatim."""
    svc = LocationService()
    result = svc.get_coordinates("Tehran", "Iran")
    assert result is not None
    assert abs(result["latitude"] - 35.6892) < 0.1
    assert result["cached"] is False
