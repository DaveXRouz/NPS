# End-to-End Workflow Report

**Generated:** 2026-02-15T17:05:33.267848+00:00

## Results

| Workflow | Step | Status | Detail | Time |
|----------|------|--------|--------|------|
| Single-User Flow | Register & Login | PASS | User: WF_38cd71_alice | 411.2ms |
|  | Create Profile | FAIL | Status 422: {"detail":[{"type":"value_error","loc" | 3.6ms |
|  | Time Reading | PASS | Reading ID: None, FC60: True | 8.0ms |
|  | List Readings | PASS | Found 107 readings | 14.8ms |
|  | Share Reading | SKIP | No reading to share | 0.0ms |
|  | Delete Profile | SKIP | No profile to delete | 0.0ms |
| Persian Mode Flow | Persian Profile | FAIL | Status 422: {"detail":[{"type":"value_error","loc" | 3.6ms |
|  | Persian Name Reading | PASS | Script: persian, Numerology: False | 17251.6ms |
|  | UTF-8 in DB | SKIP | No profile created | 0.0ms |
| Admin Flow | Admin Login | PASS | User: WF_2809ac_admin | 390.8ms |
|  | Admin Stats | PASS | Keys: ['total_users', 'active_users', 'inactive_us | 4.8ms |
|  | List Users | PASS | Found 1 users | 4.5ms |
|  | Audit Log | FAIL | Status 500: Internal Server Error | 7.1ms |
|  | Change Password | PASS | Password changed | 373.2ms |

**Summary:** 8 pass / 3 fail / 3 skip

## Workflows Tested

1. **Single-User Flow:** Register -> Profile -> Reading -> List -> Share -> Delete
2. **Persian Mode Flow:** Persian profile -> Persian name reading -> UTF-8 DB verification
3. **Admin Flow:** Admin login -> Stats -> List users -> Audit log -> Change password
