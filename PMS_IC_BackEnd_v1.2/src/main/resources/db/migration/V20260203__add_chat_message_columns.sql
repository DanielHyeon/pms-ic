-- Add trace_id and engine columns to chat_messages table
-- Required for LLM response tracking and engine attribution

ALTER TABLE chat.chat_messages
ADD COLUMN IF NOT EXISTS trace_id VARCHAR(100);

ALTER TABLE chat.chat_messages
ADD COLUMN IF NOT EXISTS engine VARCHAR(50);

-- Create index for trace_id lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_trace ON chat.chat_messages(trace_id);

COMMENT ON COLUMN chat.chat_messages.trace_id IS 'Trace ID for request tracking and debugging';
COMMENT ON COLUMN chat.chat_messages.engine IS 'LLM engine used for generating the response (e.g., gguf, vllm)';
