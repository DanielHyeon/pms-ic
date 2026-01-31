# Glossary

> **Version**: 1.0 | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- What do these technical terms mean?
- How are domain concepts defined in this system?

---

## Project Management Terms

| Term | Definition |
|------|------------|
| **Project** | Top-level container for all project activities, phases, and resources |
| **Phase** | Major stage in project lifecycle (6 phases in insurance claims methodology) |
| **WBS (Work Breakdown Structure)** | Hierarchical decomposition of project work |
| **WBS Group** | Second-level WBS element, linked to Phase |
| **WBS Item** | Third-level WBS element, represents a work package |
| **WBS Task** | Fourth-level WBS element, represents an executable task |
| **Epic** | Large body of work representing a business goal |
| **Feature** | Functional unit that delivers value, child of Epic |
| **User Story** | User requirement written from user perspective |
| **Task** | Smallest unit of work, displayed on Kanban board |
| **Sprint** | Time-boxed iteration (typically 2 weeks) |
| **Deliverable** | Tangible output required at phase gate |
| **Gate Review** | Formal checkpoint between phases |

---

## Technical Terms

| Term | Definition |
|------|------------|
| **R2DBC** | Reactive Relational Database Connectivity - non-blocking database access |
| **WebFlux** | Spring's reactive web framework |
| **Mono** | Reactive type representing 0 or 1 element |
| **Flux** | Reactive type representing 0 to N elements |
| **LangGraph** | Framework for building LLM-powered agents with graph-based workflows |
| **RAG** | Retrieval-Augmented Generation - combining retrieval with LLM |
| **GraphRAG** | RAG using graph database for knowledge retrieval |
| **Vector Index** | Index for similarity search using embeddings |
| **Embedding** | Dense numerical representation of text |
| **RRF** | Reciprocal Rank Fusion - algorithm for merging search results |
| **Outbox Pattern** | Pattern for reliable event publishing with database transactions |
| **SSE** | Server-Sent Events - real-time streaming from server to client |

---

## AI/LLM Terms

| Term | Definition |
|------|------------|
| **Two-Track Workflow** | Intent-based model selection (L1: fast, L2: quality) |
| **Track A (L1)** | Fast response track using lightweight model (2-4B params) |
| **Track B (L2)** | Quality response track using medium model (8-12B params) |
| **Hybrid Search** | Combining vector and keyword search |
| **Chunk** | Segment of document for indexing and retrieval |
| **Subagent** | Specialized AI agent for specific tasks |
| **Skill** | Reusable capability in AI workflow |
| **Decision Authority Gate** | Classification of AI action authority levels |
| **Evidence System** | RAG-based evidence extraction and linking |
| **Failure Taxonomy** | Categorized failure codes with recovery strategies |

---

## Authority Levels

| Level | Description | Example |
|-------|-------------|---------|
| **SUGGEST** | AI provides recommendation only | "Consider adding tests" |
| **DECIDE** | AI makes decision, human reviews | "Recommend moving to next phase" |
| **EXECUTE** | AI performs action with logging | "Generated report draft" |
| **COMMIT** | AI commits changes (rare, controlled) | "Updated task status" |

---

## Database Terms

| Term | Definition |
|------|------------|
| **Schema** | Logical grouping of database tables |
| **auth schema** | User authentication and authorization tables |
| **project schema** | Project management entities |
| **task schema** | Task and sprint management |
| **chat schema** | AI chat sessions and messages |
| **report schema** | Report templates and generated reports |

---

*Last Updated: 2026-01-31*
