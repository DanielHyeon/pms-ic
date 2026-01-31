# PMS Insurance Claims - Project Overview

> **Version**: 2.0 | **Status**: Production Ready | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- What is this system and why does it exist?
- What problems does it solve?
- Who are the users?
- What is the scope of AI/LLM usage?

---

## 1. Purpose (Why)

PMS Insurance Claims is an **AI-integrated Project Management Platform** for insurance claims project lifecycle management. It provides:

- Full project lifecycle management (6-phase methodology)
- GraphRAG-based intelligent assistant for decision support
- Traceability from RFP requirements to final deliverables
- Real-time project health monitoring and reporting

### Problem Being Solved

| Problem | Solution |
|---------|----------|
| Manual project tracking is error-prone | Automated status tracking with Neo4j graph |
| Lack of traceability from requirements to tasks | RFP → Requirement → UserStory → Task chain |
| Difficult to generate consistent reports | AI-generated weekly reports and analysis |
| Knowledge silos in project documentation | RAG-based knowledge retrieval |

---

## 2. Scope (What)

### Included

- Project creation and lifecycle management
- WBS (Work Breakdown Structure) hierarchy management
- Sprint/Kanban task management
- AI-powered chatbot for project queries
- Report generation (weekly, phase, project)
- RFP parsing and requirement extraction
- Deliverable tracking with gate reviews

### NOT Included

- Financial/billing management
- HR management
- External system integrations (SAP, Oracle, etc.)
- Multi-tenant SaaS deployment (single-tenant only)

---

## 3. User Types

| Role | Description | System Access |
|------|-------------|---------------|
| **ADMIN** | System administrator | Full system access |
| **AUDITOR** | Read-only system access | All projects (read-only) |
| **SPONSOR** | Project sponsor/stakeholder | Project approval, deliverable sign-off |
| **PMO_HEAD** | PMO leadership | All project management |
| **PM** | Project Manager | Full project control |
| **DEVELOPER** | Development team member | Task execution, issue reporting |
| **QA** | Quality Assurance | Testing, issue reporting |
| **BUSINESS_ANALYST** | Business analysis | Requirements, user stories |
| **MEMBER** | General project member | View access |

---

## 4. AI/LLM Usage Scope

### What AI Does

| Function | Trust Level | Description |
|----------|-------------|-------------|
| Information Summary | SUGGEST | Summarize project status, activities |
| Query Interpretation | SUGGEST | Parse natural language queries |
| Report Generation | SUGGEST | Generate draft reports for review |
| Knowledge QA | SUGGEST | Answer questions from indexed documents |

### What AI Does NOT Do

| Prohibited Action | Reason |
|-------------------|--------|
| DB state decisions | LLM output is non-deterministic |
| Authorization decisions | Security requires deterministic checks |
| Final numerical calculations | Accuracy cannot be guaranteed |
| Automatic data modification | All changes require human approval |

### Trust Principle

> All numerical data comes from the database.
> LLM results are always "advisory" and require human validation.

---

## 5. Related Documents

| Document | Description |
|----------|-------------|
| [product_scope.md](./product_scope.md) | Detailed product scope |
| [user_roles.md](./user_roles.md) | Role definitions and permissions |
| [glossary.md](./glossary.md) | Technical term definitions |
| [../01_architecture/](../01_architecture/) | System architecture |

---

*Last Updated: 2026-01-31*
