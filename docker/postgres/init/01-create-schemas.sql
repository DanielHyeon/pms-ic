-- PostgreSQL Initialization Script
-- Create independent schemas for each module (MSA-ready)
-- Updated: 2026-01-31

-- ============================================
-- Schema Creation
-- ============================================

-- Auth schema (authentication & authorization)
CREATE SCHEMA IF NOT EXISTS auth;

-- Project schema (projects, phases, WBS, parts, epics, features)
CREATE SCHEMA IF NOT EXISTS project;

-- Task schema (sprints, stories, tasks, kanban, weekly reports)
CREATE SCHEMA IF NOT EXISTS task;

-- Chat schema (chat sessions, messages for AI assistant)
CREATE SCHEMA IF NOT EXISTS chat;

-- Risk schema (risk management - future use)
CREATE SCHEMA IF NOT EXISTS risk;

-- Report schema (reports, templates)
CREATE SCHEMA IF NOT EXISTS report;

-- RFP schema (RFPs, requirements)
CREATE SCHEMA IF NOT EXISTS rfp;

-- Education schema (education modules, roadmaps, sessions)
CREATE SCHEMA IF NOT EXISTS education;

-- Lineage schema (data lineage tracking, outbox events)
CREATE SCHEMA IF NOT EXISTS lineage;

-- Audit schema (audit trails, evidence, compliance)
CREATE SCHEMA IF NOT EXISTS audit;

-- Governance schema (roles, capabilities, delegations, SoD, authority orchestration)
CREATE SCHEMA IF NOT EXISTS governance;

-- Organization schema (parts with membership types, co-leaders, assignment tracking)
CREATE SCHEMA IF NOT EXISTS organization;

-- ============================================
-- Grant Privileges
-- ============================================
GRANT ALL PRIVILEGES ON SCHEMA auth TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA project TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA task TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA chat TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA risk TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA report TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA rfp TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA education TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA lineage TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA audit TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA governance TO pms_user;
GRANT ALL PRIVILEGES ON SCHEMA organization TO pms_user;

-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Text search optimization

COMMIT;
