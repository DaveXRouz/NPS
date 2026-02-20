# NPS Backend Services

## Overview

NPS backend is a specialized Oracle service with a gRPC interface defined in `proto/`.

## Services

### Oracle (Python)

FC60 numerology engine, oracle readings, AI learning, and strategy intelligence.

- **Location:** `oracle/`
- **Language:** Python 3.8+
- **Interface:** gRPC (oracle.proto)
- **Responsibilities:** Oracle readings, numerology analysis, timing advice, scoring, AI learning
- **Legacy reuse:** All legacy engines, solvers, and logic modules copied as-is

See `oracle/README.md` for details.

## Communication

```
Frontend  ->  API Gateway (FastAPI)  ->  Oracle (gRPC)
```

The API gateway orchestrates all service communication.

## Shared Contracts

Protobuf definitions in `proto/` are the source of truth:

- `oracle.proto` — Oracle service interface

Generate client/server stubs with `make proto` from the project root.
