# Query Validation Security

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-02-02

<!-- affects: llm, backend, security -->

---

## Questions This Document Answers

- How are AI-generated SQL queries validated for security?
- What bypass patterns are detected and blocked?
- How is project scope enforced in queries?
- What sensitive data is protected?

---

## 1. Overview

The QueryValidator implements a 4-layer defense-in-depth strategy for validating AI-generated SQL and Cypher queries before execution.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Query Validation Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Syntax Validation                                     │
│  └─ Query length, emptiness, basic structure                    │
│                                                                 │
│  Layer 2: Schema Validation                                     │
│  └─ Tables exist, columns valid, type checking                  │
│                                                                 │
│  Layer 3: Security Validation   ◄── 2-Stage Security            │
│  ├─ Stage 1: Bypass Pattern Detection (fail-fast)               │
│  └─ Stage 2: Project Scope Integrity                            │
│                                                                 │
│  Layer 4: Performance Validation                                │
│  └─ LIMIT enforcement, subquery depth, UNION count              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Security Layer (Layer 3) Details

### 2.1 Stage 1: Bypass Pattern Detection

**Purpose**: Fail-fast detection of known SQL injection and scope bypass patterns.

#### OR-Based Tautologies (Blocked)

| Pattern | Example | Risk |
|---------|---------|------|
| Numeric tautology | `OR 1=1`, `OR 0=0` | Bypasses WHERE conditions |
| Boolean tautology | `OR TRUE`, `OR NOT FALSE` | Returns all rows |
| String tautology | `OR 'a'='a'` | Bypasses filters |
| Comparison tautology | `OR 2>1`, `OR 1<2` | Always evaluates true |
| NULL tautology | `OR NULL IS NULL` | Always true |
| EXISTS bypass | `OR EXISTS(SELECT 1)` | Subquery always returns |
| Function bypass | `OR COALESCE(...)` | Potential tautology |

#### Comment-Based Bypass Prevention

```sql
-- BLOCKED: Comment-obfuscated patterns
OR/**/1=1          -- Block comment bypass
OR/* comment */1=1 -- Extended comment bypass
OR--
1=1                -- Line comment bypass
```

**Implementation**: `normalize_sql()` replaces comments with spaces to preserve token boundaries.

### 2.2 Stage 2: Project Scope Integrity

**Purpose**: Ensure all queries accessing project-scoped tables include proper `project_id` filtering.

#### Project-Scoped Tables

| Table | Scope Method |
|-------|--------------|
| `task.tasks` | Via `task.user_stories.project_id` |
| `task.user_stories` | Direct `project_id` column |
| `task.sprints` | Direct `project_id` column |
| `project.phases` | Direct `project_id` column |
| `project.issues` | Direct `project_id` column |
| `project.risks` | Direct `project_id` column |

#### Alias-Aware Validation

```sql
-- VALID: Alias matches table in FROM clause
SELECT t.id FROM task.tasks t
WHERE t.project_id = :project_id

-- INVALID: Alias doesn't exist
SELECT t.id FROM task.tasks t
WHERE x.project_id = :project_id  -- 'x' is not defined
```

---

## 3. Forbidden Tables

The following tables are completely blocked from query access:

| Table | Reason |
|-------|--------|
| `auth.password_history` | Contains password hashes |
| `auth.tokens` | Contains authentication tokens |
| `auth.refresh_tokens` | Contains refresh tokens |

---

## 4. Column Denylist

Specific columns that must never appear in SELECT clauses:

| Table | Column | Reason |
|-------|--------|--------|
| `auth.users` | `password_hash` | Credential data |
| `auth.users` | `password` | Credential data |
| `auth.users` | `salt` | Cryptographic material |
| `auth.users` | `api_key` | Secret key |
| `auth.users` | `refresh_token` | Authentication token |
| `auth.users` | `access_token` | Authentication token |

### UNION Bypass Prevention

Column validation checks **all** SELECT clauses, including those in UNION queries:

```sql
-- BLOCKED: Column in second SELECT
SELECT id FROM auth.users
UNION SELECT password_hash FROM auth.users
```

---

## 5. Forbidden SQL Patterns

| Pattern | Reason |
|---------|--------|
| `DROP`, `DELETE`, `TRUNCATE` | Data destruction |
| `INSERT`, `UPDATE`, `ALTER` | Data modification |
| `CREATE`, `GRANT`, `REVOKE` | Schema/permission changes |
| `EXECUTE`, `EXEC` | Stored procedure execution |
| `--`, `/*` | SQL comments (injection vector) |
| `pg_sleep` | Resource exhaustion |
| `COPY`, `LOAD` | File system access |
| `;` followed by text | Multiple statements |

---

## 6. Performance Safeguards (Layer 4)

| Constraint | Default | Purpose |
|------------|---------|---------|
| Max query length | 5,000 chars | Prevent DoS |
| LIMIT required | Yes | Prevent unbounded results |
| Max LIMIT value | 100 rows | Resource protection |
| Max subquery depth | 3 levels | Query complexity |
| Max UNION count | 5 | Query complexity |
| RECURSIVE CTE | Blocked | Prevent infinite loops |
| SELECT * | Blocked | Column exposure prevention |

---

## 7. Error Responses

| Error Type | Message | Suggestion |
|------------|---------|------------|
| `SECURITY_VIOLATION` | "Security bypass attempt: OR 1=1 bypass detected" | "Remove tautology condition" |
| `SECURITY_VIOLATION` | "Access to table 'auth.tokens' is forbidden" | "This table cannot be queried" |
| `SCOPE_MISSING` | "Query must filter by project_id" | "Add WHERE project_id = :project_id" |
| `POLICY_VIOLATION` | "SELECT * is forbidden" | "List specific columns" |

---

## 8. Test Coverage

Security bypass prevention is verified by 13 dedicated tests:

| Test | Purpose |
|------|---------|
| `test_or_bypass_detected` | Standard OR tautologies |
| `test_comment_bypass_detected` | Comment-obfuscated patterns |
| `test_additional_or_patterns_detected` | Comparison/EXISTS/COALESCE |
| `test_legitimate_or_not_blocked` | Valid OR conditions pass |
| `test_forbidden_tables_blocked` | auth.tokens etc blocked |
| `test_allowed_tables_not_blocked` | auth.users allowed |
| `test_password_hash_column_blocked` | Sensitive columns blocked |
| `test_union_column_bypass_blocked` | UNION bypass prevention |
| `test_safe_columns_allowed` | Normal columns pass |
| `test_subquery_without_scope_detected` | Subquery scope check |
| `test_valid_scope_with_alias` | Alias validation |
| `test_legitimate_cte_not_blocked` | Valid CTEs pass |
| `test_legitimate_cte_without_inner_where_not_blocked` | CTE aggregation pass |

---

## 9. Implementation Reference

| Component | File | Description |
|-----------|------|-------------|
| Main validator | `llm-service/text2query/query_validator.py` | 4-layer validation |
| Bypass patterns | `OR_BYPASS_PATTERNS` constant | Pattern definitions |
| Column denylist | `COLUMN_DENYLIST` constant | Blocked columns |
| Forbidden tables | `FORBIDDEN_TABLES` in `schema_manager.py` | Blocked tables |
| Tests | `tests/test_schema_graph_regression.py` | Security tests |

---

## 10. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| CTE with inner WHERE | May find wrong WHERE clause | Document limitation |
| Quoted identifiers | Not fully supported | Low priority |
| Complex aliases | May miss some patterns | Additional test coverage |

---

## 11. Related Documents

| Document | Description |
|----------|-------------|
| [access_control.md](./access_control.md) | RBAC and authorization |
| [../05_llm/README.md](../05_llm/README.md) | LLM service overview |
| [ADR-005](../99_decisions/ADR-005-query-validation-security.md) | Security bypass prevention decision |

---

*Last Updated: 2026-02-02*
