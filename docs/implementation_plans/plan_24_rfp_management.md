# Implementation Plan: RFP Management (Origin Console) Backend

> **Plan Version**: 1.0
> **Date**: 2026-02-10
> **Design Spec Reference**: `docs/10_menu/화면설계/24_RFP_화면설계.md` (v2.2)
> **Status**: NOT STARTED

---

## 1. Gap Summary

The RFP Management screen is being redesigned from a simple CRUD list into an **Origin Console** -- the gateway that defines a project's foundational scope and triggers AI analysis. The current backend state:

**Existing (basic CRUD)**:
- `ReactiveRfpController.java` with 6 endpoints: GET list, GET by ID, POST create, PUT update, DELETE, PATCH status
- `ReactiveRfpService.java` with basic CRUD
- `R2dbcRfp.java` entity in `project.rfps` table with basic fields (title, content, file_path, status, processing_status)
- `project.requirements` table exists with `rfp_id` FK

**Missing (per v2.2 design spec)**:
- Upload wizard flow (multi-step with metadata, file upload, AI preview, requirement extraction)
- AI extraction pipeline (parsing -> chunking -> LLM extraction -> candidate generation)
- RFP extraction run tracking (model version, prompt version, run status)
- Candidate review workflow (PROPOSED -> ACCEPTED/REJECTED/EDITED -> confirmed as requirement)
- Version management (multiple file versions per RFP, re-analysis trigger)
- Diff/Impact analysis between versions or extraction runs
- Evidence snippets (source quotes linking candidates to original document)
- Origin policy model (EXTERNAL_RFP, INTERNAL_INITIATIVE, MODERNIZATION, MIXED)
- 11-state status model (EMPTY -> ORIGIN_DEFINED -> UPLOADED -> PARSING -> ... -> CONFIRMED)

This is the most complex plan, requiring both significant backend work and a new LLM workflow.

---

## 2. DB Schema Changes (Flyway Migration)

**File**: `V20260236_06__rfp_extraction_tables.sql`
**Schema**: `rfp` (new schema) + `project` (extension)

