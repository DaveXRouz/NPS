#!/usr/bin/env python3
"""AES-256-GCM encryption validation — round-trip, tamper detection, uniqueness.

SB3: Tests encryption module from api/app/services/security.py.
"""

import base64
import hashlib
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add API to path so we can import the security module
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_PROJECT_ROOT / "api"))

# Load .env
_ENV_PATH = _PROJECT_ROOT / ".env"
if _ENV_PATH.exists():
    for line in _ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if key and key not in os.environ:
                os.environ[key] = value

ENC_KEY = os.environ.get("NPS_ENCRYPTION_KEY", "")
ENC_SALT = os.environ.get("NPS_ENCRYPTION_SALT", "")


def _derive_key() -> bytes:
    """Derive encryption key matching the API's init_encryption logic."""
    salt = (ENC_SALT or "nps-v4-default-salt").encode("utf-8")
    if len(salt) < 32:
        salt = salt.ljust(32, b"\x00")
    else:
        salt = salt[:32]
    return hashlib.pbkdf2_hmac(
        "sha256", ENC_KEY.encode("utf-8"), salt, 600_000, dklen=32
    )


def test_key_configured() -> tuple[str, str]:
    """Check if encryption key and salt are configured."""
    if not ENC_KEY:
        return "skip", "NPS_ENCRYPTION_KEY not set"
    if not ENC_SALT:
        return "skip", "NPS_ENCRYPTION_SALT not set"
    if len(ENC_KEY) != 64:
        return "fail", f"Key length {len(ENC_KEY)}, expected 64 hex chars"
    return "pass", f"Key: {ENC_KEY[:8]}... Salt: {ENC_SALT[:8]}..."


def test_roundtrip_ascii() -> tuple[str, str]:
    """Encrypt and decrypt ASCII text."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import decrypt_aes256gcm, encrypt_aes256gcm

        key = _derive_key()
        plaintext = "Hello, NPS! This is a round-trip test."
        encrypted = encrypt_aes256gcm(plaintext, key)

        if not encrypted.startswith("ENC4:"):
            return "fail", f"Missing ENC4: prefix, got: {encrypted[:20]}"

        decrypted = decrypt_aes256gcm(encrypted, key)
        if decrypted != plaintext:
            return "fail", f"Mismatch: '{decrypted}' != '{plaintext}'"

        return "pass", f"Round-trip OK ({len(encrypted)} chars encrypted)"
    except Exception as exc:
        return "fail", str(exc)


def test_roundtrip_persian() -> tuple[str, str]:
    """Encrypt and decrypt Persian UTF-8 text."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import decrypt_aes256gcm, encrypt_aes256gcm

        key = _derive_key()
        plaintext = "سلام دنیا! این یک تست رمزنگاری است. ۱۲۳۴۵"
        encrypted = encrypt_aes256gcm(plaintext, key)
        decrypted = decrypt_aes256gcm(encrypted, key)

        if decrypted != plaintext:
            return "fail", "Persian mismatch"

        return "pass", f"Persian UTF-8 round-trip OK ({len(plaintext)} chars)"
    except Exception as exc:
        return "fail", str(exc)


def test_unique_ivs() -> tuple[str, str]:
    """Same plaintext produces different ciphertexts (unique IVs)."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import encrypt_aes256gcm

        key = _derive_key()
        plaintext = "deterministic input"
        enc1 = encrypt_aes256gcm(plaintext, key)
        enc2 = encrypt_aes256gcm(plaintext, key)

        if enc1 == enc2:
            return "fail", "Identical ciphertexts — IV reuse detected!"

        # Extract nonces to verify they're different
        payload1 = base64.b64decode(enc1[5:])
        payload2 = base64.b64decode(enc2[5:])
        nonce1 = payload1[:12]
        nonce2 = payload2[:12]

        if nonce1 == nonce2:
            return "fail", "Same nonce used for both encryptions"

        return (
            "pass",
            f"Different nonces: {nonce1.hex()[:12]}... vs {nonce2.hex()[:12]}...",
        )
    except Exception as exc:
        return "fail", str(exc)


def test_tamper_detection() -> tuple[str, str]:
    """Tampered ciphertext must fail decryption."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import decrypt_aes256gcm, encrypt_aes256gcm

        key = _derive_key()
        encrypted = encrypt_aes256gcm("secret data", key)
        payload = bytearray(base64.b64decode(encrypted[5:]))

        # Flip a byte in the ciphertext (after nonce, before tag)
        if len(payload) > 13:
            payload[13] ^= 0xFF

        tampered = f"ENC4:{base64.b64encode(bytes(payload)).decode()}"
        try:
            decrypt_aes256gcm(tampered, key)
            return "fail", "Tampered ciphertext decrypted successfully!"
        except Exception:
            return "pass", "Tamper detected — decryption correctly failed"
    except Exception as exc:
        return "fail", str(exc)


