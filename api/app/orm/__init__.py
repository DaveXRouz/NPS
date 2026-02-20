"""ORM package — shared type utilities for cross-platform column types."""

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.types import TypeDecorator


class PlatformJSONB(TypeDecorator):
    """Platform-aware JSONB: uses JSONB on PostgreSQL, generic JSON on SQLite.

    This allows ORM models to correctly declare JSONB columns that match the
    PostgreSQL schema while still working with SQLite in the test suite.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB)
        return dialect.type_descriptor(JSON)