```sql
-- V20260236_06: RFP Origin Console - extraction pipeline tables
-- Design spec: 24_RFP_화면설계.md v2.2

CREATE SCHEMA IF NOT EXISTS rfp;

-- ============================================================
-- 1. Project Origin Policy (per-project governance setting)
-- ============================================================
CREATE TABLE project.project_origin_policy (
    id                      VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id              VARCHAR(36) NOT NULL UNIQUE,
    origin_type             VARCHAR(30) NOT NULL,
        -- EXTERNAL_RFP, INTERNAL_INITIATIVE, MODERNIZATION, MIXED
    require_source_rfp_id   BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_level          VARCHAR(10) NOT NULL DEFAULT 'FULL',
        -- FULL, PARTIAL
    change_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    auto_analysis_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    lineage_enforcement     VARCHAR(10) NOT NULL DEFAULT 'STRICT',
        -- STRICT, RELAXED
    set_by                  VARCHAR(36) NOT NULL,
    set_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_count            INTEGER NOT NULL DEFAULT 0,
    previous_origin_type    VARCHAR(30),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project.project_origin_policy IS 'Per-project origin governance settings (set once, change requires approval)';
COMMENT ON COLUMN project.project_origin_policy.change_count IS 'Number of times origin type was changed (ideally 0)';

-- ============================================================
-- 2. Alter existing rfps table: expand status model + versioning
-- ============================================================
ALTER TABLE project.rfps
    ADD COLUMN IF NOT EXISTS origin_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS version_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS current_version_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS rfp_type VARCHAR(50) DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS etag VARCHAR(64) DEFAULT gen_random_uuid()::text;

-- Expand status enum: EMPTY, ORIGIN_DEFINED, UPLOADED, PARSING, PARSED,
-- EXTRACTING, EXTRACTED, REVIEWING, CONFIRMED, NEEDS_REANALYSIS, ON_HOLD, FAILED
COMMENT ON COLUMN project.rfps.status IS
    'EMPTY, ORIGIN_DEFINED, UPLOADED, PARSING, PARSED, EXTRACTING, EXTRACTED, REVIEWING, CONFIRMED, NEEDS_REANALYSIS, ON_HOLD, FAILED';

-- ============================================================
-- 3. RFP Versions (multiple file versions per RFP)
-- ============================================================
CREATE TABLE rfp.rfp_versions (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id              VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    version_label       VARCHAR(20) NOT NULL,
        -- v1.0, v1.1, v2.0 etc.
    file_path           VARCHAR(500) NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_type           VARCHAR(50),
    file_size           BIGINT,
    checksum            VARCHAR(128),
        -- SHA-256 of uploaded file
    uploaded_by         VARCHAR(36) NOT NULL,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_current          BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_rfp_version UNIQUE(rfp_id, version_label)
);

CREATE INDEX idx_rv_rfp ON rfp.rfp_versions(rfp_id);
CREATE INDEX idx_rv_current ON rfp.rfp_versions(rfp_id, is_current) WHERE is_current = TRUE;

-- ============================================================
-- 4. RFP Chunks (parsed document segments)
-- ============================================================
CREATE TABLE rfp.rfp_chunks (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_version_id      VARCHAR(36) NOT NULL REFERENCES rfp.rfp_versions(id) ON DELETE CASCADE,
    chunk_index         INTEGER NOT NULL,
    section_id          VARCHAR(100),
        -- e.g., "3.2.1" or "Appendix-A"
    content             TEXT NOT NULL,
    content_type        VARCHAR(30) DEFAULT 'TEXT',
        -- TEXT, TABLE, FIGURE_CAPTION, HEADER
    page_number         INTEGER,
    char_offset_start   INTEGER,
    char_offset_end     INTEGER,
    embedding_vector_id VARCHAR(100),
        -- Reference to Neo4j vector node
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chunk_order UNIQUE(rfp_version_id, chunk_index)
);

CREATE INDEX idx_rc_version ON rfp.rfp_chunks(rfp_version_id);
CREATE INDEX idx_rc_section ON rfp.rfp_chunks(section_id) WHERE section_id IS NOT NULL;

-- ============================================================
-- 5. RFP Extraction Runs (AI analysis execution records)
-- ============================================================
CREATE TABLE rfp.rfp_extraction_runs (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id              VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    rfp_version_id      VARCHAR(36) NOT NULL REFERENCES rfp.rfp_versions(id) ON DELETE CASCADE,
    run_number          INTEGER NOT NULL,
    model_name          VARCHAR(100) NOT NULL,
    model_version       VARCHAR(50),
    prompt_version      VARCHAR(20),
    schema_version      VARCHAR(20),
    generation_params   JSONB,
        -- { "temperature": 0.3, "top_p": 0.9 }
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        -- PENDING, PARSING, PARSED, EXTRACTING, COMPLETED, FAILED
    is_active           BOOLEAN DEFAULT TRUE,
        -- Latest active run (older runs retained for comparison)
    total_candidates    INTEGER DEFAULT 0,
    ambiguity_count     INTEGER DEFAULT 0,
    avg_confidence      DECIMAL(3,2),
    category_breakdown  JSONB,
        -- { "FUNCTIONAL": 35, "NON_FUNCTIONAL": 12, "CONSTRAINT": 5 }
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_extraction_run UNIQUE(rfp_id, run_number)
);

CREATE INDEX idx_rer_rfp ON rfp.rfp_extraction_runs(rfp_id);
CREATE INDEX idx_rer_rfp_active ON rfp.rfp_extraction_runs(rfp_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_rer_status ON rfp.rfp_extraction_runs(status);

COMMENT ON TABLE rfp.rfp_extraction_runs IS 'AI extraction run records with model/prompt versioning for reproducibility';

-- ============================================================
-- 6. RFP Candidates (extracted requirement candidates)
-- ============================================================
CREATE TABLE rfp.rfp_candidates (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    extraction_run_id   VARCHAR(36) NOT NULL REFERENCES rfp.rfp_extraction_runs(id) ON DELETE CASCADE,
    rfp_id              VARCHAR(36) NOT NULL,
    req_key             VARCHAR(50) NOT NULL,
        -- e.g., "RFP-REQ-001"
    text                TEXT NOT NULL,
    edited_text         TEXT,
        -- Reviewer-modified text (original preserved in `text`)
    category            VARCHAR(50) NOT NULL DEFAULT 'FUNCTIONAL',
        -- FUNCTIONAL, NON_FUNCTIONAL, UI, INTEGRATION, SECURITY, CONSTRAINT, BUSINESS, TECHNICAL
    priority_hint       VARCHAR(20),
        -- MUST, SHOULD, COULD, WONT (MoSCoW from AI)
    confidence          DECIMAL(3,2),
    source_paragraph_id VARCHAR(100),
        -- Section reference in original document
    source_quote        TEXT,
        -- Excerpt from original (max ~300 chars)
    source_chunk_id     VARCHAR(36),
        -- FK to rfp_chunks
    is_ambiguous        BOOLEAN DEFAULT FALSE,
    ambiguity_questions JSONB,
        -- Array of { question, suggestion }
    duplicate_refs      JSONB,
        -- Array of candidate IDs that may overlap
    status              VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
        -- PROPOSED, ACCEPTED, REJECTED, EDITED
    reviewed_by         VARCHAR(36),
    reviewed_at         TIMESTAMPTZ,
    confirmed_requirement_id VARCHAR(36),
        -- FK to project.requirements after confirmation
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_key UNIQUE(extraction_run_id, req_key)
);

CREATE INDEX idx_cand_run ON rfp.rfp_candidates(extraction_run_id);
CREATE INDEX idx_cand_rfp ON rfp.rfp_candidates(rfp_id);
CREATE INDEX idx_cand_status ON rfp.rfp_candidates(status);
CREATE INDEX idx_cand_confidence ON rfp.rfp_candidates(confidence) WHERE confidence < 0.7;

-- ============================================================
-- 7. RFP Evidence Snippets (source-to-candidate traceability)
-- ============================================================
CREATE TABLE rfp.rfp_evidence_snippets (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    candidate_id        VARCHAR(36) NOT NULL REFERENCES rfp.rfp_candidates(id) ON DELETE CASCADE,
    requirement_id      VARCHAR(36),
        -- Populated after confirmation
    chunk_id            VARCHAR(36) REFERENCES rfp.rfp_chunks(id) ON DELETE SET NULL,
    quote_text          TEXT NOT NULL,
    page_number         INTEGER,
    section_ref         VARCHAR(100),
    highlight_start     INTEGER,
    highlight_end       INTEGER,
    checksum            VARCHAR(128),
        -- SHA-256 of quote_text for integrity
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_res_candidate ON rfp.rfp_evidence_snippets(candidate_id);
CREATE INDEX idx_res_requirement ON rfp.rfp_evidence_snippets(requirement_id) WHERE requirement_id IS NOT NULL;

-- ============================================================
-- 8. RFP Status Transition Log
-- ============================================================
CREATE TABLE rfp.rfp_status_log (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id              VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    from_status         VARCHAR(50),
    to_status           VARCHAR(50) NOT NULL,
    trigger_type        VARCHAR(30) NOT NULL,
        -- USER, SYSTEM, WORKER
    trigger_detail      TEXT,
    actor_id            VARCHAR(36),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rsl_rfp ON rfp.rfp_status_log(rfp_id, created_at DESC);
```