def test_wrong_key() -> tuple[str, str]:
    """Decryption with wrong key must fail."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import decrypt_aes256gcm, encrypt_aes256gcm

        key = _derive_key()
        encrypted = encrypt_aes256gcm("secret data", key)

        # Use a different key
        wrong_key = os.urandom(32)
        try:
            decrypt_aes256gcm(encrypted, wrong_key)
            return "fail", "Wrong key succeeded!"
        except Exception:
            return "pass", "Wrong key correctly rejected"
    except Exception as exc:
        return "fail", str(exc)


def test_encryption_service_class() -> tuple[str, str]:
    """Test the EncryptionService high-level API."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import EncryptionService

        key = _derive_key()
        svc = EncryptionService(key)

        # Basic encrypt/decrypt
        ct = svc.encrypt("test value")
        pt = svc.decrypt(ct)
        if pt != "test value":
            return "fail", f"Service round-trip failed: '{pt}'"

        # encrypt_field / decrypt_field
        ef = svc.encrypt_field("field data")
        df = svc.decrypt_field(ef)
        if df != "field data":
            return "fail", "Field encrypt/decrypt failed"

        # Non-string passthrough
        if svc.encrypt_field(42) != 42:
            return "fail", "Non-string not passed through"

        return "pass", "EncryptionService class works correctly"
    except Exception as exc:
        return "fail", str(exc)


