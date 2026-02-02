-- V20260217__deliverables_rag_status.sql
-- Add RAG indexing status tracking columns to deliverables table

-- 1. Add RAG status columns
ALTER TABLE project.deliverables
    ADD COLUMN IF NOT EXISTS rag_status VARCHAR(20) DEFAULT 'PENDING';

ALTER TABLE project.deliverables
    ADD COLUMN IF NOT EXISTS rag_last_error TEXT;

ALTER TABLE project.deliverables
    ADD COLUMN IF NOT EXISTS rag_updated_at TIMESTAMP;

ALTER TABLE project.deliverables
    ADD COLUMN IF NOT EXISTS rag_version INT DEFAULT 1;

ALTER TABLE project.deliverables
    ADD COLUMN IF NOT EXISTS rag_doc_id VARCHAR(100);

-- 2. Add check constraint for rag_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_rag_status'
        AND conrelid = 'project.deliverables'::regclass
    ) THEN
        ALTER TABLE project.deliverables
            ADD CONSTRAINT chk_rag_status
            CHECK (rag_status IN ('PENDING', 'INDEXING', 'READY', 'FAILED', 'DELETED'));
    END IF;
END
$$;

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deliverables_rag_status
    ON project.deliverables(rag_status);

CREATE INDEX IF NOT EXISTS idx_deliverables_rag_doc_id
    ON project.deliverables(rag_doc_id)
    WHERE rag_doc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deliverables_rag_failed
    ON project.deliverables(rag_status, rag_updated_at)
    WHERE rag_status = 'FAILED';

-- 4. Add column comments
COMMENT ON COLUMN project.deliverables.rag_status IS 'RAG indexing status: PENDING/INDEXING/READY/FAILED/DELETED';
COMMENT ON COLUMN project.deliverables.rag_last_error IS 'Last RAG indexing error message';
COMMENT ON COLUMN project.deliverables.rag_updated_at IS 'Last RAG status update timestamp';
COMMENT ON COLUMN project.deliverables.rag_version IS 'Chunking/embedding policy version';
COMMENT ON COLUMN project.deliverables.rag_doc_id IS 'RAG document ID for idempotency (format: deliverable:{id})';

-- 5. Generate rag_doc_id for existing records
UPDATE project.deliverables
SET rag_doc_id = 'deliverable:' || id
WHERE rag_doc_id IS NULL;