---

## 3. Java Package Structure

```
com.insuretech.pms.rfp
  +-- controller/
  |   +-- ReactiveRfpController.java           (EXISTING -- extend)
  |   +-- ReactiveRfpExtractionController.java  (NEW)
  |   +-- ReactiveRfpCandidateController.java   (NEW)
  |   +-- ReactiveOriginPolicyController.java   (NEW)
  |   +-- ReactiveRfpEvidenceController.java    (NEW)
  +-- service/
  |   +-- ReactiveRfpService.java              (EXISTING -- extend with status machine)
  |   +-- ReactiveRfpUploadService.java         (NEW -- file upload + versioning)
  |   +-- ReactiveRfpExtractionService.java     (NEW -- orchestrates AI pipeline)
  |   +-- ReactiveRfpCandidateService.java      (NEW -- review workflow)
  |   +-- ReactiveOriginPolicyService.java      (NEW -- origin governance)
  |   +-- ReactiveRfpDiffService.java           (NEW -- version/run comparison)
  |   +-- ReactiveRfpEvidenceService.java       (NEW -- evidence snippets)
  |   +-- RfpStatusMachine.java                 (NEW -- state transition enforcement)
  +-- reactive/
  |   +-- entity/
  |   |   +-- R2dbcRfp.java                    (EXISTING -- extend)
  |   |   +-- R2dbcRfpVersion.java              (NEW)
  |   |   +-- R2dbcRfpChunk.java                (NEW)
  |   |   +-- R2dbcRfpExtractionRun.java        (NEW)
  |   |   +-- R2dbcRfpCandidate.java            (NEW)
  |   |   +-- R2dbcRfpEvidenceSnippet.java      (NEW)
  |   |   +-- R2dbcProjectOriginPolicy.java     (NEW)
  |   |   +-- R2dbcRfpStatusLog.java            (NEW)
  |   +-- repository/
  |       +-- ReactiveRfpRepository.java        (EXISTING)
  |       +-- ReactiveRfpVersionRepository.java  (NEW)
  |       +-- ReactiveRfpChunkRepository.java    (NEW)
  |       +-- ReactiveRfpExtractionRunRepository.java (NEW)
  |       +-- ReactiveRfpCandidateRepository.java (NEW)
  |       +-- ReactiveRfpEvidenceSnippetRepository.java (NEW)
  |       +-- ReactiveOriginPolicyRepository.java (NEW)
  |       +-- ReactiveRfpStatusLogRepository.java (NEW)
  +-- dto/
      +-- RfpDto.java                           (EXISTING -- extend)
      +-- RfpDetailDto.java                     (NEW -- full card + KPI)
      +-- RfpVersionDto.java
      +-- RfpExtractionRunDto.java
      +-- RfpCandidateDto.java
      +-- RfpCandidateSummaryDto.java
      +-- RfpCandidateConfirmRequest.java
      +-- RfpCandidateRejectRequest.java
      +-- RfpCandidateEditRequest.java
      +-- RfpEvidenceSnippetDto.java
      +-- RfpDiffDto.java
      +-- RfpImpactDto.java
      +-- OriginPolicyDto.java
      +-- OriginSummaryDto.java
      +-- RfpKpiDto.java
      +-- RfpUploadRequest.java
      +-- OriginSetRequest.java
```

