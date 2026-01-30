# LangGraph BMAD Role Remapping - Implementation Plan

## Overview

This document outlines the implementation plan for applying BMAD (Analyst/Architect/Guardian) role remapping to the PMS-IC LLM Service. The core objective is to programmatically enforce "stage responsibilities" rather than creating new agents.

## Core Principle

> **Key insight**: BMAD is not about "who speaks" but "what each stage is responsible for"

The existing Subagent calls are reinterpreted as BMAD stages, with structured outputs (State/Contract) and validation (Guards/Gates) to eliminate "role mixing".

## Current Problems to Solve

| Problem | Description | Impact |
|---------|-------------|--------|
| Role Mixing | Intent understanding ↔ Design/Rules ↔ Generation/Validation mixed in single node | Quality variance |
| Post-hoc Discovery | Policy violations, insufficient evidence found only after generation | Expensive correction loops |
| FAST Track Overhead | Excessive planner/validation intervention in fast response path | p95 instability |

## Goals

- [ ] Increase Response Contract compliance (structure/sections/fields/prohibitions)
- [ ] Increase Evidence-based response ratio (especially QUALITY track)
- [ ] Automatic blocking of permission/policy violations (target: 0 leakage)
- [ ] Maintain FAST track p95 (minimize reasoning steps, Light Guard focus)
- [ ] Reuse existing Subagents (minimize new agents)
- [ ] Automate stage-level responsibility/output validation

## Non-Goals

- Not forcing all requests through full BMAD loop (FAST uses lightweight BMAD subset)
- No complete rewrite of LangGraph templates/skills
- Not perfectly sealing entire domain with rules (realistic gradual strengthening)

## BMAD Role Definitions

### A) Analyst (Intent/Planning)
- Confirms user question as intent/scope
- Plans required sources/evidence
- Generates minimal questions if missing info (preferably 0-1)
- QUALITY track: Retrieve MUST happen after AnalystPlan

### B) Architect (Structure/Contract/Domain Rules)
- Specifies answer format/sections/terminology/prohibitions (ArchitectSpec)
- Reflects domain rules in answer structure
- Generate MUST happen after ArchitectSpec

### C) Guardian (Policy/Permission/Evidence/Consistency Judgment)
- PASS/RETRY/FAIL judgment gate
- Issues "retry directive" or "safe termination" on violations
- Finalize is IMPOSSIBLE without Guardian PASS

## Subagent → BMAD Stage Mapping

| BMAD Stage | Primary Subagent | Secondary Subagent | Responsibility |
|------------|------------------|-------------------|----------------|
| Analyst | Planner | Knowledge Curator | Intent/scope confirmation, source planning |
| Architect | Scrum Master | Reporter | Answer structure/contract, domain rule enforcement |
| Guardian | Risk/Quality | Orchestrator | Policy/permission/evidence/consistency judgment |
| Router | Orchestrator | - | FAST/QUALITY + BMAD depth decision |

## Implementation Phases

```
Phase 1: State/Contract Foundation
    ↓
Phase 2: Guardian System Enhancement  ← Highest Impact
    ↓
Phase 3: AnalystPlan Introduction
    ↓
Phase 4: ArchitectSpec Enhancement
    ↓
Phase 5: FAST Track Light Guardian
    ↓
Phase 6: Observability & Metrics
```

## Success Metrics (KPI)

| Metric | Target | Description |
|--------|--------|-------------|
| Hallucination rate | Decrease | Internal labeling |
| Evidence coverage | 90%+ (QUALITY) | Minimum condition compliance ratio |
| Policy violation leakage | 0 | Target zero leakage |
| FAST latency p95 | +5% max | Compared to current |
| User re-ask rate | Decrease | Re-questions/retries |
| Guardian RETRY ratio | Initial increase, then decrease | Good sign initially |

## Directory Structure

```
llm_service/
├── graph/
│   ├── build_graph.py
│   └── router.py
├── contracts/
│   ├── state.py
│   ├── schemas.py
│   ├── request_types.py
│   ├── track_policy.py
│   └── actions.py
├── nodes/
│   ├── analyst_plan.py
│   ├── retrieve_evidence.py
│   ├── architect_outline.py
│   ├── generate_draft.py
│   ├── guardian_verify.py
│   ├── finalize.py
│   ├── light_policy_gate.py
│   ├── light_guardian.py
│   ├── retry_bump.py
│   └── observability.py
├── guards/
│   ├── output_guard.py
│   ├── policy_gate.py
│   ├── contract_check.py
│   ├── evidence_check.py
│   └── json_parse.py
├── retrievers/
│   ├── base.py
│   ├── registry.py
│   ├── impl_db.py
│   ├── impl_neo4j.py
│   ├── impl_doc.py
│   └── impl_policy.py
├── observability/
│   ├── tracing.py
│   └── metrics.py
└── tests/
    ├── test_output_guard.py
    ├── test_guardian_rules.py
    ├── test_quality_path_e2e.py
    └── test_fast_path_light_guardian.py
```

## PR Sequence (Recommended)

| PR | Focus | Files |
|----|-------|-------|
| PR-1 | State/Contract Foundation | `contracts/`, `guards/output_guard.py`, tests |
| PR-2 | QUALITY Graph Guardian | analyst_plan → retrieve → guardian_verify → safe_exit |
| PR-3 | Architect + Contract Check | architect_outline, contract_check, generate_draft |
| PR-4 | FAST Light Guardian | light_guardian sampling, metrics comparison |

## Next Steps

1. Read [Phase 1: State/Contract Design](./01-state-contract-design.md)
2. Implement contracts and guards first
3. Progress through phases sequentially
