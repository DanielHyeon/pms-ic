# ADR-005: Query Validation Security Layer

> **Status**: Accepted
> **Date**: 2026-02-02
> **Decision Makers**: AI/LLM Team, Security Review

<!-- affects: llm, security, backend -->

---

## Questions This Document Answers

- Why did we implement a 2-stage security validation for AI-generated queries?
- What bypass patterns are we protecting against?
- How do we balance security with legitimate query flexibility?

---

## 1. Background

### Context

The LLM service generates SQL and Cypher queries from natural language user input. These queries are executed against production databases containing sensitive project data. The existing 4-layer validation (syntax, schema, security, performance) needed enhancement to protect against sophisticated bypass attempts.

### Problem Statement

AI-generated queries could potentially:
1. Bypass project scope restrictions using OR tautologies (`OR 1=1`)
2. Access sensitive columns like `password_hash` via UNION queries
3. Query forbidden tables containing authentication tokens
4. Use comment obfuscation to evade pattern detection (`OR/**/1=1`)

### Constraints

- Must not block legitimate OR conditions (e.g., `WHERE status='DONE' OR status='BLOCKED'`)
- Must support valid CTE queries for business reporting
- Must maintain sub-100ms validation overhead
- Must not require database connectivity for validation

---

## 2. Considered Options

### Option A: Regex-Heavy Single Pass

**Description**: Add more regex patterns to existing `_validate_security()` method.

**Pros**:
- Minimal code change
- Single validation pass

**Cons**:
- Regex complexity becomes unmaintainable
- Hard to test individual patterns
- Comment-based bypasses still possible

**Effort**: Low

---

### Option B: 2-Stage Modular Validation

**Description**: Separate fail-fast bypass detection (Stage 1) from scope integrity checking (Stage 2) with dedicated helper functions.

**Pros**:
- Clear separation of concerns
- Each stage is independently testable
- `normalize_sql()` handles obfuscation before pattern matching
- Easy to add new bypass patterns

**Cons**:
- Two validation passes
- Slightly more code

**Effort**: Medium

---

### Option C: External SQL Parser (sqlparse/sqlglot)

**Description**: Use full SQL parsing library for AST-based validation.

**Pros**:
- Complete SQL understanding
- No regex complexity

**Cons**:
- Heavy dependency
- Performance overhead (50-200ms per query)
- May not support all PostgreSQL syntax
- Overkill for bypass detection

**Effort**: High

---

## 3. Decision

### Chosen Option

**We chose Option B: 2-Stage Modular Validation**

### Rationale

1. **Maintainability**: Modular functions (`detect_bypass_patterns()`, `check_project_scope_integrity()`, `validate_column_denylist()`) are easier to test and extend
2. **Performance**: Normalization + pattern matching is faster than full SQL parsing
3. **Defense-in-depth**: Two stages catch different attack vectors
4. **Testability**: 13 dedicated security tests verify each bypass category

### Why Not Other Options?

| Option | Why Rejected |
|--------|--------------|
| Option A | Regex complexity would become unmaintainable; comment bypass still possible |
| Option C | Performance overhead too high; external dependency adds attack surface |

---

## 4. Consequences

### Positive Impacts

- Comment-obfuscated bypasses blocked (`OR/**/1=1`)
- UNION-based column extraction blocked
- Comparison tautologies detected (`OR 2>1`)
- EXISTS/COALESCE bypass attempts detected
- Project scope enforced with alias validation

### Negative Impacts

- CTEs with inner WHERE clauses may trigger false positives (documented limitation)
- Quoted identifiers not fully supported

### Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| False positives on valid queries | Low | Golden tests for legitimate patterns |
| New bypass pattern discovered | Medium | Modular design allows quick pattern addition |
| Performance regression | Low | Normalization is O(n) string operation |

---

## 5. Implementation Notes

### Required Changes

- [x] `normalize_sql()` - Replace comments with spaces (not empty string)
- [x] `detect_bypass_patterns()` - Stage 1 fail-fast detection
- [x] `check_project_scope_integrity()` - Stage 2 alias-aware validation
- [x] `validate_column_denylist()` - Check all SELECT clauses including UNION
- [x] `OR_BYPASS_PATTERNS` - Extended with comparison/EXISTS/function patterns
- [x] 13 security regression tests added

### Files Modified

| File | Changes |
|------|---------|
| `llm-service/text2query/query_validator.py` | 2-stage validation, extended patterns |
| `llm-service/tests/test_schema_graph_regression.py` | 13 security tests |

---

## 6. Re-evaluation Conditions

This decision should be revisited when:

- New SQL injection technique bypasses current patterns
- False positive rate exceeds 1% of legitimate queries
- Performance overhead exceeds 100ms per validation
- We adopt a query building library that provides built-in safety

---

## Related Documents

- [Query Validation Security](../07_security/query_validation.md)
- [LLM Service Architecture](../05_llm/README.md)
- [Access Control](../07_security/access_control.md)

---

## Decision History

| Date | Status | Notes |
|------|--------|-------|
| 2026-02-02 | Accepted | Security review approved implementation |

---

*ADRs are memory devices for "Why did we do this?"*