---

## 4. API Endpoint List

### 4.1 RFP CRUD + Versioning (extend existing controller)

Base path: `/api/v2/projects/{projectId}/rfps`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/` | List RFPs with status card data (FilterSpec: search, status, originType, sort, page, size) | `view_rfp` |
| `GET` | `/{rfpId}` | RFP detail (full card + KPI + latest run summary) | `view_rfp` |
| `POST` | `/` | Create RFP (Wizard Step 1+2: metadata + optional file) | `manage_rfp_upload` |
| `PATCH` | `/{rfpId}` | Update RFP metadata | `manage_rfp_upload` |
| `DELETE` | `/{rfpId}` | Soft-delete RFP (blocked if CONFIRMED) | `manage_rfp_upload` |
| `POST` | `/{rfpId}/versions` | Upload new version -> triggers NEEDS_REANALYSIS | `manage_rfp_upload` |
| `GET` | `/{rfpId}/versions` | List version history | `view_rfp` |

### 4.2 Origin Policy

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v2/projects/{projectId}/origin` | Set origin type (first time) | `manage_rfp_upload` |
| `GET` | `/api/v2/projects/{projectId}/origin` | Get origin policy + settings | `view_rfp` |
| `PUT` | `/api/v2/projects/{projectId}/origin` | Change origin (requires PM+PMO approval) | `manage_rfp_upload` |
| `GET` | `/api/v2/projects/{projectId}/origin/summary` | OriginSummaryStrip data (KPIs) | `view_rfp` |

### 4.3 Extraction Pipeline

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/{rfpId}/analyze` | Trigger analysis (parse + extract, or re-analysis) | `run_rfp_analysis` |
| `GET` | `/{rfpId}/extractions` | List extraction runs | `view_rfp` |
| `GET` | `/{rfpId}/extractions/latest` | Latest run + candidates + summary | `view_rfp` |
| `GET` | `/{rfpId}/extractions/{runId}` | Specific run detail | `view_rfp` |

### 4.4 Candidate Review

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/{rfpId}/candidates/confirm` | Bulk confirm candidates -> create requirements + trace links | `confirm_requirements` |
| `POST` | `/{rfpId}/candidates/reject` | Bulk reject candidates | `review_rfp_candidates` |
| `PATCH` | `/{rfpId}/candidates/{candidateId}` | Edit individual candidate (text/category) | `review_rfp_candidates` |

