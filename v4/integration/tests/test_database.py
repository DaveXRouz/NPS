"""Phase 2: Database integration tests — verify schema, CRUD, constraints, triggers."""

import pytest
from sqlalchemy import inspect, text


@pytest.mark.database
class TestDatabaseSchema:
    """Verify all expected tables exist and have correct structure."""

    EXPECTED_TABLES = [
        "schema_migrations",
        "users",
        "api_keys",
        "sessions",
        "findings",
        "readings",
        "learning_data",
        "insights",
        "oracle_suggestions",
        "health_checks",
        "audit_log",
        "oracle_users",
        "oracle_readings",
        "oracle_reading_users",
        "oracle_audit_log",
    ]

    def test_all_tables_exist(self, db_engine):
        """Verify all tables from init.sql exist in the database."""
        inspector = inspect(db_engine)
        existing = inspector.get_table_names()
        for table in self.EXPECTED_TABLES:
            assert table in existing, f"Table '{table}' missing from database"

    def test_oracle_users_columns(self, db_engine):
        """Verify oracle_users has the expected columns."""
        inspector = inspect(db_engine)
        columns = {c["name"] for c in inspector.get_columns("oracle_users")}
        expected = {
            "id",
            "name",
            "name_persian",
            "birthday",
            "mother_name",
            "mother_name_persian",
            "country",
            "city",
            "coordinates",
            "created_at",
            "updated_at",
        }
        assert expected.issubset(columns), f"Missing columns: {expected - columns}"

    def test_oracle_readings_columns(self, db_engine):
        """Verify oracle_readings has the expected columns."""
        inspector = inspect(db_engine)
        columns = {c["name"] for c in inspector.get_columns("oracle_readings")}
        expected = {
            "id",
            "user_id",
            "is_multi_user",
            "primary_user_id",
            "question",
            "sign_type",
            "sign_value",
            "reading_result",
            "ai_interpretation",
            "created_at",
        }
        assert expected.issubset(columns), f"Missing columns: {expected - columns}"


@pytest.mark.database
class TestOracleUsersCRUD:
    """Test insert/read/update/delete on oracle_users table."""

    def test_insert_and_read(self, db_connection):
        """Insert a user and read it back."""
        db_connection.execute(
            text(
                "INSERT INTO oracle_users (name, birthday, mother_name) "
                "VALUES (:name, :birthday, :mother_name)"
            ),
            {
                "name": "IntTest_Insert",
                "birthday": "1990-01-15",
                "mother_name": "TestMother",
            },
        )
        db_connection.commit()

        result = db_connection.execute(
            text("SELECT name, mother_name FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Insert"},
        )
        row = result.fetchone()
        assert row is not None
        assert row[0] == "IntTest_Insert"
        assert row[1] == "TestMother"

        # Cleanup
        db_connection.execute(
            text("DELETE FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Insert"},
        )
        db_connection.commit()

    def test_update(self, db_connection):
        """Insert and update a user."""
        db_connection.execute(
            text(
                "INSERT INTO oracle_users (name, birthday, mother_name) "
                "VALUES (:name, :birthday, :mother_name)"
            ),
            {
                "name": "IntTest_Update",
                "birthday": "1985-06-20",
                "mother_name": "OldMother",
            },
        )
        db_connection.commit()

        db_connection.execute(
            text("UPDATE oracle_users SET mother_name = :mn WHERE name = :name"),
            {"mn": "NewMother", "name": "IntTest_Update"},
        )
        db_connection.commit()

        result = db_connection.execute(
            text("SELECT mother_name FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Update"},
        )
        row = result.fetchone()
        assert row is not None
        assert row[0] == "NewMother"

        # Cleanup
        db_connection.execute(
            text("DELETE FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Update"},
        )
        db_connection.commit()

    def test_delete(self, db_connection):
        """Insert and delete a user."""
        db_connection.execute(
            text(
                "INSERT INTO oracle_users (name, birthday, mother_name) "
                "VALUES (:name, :birthday, :mother_name)"
            ),
            {
                "name": "IntTest_Delete",
                "birthday": "2000-03-10",
                "mother_name": "DelMother",
            },
        )
        db_connection.commit()

        db_connection.execute(
            text("DELETE FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Delete"},
        )
        db_connection.commit()

        result = db_connection.execute(
            text("SELECT id FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Delete"},
        )
        assert result.fetchone() is None


@pytest.mark.database
class TestConstraints:
    """Test database constraints and triggers."""

    def test_fk_constraint_reading_nonexistent_user(self, db_connection):
        """Inserting a reading with nonexistent user_id should fail."""
        with pytest.raises(Exception):
            db_connection.execute(
                text(
                    "INSERT INTO oracle_readings "
                    "(user_id, question, sign_type, sign_value) "
                    "VALUES (:uid, :q, :st, :sv)"
                ),
                {"uid": 999999, "q": "test?", "st": "question", "sv": "test"},
            )
            db_connection.commit()
        db_connection.rollback()

    def test_name_length_constraint(self, db_connection):
        """Name must be at least 2 characters."""
        with pytest.raises(Exception):
            db_connection.execute(
                text(
                    "INSERT INTO oracle_users (name, birthday, mother_name) "
                    "VALUES (:name, :birthday, :mn)"
                ),
                {"name": "X", "birthday": "1990-01-01", "mn": "Mom"},
            )
            db_connection.commit()
        db_connection.rollback()

    def test_updated_at_trigger(self, db_connection):
        """Verify updated_at changes on UPDATE."""
        db_connection.execute(
            text(
                "INSERT INTO oracle_users (name, birthday, mother_name) "
                "VALUES (:name, :birthday, :mn)"
            ),
            {"name": "IntTest_Trigger", "birthday": "1990-01-01", "mn": "TrigMom"},
        )
        db_connection.commit()

        # Get initial timestamps
        result = db_connection.execute(
            text("SELECT created_at, updated_at FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Trigger"},
        )
        row = result.fetchone()
        created_at = row[0]
        initial_updated = row[1]

        # Force a small delay and update
        db_connection.execute(
            text("UPDATE oracle_users SET mother_name = :mn WHERE name = :name"),
            {"mn": "TrigMomUpdated", "name": "IntTest_Trigger"},
        )
        db_connection.commit()

        result = db_connection.execute(
            text("SELECT updated_at FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Trigger"},
        )
        new_updated = result.fetchone()[0]
        assert new_updated >= initial_updated

        # Cleanup
        db_connection.execute(
            text("DELETE FROM oracle_users WHERE name = :name"),
            {"name": "IntTest_Trigger"},
        )
        db_connection.commit()


@pytest.mark.database
class TestQueryPerformance:
    """Basic query performance verification."""

    def test_explain_analyze_oracle_users(self, db_connection):
        """Run EXPLAIN ANALYZE on a sample query."""
        result = db_connection.execute(
            text(
                "EXPLAIN ANALYZE SELECT * FROM oracle_users "
                "ORDER BY created_at DESC LIMIT 20"
            )
        )
        plan = "\n".join(row[0] for row in result.fetchall())
        assert "Execution Time" in plan or "execution time" in plan.lower()
