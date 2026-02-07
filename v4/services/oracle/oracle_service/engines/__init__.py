"""V4 Oracle Service — Engine Layer.

All V3 engines copied as-is for Phase 2 Oracle service.
Pure computation modules (fc60, numerology, math_analysis, scoring) are
used directly. Operational modules (logger, health, config, etc.) will
be adapted to V4 patterns (environment variables, gRPC, PostgreSQL)
during later phases.
"""

# Core computation engines (V3 portable, no adaptation needed)
from oracle_service.engines.fc60 import (
    token60,
    encode_fc60,
    format_full_output,
    parse_input,
)
from oracle_service.engines.numerology import (
    life_path,
    name_to_number,
    numerology_reduce,
    personal_year,
)
from oracle_service.engines.math_analysis import math_profile, entropy
from oracle_service.engines.scoring import hybrid_score, score_batch

# AI/ML engines
from oracle_service.engines.ai_engine import AIEngine
from oracle_service.engines.scanner_brain import ScannerBrain
from oracle_service.engines.learning import LearningEngine
from oracle_service.engines.learner import Learner

# Oracle readings
from oracle_service.engines.oracle import OracleEngine