### 4.5 Diff / Impact / Evidence

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/{rfpId}/diff` | Version or run comparison (`?from=v1.0&to=v1.1` or `?fromRun=...&toRun=...`) | `view_rfp` |
| `GET` | `/{rfpId}/impact` | Impact analysis (change event -> affected epics/tasks) | `view_rfp` |
| `GET` | `/{rfpId}/evidence` | Evidence snippets (`?requirementId=...`) | `view_rfp_evidence` |
| `GET` | `/{rfpId}/audit/export` | Audit data export (CSV/PDF) | `export_rfp_evidence` |

---

## 5. LLM Workflow: RFP Extraction Pipeline

### New Workflow: `g8_rfp_extraction.py`

**Location**: `llm-service/routes/rfp_routes.py` + `llm-service/agents/rfp_extraction_agent.py` (new)

#### Pipeline Architecture (LangGraph)

```
[Upload] -> [OCR/Parse] -> [Chunk] -> [Extract] -> [Classify] -> [Deduplicate] -> [Output]
```

**Nodes**:

1. **Document Parser Node** (`parse_document`)
   - Input: file bytes + file_type
   - PDF: pypdfium2 for text extraction, Tesseract OCR for scanned pages
   - Word: python-docx
   - Output: raw text + page-level segments

2. **Chunking Node** (`chunk_document`)
   - Split into semantic sections (heading-aware, ~500-1000 tokens per chunk)
   - Preserve section IDs (e.g., "3.2.1")
   - Output: array of chunks with metadata

3. **Requirement Extraction Node** (`extract_requirements`)
   - Uses Gemma-3-12B with structured output prompt
   - Input: chunks + project context
   - Output: candidate requirements with confidence scores
   - Prompt includes: category classification, MoSCoW priority hint, ambiguity detection

4. **Deduplication Node** (`deduplicate`)
   - Semantic similarity check between candidates (cosine similarity on embeddings)
   - Flag duplicates with `duplicate_refs`

5. **Evidence Linking Node** (`link_evidence`)
   - For each candidate, identify source paragraph(s)
   - Extract quote text (max 300 chars)
   - Record page number and section reference

6. **Quality Gate Node** (`validate_output`)
   - Check confidence distribution
   - Flag low-confidence candidates for human review
   - Generate summary statistics

#### REST Endpoints

```python
@rfp_bp.route('/api/rfp/parse', methods=['POST'])
def parse_rfp():
    """Parse uploaded document into chunks."""
    # Input: { "rfp_id", "version_id", "file_path", "file_type" }
    # Output: { "chunks": [...], "page_count", "section_count" }

@rfp_bp.route('/api/rfp/extract', methods=['POST'])
def extract_requirements():
    """Extract requirement candidates from parsed chunks."""
    # Input: { "rfp_id", "version_id", "run_id", "chunks": [...], "project_context" }
    # Output: { "candidates": [...], "evidence": [...], "stats": {...} }

@rfp_bp.route('/api/rfp/diff', methods=['POST'])
def diff_extractions():
    """Compare two extraction runs or versions."""
    # Input: { "from_run_id", "to_run_id" } or { "from_chunks", "to_chunks" }
    # Output: { "added": [...], "removed": [...], "modified": [...] }
```

#### Spring Integration

```java
// In ReactiveRfpExtractionService.java
public Mono<Void> triggerAnalysis(String rfpId) {
    return rfpRepository.findById(rfpId)
        .flatMap(rfp -> {
            // 1. Transition to PARSING
            rfp.setStatus("PARSING");
            return rfpRepository.save(rfp);
        })
        .flatMap(rfp -> {
            // 2. Call LLM service to parse
            return webClient.post()
                .uri(aiServiceUrl + "/api/rfp/parse")
                .bodyValue(buildParseRequest(rfp))
                .retrieve()
                .bodyToMono(ParseResponse.class);
        })
        .flatMap(parseResult -> {
            // 3. Save chunks to DB
            return saveChunks(parseResult.getChunks());
        })
        .flatMap(chunks -> {
            // 4. Transition to EXTRACTING, call extraction
            return webClient.post()
                .uri(aiServiceUrl + "/api/rfp/extract")
                .bodyValue(buildExtractRequest(chunks))
                .retrieve()
                .bodyToMono(ExtractResponse.class);
        })
        .flatMap(extractResult -> {
            // 5. Save candidates + evidence, transition to EXTRACTED
            return saveCandidatesAndEvidence(extractResult);
        })
        .then();
}
```

---

## 6. RFP Status Machine

```java
public class RfpStatusMachine {

