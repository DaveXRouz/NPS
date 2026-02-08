# Scanner ↔ Oracle Collaboration Loop

> The core innovation: two services making each other smarter through shared PostgreSQL.

---

## Simple Version

**Scanner** = fast but random. Generates millions of keys, checks balances.
**Oracle** = slow but smart. Analyzes patterns, suggests where to look.

Together: Oracle studies past finds → suggests "lucky ranges" → Scanner focuses there → finds more → Oracle learns more → **REPEAT**.

---

## The Loop

```
1. Scanner generates keys (random + Oracle-biased ranges)
2. Scanner checks balances (BTC: Blockstream, ETH: LlamaRPC)
3. Findings → PostgreSQL (vault_findings, partitioned monthly)
4. Oracle analyzes: FC60 tokens, numerology, time correlations, moon phases
5. Oracle generates suggestions with confidence scores → oracle_suggestions
6. Scanner reads suggestions → allocates ~30% of scan budget to Oracle ranges
7. AI learns from outcomes → adjusts weights → learning_patterns
8. BACK TO 1
```

---

## Key Tables

| Table | Writer | Reader |
|-------|--------|--------|
| `vault_findings` | Scanner | Oracle |
| `oracle_suggestions` | Oracle | Scanner |
| `learning_patterns` | Oracle (AI) | Oracle |
| `oracle_readings` | Oracle | Frontend |

---

## Suggestion Signals

1. **FC60 patterns** — overrepresented animals/elements in successful keys
2. **Time correlations** — moon phase, weekday, hour-of-day at time of find
3. **Numerological properties** — digit sums, master numbers frequency
4. **Range clustering** — hex ranges with more finds than expected

**Confidence score:** `0.3 * sample_size + 0.3 * significance + 0.2 * historical_accuracy + 0.2 * recency`

---

## Scanner Split: 70% random + 30% Oracle-guided
Ensures: no blind spots (random covers full space) + exploits known patterns (Oracle ranges).

---

## AI Levels: Novice (<1K) → Apprentice (1K-10K) → Journeyman (10K-100K) → Expert (100K+) → Master (1M+)

---

## Current Status
- Scanner: Rust stub (future project)
- Oracle engines: being rewritten (45-session plan)
- Database: schema exists, no real data yet
- Full loop: not operational until both Scanner + Oracle are complete
