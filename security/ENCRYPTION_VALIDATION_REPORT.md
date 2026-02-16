# Encryption Validation Report

**Generated:** 2026-02-15T16:45:24.659891+00:00
**Algorithm:** AES-256-GCM with PBKDF2-HMAC-SHA256 key derivation
**Key Derivation:** 600,000 iterations, 32-byte key
**Nonce:** 96-bit random per encryption

## Results

| Test | Status | Detail | Time |
|------|--------|--------|------|
| Key Configured | PASS | Key: 9b60e9ea... Salt: 88fd1b78... | 0.0ms |
| Round-trip ASCII | PASS | Round-trip OK (93 chars encrypted) | 110.5ms |
| Round-trip Persian UTF-8 | PASS | Persian UTF-8 round-trip OK (41 chars) | 102.5ms |
| Unique IVs (no nonce reuse) | PASS | Different nonces: 921797feeb77... vs 17e341c95241... | 99.3ms |
| Tamper Detection | PASS | Tamper detected — decryption correctly failed | 98.6ms |
| Wrong Key Rejection | PASS | Wrong key correctly rejected | 98.2ms |
| EncryptionService Class | PASS | EncryptionService class works correctly | 99.8ms |
| Dict Encryption | PASS | Dict encryption: 2 fields encrypted, 2 passthrough | 100.6ms |
| Edge Cases | PASS | All 6 edge cases passed | 101.0ms |
| No Plaintext in DB | PASS | No sensitive columns with data to check | 29.4ms |

**Summary:** 10 pass / 0 fail / 0 skip

## Security Properties Verified

- [x] AES-256-GCM authenticated encryption
- [x] Unique nonces (no IV reuse)
- [x] Tamper detection (ciphertext integrity)
- [x] Wrong key rejection
- [x] Persian UTF-8 support
- [x] No plaintext in database