    private static final Map<String, Set<String>> TRANSITIONS = Map.ofEntries(
        Map.entry("EMPTY",              Set.of("ORIGIN_DEFINED")),
        Map.entry("ORIGIN_DEFINED",     Set.of("UPLOADED")),
        Map.entry("UPLOADED",           Set.of("PARSING", "FAILED")),
        Map.entry("PARSING",            Set.of("PARSED", "FAILED")),
        Map.entry("PARSED",             Set.of("EXTRACTING", "FAILED")),
        Map.entry("EXTRACTING",         Set.of("EXTRACTED", "FAILED")),
        Map.entry("EXTRACTED",          Set.of("REVIEWING")),
        Map.entry("REVIEWING",          Set.of("CONFIRMED")),
        Map.entry("CONFIRMED",          Set.of("NEEDS_REANALYSIS", "ON_HOLD")),
        Map.entry("NEEDS_REANALYSIS",   Set.of("PARSING")),
        Map.entry("ON_HOLD",            Set.of(/* restore to previous_status */)),
        Map.entry("FAILED",             Set.of("UPLOADED"))  // retry
    );

    public static boolean canTransition(String from, String to) {
        return TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }
}
```

---

## 7. Implementation Steps (Ordered)

### Phase 1: Database & Core Entities (2 days)
1. Create Flyway migration `V20260236_06__rfp_extraction_tables.sql`
2. Extend `R2dbcRfp.java` with new columns (origin_type, previous_status, failure_reason, version_count, etc.)
3. Implement new R2DBC entities: `R2dbcRfpVersion`, `R2dbcRfpChunk`, `R2dbcRfpExtractionRun`, `R2dbcRfpCandidate`, `R2dbcRfpEvidenceSnippet`, `R2dbcProjectOriginPolicy`, `R2dbcRfpStatusLog`
4. Implement new reactive repositories

### Phase 2: Origin Policy (1 day)
5. Implement `ReactiveOriginPolicyService` (set, get, change with approval check)
6. Implement `ReactiveOriginPolicyController` at `/api/v2/projects/{projectId}/origin`
7. Implement OriginPolicy -> system behavior mapping (auto-analysis, evidence level, lineage enforcement)

### Phase 3: Upload & Versioning (1 day)
8. Implement `ReactiveRfpUploadService`:
   - Multipart file upload handling
   - Version creation with checksum (SHA-256)
   - Status transition: ORIGIN_DEFINED -> UPLOADED
   - Re-upload: CONFIRMED -> NEEDS_REANALYSIS
9. Extend `ReactiveRfpController` with version management endpoints

### Phase 4: RFP Status Machine (1 day)
10. Implement `RfpStatusMachine` with all 11 states and valid transitions
11. Implement `ReactiveRfpStatusLogService` for audit trail of all status changes
12. Integrate status machine into all service methods that change RFP status
13. Implement ON_HOLD with `previous_status` preservation and restoration

### Phase 5: LLM Extraction Pipeline (3 days)
14. Create `llm-service/agents/rfp_extraction_agent.py` with LangGraph workflow:
    - Document Parser node (PDF via pypdfium2, OCR via Tesseract, Word via python-docx)
    - Chunking node (heading-aware semantic splitting)
    - Requirement Extraction node (Gemma-3-12B structured output)
    - Deduplication node (embedding similarity)
    - Evidence Linking node (source quote extraction)
    - Quality Gate node (confidence validation)
15. Create `llm-service/routes/rfp_routes.py` with parse/extract/diff endpoints
16. Unit test each pipeline node independently
17. Integration test full pipeline with sample RFP document

### Phase 6: Extraction Service (Spring) (2 days)
18. Implement `ReactiveRfpExtractionService`:
    - Orchestrate parse -> chunk -> extract flow via WebClient
    - Create extraction run record with model/prompt versioning
    - Save chunks, candidates, evidence snippets to DB
    - Manage status transitions through pipeline stages
    - Handle async execution (non-blocking, status polling)
19. Implement `ReactiveRfpExtractionController` with analyze/list/detail endpoints

### Phase 7: Candidate Review (2 days)
20. Implement `ReactiveRfpCandidateService`:
    - Bulk confirm: create `project.requirements` from accepted candidates + trace links
    - Bulk reject: mark candidates as REJECTED
    - Individual edit: preserve original `text`, store `edited_text`
    - Status workflow: PROPOSED -> ACCEPTED/REJECTED/EDITED
21. Implement `ReactiveRfpCandidateController` with confirm/reject/edit endpoints
22. Implement requirement creation from confirmed candidates (link `confirmed_requirement_id`)

### Phase 8: Diff & Evidence (1 day)
23. Implement `ReactiveRfpDiffService`:
    - Version-to-version diff (text comparison)
    - Run-to-run diff (candidate comparison)
    - Impact analysis (changed requirements -> affected epics/tasks)
24. Implement `ReactiveRfpEvidenceService`:
    - Query evidence snippets by requirement or candidate
    - Checksum validation for evidence integrity
25. Implement diff/impact/evidence endpoints

### Phase 9: Extend RFP List (1 day)
26. Update `ReactiveRfpController.getRfpsByProject()` to return status card data:
    - Derived requirement count
    - Epic link rate
    - Latest run status + AI analysis state badge
    - Change impact level
27. Implement `OriginSummaryDto` for the summary strip

### Phase 10: Testing & Documentation (2 days)
28. Unit tests for RFP status machine (all transitions, invalid transitions)
29. Unit tests for candidate confirmation -> requirement creation
30. Integration tests for full extraction pipeline (upload -> parse -> extract -> review -> confirm)
31. Integration tests for diff between versions and runs
32. Integration tests for evidence snippet integrity (checksum validation)
33. Add OpenAPI annotations for all new endpoints

---

## 8. Verification Steps

- [ ] Origin Policy set correctly per project (EXTERNAL_RFP/INTERNAL_INITIATIVE/MODERNIZATION/MIXED)
- [ ] Origin Policy enforces: `requireSourceRfpId`, `evidenceLevel`, `changeApprovalRequired`, `autoAnalysisEnabled`, `lineageEnforcement`
- [ ] Origin change count tracked; change requires PM+PMO approval
- [ ] RFP status machine enforces all 11 states with valid transitions only
- [ ] Invalid transitions return structured error with `violations[]`
- [ ] ON_HOLD preserves `previous_status` and restores on resume
- [ ] FAILED stores `failure_reason`
- [ ] File upload stores file with SHA-256 checksum
- [ ] Version management correctly sets `is_current` flag
- [ ] New version upload on CONFIRMED RFP triggers NEEDS_REANALYSIS
- [ ] LLM parse endpoint correctly extracts text from PDF/Word documents
- [ ] Chunking preserves section references and page numbers
- [ ] Extraction produces candidates with confidence scores and category classification
- [ ] Deduplication flags overlapping candidates
- [ ] Evidence snippets link candidates to source quotes with checksums
- [ ] Extraction run records model/prompt/schema versions for reproducibility
- [ ] Candidate review: PROPOSED -> ACCEPTED/REJECTED/EDITED workflow
- [ ] Bulk confirm creates requirements in `project.requirements` with `rfp_id` and `source_text`
- [ ] Trace links created from confirmed candidate -> requirement (evidence chain)
- [ ] Diff endpoint compares versions or runs correctly
- [ ] Impact analysis identifies affected epics and tasks from changed requirements
- [ ] RFP list returns enriched card data (status badge, requirement count, epic link rate)
- [ ] Status log records every transition with actor, trigger type, and timestamp
- [ ] All endpoints enforce appropriate capabilities (`view_rfp`, `manage_rfp_upload`, `run_rfp_analysis`, `review_rfp_candidates`, `confirm_requirements`)
