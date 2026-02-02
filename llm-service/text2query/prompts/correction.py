"""Query Correction Prompt Template."""

CORRECTION_PROMPT = """You are a {query_type} expert. The following query has validation errors.
Fix the query to resolve all errors while maintaining the original intent.

## Original Query:
```
{original_query}
```

## Validation Errors:
{errors}

## Original Question:
{question}

## Project ID for filtering:
{project_id}

## Instructions:
1. Fix ALL the validation errors listed above
2. Ensure the query is syntactically correct
3. Make sure project_id filter is present for project-scoped tables
4. Keep the query as close to the original intent as possible

## Output:
Return ONLY the corrected query, no explanations.

Corrected Query:"""