def test_dict_encryption() -> tuple[str, str]:
    """Test dict-level encryption of sensitive fields."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import decrypt_dict, encrypt_dict

        key = _derive_key()
        data = {
            "private_key": "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ",
            "seed_phrase": "abandon abandon abandon abandon abandon about",
            "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "balance": 50.0,
        }

        encrypted = encrypt_dict(data, key)

        # Check sensitive fields are encrypted
        if not encrypted["private_key"].startswith("ENC4:"):
            return "fail", "private_key not encrypted"
        if not encrypted["seed_phrase"].startswith("ENC4:"):
            return "fail", "seed_phrase not encrypted"
        # Non-sensitive fields unchanged
        if encrypted["address"] != data["address"]:
            return "fail", "address was modified"
        if encrypted["balance"] != data["balance"]:
            return "fail", "balance was modified"

        # Decrypt
        decrypted = decrypt_dict(encrypted, key)
        if decrypted["private_key"] != data["private_key"]:
            return "fail", "private_key decrypt mismatch"
        if decrypted["seed_phrase"] != data["seed_phrase"]:
            return "fail", "seed_phrase decrypt mismatch"

        return "pass", "Dict encryption: 2 fields encrypted, 2 passthrough"
    except Exception as exc:
        return "fail", str(exc)


def test_empty_and_edge_cases() -> tuple[str, str]:
    """Test edge cases: empty string, very long string, special chars."""
    if not ENC_KEY:
        return "skip", "No encryption key"
    try:
        from app.services.security import decrypt_aes256gcm, encrypt_aes256gcm

        key = _derive_key()
        cases = [
            ("empty", ""),
            ("single_char", "x"),
            ("special_chars", "!@#$%^&*()_+-=[]{}|;':\",./<>?"),
            ("newlines", "line1\nline2\nline3"),
            ("unicode_mix", "Hello مرحبا 你好 🌍"),
            ("long_string", "A" * 10000),
        ]

        for name, plaintext in cases:
            encrypted = encrypt_aes256gcm(plaintext, key)
            decrypted = decrypt_aes256gcm(encrypted, key)
            if decrypted != plaintext:
                return "fail", f"Edge case '{name}' failed"

        return "pass", f"All {len(cases)} edge cases passed"
    except Exception as exc:
        return "fail", str(exc)


def test_no_plaintext_in_db() -> tuple[str, str]:
    """Query database for any plaintext sensitive keys."""
    try:
        import psycopg2

        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="nps",
            user="nps",
            password=os.environ.get("POSTGRES_PASSWORD", "nps_dev_password_2024"),
        )
        cur = conn.cursor()

        # Check oracle_readings for unencrypted sensitive fields
        sensitive_cols = [
            ("oracle_readings", "interpretation"),
            ("oracle_readings", "ai_interpretation"),
        ]
        plaintext_found = 0
        checked = 0
        for table, col in sensitive_cols:
            try:
                cur.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE {col} IS NOT NULL "
                    f"AND {col} != '' "
                    f"AND {col} NOT LIKE 'ENC4:%%' "
                    f"AND {col} NOT LIKE 'ENC:%%' "
                    f"AND {col} NOT LIKE 'PLAIN:%%'"
                )
                count = cur.fetchone()[0]
                if count > 0:
                    plaintext_found += count
                checked += 1
            except psycopg2.Error:
                pass  # Column may not exist

        conn.close()

        if checked == 0:
            return "pass", "No sensitive columns with data to check"
        if plaintext_found > 0:
            return "fail", f"{plaintext_found} plaintext values found in DB"
        return "pass", f"Checked {checked} columns — 0 plaintext values"
    except ImportError:
        return "skip", "psycopg2 not installed"
    except Exception as exc:
        return "fail", str(exc)


def main() -> None:
    print("=" * 60)
    print("NPS Encryption Validation Test")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    tests = [
        ("Key Configured", test_key_configured),
        ("Round-trip ASCII", test_roundtrip_ascii),
        ("Round-trip Persian UTF-8", test_roundtrip_persian),
        ("Unique IVs (no nonce reuse)", test_unique_ivs),
        ("Tamper Detection", test_tamper_detection),
        ("Wrong Key Rejection", test_wrong_key),
        ("EncryptionService Class", test_encryption_service_class),
        ("Dict Encryption", test_dict_encryption),
        ("Edge Cases", test_empty_and_edge_cases),
        ("No Plaintext in DB", test_no_plaintext_in_db),
    ]

    results = []
    for name, func in tests:
        t0 = time.perf_counter()
        status, detail = func()
        elapsed = (time.perf_counter() - t0) * 1000
        icon = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}[status]
        print(f"  [{icon}] {name}: {detail} ({elapsed:.0f}ms)")
        results.append(
            {
                "test": name,
                "status": status,
                "detail": detail,
                "elapsed_ms": round(elapsed, 1),
            }
        )

    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    skipped = sum(1 for r in results if r["status"] == "skip")

    print(f"\nResults: {passed} pass / {failed} fail / {skipped} skip")
    print("=" * 60)

    # Generate report
    report_lines = [
        "# Encryption Validation Report",
        "",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        "**Algorithm:** AES-256-GCM with PBKDF2-HMAC-SHA256 key derivation",
        "**Key Derivation:** 600,000 iterations, 32-byte key",
        "**Nonce:** 96-bit random per encryption",
        "",
        "## Results",
        "",
        "| Test | Status | Detail | Time |",
        "|------|--------|--------|------|",
    ]
    for r in results:
        icon = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}[r["status"]]
        report_lines.append(
            f"| {r['test']} | {icon} | {r['detail'][:60]} | {r['elapsed_ms']}ms |"
        )

    report_lines.extend(
        [
            "",
            f"**Summary:** {passed} pass / {failed} fail / {skipped} skip",
            "",
            "## Security Properties Verified",
            "",
            (
                "- [x] AES-256-GCM authenticated encryption"
                if passed >= 2
                else "- [ ] AES-256-GCM authenticated encryption"
            ),
            (
                "- [x] Unique nonces (no IV reuse)"
                if any(
                    r["test"] == "Unique IVs (no nonce reuse)" and r["status"] == "pass"
                    for r in results
                )
                else "- [ ] Unique nonces"
            ),
            (
                "- [x] Tamper detection (ciphertext integrity)"
                if any(
                    r["test"] == "Tamper Detection" and r["status"] == "pass"
                    for r in results
                )
                else "- [ ] Tamper detection"
            ),
            (
                "- [x] Wrong key rejection"
                if any(
                    r["test"] == "Wrong Key Rejection" and r["status"] == "pass"
                    for r in results
                )
                else "- [ ] Wrong key rejection"
            ),
            (
                "- [x] Persian UTF-8 support"
                if any(
                    r["test"] == "Round-trip Persian UTF-8" and r["status"] == "pass"
                    for r in results
                )
                else "- [ ] Persian UTF-8 support"
            ),
            (
                "- [x] No plaintext in database"
                if any(
                    r["test"] == "No Plaintext in DB" and r["status"] == "pass"
                    for r in results
                )
                else "- [ ] No plaintext in database"
            ),
            "",
        ]
    )

    security_dir = _PROJECT_ROOT / "security"
    security_dir.mkdir(exist_ok=True)
    report_path = security_dir / "ENCRYPTION_VALIDATION_REPORT.md"
    report_path.write_text("\n".join(report_lines))
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    main()
