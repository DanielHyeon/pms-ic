# ADR-002: PostgreSQL to Neo4j Sync via Outbox Pattern

## Status

**Accepted** | 2026-01-31

---

## Context

We use PostgreSQL as the primary transactional database and Neo4j for graph-based RAG. Data needs to be synchronized between them, but we need to maintain transactional consistency.

---

## Considered Options

### Option A: Dual Write

Write to both PostgreSQL and Neo4j in the same transaction.

**Pros:**
- Immediate consistency
- Simple conceptually

**Cons:**
- No distributed transaction support
- Partial failure scenarios
- Neo4j write failure blocks main operations
- Performance impact

### Option B: Change Data Capture (CDC)

Use Debezium or similar for PostgreSQL CDC.

**Pros:**
- No application code changes
- Real-time streaming

**Cons:**
- Infrastructure complexity
- Additional moving parts
- Kafka/Connect dependency
- Harder to debug

### Option C: Transactional Outbox (Chosen)

Write to outbox table in same transaction, poll and sync to Neo4j.

**Pros:**
- Transactional guarantee (local commit)
- Simple polling mechanism
- Easy to debug and retry
- No external dependencies

**Cons:**
- Eventual consistency (delay)
- Polling overhead
- Need to manage outbox table

---

## Decision

**Option C: Transactional Outbox Pattern**

We chose to implement the outbox pattern with polling-based Neo4j synchronization.

---

## Rationale

1. **Consistency guarantee**: Outbox write is in same transaction as business data. If transaction fails, both fail atomically.

2. **Simplicity**: No need for Kafka, Debezium, or distributed transaction coordinator.

3. **Debuggability**: Outbox events are visible in database, easy to inspect and replay.

4. **Failure handling**: Failed syncs can be retried without affecting main operations.

5. **Independence**: Neo4j unavailability doesn't block PostgreSQL writes.

---

## Implementation

### Outbox Table

```sql
CREATE TABLE project.outbox_events (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,  -- CREATE, UPDATE, DELETE
    payload JSONB NOT NULL,
    project_id VARCHAR(50),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);
```

### Sync Flow

```
1. Business operation + outbox insert (single transaction)
2. Poller reads unprocessed events (every 5 min)
3. Apply to Neo4j
4. Mark as processed
5. Full sync every 24 hours for consistency check
```

---

## Consequences

### Positive

- PostgreSQL operations are never blocked by Neo4j
- Clear audit trail of all synced changes
- Easy replay of failed events
- Transactional safety

### Negative

- 5-minute delay for graph updates
- Need to manage outbox table growth
- Polling resource usage

### Mitigations

- RAG queries include "last synced" metadata
- Outbox cleanup job (7-day retention)
- Configurable polling interval

---

## Review Conditions

Revisit this decision if:

- Real-time graph updates become required
- Outbox table grows too large
- CDC tooling becomes simpler to operate

---

## Evidence

- Schema: `V20260121__add_outbox_events.sql`
- Poller: `DeliverableOutboxPollerService.java`
- Neo4j Sync: `llm-service/run_sync.py`

---

*Decision made by: Architecture Team*
*Date: 2026-01-31*
