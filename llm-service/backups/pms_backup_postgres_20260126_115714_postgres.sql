--
-- PostgreSQL database dump
--

\restrict 09R4jehvD3xDRdfkXI3Y4gji4nhRzDA6HAYtAbMHfWVjbu3YsWQZ9yfaUrsnlL8

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7 (Ubuntu 17.7-3.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY task.tasks DROP CONSTRAINT IF EXISTS fkqgwaiqxymudd3ega3in76ydsi;
ALTER TABLE IF EXISTS ONLY task.user_story_requirement_links DROP CONSTRAINT IF EXISTS fkmnaa7l7i1o951c1m6dyg33c2;
ALTER TABLE IF EXISTS ONLY task.user_stories DROP CONSTRAINT IF EXISTS fkhs7f69eg9suwnn7h81anvhutk;
ALTER TABLE IF EXISTS ONLY project.parts DROP CONSTRAINT IF EXISTS fkrjpcnvx0068nwbunx4uoaqd1m;
ALTER TABLE IF EXISTS ONLY project.phases DROP CONSTRAINT IF EXISTS fkp0vs31guyj5itugskrstnrm4y;
ALTER TABLE IF EXISTS ONLY project.part_members DROP CONSTRAINT IF EXISTS fkotdeupkma2mns1044mk6lv7do;
ALTER TABLE IF EXISTS ONLY project.kpis DROP CONSTRAINT IF EXISTS fknh1feih4rmq1l3scneefwlh66;
ALTER TABLE IF EXISTS ONLY project.requirement_task_links DROP CONSTRAINT IF EXISTS fkg70pc3ndm2g0dvqgpcub61ey5;
ALTER TABLE IF EXISTS ONLY project.education_histories DROP CONSTRAINT IF EXISTS fkffc3rfeufwg3lbole9n1ejcs8;
ALTER TABLE IF EXISTS ONLY project.project_members DROP CONSTRAINT IF EXISTS fkdki1sp2homqsdcvqm9yrix31g;
ALTER TABLE IF EXISTS ONLY project.deliverables DROP CONSTRAINT IF EXISTS fkcd22r03cehbp5p2jn2mkv34oh;
ALTER TABLE IF EXISTS ONLY project.requirements DROP CONSTRAINT IF EXISTS fkcauiebj13mq4kuavdv109ga66;
ALTER TABLE IF EXISTS ONLY project.meetings DROP CONSTRAINT IF EXISTS fkbt3vmcde0efob60esnfkyaeg0;
ALTER TABLE IF EXISTS ONLY project.backlog_items DROP CONSTRAINT IF EXISTS fkaxepsnspse4d7q4x73bk9kos2;
ALTER TABLE IF EXISTS ONLY project.backlog_items DROP CONSTRAINT IF EXISTS fkakluvqav0ismo22t6ryq1c33d;
ALTER TABLE IF EXISTS ONLY project.wbs_item_story_links DROP CONSTRAINT IF EXISTS fk_wis_link_wbs_item;
ALTER TABLE IF EXISTS ONLY project.wbs_tasks DROP CONSTRAINT IF EXISTS fk_wbs_task_phase;
ALTER TABLE IF EXISTS ONLY project.wbs_tasks DROP CONSTRAINT IF EXISTS fk_wbs_task_item;
ALTER TABLE IF EXISTS ONLY project.wbs_tasks DROP CONSTRAINT IF EXISTS fk_wbs_task_group;
ALTER TABLE IF EXISTS ONLY project.wbs_items DROP CONSTRAINT IF EXISTS fk_wbs_item_phase;
ALTER TABLE IF EXISTS ONLY project.wbs_items DROP CONSTRAINT IF EXISTS fk_wbs_item_group;
ALTER TABLE IF EXISTS ONLY project.wbs_groups DROP CONSTRAINT IF EXISTS fk_wbs_group_phase;
ALTER TABLE IF EXISTS ONLY project.wbs_groups DROP CONSTRAINT IF EXISTS fk_wbs_group_epic;
ALTER TABLE IF EXISTS ONLY project.features DROP CONSTRAINT IF EXISTS fk_feature_wbs_group;
ALTER TABLE IF EXISTS ONLY project.features DROP CONSTRAINT IF EXISTS fk_feature_epic;
ALTER TABLE IF EXISTS ONLY project.epics DROP CONSTRAINT IF EXISTS fk_epic_phase;
ALTER TABLE IF EXISTS ONLY project.backlog_items DROP CONSTRAINT IF EXISTS fk826yfnvgitrmim7317fis8wa0;
ALTER TABLE IF EXISTS ONLY project.phase_gates DROP CONSTRAINT IF EXISTS fk7uks9k66rxkyycybmcelu3qgy;
ALTER TABLE IF EXISTS ONLY project.education_sessions DROP CONSTRAINT IF EXISTS fk7mtfidgoh2o9fnk4wumui0idl;
ALTER TABLE IF EXISTS ONLY project.education_roadmaps DROP CONSTRAINT IF EXISTS fk5dq8ve03gtx7ngvgklmjhqfk0;
ALTER TABLE IF EXISTS ONLY project.issues DROP CONSTRAINT IF EXISTS fk4j2x3reshuu7qj5svh6eacnpt;
ALTER TABLE IF EXISTS ONLY chat.chat_messages DROP CONSTRAINT IF EXISTS fk3cpkdtwdxndrjhrx3gt9q5ux9;
ALTER TABLE IF EXISTS ONLY auth.role_permissions DROP CONSTRAINT IF EXISTS fkegdk29eiy7mdtefy5c7eirr6e;
DROP INDEX IF EXISTS task.idx_user_stories_wbs_item_id;
DROP INDEX IF EXISTS task.idx_user_stories_feature_id;
DROP INDEX IF EXISTS project.idx_wis_links_wbs_item_id;
DROP INDEX IF EXISTS project.idx_wis_links_story_id;
DROP INDEX IF EXISTS project.idx_wbs_tasks_status;
DROP INDEX IF EXISTS project.idx_wbs_tasks_phase_id;
DROP INDEX IF EXISTS project.idx_wbs_tasks_linked_task_id;
DROP INDEX IF EXISTS project.idx_wbs_tasks_item_id;
DROP INDEX IF EXISTS project.idx_wbs_tasks_group_id;
DROP INDEX IF EXISTS project.idx_wbs_tasks_assignee_id;
DROP INDEX IF EXISTS project.idx_wbs_items_status;
DROP INDEX IF EXISTS project.idx_wbs_items_phase_id;
DROP INDEX IF EXISTS project.idx_wbs_items_order;
DROP INDEX IF EXISTS project.idx_wbs_items_group_id;
DROP INDEX IF EXISTS project.idx_wbs_items_assignee_id;
DROP INDEX IF EXISTS project.idx_wbs_groups_status;
DROP INDEX IF EXISTS project.idx_wbs_groups_phase_id;
DROP INDEX IF EXISTS project.idx_wbs_groups_order;
DROP INDEX IF EXISTS project.idx_wbs_groups_linked_epic_id;
DROP INDEX IF EXISTS project.idx_features_wbs_group_id;
DROP INDEX IF EXISTS project.idx_features_status;
DROP INDEX IF EXISTS project.idx_features_priority;
DROP INDEX IF EXISTS project.idx_features_epic_id;
DROP INDEX IF EXISTS project.idx_epics_phase_id;
ALTER TABLE IF EXISTS ONLY task.weekly_reports DROP CONSTRAINT IF EXISTS weekly_reports_pkey;
ALTER TABLE IF EXISTS ONLY task.user_stories DROP CONSTRAINT IF EXISTS user_stories_pkey;
ALTER TABLE IF EXISTS ONLY task.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE IF EXISTS ONLY task.sprints DROP CONSTRAINT IF EXISTS sprints_pkey;
ALTER TABLE IF EXISTS ONLY task.kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_pkey;
ALTER TABLE IF EXISTS ONLY project.wbs_tasks DROP CONSTRAINT IF EXISTS wbs_tasks_pkey;
ALTER TABLE IF EXISTS ONLY project.wbs_items DROP CONSTRAINT IF EXISTS wbs_items_pkey;
ALTER TABLE IF EXISTS ONLY project.wbs_item_story_links DROP CONSTRAINT IF EXISTS wbs_item_story_links_pkey;
ALTER TABLE IF EXISTS ONLY project.wbs_groups DROP CONSTRAINT IF EXISTS wbs_groups_pkey;
ALTER TABLE IF EXISTS ONLY project.project_members DROP CONSTRAINT IF EXISTS ukaydweb1re2g5786xaugww4u0;
ALTER TABLE IF EXISTS ONLY project.wbs_item_story_links DROP CONSTRAINT IF EXISTS uk_wbs_item_story;
ALTER TABLE IF EXISTS ONLY project.wbs_groups DROP CONSTRAINT IF EXISTS uk_phase_wbs_group_code;
ALTER TABLE IF EXISTS ONLY project.outbox_events DROP CONSTRAINT IF EXISTS uk_ndatjktgs02jyasj8s7onvfsb;
ALTER TABLE IF EXISTS ONLY project.wbs_tasks DROP CONSTRAINT IF EXISTS uk_item_wbs_task_code;
ALTER TABLE IF EXISTS ONLY project.wbs_items DROP CONSTRAINT IF EXISTS uk_group_wbs_item_code;
ALTER TABLE IF EXISTS ONLY project.features DROP CONSTRAINT IF EXISTS uk_epic_feature_name;
ALTER TABLE IF EXISTS ONLY project.requirements DROP CONSTRAINT IF EXISTS uk_bbc2glmhm0nqq604k5a2miv8u;
ALTER TABLE IF EXISTS ONLY project.rfps DROP CONSTRAINT IF EXISTS rfps_pkey;
ALTER TABLE IF EXISTS ONLY project.requirements DROP CONSTRAINT IF EXISTS requirements_pkey;
ALTER TABLE IF EXISTS ONLY project.projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE IF EXISTS ONLY project.project_members DROP CONSTRAINT IF EXISTS project_members_pkey;
ALTER TABLE IF EXISTS ONLY project.phases DROP CONSTRAINT IF EXISTS phases_pkey;
ALTER TABLE IF EXISTS ONLY project.phase_gates DROP CONSTRAINT IF EXISTS phase_gates_pkey;
ALTER TABLE IF EXISTS ONLY project.parts DROP CONSTRAINT IF EXISTS parts_pkey;
ALTER TABLE IF EXISTS ONLY project.outbox_events DROP CONSTRAINT IF EXISTS outbox_events_pkey;
ALTER TABLE IF EXISTS ONLY project.meetings DROP CONSTRAINT IF EXISTS meetings_pkey;
ALTER TABLE IF EXISTS ONLY project.kpis DROP CONSTRAINT IF EXISTS kpis_pkey;
ALTER TABLE IF EXISTS ONLY project.issues DROP CONSTRAINT IF EXISTS issues_pkey;
ALTER TABLE IF EXISTS ONLY project.features DROP CONSTRAINT IF EXISTS features_pkey;
ALTER TABLE IF EXISTS ONLY project.epics DROP CONSTRAINT IF EXISTS epics_pkey;
ALTER TABLE IF EXISTS ONLY project.educations DROP CONSTRAINT IF EXISTS educations_pkey;
ALTER TABLE IF EXISTS ONLY project.education_sessions DROP CONSTRAINT IF EXISTS education_sessions_pkey;
ALTER TABLE IF EXISTS ONLY project.education_roadmaps DROP CONSTRAINT IF EXISTS education_roadmaps_pkey;
ALTER TABLE IF EXISTS ONLY project.education_histories DROP CONSTRAINT IF EXISTS education_histories_pkey;
ALTER TABLE IF EXISTS ONLY project.deliverables DROP CONSTRAINT IF EXISTS deliverables_pkey;
ALTER TABLE IF EXISTS ONLY project.backlogs DROP CONSTRAINT IF EXISTS backlogs_pkey;
ALTER TABLE IF EXISTS ONLY project.backlog_items DROP CONSTRAINT IF EXISTS backlog_items_pkey;
ALTER TABLE IF EXISTS ONLY chat.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pkey;
ALTER TABLE IF EXISTS ONLY chat.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.role_permissions DROP CONSTRAINT IF EXISTS ukriljgn66b857jm4uffdqtcsmy;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS uk_6dotkott2kjsp8vw4d0m25fb7;
ALTER TABLE IF EXISTS ONLY auth.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_pkey;
ALTER TABLE IF EXISTS ONLY auth.permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE IF EXISTS ONLY admin.sync_history DROP CONSTRAINT IF EXISTS sync_history_pkey;
ALTER TABLE IF EXISTS ONLY admin.backup_history DROP CONSTRAINT IF EXISTS backup_history_pkey;
DROP TABLE IF EXISTS task.weekly_reports;
DROP TABLE IF EXISTS task.user_story_requirement_links;
DROP TABLE IF EXISTS task.user_stories;
DROP TABLE IF EXISTS task.tasks;
DROP TABLE IF EXISTS task.sprints;
DROP TABLE IF EXISTS task.kanban_columns;
DROP TABLE IF EXISTS project.wbs_tasks;
DROP TABLE IF EXISTS project.wbs_items;
DROP TABLE IF EXISTS project.wbs_item_story_links;
DROP TABLE IF EXISTS project.wbs_groups;
DROP TABLE IF EXISTS project.rfps;
DROP TABLE IF EXISTS project.requirements;
DROP TABLE IF EXISTS project.requirement_task_links;
DROP TABLE IF EXISTS project.projects;
DROP TABLE IF EXISTS project.project_members;
DROP TABLE IF EXISTS project.phases;
DROP TABLE IF EXISTS project.phase_gates;
DROP TABLE IF EXISTS project.parts;
DROP TABLE IF EXISTS project.part_members;
DROP TABLE IF EXISTS project.outbox_events;
DROP TABLE IF EXISTS project.meetings;
DROP TABLE IF EXISTS project.kpis;
DROP TABLE IF EXISTS project.issues;
DROP TABLE IF EXISTS project.features;
DROP TABLE IF EXISTS project.epics;
DROP TABLE IF EXISTS project.educations;
DROP TABLE IF EXISTS project.education_sessions;
DROP TABLE IF EXISTS project.education_roadmaps;
DROP TABLE IF EXISTS project.education_histories;
DROP TABLE IF EXISTS project.deliverables;
DROP TABLE IF EXISTS project.backlogs;
DROP TABLE IF EXISTS project.backlog_items;
DROP TABLE IF EXISTS chat.chat_sessions;
DROP TABLE IF EXISTS chat.chat_messages;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.role_permissions;
DROP TABLE IF EXISTS auth.permissions;
DROP TABLE IF EXISTS admin.sync_history;
DROP TABLE IF EXISTS admin.backup_history;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pg_trgm;
DROP SCHEMA IF EXISTS task;
DROP SCHEMA IF EXISTS risk;
DROP SCHEMA IF EXISTS report;
DROP SCHEMA IF EXISTS project;
DROP SCHEMA IF EXISTS chat;
DROP SCHEMA IF EXISTS auth;
DROP SCHEMA IF EXISTS admin;
--
-- Name: admin; Type: SCHEMA; Schema: -; Owner: pms_user
--

CREATE SCHEMA admin;


ALTER SCHEMA admin OWNER TO pms_user;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: pms_user
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO pms_user;

--
-- Name: chat; Type: SCHEMA; Schema: -; Owner: pms_user
--

CREATE SCHEMA chat;


ALTER SCHEMA chat OWNER TO pms_user;

--
-- Name: project; Type: SCHEMA; Schema: -; Owner: pms_user
--

CREATE SCHEMA project;


ALTER SCHEMA project OWNER TO pms_user;

--
-- Name: report; Type: SCHEMA; Schema: -; Owner: pms_user
--

CREATE SCHEMA report;


ALTER SCHEMA report OWNER TO pms_user;

--
-- Name: risk; Type: SCHEMA; Schema: -; Owner: pms_user
--

CREATE SCHEMA risk;


ALTER SCHEMA risk OWNER TO pms_user;

--
-- Name: task; Type: SCHEMA; Schema: -; Owner: pms_user
--

CREATE SCHEMA task;


ALTER SCHEMA task OWNER TO pms_user;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: backup_history; Type: TABLE; Schema: admin; Owner: pms_user
--

CREATE TABLE admin.backup_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    backup_type character varying(20) NOT NULL,
    backup_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size_bytes bigint,
    status character varying(20) DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    error_message text,
    created_by character varying(50) NOT NULL,
    duration_ms integer,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE admin.backup_history OWNER TO pms_user;

--
-- Name: sync_history; Type: TABLE; Schema: admin; Owner: pms_user
--

CREATE TABLE admin.sync_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    entities_synced jsonb,
    total_records_synced integer DEFAULT 0,
    total_records_failed integer DEFAULT 0,
    error_message text,
    triggered_by character varying(50) NOT NULL,
    duration_ms integer,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE admin.sync_history OWNER TO pms_user;

--
-- Name: permissions; Type: TABLE; Schema: auth; Owner: pms_user
--

CREATE TABLE auth.permissions (
    id character varying(100) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    action character varying(50),
    category character varying(50) NOT NULL,
    description text,
    name character varying(200) NOT NULL,
    resource character varying(100)
);


ALTER TABLE auth.permissions OWNER TO pms_user;

--
-- Name: role_permissions; Type: TABLE; Schema: auth; Owner: pms_user
--

CREATE TABLE auth.role_permissions (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    granted boolean NOT NULL,
    role character varying(50) NOT NULL,
    permission_id character varying(100) NOT NULL,
    CONSTRAINT role_permissions_role_check CHECK (((role)::text = ANY (ARRAY[('SPONSOR'::character varying)::text, ('PMO_HEAD'::character varying)::text, ('PM'::character varying)::text, ('DEVELOPER'::character varying)::text, ('QA'::character varying)::text, ('BUSINESS_ANALYST'::character varying)::text, ('AUDITOR'::character varying)::text, ('ADMIN'::character varying)::text])))
);


ALTER TABLE auth.role_permissions OWNER TO pms_user;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: pms_user
--

CREATE TABLE auth.users (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    active boolean NOT NULL,
    department character varying(100),
    email character varying(100) NOT NULL,
    last_login_at timestamp(6) without time zone,
    name character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('SPONSOR'::character varying)::text, ('PMO_HEAD'::character varying)::text, ('PM'::character varying)::text, ('DEVELOPER'::character varying)::text, ('QA'::character varying)::text, ('BUSINESS_ANALYST'::character varying)::text, ('AUDITOR'::character varying)::text, ('ADMIN'::character varying)::text])))
);


ALTER TABLE auth.users OWNER TO pms_user;

--
-- Name: chat_messages; Type: TABLE; Schema: chat; Owner: pms_user
--

CREATE TABLE chat.chat_messages (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    content text NOT NULL,
    role character varying(20) NOT NULL,
    session_id character varying(50) NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK (((role)::text = ANY (ARRAY[('USER'::character varying)::text, ('ASSISTANT'::character varying)::text])))
);


ALTER TABLE chat.chat_messages OWNER TO pms_user;

--
-- Name: chat_sessions; Type: TABLE; Schema: chat; Owner: pms_user
--

CREATE TABLE chat.chat_sessions (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    active boolean NOT NULL,
    title character varying(200),
    user_id character varying(50) NOT NULL
);


ALTER TABLE chat.chat_sessions OWNER TO pms_user;

--
-- Name: backlog_items; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.backlog_items (
    id character varying(36) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    acceptance_criteria text,
    epic_id character varying(100),
    estimated_effort_hours integer,
    origin_type character varying(50) NOT NULL,
    priority_order integer NOT NULL,
    sprint_id character varying(50),
    status character varying(50),
    story_points integer,
    backlog_id character varying(36) NOT NULL,
    epic_id_ref character varying(36),
    requirement_id character varying(36),
    CONSTRAINT backlog_items_origin_type_check CHECK (((origin_type)::text = ANY (ARRAY[('REQUIREMENT'::character varying)::text, ('MANUAL'::character varying)::text]))),
    CONSTRAINT backlog_items_status_check CHECK (((status)::text = ANY (ARRAY[('BACKLOG'::character varying)::text, ('SELECTED'::character varying)::text, ('SPRINT'::character varying)::text, ('COMPLETED'::character varying)::text])))
);


ALTER TABLE project.backlog_items OWNER TO pms_user;

--
-- Name: backlogs; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.backlogs (
    id character varying(36) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    description text,
    name character varying(255),
    project_id character varying(36) NOT NULL,
    status character varying(50),
    CONSTRAINT backlogs_status_check CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('ARCHIVED'::character varying)::text])))
);


ALTER TABLE project.backlogs OWNER TO pms_user;

--
-- Name: deliverables; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.deliverables (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    approved_at timestamp(6) without time zone,
    approver character varying(50),
    description text,
    file_name character varying(200),
    file_path character varying(500),
    file_size bigint,
    name character varying(200) NOT NULL,
    status character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    uploaded_by character varying(50),
    phase_id character varying(50) NOT NULL,
    CONSTRAINT deliverables_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('IN_REVIEW'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text]))),
    CONSTRAINT deliverables_type_check CHECK (((type)::text = ANY (ARRAY[('DOCUMENT'::character varying)::text, ('CODE'::character varying)::text, ('REPORT'::character varying)::text, ('PRESENTATION'::character varying)::text, ('OTHER'::character varying)::text])))
);


ALTER TABLE project.deliverables OWNER TO pms_user;

--
-- Name: education_histories; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.education_histories (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    certificate_issued boolean,
    completed_at timestamp(6) without time zone,
    completion_status character varying(50) NOT NULL,
    feedback text,
    participant_department character varying(100),
    participant_id character varying(50) NOT NULL,
    participant_name character varying(100) NOT NULL,
    registered_at timestamp(6) without time zone,
    score integer,
    session_id character varying(50) NOT NULL,
    CONSTRAINT education_histories_completion_status_check CHECK (((completion_status)::text = ANY (ARRAY[('REGISTERED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('DROPPED'::character varying)::text, ('NO_SHOW'::character varying)::text])))
);


ALTER TABLE project.education_histories OWNER TO pms_user;

--
-- Name: education_roadmaps; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.education_roadmaps (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    description text,
    is_required boolean NOT NULL,
    level character varying(50) NOT NULL,
    order_num integer NOT NULL,
    target_role character varying(50) NOT NULL,
    education_id character varying(50) NOT NULL,
    CONSTRAINT education_roadmaps_level_check CHECK (((level)::text = ANY (ARRAY[('BASIC'::character varying)::text, ('INTERMEDIATE'::character varying)::text, ('ADVANCED'::character varying)::text]))),
    CONSTRAINT education_roadmaps_target_role_check CHECK (((target_role)::text = ANY (ARRAY[('ALL'::character varying)::text, ('PM'::character varying)::text, ('DEVELOPER'::character varying)::text, ('QA'::character varying)::text, ('BUSINESS_ANALYST'::character varying)::text, ('DATA_SCIENTIST'::character varying)::text])))
);


ALTER TABLE project.education_roadmaps OWNER TO pms_user;

--
-- Name: education_sessions; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.education_sessions (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    current_participants integer,
    end_at timestamp(6) without time zone,
    instructor character varying(100),
    location character varying(200),
    max_participants integer,
    notes text,
    scheduled_at timestamp(6) without time zone NOT NULL,
    session_name character varying(200),
    status character varying(50) NOT NULL,
    education_id character varying(50) NOT NULL,
    CONSTRAINT education_sessions_status_check CHECK (((status)::text = ANY (ARRAY[('SCHEDULED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


ALTER TABLE project.education_sessions OWNER TO pms_user;

--
-- Name: educations; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.educations (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    category character varying(50) NOT NULL,
    description text,
    duration_hours integer,
    education_type character varying(50) NOT NULL,
    instructor character varying(100),
    is_active boolean NOT NULL,
    learning_objectives text,
    materials text,
    prerequisites text,
    target_role character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    CONSTRAINT educations_category_check CHECK (((category)::text = ANY (ARRAY[('AGENT_AI'::character varying)::text, ('MACHINE_LEARNING'::character varying)::text, ('DEEP_LEARNING'::character varying)::text, ('PYTHON'::character varying)::text, ('BUSINESS_PLANNING'::character varying)::text, ('BUSINESS_OPERATION'::character varying)::text, ('AGENT_ROLE_EXPLANATION'::character varying)::text]))),
    CONSTRAINT educations_education_type_check CHECK (((education_type)::text = ANY (ARRAY[('IT_BASIC'::character varying)::text, ('IT_INTERMEDIATE'::character varying)::text, ('IT_ADVANCED'::character varying)::text, ('BUSINESS_AI_AWARENESS'::character varying)::text, ('BUSINESS_CASE_STUDY'::character varying)::text, ('POST_DEPLOYMENT'::character varying)::text]))),
    CONSTRAINT educations_target_role_check CHECK (((target_role)::text = ANY (ARRAY[('ALL'::character varying)::text, ('PM'::character varying)::text, ('DEVELOPER'::character varying)::text, ('QA'::character varying)::text, ('BUSINESS_ANALYST'::character varying)::text, ('DATA_SCIENTIST'::character varying)::text])))
);


ALTER TABLE project.educations OWNER TO pms_user;

--
-- Name: epics; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.epics (
    id character varying(36) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    business_value integer,
    description text,
    goal text,
    item_count integer,
    name character varying(255) NOT NULL,
    owner_id character varying(36),
    project_id character varying(36) NOT NULL,
    status character varying(50) NOT NULL,
    target_completion_date date,
    total_story_points integer,
    phase_id character varying(50),
    color character varying(20),
    progress integer DEFAULT 0,
    priority character varying(50) DEFAULT 'MEDIUM'::character varying,
    CONSTRAINT epics_status_check CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('ACTIVE'::character varying)::text, ('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


ALTER TABLE project.epics OWNER TO pms_user;

--
-- Name: COLUMN epics.phase_id; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.epics.phase_id IS 'Reference to Phase for Epic-Phase integration';


--
-- Name: COLUMN epics.color; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.epics.color IS 'Color code for UI display (e.g., #3B82F6)';


--
-- Name: COLUMN epics.progress; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.epics.progress IS 'Epic completion percentage (0-100)';


--
-- Name: COLUMN epics.priority; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.epics.priority IS 'CRITICAL, HIGH, MEDIUM, LOW';


--
-- Name: features; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.features (
    id character varying(36) NOT NULL,
    epic_id character varying(36) NOT NULL,
    wbs_group_id character varying(36),
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'MEDIUM'::character varying,
    order_num integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(36),
    updated_by character varying(36)
);


ALTER TABLE project.features OWNER TO pms_user;

--
-- Name: TABLE features; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON TABLE project.features IS 'Feature - Second level in Backlog hierarchy (Epic -> Feature -> UserStory -> Task)';


--
-- Name: COLUMN features.wbs_group_id; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.features.wbs_group_id IS 'Reference to WBS Group for Feature-WbsGroup integration';


--
-- Name: COLUMN features.status; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.features.status IS 'OPEN, IN_PROGRESS, DONE, CANCELLED';


--
-- Name: COLUMN features.priority; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.features.priority IS 'CRITICAL, HIGH, MEDIUM, LOW';


--
-- Name: issues; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.issues (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    assignee character varying(100),
    comments text,
    description text,
    due_date date,
    issue_type character varying(50) NOT NULL,
    priority character varying(50) NOT NULL,
    reporter character varying(100),
    resolution text,
    resolved_at timestamp(6) without time zone,
    reviewer character varying(100),
    status character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    project_id character varying(50) NOT NULL,
    CONSTRAINT issues_issue_type_check CHECK (((issue_type)::text = ANY (ARRAY[('BUG'::character varying)::text, ('RISK'::character varying)::text, ('BLOCKER'::character varying)::text, ('CHANGE_REQUEST'::character varying)::text, ('QUESTION'::character varying)::text, ('IMPROVEMENT'::character varying)::text, ('OTHER'::character varying)::text]))),
    CONSTRAINT issues_priority_check CHECK (((priority)::text = ANY (ARRAY[('CRITICAL'::character varying)::text, ('HIGH'::character varying)::text, ('MEDIUM'::character varying)::text, ('LOW'::character varying)::text]))),
    CONSTRAINT issues_status_check CHECK (((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('RESOLVED'::character varying)::text, ('VERIFIED'::character varying)::text, ('CLOSED'::character varying)::text, ('REOPENED'::character varying)::text, ('DEFERRED'::character varying)::text])))
);


ALTER TABLE project.issues OWNER TO pms_user;

--
-- Name: kpis; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.kpis (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    current character varying(100),
    name character varying(200) NOT NULL,
    status character varying(50) NOT NULL,
    target character varying(100) NOT NULL,
    phase_id character varying(50) NOT NULL,
    CONSTRAINT kpis_status_check CHECK (((status)::text = ANY (ARRAY[('ACHIEVED'::character varying)::text, ('ON_TRACK'::character varying)::text, ('AT_RISK'::character varying)::text])))
);


ALTER TABLE project.kpis OWNER TO pms_user;

--
-- Name: meetings; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.meetings (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    actual_end_at timestamp(6) without time zone,
    actual_start_at timestamp(6) without time zone,
    attendees text,
    description text,
    location character varying(200),
    meeting_type character varying(50) NOT NULL,
    minutes text,
    organizer character varying(100),
    scheduled_at timestamp(6) without time zone NOT NULL,
    status character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    project_id character varying(50) NOT NULL,
    CONSTRAINT meetings_meeting_type_check CHECK (((meeting_type)::text = ANY (ARRAY[('KICKOFF'::character varying)::text, ('WEEKLY'::character varying)::text, ('MONTHLY'::character varying)::text, ('MILESTONE'::character varying)::text, ('CLOSING'::character varying)::text, ('TECHNICAL'::character varying)::text, ('STAKEHOLDER'::character varying)::text, ('OTHER'::character varying)::text]))),
    CONSTRAINT meetings_status_check CHECK (((status)::text = ANY (ARRAY[('SCHEDULED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text, ('POSTPONED'::character varying)::text])))
);


ALTER TABLE project.meetings OWNER TO pms_user;

--
-- Name: outbox_events; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.outbox_events (
    id uuid NOT NULL,
    aggregate_id character varying(100) NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    created_at timestamp(6) without time zone,
    event_type character varying(100) NOT NULL,
    idempotency_key character varying(100),
    last_error text,
    payload jsonb NOT NULL,
    published_at timestamp(6) without time zone,
    retry_count integer,
    status character varying(20),
    CONSTRAINT outbox_events_event_type_check CHECK (((event_type)::text = ANY (ARRAY[('REQUIREMENT_CREATED'::character varying)::text, ('REQUIREMENT_UPDATED'::character varying)::text, ('REQUIREMENT_DELETED'::character varying)::text, ('REQUIREMENT_STATUS_CHANGED'::character varying)::text, ('STORY_CREATED'::character varying)::text, ('STORY_UPDATED'::character varying)::text, ('STORY_DELETED'::character varying)::text, ('STORY_SPRINT_ASSIGNED'::character varying)::text, ('TASK_CREATED'::character varying)::text, ('TASK_UPDATED'::character varying)::text, ('TASK_DELETED'::character varying)::text, ('TASK_STATUS_CHANGED'::character varying)::text, ('REQUIREMENT_STORY_LINKED'::character varying)::text, ('REQUIREMENT_STORY_UNLINKED'::character varying)::text, ('STORY_TASK_LINKED'::character varying)::text, ('STORY_TASK_UNLINKED'::character varying)::text, ('REQUIREMENT_TASK_LINKED'::character varying)::text, ('REQUIREMENT_TASK_UNLINKED'::character varying)::text, ('SPRINT_CREATED'::character varying)::text, ('SPRINT_STARTED'::character varying)::text, ('SPRINT_COMPLETED'::character varying)::text]))),
    CONSTRAINT outbox_events_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('PUBLISHED'::character varying)::text, ('FAILED'::character varying)::text])))
);


ALTER TABLE project.outbox_events OWNER TO pms_user;

--
-- Name: part_members; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.part_members (
    part_id character varying(50) NOT NULL,
    user_id character varying(255)
);


ALTER TABLE project.part_members OWNER TO pms_user;

--
-- Name: parts; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.parts (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    description text,
    end_date date,
    leader_id character varying(50),
    leader_name character varying(100),
    name character varying(200) NOT NULL,
    progress integer NOT NULL,
    start_date date,
    status character varying(50) NOT NULL,
    project_id character varying(50) NOT NULL,
    CONSTRAINT parts_status_check CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('COMPLETED'::character varying)::text])))
);


ALTER TABLE project.parts OWNER TO pms_user;

--
-- Name: phase_gates; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.phase_gates (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    approved_at timestamp(6) without time zone,
    approved_by character varying(50),
    comments text,
    rejected_at timestamp(6) without time zone,
    rejected_by character varying(50),
    status character varying(50) NOT NULL,
    submitted_at timestamp(6) without time zone,
    submitted_by character varying(50),
    phase_id character varying(50) NOT NULL,
    CONSTRAINT phase_gates_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SUBMITTED'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text])))
);


ALTER TABLE project.phase_gates OWNER TO pms_user;

--
-- Name: phases; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.phases (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    description text,
    end_date date,
    gate_status character varying(50),
    name character varying(200) NOT NULL,
    order_num integer NOT NULL,
    progress integer NOT NULL,
    start_date date,
    status character varying(50) NOT NULL,
    track_type character varying(20),
    project_id character varying(50) NOT NULL,
    CONSTRAINT phases_gate_status_check CHECK (((gate_status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SUBMITTED'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text]))),
    CONSTRAINT phases_status_check CHECK (((status)::text = ANY (ARRAY[('NOT_STARTED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('ON_HOLD'::character varying)::text]))),
    CONSTRAINT phases_track_type_check CHECK (((track_type)::text = ANY (ARRAY[('AI'::character varying)::text, ('SI'::character varying)::text, ('COMMON'::character varying)::text])))
);


ALTER TABLE project.phases OWNER TO pms_user;

--
-- Name: project_members; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.project_members (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    active boolean NOT NULL,
    department character varying(100),
    joined_at timestamp(6) without time zone,
    role character varying(50) NOT NULL,
    user_email character varying(100),
    user_id character varying(50) NOT NULL,
    user_name character varying(100),
    project_id character varying(50) NOT NULL,
    CONSTRAINT project_members_role_check CHECK (((role)::text = ANY (ARRAY[('SPONSOR'::character varying)::text, ('PM'::character varying)::text, ('PMO_HEAD'::character varying)::text, ('DEVELOPER'::character varying)::text, ('QA'::character varying)::text, ('BUSINESS_ANALYST'::character varying)::text, ('AUDITOR'::character varying)::text, ('MEMBER'::character varying)::text])))
);


ALTER TABLE project.project_members OWNER TO pms_user;

--
-- Name: projects; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.projects (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    budget numeric(15,2),
    description text,
    end_date date,
    name character varying(200) NOT NULL,
    progress integer NOT NULL,
    start_date date,
    status character varying(50) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY (ARRAY[('PLANNING'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('ON_HOLD'::character varying)::text, ('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


ALTER TABLE project.projects OWNER TO pms_user;

--
-- Name: requirement_task_links; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.requirement_task_links (
    requirement_id character varying(36) NOT NULL,
    task_id character varying(255)
);


ALTER TABLE project.requirement_task_links OWNER TO pms_user;

--
-- Name: requirements; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.requirements (
    id character varying(36) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    acceptance_criteria text,
    actual_effort integer,
    actual_effort_hours integer,
    assignee_id character varying(36),
    category character varying(50),
    requirement_code character varying(50) NOT NULL,
    description text,
    due_date date,
    estimated_effort integer,
    estimated_effort_hours integer,
    last_progress_update timestamp(6) without time zone,
    neo4j_node_id character varying(100),
    page_number integer,
    priority character varying(20),
    progress integer,
    progress_calc_method character varying(50),
    progress_percentage integer,
    project_id character varying(36) NOT NULL,
    remaining_effort_hours integer,
    source_text text,
    status character varying(50),
    story_points integer,
    tenant_id character varying(36) NOT NULL,
    title character varying(500) NOT NULL,
    rfp_id character varying(36),
    CONSTRAINT requirements_category_check CHECK (((category)::text = ANY (ARRAY[('FUNCTIONAL'::character varying)::text, ('NON_FUNCTIONAL'::character varying)::text, ('UI'::character varying)::text, ('INTEGRATION'::character varying)::text, ('SECURITY'::character varying)::text, ('AI'::character varying)::text, ('SI'::character varying)::text, ('COMMON'::character varying)::text, ('TECHNICAL'::character varying)::text, ('BUSINESS'::character varying)::text, ('CONSTRAINT'::character varying)::text]))),
    CONSTRAINT requirements_priority_check CHECK (((priority)::text = ANY (ARRAY[('CRITICAL'::character varying)::text, ('HIGH'::character varying)::text, ('MEDIUM'::character varying)::text, ('LOW'::character varying)::text]))),
    CONSTRAINT requirements_progress_calc_method_check CHECK (((progress_calc_method)::text = ANY (ARRAY[('STORY_POINT'::character varying)::text, ('TASK_COUNT'::character varying)::text, ('TIME_BASED'::character varying)::text]))),
    CONSTRAINT requirements_status_check CHECK (((status)::text = ANY (ARRAY[('IDENTIFIED'::character varying)::text, ('ANALYZED'::character varying)::text, ('APPROVED'::character varying)::text, ('IMPLEMENTED'::character varying)::text, ('VERIFIED'::character varying)::text, ('DEFERRED'::character varying)::text, ('REJECTED'::character varying)::text])))
);


ALTER TABLE project.requirements OWNER TO pms_user;

--
-- Name: rfps; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.rfps (
    id character varying(36) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    content text,
    file_name character varying(255),
    file_path character varying(500),
    file_size bigint,
    file_type character varying(50),
    processing_message character varying(255),
    processing_status character varying(50),
    project_id character varying(36) NOT NULL,
    status character varying(50),
    submitted_at timestamp(6) without time zone,
    tenant_id character varying(36) NOT NULL,
    title character varying(255) NOT NULL,
    CONSTRAINT rfps_processing_status_check CHECK (((processing_status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('EXTRACTING'::character varying)::text, ('INDEXING'::character varying)::text, ('COMPLETED'::character varying)::text, ('FAILED'::character varying)::text]))),
    CONSTRAINT rfps_status_check CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('SUBMITTED'::character varying)::text, ('UNDER_REVIEW'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text])))
);


ALTER TABLE project.rfps OWNER TO pms_user;

--
-- Name: wbs_groups; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.wbs_groups (
    id character varying(36) NOT NULL,
    phase_id character varying(50) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
    progress integer DEFAULT 0,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    weight integer DEFAULT 100,
    order_num integer DEFAULT 0,
    linked_epic_id character varying(36),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(36),
    updated_by character varying(36)
);


ALTER TABLE project.wbs_groups OWNER TO pms_user;

--
-- Name: TABLE wbs_groups; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON TABLE project.wbs_groups IS 'WBS Group - Second level in WBS hierarchy (Phase -> WbsGroup -> WbsItem -> WbsTask)';


--
-- Name: COLUMN wbs_groups.status; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.wbs_groups.status IS 'NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED';


--
-- Name: COLUMN wbs_groups.weight; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.wbs_groups.weight IS 'Weight for progress calculation (default 100)';


--
-- Name: COLUMN wbs_groups.linked_epic_id; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.wbs_groups.linked_epic_id IS 'Reference to Epic entity for Phase-WBS-Backlog integration';


--
-- Name: wbs_item_story_links; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.wbs_item_story_links (
    id character varying(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    wbs_item_id character varying(36) NOT NULL,
    story_id character varying(50) NOT NULL,
    linked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    linked_by character varying(36)
);


ALTER TABLE project.wbs_item_story_links OWNER TO pms_user;

--
-- Name: TABLE wbs_item_story_links; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON TABLE project.wbs_item_story_links IS 'Links WBS Items to User Stories for WbsItem-Story integration';


--
-- Name: wbs_items; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.wbs_items (
    id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL,
    phase_id character varying(50) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
    progress integer DEFAULT 0,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    weight integer DEFAULT 100,
    order_num integer DEFAULT 0,
    estimated_hours integer,
    actual_hours integer,
    assignee_id character varying(36),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(36),
    updated_by character varying(36)
);


ALTER TABLE project.wbs_items OWNER TO pms_user;

--
-- Name: TABLE wbs_items; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON TABLE project.wbs_items IS 'WBS Item - Third level in WBS hierarchy (Phase -> WbsGroup -> WbsItem -> WbsTask)';


--
-- Name: COLUMN wbs_items.status; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.wbs_items.status IS 'NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED';


--
-- Name: COLUMN wbs_items.weight; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.wbs_items.weight IS 'Weight for progress calculation within group (default 100)';


--
-- Name: wbs_tasks; Type: TABLE; Schema: project; Owner: pms_user
--

CREATE TABLE project.wbs_tasks (
    id character varying(36) NOT NULL,
    item_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL,
    phase_id character varying(50) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
    progress integer DEFAULT 0,
    weight integer DEFAULT 100,
    order_num integer DEFAULT 0,
    estimated_hours integer,
    actual_hours integer,
    assignee_id character varying(36),
    linked_task_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(36),
    updated_by character varying(36)
);


ALTER TABLE project.wbs_tasks OWNER TO pms_user;

--
-- Name: TABLE wbs_tasks; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON TABLE project.wbs_tasks IS 'WBS Task - Fourth level in WBS hierarchy (Phase -> WbsGroup -> WbsItem -> WbsTask)';


--
-- Name: COLUMN wbs_tasks.linked_task_id; Type: COMMENT; Schema: project; Owner: pms_user
--

COMMENT ON COLUMN project.wbs_tasks.linked_task_id IS 'Reference to task.tasks.id for WBS-Task integration';


--
-- Name: kanban_columns; Type: TABLE; Schema: task; Owner: pms_user
--

CREATE TABLE task.kanban_columns (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    color character varying(20),
    is_bottleneck_column boolean NOT NULL,
    name character varying(100) NOT NULL,
    order_num integer NOT NULL,
    project_id character varying(50) NOT NULL,
    wip_limit integer,
    wip_limit_hard integer,
    wip_limit_soft integer
);


ALTER TABLE task.kanban_columns OWNER TO pms_user;

--
-- Name: sprints; Type: TABLE; Schema: task; Owner: pms_user
--

CREATE TABLE task.sprints (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    conwip_limit integer,
    enable_wip_validation boolean NOT NULL,
    end_date date,
    goal text,
    name character varying(100) NOT NULL,
    neo4j_node_id character varying(255),
    project_id character varying(50) NOT NULL,
    start_date date,
    status character varying(50) NOT NULL,
    CONSTRAINT sprints_status_check CHECK (((status)::text = ANY (ARRAY[('PLANNED'::character varying)::text, ('ACTIVE'::character varying)::text, ('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


ALTER TABLE task.sprints OWNER TO pms_user;

--
-- Name: tasks; Type: TABLE; Schema: task; Owner: pms_user
--

CREATE TABLE task.tasks (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    assignee_id character varying(50),
    description text,
    due_date date,
    order_num integer,
    phase_id character varying(50),
    priority character varying(20) NOT NULL,
    sprint_id character varying(50),
    status character varying(50) NOT NULL,
    tags character varying(500),
    title character varying(200) NOT NULL,
    track_type character varying(20),
    user_story_id character varying(50),
    column_id character varying(50) NOT NULL,
    requirement_id character varying(50),
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY (ARRAY[('LOW'::character varying)::text, ('MEDIUM'::character varying)::text, ('HIGH'::character varying)::text, ('CRITICAL'::character varying)::text]))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY (ARRAY[('TODO'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('REVIEW'::character varying)::text, ('DONE'::character varying)::text]))),
    CONSTRAINT tasks_track_type_check CHECK (((track_type)::text = ANY (ARRAY[('AI'::character varying)::text, ('SI'::character varying)::text, ('COMMON'::character varying)::text])))
);


ALTER TABLE task.tasks OWNER TO pms_user;

--
-- Name: user_stories; Type: TABLE; Schema: task; Owner: pms_user
--

CREATE TABLE task.user_stories (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    acceptance_criteria text,
    assignee_id character varying(50),
    description text,
    epic character varying(100),
    priority character varying(20) NOT NULL,
    priority_order integer,
    project_id character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    story_points integer,
    title character varying(200) NOT NULL,
    sprint_id character varying(50),
    feature_id character varying(36),
    wbs_item_id character varying(36),
    CONSTRAINT user_stories_priority_check CHECK (((priority)::text = ANY (ARRAY[('LOW'::character varying)::text, ('MEDIUM'::character varying)::text, ('HIGH'::character varying)::text, ('CRITICAL'::character varying)::text]))),
    CONSTRAINT user_stories_status_check CHECK (((status)::text = ANY (ARRAY[('BACKLOG'::character varying)::text, ('SELECTED'::character varying)::text, ('IN_PROGRESS'::character varying)::text, ('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text])))
);


ALTER TABLE task.user_stories OWNER TO pms_user;

--
-- Name: COLUMN user_stories.feature_id; Type: COMMENT; Schema: task; Owner: pms_user
--

COMMENT ON COLUMN task.user_stories.feature_id IS 'Reference to Feature for Feature-Story integration';


--
-- Name: COLUMN user_stories.wbs_item_id; Type: COMMENT; Schema: task; Owner: pms_user
--

COMMENT ON COLUMN task.user_stories.wbs_item_id IS 'Reference to WBS Item for WbsItem-Story integration';


--
-- Name: user_story_requirement_links; Type: TABLE; Schema: task; Owner: pms_user
--

CREATE TABLE task.user_story_requirement_links (
    user_story_id character varying(50) NOT NULL,
    requirement_id character varying(255)
);


ALTER TABLE task.user_story_requirement_links OWNER TO pms_user;

--
-- Name: weekly_reports; Type: TABLE; Schema: task; Owner: pms_user
--

CREATE TABLE task.weekly_reports (
    id character varying(50) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by character varying(255),
    updated_at timestamp(6) without time zone,
    updated_by character varying(255),
    average_wip_count integer,
    blocked_tasks integer,
    bottlenecks text,
    completed_tasks integer,
    completion_rate double precision,
    completion_trend double precision,
    flow_efficiency double precision,
    generated_at date NOT NULL,
    generated_by character varying(50),
    generated_content text,
    in_progress_tasks integer,
    llm_confidence_score double precision,
    llm_model character varying(100),
    peak_wip_count integer,
    project_id character varying(50) NOT NULL,
    recommendations text,
    sprint_id character varying(50),
    story_points_completed integer,
    story_points_in_progress integer,
    story_points_planned integer,
    summary text,
    todo_tasks integer,
    total_tasks integer,
    velocity double precision,
    velocity_trend double precision,
    week_end_date date NOT NULL,
    week_start_date date NOT NULL
);


ALTER TABLE task.weekly_reports OWNER TO pms_user;

--
-- Data for Name: backup_history; Type: TABLE DATA; Schema: admin; Owner: pms_user
--

COPY admin.backup_history (id, backup_type, backup_name, file_path, file_size_bytes, status, error_message, created_by, duration_ms, started_at, completed_at, created_at) FROM stdin;
7b890df3-ea07-47d9-9fea-da4f8ccbba6c	POSTGRES	pms_backup_postgres_20260126_092340		0	FAILED	[Errno 2] No such file or directory: 'pg_dump'	admin	2	2026-01-26 09:23:40.627497	\N	2026-01-26 09:23:40.638202
289acfb1-a9ae-4d31-9966-a5a637d2054d	POSTGRES	pms_backup_postgres_20260126_114116		0	FAILED	pg_dump failed: pg_dump: error: server version: 17.7; pg_dump version: 14.20 (Ubuntu 14.20-0ubuntu0.22.04.1)\npg_dump: error: aborting because of server version mismatch\n	admin	50	2026-01-26 11:41:16.70616	\N	2026-01-26 11:41:16.76553
\.


--
-- Data for Name: sync_history; Type: TABLE DATA; Schema: admin; Owner: pms_user
--

COPY admin.sync_history (id, sync_type, status, entities_synced, total_records_synced, total_records_failed, error_message, triggered_by, duration_ms, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: auth; Owner: pms_user
--

COPY auth.permissions (id, created_at, created_by, updated_at, updated_by, action, category, description, name, resource) FROM stdin;
view_dashboard	2026-01-23 14:54:00.534412	system	2026-01-23 14:54:00.534412	system	view	대시보드	전체 프로젝트 현황을 대시보드에서 확인	전사 프로젝트 대시보드 조회	dashboard
create_project	2026-01-23 14:54:00.550183	system	2026-01-23 14:54:00.550183	system	create	프로젝트	새로운 프로젝트 생성	프로젝트 생성	project
delete_project	2026-01-23 14:54:00.55102	system	2026-01-23 14:54:00.55102	system	delete	프로젝트	프로젝트 삭제	프로젝트 삭제	project
manage_wbs	2026-01-23 14:54:00.551733	system	2026-01-23 14:54:00.551733	system	manage	일정관리	작업 분해 구조 관리	WBS 작성 및 수정	wbs
manage_budget	2026-01-23 14:54:00.552492	system	2026-01-23 14:54:00.552492	system	manage	예산관리	프로젝트 예산 계획 및 수정	예산 편성 및 수정	budget
approve_budget	2026-01-23 14:54:00.566347	system	2026-01-23 14:54:00.566347	system	approve	예산관리	예산 계획 최종 승인	예산 최종 승인	budget
manage_risk	2026-01-23 14:54:00.567364	system	2026-01-23 14:54:00.567364	system	manage	리스크/이슈	리스크와 이슈 관리	리스크 및 이슈 등록/수정	risk
approve_deliverable	2026-01-23 14:54:00.568212	system	2026-01-23 14:54:00.568212	system	approve	산출물	프로젝트 산출물 검토 및 승인	산출물 승인/반려	deliverable
manage_backlog	2026-01-23 14:54:00.568796	system	2026-01-23 14:54:00.568796	system	manage	애자일	제품 백로그 생성 및 관리	백로그 관리	backlog
manage_sprint	2026-01-23 14:54:00.569371	system	2026-01-23 14:54:00.569371	system	manage	애자일	스프린트 계획 및 실행 관리	스프린트 관리	sprint
use_ai_assistant	2026-01-23 14:54:00.569904	system	2026-01-23 14:54:00.569904	system	use	AI 기능	AI 챗봇을 활용한 업무 지원	AI 어시스턴트 사용	ai_assistant
view_audit_log	2026-01-23 14:54:00.57044	system	2026-01-23 14:54:00.57044	system	view	보안/감사	시스템 감사 로그 확인	감사 로그 조회	audit_log
manage_users	2026-01-23 14:54:00.570895	system	2026-01-23 14:54:00.570895	system	manage	보안/감사	사용자 계정 및 권한 관리	사용자 및 권한 관리	users
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: auth; Owner: pms_user
--

COPY auth.role_permissions (id, created_at, created_by, updated_at, updated_by, granted, role, permission_id) FROM stdin;
baadddfc-ca19-40f3-91e9-c1f6b5a472d9	2026-01-23 14:54:00.641463	system	2026-01-23 14:54:00.641463	system	t	SPONSOR	view_dashboard
a7d90876-8d5d-45d2-a266-483d62ca3e3d	2026-01-23 14:54:00.64685	system	2026-01-23 14:54:00.64685	system	t	SPONSOR	manage_budget
769aa8ba-10b2-4ab2-92bf-4855085dad7c	2026-01-23 14:54:00.647818	system	2026-01-23 14:54:00.647818	system	t	SPONSOR	approve_budget
fbfad009-1b37-4cc0-89eb-faccdb30e4e5	2026-01-23 14:54:00.648745	system	2026-01-23 14:54:00.648745	system	t	SPONSOR	approve_deliverable
e26abfda-d069-42cd-85c7-06ef59fa3d83	2026-01-23 14:54:00.649552	system	2026-01-23 14:54:00.649552	system	t	SPONSOR	use_ai_assistant
e183a065-7a40-4706-8086-188256e0e0f5	2026-01-23 14:54:00.650468	system	2026-01-23 14:54:00.650468	system	t	PMO_HEAD	view_dashboard
518ad61c-9d7e-4331-a9cb-abd34630f8b7	2026-01-23 14:54:00.650857	system	2026-01-23 14:54:00.650857	system	t	PMO_HEAD	create_project
59390763-8438-4b24-adf4-c6b98d5abc49	2026-01-23 14:54:00.656252	system	2026-01-23 14:54:00.656252	system	t	PMO_HEAD	delete_project
b8e3f170-3dfc-4d4a-827c-9674250588c7	2026-01-23 14:54:00.656939	system	2026-01-23 14:54:00.656939	system	t	PMO_HEAD	manage_wbs
6bcedd54-fbed-4f35-9ade-355921ea60ac	2026-01-23 14:54:00.657514	system	2026-01-23 14:54:00.657514	system	t	PMO_HEAD	manage_budget
a07f3790-4c13-47f6-9868-7d0bc594a6bd	2026-01-23 14:54:00.657639	system	2026-01-23 14:54:00.657639	system	t	PMO_HEAD	manage_risk
61432201-753a-4e6f-b2ad-e8a2e48096d1	2026-01-23 14:54:00.658201	system	2026-01-23 14:54:00.658201	system	t	PMO_HEAD	approve_deliverable
66e03f83-afa9-48db-9912-4d04385ffb72	2026-01-23 14:54:00.658342	system	2026-01-23 14:54:00.658342	system	t	PMO_HEAD	use_ai_assistant
66102ee4-107d-48fe-8ca8-1e99e96ff3f0	2026-01-23 14:54:00.658491	system	2026-01-23 14:54:00.658491	system	t	PMO_HEAD	view_audit_log
647230c4-d219-4fa1-837c-a7a17267460c	2026-01-23 14:54:00.659176	system	2026-01-23 14:54:00.659176	system	t	PM	view_dashboard
ce5c930b-2b3e-48e0-9db8-e65e74813ab6	2026-01-23 14:54:00.659323	system	2026-01-23 14:54:00.659323	system	t	PM	create_project
d9dc743c-313d-4a12-b920-cbf7e6aa1542	2026-01-23 14:54:00.659482	system	2026-01-23 14:54:00.659482	system	t	PM	manage_wbs
d3c9e379-b3f5-469c-8c3c-a81f75602944	2026-01-23 14:54:00.659651	system	2026-01-23 14:54:00.659651	system	t	PM	manage_risk
a900cff5-c6c2-4212-9981-fafcb87bc117	2026-01-23 14:54:00.659842	system	2026-01-23 14:54:00.659842	system	t	PM	approve_deliverable
1f8d43ef-2c2b-4249-9e3c-ac99e614a49f	2026-01-23 14:54:00.659998	system	2026-01-23 14:54:00.659998	system	t	PM	manage_backlog
4eab1149-d997-473a-a02d-3b5a36115b55	2026-01-23 14:54:00.660522	system	2026-01-23 14:54:00.660522	system	t	PM	manage_sprint
35696cf3-48ed-47a6-b5d4-6547017d62b9	2026-01-23 14:54:00.661037	system	2026-01-23 14:54:00.661037	system	t	PM	use_ai_assistant
384ffde8-d021-4e26-b029-de3c2d15c7ad	2026-01-23 14:54:00.66127	system	2026-01-23 14:54:00.66127	system	t	DEVELOPER	manage_risk
bd71588e-6dc7-471b-9f33-ca2f37f8c3fc	2026-01-23 14:54:00.661406	system	2026-01-23 14:54:00.661406	system	t	DEVELOPER	manage_backlog
28751154-fafa-4183-a72e-0880bfd5ad64	2026-01-23 14:54:00.661673	system	2026-01-23 14:54:00.661673	system	t	DEVELOPER	manage_sprint
67861f6a-fe5a-4156-b618-2ee8df72e25a	2026-01-23 14:54:00.6618	system	2026-01-23 14:54:00.6618	system	t	DEVELOPER	use_ai_assistant
c250173b-4176-41e2-85ea-e54d2b6cce5c	2026-01-23 14:54:00.661983	system	2026-01-23 14:54:00.661983	system	t	QA	manage_risk
0b39b8bf-a8bf-47eb-86b2-06896c5073a4	2026-01-23 14:54:00.662117	system	2026-01-23 14:54:00.662117	system	t	QA	manage_backlog
6c299471-0c7c-4ede-87cc-53c67c0af893	2026-01-23 14:54:00.66242	system	2026-01-23 14:54:00.66242	system	t	QA	manage_sprint
0a3b8742-fde0-4d7f-b4aa-f80d06ad7030	2026-01-23 14:54:00.662556	system	2026-01-23 14:54:00.662556	system	t	QA	use_ai_assistant
7ce2bf68-8c92-449f-9760-7fe8a2e528bd	2026-01-23 14:54:00.662701	system	2026-01-23 14:54:00.662701	system	t	BUSINESS_ANALYST	manage_backlog
99b63a19-aaa4-491b-a08c-2aab7d7b0040	2026-01-23 14:54:00.662893	system	2026-01-23 14:54:00.662893	system	t	BUSINESS_ANALYST	use_ai_assistant
dc4e81e8-e870-4054-a04c-7be890f90bc9	2026-01-23 14:54:00.663254	system	2026-01-23 14:54:00.663254	system	t	AUDITOR	view_dashboard
e9627e5a-ed5d-49da-afe1-a51b1602ffb1	2026-01-23 14:54:00.663396	system	2026-01-23 14:54:00.663396	system	t	AUDITOR	view_audit_log
0fba88a8-18ef-4c19-b07c-d31d808c9a91	2026-01-23 14:54:00.663522	system	2026-01-23 14:54:00.663522	system	t	ADMIN	create_project
196df3d3-0cf5-4ba9-bba0-e31dc66edaeb	2026-01-23 14:54:00.663651	system	2026-01-23 14:54:00.663651	system	t	ADMIN	delete_project
374e4282-98ee-4abd-932b-fb84e3941d1a	2026-01-23 14:54:00.663802	system	2026-01-23 14:54:00.663802	system	t	ADMIN	view_audit_log
1ce61132-4d47-44fd-b8cd-da98f77492d3	2026-01-23 14:54:00.664253	system	2026-01-23 14:54:00.664253	system	t	ADMIN	manage_users
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: pms_user
--

COPY auth.users (id, created_at, created_by, updated_at, updated_by, active, department, email, last_login_at, name, password, role) FROM stdin;
user-pmo-001	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	PMO	pmo.head@insuretech.com	\N	James Wilson	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	PMO_HEAD
user-pm-001	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Project Management	pm.kim@insuretech.com	\N	Kim Minsu	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	PM
user-pm-002	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Project Management	pm.lee@insuretech.com	\N	Lee Jihye	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	PM
user-dev-001	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Development	dev.park@insuretech.com	\N	Park Sungho	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	DEVELOPER
user-dev-002	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Development	dev.choi@insuretech.com	\N	Choi Eunji	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	DEVELOPER
user-dev-003	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Development	dev.jung@insuretech.com	\N	Jung Wonjae	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	DEVELOPER
user-qa-001	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Quality Assurance	qa.han@insuretech.com	\N	Han Soojin	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	QA
user-ba-001	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Business Analysis	ba.yoon@insuretech.com	\N	Yoon Hyemi	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	BUSINESS_ANALYST
user-sponsor-001	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	Executive	sponsor.kang@insuretech.com	\N	Kang Daehyun	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	SPONSOR
U001	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	경영진	sponsor@insure.com	\N	이사장	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	SPONSOR
U005	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	품질보증팀	qa@insure.com	\N	최지훈	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	QA
U006	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	보험심사팀	ba@insure.com	\N	이영희	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	BUSINESS_ANALYST
U007	2026-01-23 14:54:00.161532	\N	2026-01-23 14:54:00.161532	\N	t	외부감리법인	auditor@insure.com	\N	감리인	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	AUDITOR
user-admin-001	2026-01-23 14:54:00.161532	\N	2026-01-24 09:49:38.362153	admin@insuretech.com	t	IT	admin@insuretech.com	2026-01-24 09:49:38.347226	System Admin	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	ADMIN
U004	2026-01-23 14:54:00.161532	\N	2026-01-24 19:01:19.748835	dev@insure.com	t	AI개발팀	dev@insure.com	2026-01-24 19:01:19.734224	박민수	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	DEVELOPER
U002	2026-01-23 14:54:00.161532	\N	2026-01-26 07:27:07.359447	pmo@insure.com	t	PMO	pmo@insure.com	2026-01-26 07:27:07.303144	PMO 총괄	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	PMO_HEAD
U003	2026-01-23 14:54:00.161532	\N	2026-01-26 07:37:02.625952	pm@insure.com	t	IT혁신팀	pm@insure.com	2026-01-26 07:37:02.61225	김철수	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	PM
U008	2026-01-23 14:54:00.161532	\N	2026-01-26 09:19:35.958583	admin@insure.com	t	IT운영팀	admin@insure.com	2026-01-26 09:19:35.946122	시스템관리자	$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy	ADMIN
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: chat; Owner: pms_user
--

COPY chat.chat_messages (id, created_at, created_by, updated_at, updated_by, content, role, session_id) FROM stdin;
3e4467a0-72ff-49e7-9e39-1f3eeadc28b4	2026-01-23 18:53:09.843404	pm@insure.com	2026-01-23 18:53:09.843404	pm@insure.com	스크럼이 뭐야	USER	07475858-47c7-4ced-b96a-cdf646b4aa2e
b05d627e-0401-4521-a244-023e76a7f79d	2026-01-23 18:53:09.938354	pm@insure.com	2026-01-23 18:53:09.938354	pm@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	07475858-47c7-4ced-b96a-cdf646b4aa2e
51765137-fe00-43f1-8fc0-32370e05c74d	2026-01-23 20:49:01.862443	pm@insure.com	2026-01-23 20:49:01.862443	pm@insure.com	스크럼에 대해 얘기 해줘	USER	594b80dc-a39c-4a5d-8547-fc614e678436
29b2dc5c-a8de-4884-8987-f39e4929ab09	2026-01-23 20:49:02.200388	pm@insure.com	2026-01-23 20:49:02.200388	pm@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	594b80dc-a39c-4a5d-8547-fc614e678436
b4b3bbed-cd64-4d39-919b-622446e5b07e	2026-01-23 20:52:10.71321	pm@insure.com	2026-01-23 20:52:10.71321	pm@insure.com	스크럼이 뭐야	USER	ebcc4516-5826-4dbf-98b8-5c5c6e865f8f
09e62bca-683a-4974-bdb6-282e63a282e6	2026-01-23 20:52:11.015799	pm@insure.com	2026-01-23 20:52:11.015799	pm@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	ebcc4516-5826-4dbf-98b8-5c5c6e865f8f
de7e93f6-475c-407b-9a11-f0b96bed5d33	2026-01-23 20:52:22.930539	pm@insure.com	2026-01-23 20:52:22.930539	pm@insure.com	스크럼이 뭐야	USER	ebcc4516-5826-4dbf-98b8-5c5c6e865f8f
9b4f3506-4880-4e54-b990-79190b70dc15	2026-01-23 20:52:26.943417	pm@insure.com	2026-01-23 20:52:26.943417	pm@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	ebcc4516-5826-4dbf-98b8-5c5c6e865f8f
e678b999-57c0-47fb-80b9-57071f45c73f	2026-01-24 08:33:39.192248	pm@insure.com	2026-01-24 08:33:39.192248	pm@insure.com	스크럼이란	USER	bd756d08-1212-4e59-84af-1e1b4c139a32
25e3a8d6-6d13-40a7-a9fd-13963ce9604f	2026-01-24 08:33:42.093072	pm@insure.com	2026-01-24 08:33:42.093072	pm@insure.com	죄송합니다. 해당 질문은 제가 가진 프로젝트 관리 지식 범위를 벗어납니다. 프로젝트 일정, 진척, 예산, 리스크, 이슈, 또는 애자일 방법론에 대해 질문해주세요.	ASSISTANT	bd756d08-1212-4e59-84af-1e1b4c139a32
8e6b6a05-bb04-4b2d-9b8d-53299c47fff0	2026-01-24 08:40:50.824751	pmo@insure.com	2026-01-24 08:40:50.824751	pmo@insure.com	스크럼이란	USER	32f4f282-9100-4bf6-b409-d38c468a4c9e
0bde5a24-4714-45c1-b49f-a1528876528c	2026-01-24 08:40:51.059139	pmo@insure.com	2026-01-24 08:40:51.059139	pmo@insure.com	죄송합니다. 해당 질문은 제가 가진 프로젝트 관리 지식 범위를 벗어납니다. 프로젝트 일정, 진척, 예산, 리스크, 이슈, 또는 애자일 방법론에 대해 질문해주세요.	ASSISTANT	32f4f282-9100-4bf6-b409-d38c468a4c9e
0241ce9a-ab0f-499a-8534-9e6a9e2dc65c	2026-01-24 08:42:03.86229	pmo@insure.com	2026-01-24 08:42:03.86229	pmo@insure.com	스크럼이란	USER	f7a05e5c-40ab-4172-b88e-71a9b351565c
ef3018bd-6785-4f4f-8111-88fa4e8ac19e	2026-01-24 08:42:04.089148	pmo@insure.com	2026-01-24 08:42:04.089148	pmo@insure.com	죄송합니다. 해당 질문은 제가 가진 프로젝트 관리 지식 범위를 벗어납니다. 프로젝트 일정, 진척, 예산, 리스크, 이슈, 또는 애자일 방법론에 대해 질문해주세요.	ASSISTANT	f7a05e5c-40ab-4172-b88e-71a9b351565c
7978c072-d44a-44ad-833e-5c6133ffbb89	2026-01-24 09:16:33.308053	pmo@insure.com	2026-01-24 09:16:33.308053	pmo@insure.com	스크럼이란	USER	c09919ce-865e-470f-af51-9cc1e68ccf51
60e42bed-069e-4f8d-ba4c-2c39b8afd5c9	2026-01-24 09:16:35.558615	pmo@insure.com	2026-01-24 09:16:35.558615	pmo@insure.com	죄송합니다. 해당 질문은 제가 가진 프로젝트 관리 지식 범위를 벗어납니다. 프로젝트 일정, 진척, 예산, 리스크, 이슈, 또는 애자일 방법론에 대해 질문해주세요.	ASSISTANT	c09919ce-865e-470f-af51-9cc1e68ccf51
74dc55cf-bf98-4c3f-bcc8-b92cfa433ff5	2026-01-24 09:18:36.660125	admin@insuretech.com	2026-01-24 09:18:36.660125	admin@insuretech.com	스크럼이란 무엇인가요?	USER	0f2cd44e-e6b1-49dc-acf2-29bd4942d607
8ee70f4f-ef20-4700-a4b2-a69c78ef7e71	2026-01-24 09:18:59.85122	pmo@insure.com	2026-01-24 09:18:59.85122	pmo@insure.com	스크럼이란	USER	10230fd0-37a5-43f9-b9d7-45e02a815594
6f8f97a3-c651-4f61-84d6-a894e2a019a4	2026-01-24 09:19:04.113079	pmo@insure.com	2026-01-24 09:19:04.113079	pmo@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	10230fd0-37a5-43f9-b9d7-45e02a815594
4a9eeaff-1e03-46ea-973e-21b44c73d9d0	2026-01-24 09:19:04.113078	admin@insuretech.com	2026-01-24 09:19:04.113078	admin@insuretech.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	0f2cd44e-e6b1-49dc-acf2-29bd4942d607
58f87c08-1f2a-46f8-8751-18a81228032e	2026-01-24 09:19:20.462392	pmo@insure.com	2026-01-24 09:19:20.462392	pmo@insure.com	플래닝 포커란	USER	10230fd0-37a5-43f9-b9d7-45e02a815594
fe270297-64dd-476e-904d-1cdcdc595355	2026-01-24 09:19:20.557265	pmo@insure.com	2026-01-24 09:19:20.557265	pmo@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	10230fd0-37a5-43f9-b9d7-45e02a815594
f6d48e3a-e293-41e6-a6a1-4a2746819d8d	2026-01-24 09:22:38.572768	anonymousUser	2026-01-24 09:22:38.572768	anonymousUser	스크럼이란 무엇인가요?	USER	938342e4-301e-4940-ae32-ca00f724523f
d58ebcb3-93f5-4e6f-8b44-5d52abe18ac7	2026-01-24 09:23:13.462346	anonymousUser	2026-01-24 09:23:13.462346	anonymousUser	스크럼은 소프트웨어 개발 및 기타 복잡한 프로젝트를 관리하기 위한 애자일 방법론으로, 1986년 하버드 비즈니스 리뷰에 소개된 제품개발 그룹들의 성공적인 실천법에서 유래했습니다. 핵심은 짧고 집중적인 반복 주기인 '스프린트'를 통해 고객의 피드백을 빠르게 반영하고 지속적으로 가치를 전달하는 데 있습니다.\n\n스크럼의 정의는 다음과 같습니다:\n\n*   **자기 조직화된 팀:** 스크럼 팀은 외부의 지시 없이 스스로 업무를 계획하고 실행합니다.\n*   **투명성:** 모든 프로젝트 정보는 팀 전체에게 명확하게 공개되어야 합니다.\n*   **검토 및 적응:** 스프린트 종료 후, 스프린트 리뷰(검토)와 스프린트 회고(적응)를 통해 진행 상황을 평가하고 개선점을 찾아냅니다.\n\n이러한 원칙과 함께, 스크럼은 구체적인 역할(스크럼 마스터, 제품 책임자, 개발 팀), 이벤트(스프린트 계획, 일일 스크럼, 스프린트 리뷰, 스프린트 회고), 그리고 산출물(제품 백로그, 스프린트 백로그)로 구성됩니다. 스크럼은 정해진 규칙만 따르는 것이 아니라, 팀의 특성과 상황에 맞게 유연하게 적용하는 것이 중요합니다. 회사 내에서의 스크럼 적용 실험은 초기에는 제대로 이루어지지 않았지만, 일년 동안의 적용을 통해 팀의 효율성을 크게 향상시키고 납기 지연과 품질 문제를 해결하는 데 기여했습니다.	ASSISTANT	938342e4-301e-4940-ae32-ca00f724523f
ccba0dc1-d959-4acb-8e60-f5f5ee87334b	2026-01-24 09:31:58.286351	pmo@insure.com	2026-01-24 09:31:58.286351	pmo@insure.com	스크럼이 뭐야	USER	4e7de0ff-7d57-4577-b71c-0a94d6b7b22d
3f09c9d3-2155-48dc-8221-cbd762c8d731	2026-01-24 09:34:28.344828	pmo@insure.com	2026-01-24 09:34:28.344828	pmo@insure.com	플래닝 포커란	USER	4e7de0ff-7d57-4577-b71c-0a94d6b7b22d
98ca6322-5235-45c5-820e-3a40668ee3b4	2026-01-24 19:01:34.977903	dev@insure.com	2026-01-24 19:01:34.977903	dev@insure.com	플래닝 포커란	USER	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
3b17818f-f8e7-449e-a001-4a5749c92eba	2026-01-24 09:32:24.727233	pmo@insure.com	2026-01-24 09:32:24.727233	pmo@insure.com	스크럼은 소프트웨어 개발을 포함한 다양한 프로젝트에서 널리 사용되는 **애자일 방법론 중 가장 인기 있는 프레임워크**입니다. 1986년 처음 소개된 이 방법은 럭비 팀의 자기 조직 방식에서 영감을 받아, 짧은 주기의 반복적인 개발 주기인 '스프린트'를 통해 고객의 요구에 빠르게 대응하고 지속적인 개선을 추구합니다.\n\n구체적으로, 스크럼은 다음과 같은 핵심 요소들로 구성됩니다:\n\n*   **팀:** 3~12명으로 구성된 자기 조직화된 팀을 중심으로 운영됩니다.\n*   **역할:** 스크럼 마스터, 제품 책임자(Product Owner), 개발팀(Development Team)이라는 세 가지 주요 역할을 정의합니다.\n*   **아티팩토:** 제품 백로그(Product Backlog), 스프린트 백로그(Sprint Backlog), 그리고 완료된 작업 목록인 '완료된 것 목록(Definition of Done)'을 관리합니다.\n*   **이벤트:** 스프린트 계획(Sprint Planning), 일일 스크럼(Daily Scrum), 스프린트 리뷰(Sprint Review), 스프린트 회고(Sprint Retrospective)라는 네 가지 핵심 이벤트를 주기적으로 진행하며 진행 상황을 점검하고 개선합니다.\n\n이러한 구성 요소들을 통해 스크럼은 변화에 유연하게 대응하고 고품질의 결과물을 효율적으로 제공하는 것을 목표로 합니다. 스크럼이 성공적이기 위해서는 팀원 모두가 이 원칙과 실천법을 이해하고 적용하는 것이 매우 중요합니다.	ASSISTANT	4e7de0ff-7d57-4577-b71c-0a94d6b7b22d
c434afac-4bb9-46f6-a994-36befe42d865	2026-01-24 09:35:01.75303	pmo@insure.com	2026-01-24 09:35:01.75303	pmo@insure.com	플래닝 포커는 애자일 방법론, 특히 스크럼에서 팀이 스프린트 동안 완료할 작업을 결정하고 우선순위를 정하는 데 사용하는 의사결정 도구입니다. \n\n**핵심 개념:**\n\n*   **포커 카드:** 플래닝 포커는 포커 카드처럼 숫자를 사용하여 각 작업의 '불확실성'을 나타냅니다. 숫자가 높을수록 해당 작업이 더 복잡하고 위험하다고 판단됩니다. 예를 들어, 숫자가 1의 작업은 비교적 작고 확실하며, 숫자가 5 이상의 작업은 상당한 불확실성을 내포합니다.\n*   **제한된 자원:** 보통 팀은 4~5장의 플래닝 포커 카드만을 사용합니다. 이 제한은 팀이 현실적으로 감당 가능한 작업만 선택하도록 강제하며, 과도하게 야 ambitious한 계획을 막습니다.\n*   **팀 협의:** 팀원들은 각 작업의 가치를 논의하고, 자신의 전문성과 경험을 바탕으로 적절한 숫자를 선택합니다.  이 과정에서 팀원들은 잠재적인 위험 요소를 파악하고, 필요한 경우 추가 조사나 준비를 약속할 수 있습니다.\n*   **점진적인 계획:** 플래닝 포커는 상향식(Bottom-Up) 계획 기법의 일종입니다. 즉, 개별 작업의 규모와 리스크를 먼저 평가하고, 이를 바탕으로 전체 스프린트 계획을 조정하는 방식입니다.\n\n플래닝 포커를 통해 팀은 불완전하거나 불확실한 미래를 예측하기보다는, 각 작업을 작은 단위로 나누어 현실적인 목표를 설정하고, 팀원들의 약속을 통해 계획을 구체화합니다. 이는 애자일의 핵심 원칙인 '변화에 대한 수용'과 '작동하는 소프트웨어의 우선순위'를 잘 반영하는 방법입니다.  스프린트 계획 회의에서 플래닝 포커를 사용하는 것은 팀원들이 스프린트 목표 달성을 위한 구체적인 실행 계획을 수립하고, 각자의 역할과 책임을 명확히 하는 데 매우 효과적입니다.	ASSISTANT	4e7de0ff-7d57-4577-b71c-0a94d6b7b22d
ebde39d0-4086-4d71-9e5c-a757b77ba002	2026-01-24 09:43:20.502932	anonymousUser	2026-01-24 09:43:20.502932	anonymousUser	스크럼이 뭐야?	USER	e38fcb4e-de2f-402c-88e3-f25ae0223aa2
c2cb053e-3620-4322-84a6-bdaca0b7ae64	2026-01-24 09:43:52.016347	anonymousUser	2026-01-24 09:43:52.016347	anonymousUser	스크럼은 **애자일 개발 방법론 중 가장 널리 사용되는 프레임워크** 중 하나입니다. 1986년 럭비 팀의 자기 조직화 방식에서 영감을 받아, 1993년 켄 슈와버와 제프 서더랜드 박사에 의해 체계화되었습니다. \n\n핵심은 **짧은 주기의 반복적인 개발(스프린트)**을 통해 고객의 빠른 피드백을 반영하고, 지속적인 개선을 추구하는 데 있습니다. 전통적인 폭포수 모델처럼 계획을 먼저 세우고 순차적으로 진행하는 것이 아니라, '짧고 빠른 반복'을 통해 변화에 유연하게 대응하는 것이 특징입니다. \n\n스크럼은 일반적으로 **스크럼 마스터, 제품 책(Proprietor), 개발 팀**으로 구성되며, 각 팀은 3~12명 정도로 운영됩니다. 스프린트 기간은 보통 1~4주 정도이며, 각 스프린트마다 완료된 기능을 정의하고 검증합니다. 스프린트 백로그, 제품 백로그, 그리고 실제 작업 내용을 기록하는 것은 팀의 상황과 도구에 따라 다양하게 진행될 수 있습니다. \n\n결론적으로, 스크럼은 애자일 원칙을 실제 프로젝트에 적용하는 효과적인 방법이며, 지속적인 협업과 빠른 가치 전달을 목표로 합니다.	ASSISTANT	e38fcb4e-de2f-402c-88e3-f25ae0223aa2
597caa47-2b85-471b-aad7-6df477324e70	2026-01-24 09:46:17.512425	anonymousUser	2026-01-24 09:46:17.512425	anonymousUser	스크럼이 뭐야?	USER	123c1948-21c1-44f3-af1c-6af261b11f47
d30c49f3-3ac4-4444-aebc-882ed5e0da94	2026-01-24 09:46:24.159331	anonymousUser	2026-01-24 09:46:24.159331	anonymousUser	스크럼은 애자일 개발 방법론 중 가장 널리 사용되는 프레임워크로, 짧은 반복 주기(스프린트)를 통해 고객 피드백을 지속적으로 반영하며 빠르게 제품을 개선하는 방식입니다.	ASSISTANT	123c1948-21c1-44f3-af1c-6af261b11f47
628521a3-9574-4260-8b67-838e73326b87	2026-01-24 09:46:36.165508	anonymousUser	2026-01-24 09:46:36.165508	anonymousUser	스크럼이 뭐야?	USER	4d213d74-35c5-4bb0-90b4-45133a71f2c9
c75da89c-6b6a-4422-bd20-1a5984062be3	2026-01-24 09:46:41.541855	anonymousUser	2026-01-24 09:46:41.541855	anonymousUser	스크럼은 1986년 처음 소개된 애자일 방법론으로, 고객의 지속적 참여와 빠른 반복(Iteration)을 통해 제품을 개발하는 방식입니다. 고객의 피드백을 반영하며 빠르게 개선을 반복하며 유연하게 변화에 대응하는 것을 특징으로 합니다.	ASSISTANT	4d213d74-35c5-4bb0-90b4-45133a71f2c9
d4086f5b-5d7b-42fc-a5ef-dd273575828b	2026-01-24 09:46:49.009052	anonymousUser	2026-01-24 09:46:49.009052	anonymousUser	스크럼이 뭐야?	USER	61224ce1-f507-4bc4-95ba-675992013e13
1c06b583-4bc9-440f-86bb-33e67969c070	2026-01-24 09:46:55.406747	anonymousUser	2026-01-24 09:46:55.406747	anonymousUser	스크럼은 1986년 처음 소개된 애자일 방법론 중 가장 널리 사용되는 프레임워크로, 고객의 지속적인 참여를 허용하며 빠르게 반복적인 개발을 통해 가치를 빠르게 제공하는 방식이다.	ASSISTANT	61224ce1-f507-4bc4-95ba-675992013e13
d1e6a233-3049-49b4-9540-0600168fc14f	2026-01-24 09:48:58.391553	anonymousUser	2026-01-24 09:48:58.391553	anonymousUser	스크럼이 뭐야?	USER	d61cb225-0cb2-4e94-8d1f-c5d7f0a2b2a4
034aa8d1-8bd7-493e-a7b6-c80a254005c6	2026-01-24 09:49:13.422799	anonymousUser	2026-01-24 09:49:13.422799	anonymousUser	스크럼은 빠른 반복과 고객 참여를 중시하는 애자일 방법론으로, 1986년 하버드 비즈니스 리뷰에 소개된 제품개발 그룹들의 성공적인 실천 사례에서 유래되었습니다. 팀은 짧은 주기인 스프린트를 통해 지속적으로 목표를 검토하고 수정하며, 고객의 피드백을 적극 반영해 제품을 빠르게 개선해 나갑니다. 핵심 특징으로는 자기 조직화된 팀, 정기적인 회의(데일리 스탠드업, 스프린트 리뷰 등), 그리고 유연한 변화 대응이 있으며, 이를 통해 효율적이고 고객 중심의 소프트웨어 개발이 가능해집니다.	ASSISTANT	d61cb225-0cb2-4e94-8d1f-c5d7f0a2b2a4
202174b6-5dc2-40db-96bf-347ad94aba9b	2026-01-24 09:49:38.377495	anonymousUser	2026-01-24 09:49:38.377495	anonymousUser	스크럼이 뭐야?	USER	19f9713c-4097-4e74-b320-4eb17963c800
a36ec2d6-509d-4aec-970f-7e48748ddc42	2026-01-24 19:40:43.259996	dev@insure.com	2026-01-24 19:40:43.259996	dev@insure.com	스크럼이란	USER	275699fe-5b3a-4e8a-83e6-3be907ab38b0
f66a2dea-19ce-41f5-82f0-e86a381cf13e	2026-01-24 09:49:51.002671	anonymousUser	2026-01-24 09:49:51.002671	anonymousUser	스크럼은 소프트웨어 개발 및 기타 복잡한 프로젝트를 관리하는 애자일 프레임워크로, 자기 조직화된 소규모 팀이 짧은 주기의 반복적인 작업을 통해 지속적으로 가치 있는 제품을 제공하는 데 중점을 둡니다. 핵심 특징은 정기적인 스프린트(보통 2~4주)를 통해 목표를 설정하고, 매일 스탠드업 미팅을 통해 진행 상황을 점검하며, 고객의 지속적인 참여와 피드백을 반영하는 유연한 접근 방식입니다. 또한, 제품 백로그를 우선순위화하고, 스크럼 마스터, 제품주도자, 개발팀 등 명확한 역할을 통해 협업을 촉진하며, 변화에 빠르게 대응할 수 있는 구조를 제공합니다.	ASSISTANT	19f9713c-4097-4e74-b320-4eb17963c800
87f2a455-d319-4dab-a583-cd6e72c1dd66	2026-01-24 09:50:31.535979	pmo@insure.com	2026-01-24 09:50:31.535979	pmo@insure.com	플래닝 포커란	USER	4e7de0ff-7d57-4577-b71c-0a94d6b7b22d
d5b8db97-9bfa-4334-9676-4e2c20773d6d	2026-01-24 09:51:00.095061	pmo@insure.com	2026-01-24 09:51:00.095061	pmo@insure.com	플래닝 포커는 애자일 프로젝트, 특히 스크럼에서 사용하는 **불확실성을 인정하고 상향식으로 계획하는 의사결정 도구**입니다. \n\n*   **핵심:** 팀원들이 각 작업의 가치와 난이도를 추정하기 위해 포커 카드처럼 숫자를 사용하여, 실제 수행 가능한 범위 내에서 현실적인 목표를 설정하는 데 초점을 맞춥니다.\n*   **특징:** 제한된 카드 수(보통 4-5장)로 팀의 역량을 고려하여 '할 수 있는' 작업량을 결정하며, 이를 통해 팀원들의 자발적인 합의를 이끌어냅니다.\n*   **목적:** 상위 수준의 가치를 우선시하고, 완벽한 계획보다 유연하고 지속적인 계획을 가능하게 하여, 변화에 대한 수용성을 높이고 실제 진행 상황을 효과적으로 추적하고 관리할 수 있도록 돕습니다. \n*   **활용:** 스프린트 계획 회의에서 팀이 스프린트 목표 달성을 위한 구체적인 작업 계획을 수립하고, 각자 역할을 분담하는 데 필수적인 도구입니다. 완벽한 계획을 기대하기보다, 지속적인 개선을 통해 계획을 조정해나가는 데 중점을 둡니다.	ASSISTANT	4e7de0ff-7d57-4577-b71c-0a94d6b7b22d
535e111c-ccd1-445c-b26c-aeb64f101e89	2026-01-24 09:52:21.340182	pmo@insure.com	2026-01-24 09:52:21.340182	pmo@insure.com	스크럼이란	USER	3e439c5c-994e-4a82-85c1-28cc0e7c5a59
e5b79e7f-d02c-4dba-97f3-ea4d8a8300df	2026-01-24 09:52:35.023735	pmo@insure.com	2026-01-24 09:52:35.023735	pmo@insure.com	스크럼은 빠른 반복과 고객 참여를 중시하는 애자일 방법론으로, 짧은 주기의 스프린트를 통해 제품을 점진적으로 개발하는 프레임워크이다. 팀원들은 자기 조직화하며 협업하고, 매일 스탠드업 미팅과 스프린트 리뷰를 통해 투명성과 적응력을 높인다. 전통적인 방법보다 유연하며, 변화에 민첩하게 대응하면서 품질과 생산성을 동시에 개선한다. 약 40명 규모의 팀에서 1년간 실험적으로 적용된 후, 다양한 환경에 맞게 확장되어 널리 채택되었다.	ASSISTANT	3e439c5c-994e-4a82-85c1-28cc0e7c5a59
909d8e15-3b75-4896-9234-ec7303aea54e	2026-01-24 17:58:40.551202	dev@insure.com	2026-01-24 17:58:40.551202	dev@insure.com	안녕	USER	0b5552af-6884-485c-81d3-a8833bfdb626
75a009b3-d5f3-481f-8a0a-b711ecc1b1c0	2026-01-24 17:58:42.984689	dev@insure.com	2026-01-24 17:58:42.984689	dev@insure.com	안녕하세요! 저는 프로젝트 관리(PMS) 전문 AI 어시스턴트입니다. 프로젝트 일정, 리스크, 이슈, 애자일 방법론 등에 대해 물어보세요!	ASSISTANT	0b5552af-6884-485c-81d3-a8833bfdb626
fb826e03-2d70-4d99-a450-6e03d9055136	2026-01-24 17:58:50.092407	dev@insure.com	2026-01-24 17:58:50.092407	dev@insure.com	스크럼이 뭐야	USER	0b5552af-6884-485c-81d3-a8833bfdb626
68c87f94-a565-4264-9419-5642a10c275e	2026-01-24 17:59:02.15917	dev@insure.com	2026-01-24 17:59:02.15917	dev@insure.com	스크럼은 고객의 지속적인 참여와 빠른 반복을 중시하는 애자일 개발 방법론으로, 짧은 주기의 스프린트를 통해 프로젝트를 관리합니다. 팀원들이 자율적으로 협업하며 유연하게 변화에 대응할 수 있도록 설계되었습니다. 제품 소유자, 스크럼 마스터, 개발팀으로 구성된 역할을 통해 명확한 책임과 진행 상황 관리가 가능합니다. 핵심 실천법으로는 스프린트 계획, 일일 스크럼, 스프린트 리뷰, 회고가 있으며, 이를 통해 지속적인 개선과 고객 피드백 반영이 이루어집니다.	ASSISTANT	0b5552af-6884-485c-81d3-a8833bfdb626
882ed7a5-969e-4a17-b8e0-642f8c831001	2026-01-24 18:00:48.407389	dev@insure.com	2026-01-24 18:00:48.407389	dev@insure.com	플래닝 포커란	USER	0b5552af-6884-485c-81d3-a8833bfdb626
d2f3066a-ca32-4b50-8011-ab7154aca1e3	2026-01-24 18:01:06.939371	dev@insure.com	2026-01-24 18:01:06.939371	dev@insure.com	플래닝 포커는 팀원들이 불확실한 미래에도 유연하게 대처할 수 있도록 핵심 작업에 집중하며 계획을 세우는 애자일 기법입니다. 주요 특징은 핵심 작업을 최소한의 확실성으로 선정하고, 나머지는 팀의 자율성과 협업을 통해 결정하는 점입니다. 마이크 콤의 플래닝 포커 사이트 같은 도구를 활용하면 목표 달성에 집중하면서도 변화에 유연하게 대응할 수 있습니다. 이 기법은 계획대로 진행되는 것이 아니라, 헌신적인 실행을 통해 목표를 향해 나아가는 것을 강조합니다.	ASSISTANT	0b5552af-6884-485c-81d3-a8833bfdb626
10a82f7b-7b0e-4354-a035-3fa395dcb89e	2026-01-24 18:16:33.523476	pm@insure.com	2026-01-24 18:16:33.523476	pm@insure.com	스크럼이란	USER	1488fd28-c0fa-41ee-8eb3-e9446fd27037
f51cd177-53b3-4202-a8b9-8dad81737324	2026-01-24 18:16:44.359273	pm@insure.com	2026-01-24 18:16:44.359273	pm@insure.com	스크럼은 애자일 개발 방법론의 대표적 프레임워크로, 짧은 주기의 반복적이고 협업적인 프로세스를 통해 제품을 점진적으로 개발하는 방식이다. 핵심 특징으로는 자기 조직화된 소규모 팀의 운영, 정기적인 스프린트(보통 2~4주)를 통한 목표 설정 및 검토, 그리고 고객의 지속적 참여를 통한 피드백 반영이 있다. 스크럼은 변화에 유연하게 대응하고 품질을 높이며 납기 지연을 줄이는 데 효과적이며, 실제 프로젝트 경험을 통해 얻은 통찰력을 바탕으로 실질적이고 실행 가능한 프로세스로 정립되었다.	ASSISTANT	1488fd28-c0fa-41ee-8eb3-e9446fd27037
51d46d80-76f4-4fa3-8d98-be193ec057d5	2026-01-24 18:29:50.104059	dev@insure.com	2026-01-24 18:29:50.104059	dev@insure.com	스크럼이 뭐야	USER	3004e57a-7d42-4261-8980-7fd0e718a393
681aee87-6dfe-4213-bac5-624589373ee2	2026-01-24 18:30:06.345234	dev@insure.com	2026-01-24 18:30:06.345234	dev@insure.com	스크럼은 애자일 방법론의 핵심인 프레임워크로, 팀이 자율적으로 문제를 해결하고 목표를 달성하도록 지원하는 구조를 제공합니다. 스크럼은 1986년 럭비 팀의 조직화 방식에서 비롯되어 개발 팀에 도입되었으며, 1993년에 켄 슈와버와 제프 서더랜드가 체계화시켰습니다. 스크럼은 팀이 스스로를 관리하고, 지속적인 반복과 개선을 통해 목표를 달성하는 방식으로, 개발 팀의 구조와 문화에 따라 유연하게 적용할 수 있습니다. 스크럼은 단순한 프레임워크가 아니라, 팀의 상황과 특성에 맞게 빈칸을 채우는 유연한 접근법입니다.	ASSISTANT	3004e57a-7d42-4261-8980-7fd0e718a393
2cef5a51-0b03-4b6f-955e-bf2e1e332642	2026-01-24 18:32:48.839347	dev@insure.com	2026-01-24 18:32:48.839347	dev@insure.com	스크럼이 뭐야	USER	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
e1484ab5-265d-42ca-8c5b-0b04f96b9d25	2026-01-24 18:33:01.810381	dev@insure.com	2026-01-24 18:33:01.810381	dev@insure.com	스크럼은 복잡한 프로젝트를 짧고 집중된 반복 주기인 '스프린트'로 나누어 관리하는 애자일 방법론이다. 팀은 자율적으로 구성되어 고객의 피드백을 적극 반영하며 빠르게 계획, 실행, 검토, 개선을 반복한다. 핵심 특징으로는 자기 조직화된 팀, 정기적인 회의(일일 스크럼, 스프린트 리뷰, 회고), 그리고 유연한 요구사항 관리가 있다. 이러한 방식은 변화에 빠르게 대응하고 고객 만족도를 높이는 데 효과적이다.	ASSISTANT	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
f6cbf88a-0e66-41cf-b55a-d03532488689	2026-01-24 18:38:15.673724	dev@insure.com	2026-01-24 18:38:15.673724	dev@insure.com	프로젝트 위험 관리를 어떻게 해야돼	USER	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
b269b26e-1820-4ed5-9954-cce00b0500d6	2026-01-24 18:38:35.607209	dev@insure.com	2026-01-24 18:38:35.607209	dev@insure.com	프로젝트 위험 관리는 식별된 위험의 원인과 영향을 고려해 통제 가능한 위험에 대해 대응 계획을 수립하는 것이 핵심입니다. 먼저, 관련 문서(제안서, 계약서 등)를 꼼꼼히 검토해 사전에 위험 요소를 파악하고, 계약서에 위험비용을 포함하거나 국제보험 가입 등의 비상계획을 마련해야 합니다. 모든 위험을 막기 어렵다는 점을 인지하고, 비용 대비 효율적인 방법으로 상위 5~10개 위험만 집중 관리하며, 불확실성에 대비해 인내심을 갖고 단계적으로 대응하세요.	ASSISTANT	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
7e42b195-4d1c-4feb-af2c-7ebdd3f239d4	2026-01-24 18:39:51.1686	dev@insure.com	2026-01-24 18:39:51.1686	dev@insure.com	WBS란	USER	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
653c7705-1cb1-47d3-8bdb-8d1cb0f2dbd7	2026-01-24 18:40:05.448473	dev@insure.com	2026-01-24 18:40:05.448473	dev@insure.com	WBS(Work Breakdown Structure)는 프로젝트 팀이 수행해야 할 모든 작업을 계층적으로 체계적으로 정리한 표이다. 이는 요구사항, 범위, 업무를 구분하여 명확한 작업 범위를 설정하고, 각 작업의 책임과 역할을 분명히 하여 추정의 정확성을 높인다. 또한, 업무의 모호성과 중복을 제거함으로써 원가, 일정, 자원 등의 관리를 용이하게 한다. WBS는 전체 프로젝트를 작은 단위로 세분화해 관리함으로써 효과적인 계획 수립과 진행 상황 모니터링을 가능하게 한다.	ASSISTANT	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
ca005f9b-8c64-4e3c-84d3-a8e5273ea93e	2026-01-24 18:40:53.218992	dev@insure.com	2026-01-24 18:40:53.218992	dev@insure.com	WBS작성법을 자세하게 설명해줘	USER	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
ae36a97d-f642-49a4-9652-56eed9d0d300	2026-01-24 18:41:09.432922	dev@insure.com	2026-01-24 18:41:09.432922	dev@insure.com	WBS 작성법은 팀원들이 함께 참여해 하향식(Top-Down) 방식으로 진행하는 것이 가장 효과적입니다. 먼저 프로젝트 목표와 고객의 요구사항을 명확히 정의하고, 주요 결과물과 수행해야 할 작업을 세분화해 각 레벨을 구축합니다. 이를 통해 누락된 작업을 방지하고, 팀원들의 책임감을 높이며, 추정의 정확성과 작업 성과 모니터링을 용이하게 합니다. 프로젝트 계획서에 WBS를 포함해 명확한 작업 범위와 일정, 자원 배정을 정리한 후, 최종적으로 보고서를 작성할 때 개략적인 목차와 예상 작업량을 설정해 체계적인 관리를 지원합니다.	ASSISTANT	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
061efaac-3494-40a9-bb7b-90b67195e171	2026-01-24 18:45:06.057078	dev@insure.com	2026-01-24 18:45:06.057078	dev@insure.com	WBS 작성법을 자세하게 설명해줘	USER	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
80bc387c-3c4b-441c-ab62-c49499397020	2026-01-24 18:45:10.950722	dev@insure.com	2026-01-24 18:45:10.950722	dev@insure.com	WBS 작성법은 다음과 같은 단계로 구성됩니다:\n\n1. **프로젝트 정의 및 목표 설정**: 프로젝트의 전반적인 목표와 범위를 명확히 정의하고, 고객의 요구사항을 분석하여 WBS의 기초를 마련합니다.\n\n2. **요구사항 분석**: 고객의 요구사항을 상세히 분석하여 필요한 모든 작업을 식별하고, 각 작업의 중요도와 우선순위를 파악합니다.\n\n3. **WBS 레벨 구조화**: 일반적으로 세 가지 레벨(Level 1, Level 2, Level 3)로 구조화하며, Level 1은 프로젝트 전체를 대표하고, Level 2는 주요 결과물을 구분하고, Level 3은 각 결과물의 구체적인 작업을 명시합니다.\n\n4. **작업 분할**: 각 레벨에서 세부 작업을 도출하며, 작업을 명확하고 구체적으로 정의하여 중복과 모호함을 제거합니다.\n\n5. **책임과 역할 정의**: 각 작업에 대해 담당자를 지정하여 책임 소재를 명확히 합니다.\n\n6. **추정 및 자원 배분**: 각 작업에 대한 시간, 비용, 자원을 예측하여 WBS에 반영하고, 자원 배분 계획을 수립합니다.\n\n7. **검토 및 승인**: 팀원들과 함께 WBS 문서를 검토하고, 최종적으로 승인 절차를 거칩니다.\n\n8. **문서화 및 보고**: WBS를 문서로 정리하고, 프로젝트 일정, 자원, 작업량 등의 개요 목차를 보고서서에 포함시킵니다.\n\n위의 단계를 따라 작업을 진행하면 WBS를 효과적으로 작성할 수 있습니다.	ASSISTANT	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
d4341875-9b78-4603-89de-a8d99c855580	2026-01-24 18:45:51.293438	dev@insure.com	2026-01-24 18:45:51.293438	dev@insure.com	플래닝 포커란	USER	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
c4daf39d-43f3-48cf-a3a3-bedd1673f509	2026-01-24 18:46:12.887974	dev@insure.com	2026-01-24 18:46:12.887974	dev@insure.com	플래닝 포커(Planning Poker)는 팀원들이 협력하여 프로젝트의 작업 범위와 우선순위를 결정하는 데 사용하는 상향식(Top-Down) 의사결정 기법입니다. 이 방법은 각 팀원이 작업의 복잡도, 시간, 위험 등을 추정하기 위해 동시에 카드를 사용하며, 합의를 도출해 현실적인 '할 수 있는 일정'을 수립하는 데 목적이 있습니다. 특히 불확실성이 높은 프로젝트에서 팀의 집단 지혜를 활용해 정확한 추정을 돕고, 팀원의 적극적인 참여와 의지를 강화하는 데 효과적입니다. 또한, 상향식 접근법을 통해 작업의 규모와 자원 역량을 종합적으로 고려한 유연한 일정 수립이 가능합니다.	ASSISTANT	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
74ec4298-beeb-47c9-aa28-a740f10776c9	2026-01-24 18:46:36.3559	dev@insure.com	2026-01-24 18:46:36.3559	dev@insure.com	플래닝 포커란	USER	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
28a4c232-f11c-47e7-a1a1-d99afec77881	2026-01-24 18:46:57.216802	dev@insure.com	2026-01-24 18:46:57.216802	dev@insure.com	플래닝 포커는 팀원들이 협력하여 작업의 복잡도, 시간, 비용 등을 추정하고, 합의를 통해 현실적인 일정을 결정하는 상향식(Bottom-up) 추정 기법입니다. 이 방법은 불확실한 미래 상황에 대비하기보다는 팀의 집단 지혜를 활용해 ‘할 수 있는 일정’을 수립하는 데 중점을 둡니다. 각 팀원이 카드를 사용해 자신의 추정을 독립적으로 제시한 후, 팀 전체가 합의를 통해 최종 추정치를 도출함으로써 투명성과 책임감을 높일 수 있습니다. 플래닝 포커는 프로젝트의 변동성과 불확실성을 인정하고, 유연하게 대응할 수 있는 기반을 마련해줍니다. 예를 들어, 오토캠핑장에서 저녁 식사를 준비할 때, 각 조리 작업의 소요 시간과 인력, 자원 등을 고려해 최종적으로 가능한 일정을 결정하는 데 매우 효과적입니다.	ASSISTANT	2d48a4b9-29a8-4f7b-91ce-fdcbf2522801
dd2c9bf6-efb4-423f-b0f6-f39c233a6b70	2026-01-24 19:01:53.677541	dev@insure.com	2026-01-24 19:01:53.677541	dev@insure.com	플래닝 포커란 프로젝트 관리에서 불확실성을 인정하고 최종 결과에 집중하는 전략적 접근 방식입니다. 이는 모든 세부 사항을 사전에 완벽하게 계획하는 것이 아니라, 핵심 목표와 목표 달성에 필요한 주요 결정을 미리 확정하고, 실행 과정에서의 변화와 위험에 유연하게 대응하는 것을 의미합니다. 팀원 간의 협력과 신뢰를 바탕으로, 변경되는 상황에 따라 계획을 지속적으로 조정하는 것이 핵심입니다. 이 방식은 완벽한 계획보다는 헌신적인 실행과 적응력을 중시하며, 복잡한 프로젝트에서도 방향성을 유지하는 데 효과적입니다.	ASSISTANT	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
2395614f-dab6-4898-be20-d3a948fc8a6f	2026-01-24 19:03:16.63169	dev@insure.com	2026-01-24 19:03:16.63169	dev@insure.com	플래닝 포커의 방식과 절차에 대해 설명해줘	USER	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
d97a255f-b176-4150-9125-31a6f3195e6e	2026-01-24 19:03:35.97905	dev@insure.com	2026-01-24 19:03:35.97905	dev@insure.com	플래닝 포커는 초기 계획을 핵심 목표와 마감일에 맞춰 세우되, 실행 과정에서 유연하게 변경하는 전략입니다. 먼저 각 작업에 필요한 시간과 자원을 파악한 후, 최종적으로 집중해야 할 핵심 작업을 선정하고 나머지는 상황에 따라 조정합니다. 상향식 CPM 방식처럼 작업 흐름과 자원 제약을 고려해 ‘할 수 있는 일정’을 만드는 것이 핵심입니다. 이 방법은 목표 달성을 위한 가장 중요한 경로를 파악하고, 예상치 못한 변화에도 신속히 대응할 수 있게 해줍니다.	ASSISTANT	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
96d0c2ef-9454-4ae9-827f-fa8de8b476be	2026-01-24 19:05:47.809976	dev@insure.com	2026-01-24 19:05:47.809976	dev@insure.com	플래닝 포커란	USER	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
e398c97e-94f2-457d-82f3-99a1eb2f862e	2026-01-24 19:06:10.376461	dev@insure.com	2026-01-24 19:06:10.376461	dev@insure.com	플래닝 포커란 프로젝트 관리에서 불확실한 미래를 고려해 최종 목표와 방향성에 집중하고, 핵심 작업을 우선 설정한 후 유연하게 변화에 대응하는 전략입니다. 완벽한 사전 계획보다는 팀의 헌신적인 실행과 적응력을 통해 목표 달성을 추구하며, 계획은 항상 변경될 수 있다는 전제를 바릅니다. 이 방식은 예측 불가능한 상황에서도 프로젝트의 핵심 가치를 유지하고, 팀원 간 신뢰를 바탕으로 일관된 진행을 가능하게 합니다. 특히 상향식 일정 수립 방식과 결합될 때, 작업의 규모와 자원 제약을 고려한 효과적인 일정 관리가 가능합니다.	ASSISTANT	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
4c2b1b60-6dad-4963-b07a-2509cd372b6f	2026-01-24 19:10:01.104971	dev@insure.com	2026-01-24 19:10:01.104971	dev@insure.com	플래닝 포커란	USER	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
ecd84867-29db-4d98-af5b-2220e2783f85	2026-01-24 19:10:22.456785	dev@insure.com	2026-01-24 19:10:22.456785	dev@insure.com	플래닝 포커는 불확실한 미래를 전제로, 프로젝트의 핵심 목표와 마감일을 중심으로 가장 중요한 작업을 선정하고, 나머지는 유연하게 조정하는 전략입니다. 완벽한 사전 계획보다는 팀의 헌신적 실행과 지속적인 대응력을 중시하며, 계획은 변경될 수 있다는 점을 인정합니다. 예를 들어, 저녁식사 준비 시 각 요리의 조리 시간과 인원 수를 고려해 실행 가능한 일정을 수립하는 방식입니다. 이는 상향식 CPM 방식과도 유사하게, 자원과 작업의 규모를 고려해 ‘할 수 있는 일정’을 우선적으로 설정하는 과정입니다.	ASSISTANT	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
84d195ef-6b30-4213-97be-d5835baf5774	2026-01-24 19:15:09.667788	dev@insure.com	2026-01-24 19:15:09.667788	dev@insure.com	플래닝 포커란	USER	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
65605596-f0d4-4540-bf0e-1f88f2c3d76a	2026-01-24 19:15:31.871844	dev@insure.com	2026-01-24 19:15:31.871844	dev@insure.com	플래닝 포커란 팀원들이 각자의 스토리에 대해 추정치를 수립하고, 카드를 통해 동시에 의견을 제시하는 협업 기법입니다. 이를 통해 팀원들이 각자 가장 잘 아는 사람이 먼저 말하게 되어, 개인의 편견이나 과도한 추정치가 다른 사람에게 영향을 받지 않고 객관적인 합의에 도달할 수 있습니다. 이 과정은 팀원 간의 이해를 증진시키고, 불확실한 작업에 대한 공유된 인식을 형성하는 데 효과적입니다. 또한, 플래닝 포커는 계획의 유연성과 수렴성을 높이며, 사전 완벽한 계획 대신 팀의 헌신과 대응력을 바탕으로 프로젝트를 추진합니다.	ASSISTANT	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
819afab2-18ce-48c4-ac83-92bba8c6aed9	2026-01-24 19:18:38.173561	dev@insure.com	2026-01-24 19:18:38.173561	dev@insure.com	플래닝 포커란	USER	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
c46cd7bf-a57c-4062-ae8b-3a92a0c02287	2026-01-24 19:19:02.001897	dev@insure.com	2026-01-24 19:19:02.001897	dev@insure.com	플래닝 포커는 팀원들이 각자 추정 카드를 사용해 스토리의 중요도와 복잡성을 평가하는 협업 기법으로, 팀 전체가 명확히 이해한 후 추정치를 공개적으로 제시함으로써 편향된 의견을 줄이고 합의를 도출합니다. 이 방법은 변화하는 상황에 유연하게 대응할 수 있는 상향식 계획을 가능하게 하며, 팀원들이 가장 잘 아는 사람이 먼저 말하게 하여 객관적인 판단을 장려합니다. 예를 들어, 저녁식사 준비 스토리를 각자 추정한 후, 팀원들이 카드를 공개하면 서로 다른 의견을 비교하고 토론하면서 더 신뢰할 수 있는 결정에 도달할 수 있습니다. 결국 플래닝 포커는 불확실한 프로젝트에서도 팀의 집단 지성을 활용해 목표 달성을 위한 실행력을 강화합니다.	ASSISTANT	4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36
62f5dd8f-af39-468c-b8a3-a6af607a3e41	2026-01-24 19:37:07.26468	dev@insure.com	2026-01-24 19:37:07.26468	dev@insure.com	스크럼이란	USER	275699fe-5b3a-4e8a-83e6-3be907ab38b0
f069efab-49da-4e87-af0f-3bdef7cdd702	2026-01-24 19:37:15.512299	dev@insure.com	2026-01-24 19:37:15.512299	dev@insure.com	스크럼은 복잡한 프로젝트를 짧은 반복 주기(스프린트)로 나누어 협업하고 가치를 빠르게 전달하는 애자일 프로젝트 관리 방법론입니다. 핵심 특징으로는 역할(스크럼 마스터, 제품 책임자, 개발팀), 이벤트(스프린트 계획, 일일 스크럼, 검토, 회고), 그리고 아티팩트(제품 백로그, 스프린트 백로그, 증분)가 있습니다. 유연성과 투명성을 중시하며, 변화에 빠르게 대응하며 지속적인 개선을 추구합니다.	ASSISTANT	275699fe-5b3a-4e8a-83e6-3be907ab38b0
7b05a9fa-c861-462d-9aa4-e82cda7336a1	2026-01-24 19:39:13.092341	dev@insure.com	2026-01-24 19:39:13.092341	dev@insure.com	스크럼이란	USER	275699fe-5b3a-4e8a-83e6-3be907ab38b0
ac3bdb8a-e8e9-43da-b581-02380dcc7815	2026-01-24 19:39:21.829214	dev@insure.com	2026-01-24 19:39:21.829214	dev@insure.com	스크럼은 애자일 프로젝트 관리 방법론으로, 짧은 스프린트 단위로 작업을 나누어 유연하고 빠른 개발을 가능하게 합니다. 핵심 요소로는 스크럼 마스터, 제품 책임자, 개발팀이 있으며, 일일 스크럼, 스프린트 계획, 검토, 회고 등의 정기 이벤트를 통해 지속적인 협업과 개선을 이끌어냅니다. 변화에 민첩하게 대응하며 투명성과 자기 조직화를 강조하여 복잡한 프로젝트를 효율적으로 관리할 수 있습니다.	ASSISTANT	275699fe-5b3a-4e8a-83e6-3be907ab38b0
99ac3b06-ba3c-426f-acca-af0bf3c542c8	2026-01-24 19:40:45.260506	dev@insure.com	2026-01-24 19:40:45.260506	dev@insure.com	음, 그건 제가 도움드리기 어려운 내용이에요 😅 프로젝트 일정, 진척, 리스크, 이슈 같은 PMS 관련 질문이면 도와드릴 수 있어요!	ASSISTANT	275699fe-5b3a-4e8a-83e6-3be907ab38b0
f34fa34c-aed0-46ba-a75c-e02eedd4951c	2026-01-24 19:40:51.563169	dev@insure.com	2026-01-24 19:40:51.563169	dev@insure.com	스크럼이나	USER	275699fe-5b3a-4e8a-83e6-3be907ab38b0
394bf5b3-33fc-467a-8f8b-1046c9d9ee08	2026-01-24 19:40:51.787377	dev@insure.com	2026-01-24 19:40:51.787377	dev@insure.com	음, 그건 제가 도움드리기 어려운 내용이에요 😅 프로젝트 일정, 진척, 리스크, 이슈 같은 PMS 관련 질문이면 도와드릴 수 있어요!	ASSISTANT	275699fe-5b3a-4e8a-83e6-3be907ab38b0
c60b9de6-ef3b-488f-aa36-8ef86e2bf081	2026-01-24 19:41:07.810509	pm@insure.com	2026-01-24 19:41:07.810509	pm@insure.com	스크럼이란	USER	1a92c61e-61bd-4539-a8e9-b01852d67af5
4752ee8b-b21b-4167-a9f3-b1d16b39f49a	2026-01-24 19:41:08.053994	pm@insure.com	2026-01-24 19:41:08.053994	pm@insure.com	음, 그건 제가 도움드리기 어려운 내용이에요 😅 프로젝트 일정, 진척, 리스크, 이슈 같은 PMS 관련 질문이면 도와드릴 수 있어요!	ASSISTANT	1a92c61e-61bd-4539-a8e9-b01852d67af5
7a3c876d-c8f2-49b1-873e-3eee47c87f99	2026-01-24 19:41:11.935274	pm@insure.com	2026-01-24 19:41:11.935274	pm@insure.com	스크럼이란	USER	1a92c61e-61bd-4539-a8e9-b01852d67af5
c6488c7e-1996-48a2-beb6-2c0f12f8b2e1	2026-01-24 19:41:12.185006	pm@insure.com	2026-01-24 19:41:12.185006	pm@insure.com	음, 그건 제가 도움드리기 어려운 내용이에요 😅 프로젝트 일정, 진척, 리스크, 이슈 같은 PMS 관련 질문이면 도와드릴 수 있어요!	ASSISTANT	1a92c61e-61bd-4539-a8e9-b01852d67af5
f2257d99-bab3-439a-823a-dac2f346a482	2026-01-24 19:41:17.597901	pm@insure.com	2026-01-24 19:41:17.597901	pm@insure.com	플래닝 포커란	USER	1a92c61e-61bd-4539-a8e9-b01852d67af5
87dcdd36-a8c6-43c6-a26a-b8067ed1b6ae	2026-01-24 19:41:17.836588	pm@insure.com	2026-01-24 19:41:17.836588	pm@insure.com	음, 그건 제가 도움드리기 어려운 내용이에요 😅 프로젝트 일정, 진척, 리스크, 이슈 같은 PMS 관련 질문이면 도와드릴 수 있어요!	ASSISTANT	1a92c61e-61bd-4539-a8e9-b01852d67af5
c2cba007-b697-4112-bb5b-dc948c22b4e9	2026-01-24 19:46:24.694815	pm@insure.com	2026-01-24 19:46:24.694815	pm@insure.com	스크럼이란	USER	1a92c61e-61bd-4539-a8e9-b01852d67af5
ee4be09a-2ea3-4a16-aa76-e0c51a5cf6ef	2026-01-24 19:46:48.359811	pm@insure.com	2026-01-24 19:46:48.359811	pm@insure.com	스크럼은 애자일 방법론의 한 대표적인 프레임워크로, 특히 소프트웨어 개발에서 빠른 반복과 지속적인 고객 참여를 통해 유연하고 효율적인 프로젝트 관리를 가능하게 하는 방법입니다.\n\n### 정의  \n스크럼(Scrum)은 팀원들이 짧은 주기의 반복(일명 스프린트)을 통해 작업을 계획, 실행, 검토하며 지속적으로 개선해 나가는 애자일 개발 프로세스입니다. 이는 예측 가능한 결과와 유연한 대응력을 동시에 추구하는 방식으로, 고객의 피드백을 빠르게 반영할 수 있도록 설계되었습니다.\n\n### 목적  \n- **빠른 가치 전달:** 짧은 스프린트 주기를 통해 고객에게 단계적으로 가치를 제공합니다.  \n- **변화에 대한 유연한 대응:** 프로젝트 진행 중 발생하는 변화를 효율적으로 수용할 수 있도록 합니다.  \n- **고객 참여 극대화:** 고객이나 이해관계자가 지속적으로 프로세스에 참여하여 요구사항을 명확히 하고 빠른 피드백을 제공합니다.  \n- **팀 협업과 자기 조직화 촉진:** 팀원들이 스스로 역할을 정의하고 협업하며 자율적으로 문제를 해결하도록 유도합니다.\n\n### 핵심 특징  \n1. **짧은 반복 주기(Sprint):** 일반적으로 1~4주 단위로 작업을 나누어 진행합니다.  \n2. **정기적인 회의:** 스크럼 미팅(스탠드업 미팅), 스프린트 계획, 스프린트 리뷰, 스프린트 회고를 통해 지속적인 소통과 개선을 이룹니다.  \n3. **역할의 명확화:**  \n   - **스크럼 마스터:** 팀이 스크럼 원칙을 준수하고 협업을 원활히 할 수 있도록 지원합니다.  \n   - **제품 책임자(Product Owner):** 고객 대리인으로서 제품의 우선순위를 관리하고 피드백을 전달합니다.	ASSISTANT	1a92c61e-61bd-4539-a8e9-b01852d67af5
4072d03d-85bf-4648-b2ef-cc067827d66d	2026-01-24 19:47:12.542187	pm@insure.com	2026-01-24 19:47:12.542187	pm@insure.com	플래닝 포커란	USER	1a92c61e-61bd-4539-a8e9-b01852d67af5
4eeae6d4-7bf4-4a5e-bea6-d0a30a82e3ee	2026-01-24 19:47:51.117162	pm@insure.com	2026-01-24 19:47:51.117162	pm@insure.com	플래닝 포커(Planning Poker)는 팀원들이 스토리 포인트(Story Points)를 통해 작업의 크기와 복잡도를 추정하는 애자일 프로젝트 관리 기법입니다. 이는 각 팀원이 자신이 해당 작업을 완료하는 데 필요한 상대적인 노력이나 시간을 13장의 카드를 사용해 추정하고, 최종적으로 합의를 도출하는 방식으로 진행됩니다.\n\n### 주요 목적  \n- 팀원들이 각자 이해한 바에 따라 추정치를 제시하도록 유도하여, 일관되고 합리적인 기준으로 작업의 우선순위와 자원 배분을 결정할 수 있도록 돕습니다.  \n- 추정 과정에서 다양한 관점을 공유함으로써 팀원 간의 소통을 촉진하고, 숨겨진 위험이나 고려 사항을 발견할 수 있게 합니다.  \n- 계획의 불확실성을 인정하고, 유연하게 대처할 수 있는 팀의 자세를 강화합니다.\n\n### 핵심 특징  \n- **상향식 추정(Top-Down Planning):** 팀 전체가 참여하여 각 작업에 대한 상대적인 크기와 복잡도를 추정합니다.  \n- **합의 도출:** 각자 추정 후 동시에 카드를 보여주며, 의견 차이가 나면 이유를 논의해 최종 합의에 도달합니다.  \n- **숨겨진 가치 강조:** 완벽한 계획이 아닌, 헌신적인 실행과 유연한 대응을 통해 프로젝트의 방향성을 제시하는 데 초점을 둡니다.\n\n### 구성 요소  \n- **13장의 카드:** 각 카드에는 1, 2, 3, 5, 8, 13과 같은 숫자가 적혀 있습니다. 이 숫자들은 작업의 상대적 크기를 표현하는 단위로 사용됩니다.  \n- **추정 과정:** 팀원들은 자신의 추정치를 입札(바우밍) 형태로 동시에 표시한 후, 결과를 공유하고 토론합니다.  \n- **합의 도출:** 토론을 통해 팀 전체가 동의하는 하나의 추정치를 선정하여, 해당 작업을 실행하거나 우선순위를 정합니다.\n\n요약하자면, 플래닝 포커는 팀원들의 집단적 판단을 통해 프로젝트의 불확실성을 관리하고, 유연하고 현실적인 계획 수립을 돕는 효과적인 협업 도구입니다.	ASSISTANT	1a92c61e-61bd-4539-a8e9-b01852d67af5
63116aa6-13ab-4540-8e2b-1571647aa919	2026-01-24 19:50:32.123602	pm@insure.com	2026-01-24 19:50:32.123602	pm@insure.com	스크럼이란	USER	1a92c61e-61bd-4539-a8e9-b01852d67af5
3b8bdd6b-8d17-4d60-93b4-e3d2f038e1a2	2026-01-24 19:50:51.527121	pm@insure.com	2026-01-24 19:50:51.527121	pm@insure.com	스크럼은 짧은 주기의 반복적이고 빠른 개발 방식을 통해 고객의 지속적인 피드백을 수용하며, 변화에 유연하게 대응하는 애자일 방법론입니다. 이 방법은 1986년 제품개발그룹들의 실제 성공 사례에서 영감을 받아, 자기 조직화된 팀과 정기적인 회고를 통해 지속적인 개선을 강조합니다. 스크럼에서는 일반적으로 1~4주 주기로 짧은 스프린트를 진행하며, 각 스프린트 끝에 고객으로부터 피드백을 받아 다음 단계로 반영합니다. 스크럼 팀은 스크럼 마스터, 프로젝트 소유자, 개발팀의 구성원으로 이루어져 있으며, 일일 스탠드업 미팅과 스프린트 계획, 회고 등을 통해 투명성과 협업을 유지합니다. 이러한 구조는 팀의 효율성을 높이고, 프로젝트 목표에 대한 집중도를 강화하며, 빠른 문제 해결과 고객 만족도 향상을 가능하게 합니다.	ASSISTANT	1a92c61e-61bd-4539-a8e9-b01852d67af5
d095d0a9-755d-4aa5-8a5c-7777d55e7636	2026-01-24 19:51:54.303815	pm@insure.com	2026-01-24 19:51:54.303815	pm@insure.com	플래닝 포커란	USER	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
1c8e4cc2-3d3b-4676-8dcd-5b0c3d4b332b	2026-01-24 19:52:11.566802	pm@insure.com	2026-01-24 19:52:11.566802	pm@insure.com	플래닝 포커는 팀원들이 각자 13장의 카드를 받아 자신의 스토리 완료에 필요한 작업량을 추정하는 협업 의사결정 기법이다. 각 팀원은 자신의 목표 완료일을 넘지 않도록, 동시에 자신의 추정에 대해 최대한 객관적이고 독립적으로 의견을 제시한다. 이를 통해 팀 전체가 다양한 관점을 이해하고, 합의된 기준으로 작업 계획을 수립할 수 있다. 플래닝 포커는 상향식 일정 계획 방식으로, 팀원의 실제 역량과 자원을 고려한 '할 수 있는 일정'을 도출하는 데 유용하다. 팀원들이 서로의 추정을 논의하면서 의견 차이를 줄이고, 더 정확한 합의점을 찾을 수 있는 기회를 제공한다. 이 과정을 통해 불확실한 미래에 유연하게 대응할 수 있는 탄력적인 계획을 만들어낸다.	ASSISTANT	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
502f756c-5ca5-4c42-a922-2c9cc80083a0	2026-01-24 19:55:48.791895	pm@insure.com	2026-01-24 19:55:48.791895	pm@insure.com	스크럼이란	USER	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
eaa86ce0-aa0a-490d-aa6b-1b9dd5156ee4	2026-01-24 19:55:48.853675	pm@insure.com	2026-01-24 19:55:48.853675	pm@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
5812c8c5-b8eb-4bde-aaad-54c08fb7089c	2026-01-24 19:55:54.083482	pm@insure.com	2026-01-24 19:55:54.083482	pm@insure.com	스크럼이란	USER	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
d6aa56bd-ec29-499e-b7f1-bb2141a00590	2026-01-24 19:56:12.227216	pm@insure.com	2026-01-24 19:56:12.227216	pm@insure.com	**스크럼(Scrum)**은 애자일(Agile) 개발 방법론 중 하나로, 짧고 반복적인 주기인 **스프린트(Sprint)**를 통해 제품을 점진적으로 개발하고, 고객의 피드백을 지속적으로 반영하는 방식입니다. 주요 특징은 다음과 같습니다:\n\n### 정의\n스크럼은 자기 조직화된 소규모 팀이 협력하여 짧은 주기로 제품을 개발하고, 고객의 요구를 지속적으로 반영하는 프레임워크입니다. 팀은 정해진 기간(보통 1~4주) 동안 작업을 계획하고 실행하며, 주기적인 회의(스크럼 미팅)를 통해 진행 상황을 점검하고 개선합니다.\n\n### 핵심 특징\n1. **자기 조직화된 팀(Autonomous Team):**  \n   팀원들이 스스로 역할과 책임을 결정하며 협업합니다.\n\n2. **정기적인 스프린트(Sprints):**  \n   짧은 주기로 작업을 나누어 주기적으로 결과물을 완성하고 검토합니다.\n\n3. **고객 피드백 반영:**  \n   고객의 참여와 피드백을 지속적으로 받아 제품	ASSISTANT	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
147806bd-feda-4297-bd52-4df205cdcafa	2026-01-24 19:58:19.147571	pm@insure.com	2026-01-24 19:58:19.147571	pm@insure.com	스크럼이란	USER	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
6302a58f-1e80-41bf-bd82-17e1e74bad06	2026-01-24 19:58:41.274734	pm@insure.com	2026-01-24 19:58:41.274734	pm@insure.com	**스크럼(Scrum)**은 애자일 개발 방법론의 핵심 프레임워크로, 고객의 적극적인 참여와 빠른 반복을 기반으로 제품을 점진적으로 개발하는 방식입니다. 1986년 처음 소개된 스크럼은 자기 조직화된 소규모 팀이 짧은 주기인 **스프린트(Sprint)** 동안 목표를 설정하고, 매일의 스크럼 미팅, 스프린트 리뷰, 스프린트 회고 등을 통해 협업하며 지속적으로 개선해 나갑니다.  \n\n### 주요 특징  \n- **자기 조직화된 팀:** 팀원들이 스스로 역할을 정하고 협력합니다.  \n- **정기적인 스프린트:** 보통 1~4주로 짧은 주기로 작업을 나누어 빠르게 결과물을 만들어냅니다.  \n- **고객 피드백의 지속적 통합:** 고객이 매 스프린트마다 결과물을 검토하며 요구사항을 조정합니다.  \n- **유연한 변화 수용:** 계획 변경을 유연하게 수용하며 시장이나 요구사항 변화에 빠르게 대응합니다.  \n- **명확한 역할과 역할:** 스크럼 마스터(Scrum Master), 제품 소유자(Product Owner), 개발팀(Development Team)의 역할을 구분하여 운영합니다.  \n\n이러한 특징 덕분에 스크럼은 복잡하고 변화가 빠른 프로젝트에서 효율적인 협업과 빠른 결과물 제공을 가능하게 합니다.	ASSISTANT	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
07aaa7d6-bf08-4b88-b889-a9c7d369adcc	2026-01-24 19:59:02.433986	pm@insure.com	2026-01-24 19:59:02.433986	pm@insure.com	플래닝 포커란	USER	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
3547271f-fcec-4f94-af9d-8230206300b5	2026-01-24 19:59:35.315572	pm@insure.com	2026-01-24 19:59:35.315572	pm@insure.com	**플래닝 포커(Planning Poker)**는 팀원들이 협력하여 작업이나 기능을 추정할 때 사용하는 애자일 기법입니다. 이 기법은 각 팀원이 자신만의 카드를 사용해 동시에 독립적으로 추정치를 제시하는 방식으로, **팀 전체의 합의와 투명한 의사결정을 유도**합니다.  \n\n### 핵심 특징  \n- **개별 추정의 독립성**: 각 팀원은 다른 사람의 영향을 받지 않고 자신만의 추정치를 제시하여, 보다 객관적인 평가를 가능하게 합니다.  \n- **상향식 합의**: 추정 후, 팀 전체가 논의하며 왜 다른 수치를 제시했는지 설명함으로써 서로의 이해를 깊게 하고, 일관된 합의를 도출합니다.  \n- **유연한 시간 관리**: 작업 크기, 복잡성, 자원 제약 등을 고려해 현실적인 추정을 도출하며, 스프린트 계획 수립에 반영됩니다.  \n- **투명성과 책임감**: 플래닝 포커는 누가 어떤 추정치를 했는지 명확히 기록되어, 책임 소재와 진행 상황을 쉽게 추적할 수 있습니다.  \n\n이 기법은 프로젝트의 불확실성을 인정하고, 팀 내 다양한 시각을 통합해 더 정확한 계획을 세우는 데 효과적입니다. 예를 들어, 저녁식사 준비 시간 예측처럼, 각 조리 단계의 실제 시간을 고려한 합의 추정치를 도출함으로써 실제 업무 효율성을 높일 수 있습니다.	ASSISTANT	ec5f0fc6-2d0e-4921-b1b4-106c319bcc50
18ab7df5-6cca-4386-9e2f-623df682b6e9	2026-01-26 07:56:28.840148	pm@insure.com	2026-01-26 07:56:28.840148	pm@insure.com	안녕	USER	e674b9df-f4ef-4539-9a91-d097d7bbd5ab
0e28a2eb-9200-4a2c-9412-c26b9c37e3bb	2026-01-26 07:56:31.605645	pm@insure.com	2026-01-26 07:56:31.605645	pm@insure.com	안녕하세요! PMS 도우미예요 😊 프로젝트 일정, 리스크, 이슈 등 궁금한 거 있으면 편하게 물어봐 주세요!	ASSISTANT	e674b9df-f4ef-4539-9a91-d097d7bbd5ab
6f3b5cc8-f284-4164-9155-e9a26866443d	2026-01-26 07:56:38.912688	pm@insure.com	2026-01-26 07:56:38.912688	pm@insure.com	스크럼이 뭐야	USER	e674b9df-f4ef-4539-9a91-d097d7bbd5ab
0dbea6ff-a9b7-4cd8-9bd9-b782472e53ce	2026-01-26 07:57:04.285579	pm@insure.com	2026-01-26 07:57:04.285579	pm@insure.com	안녕! 스크럼에 대해 설명드릴게요.\n\n**스크럼**은 1986년 하버드 비즈니스 리뷰에 소개된 제품개발 그룹들의 성공적인 실천법에서 영감을 받은 애자일 방법론 중 가장 널리 알려진 프레임워크입니다. 핵심 특징은 다음과 같아요:\n\n### 정의:\n스크럼은 짧은 반복 주기(일주일에서 한 달 정도)를 기반으로 한 **반복적이고 협업적인 프로젝트 관리 방법**입니다. 팀은 주기적으로 계획을 세우고, 작업을 실행하며, 정기적인 회의(스탠드업 미팅, 스프린트 리뷰, 스프린트 회고 등)를 통해 지속적으로 개선해 나갑니다.\n\n### 핵심 특징:\n1. **자기 조직화된 팀 (Self-Organizing Teams):**  \n   팀 구성원들이 스스로 역할과 책임을 정의하고, 목표 달성을 위해 협력합니다. 리더가 지시하는 것이 아니라, 팀이 스스로 결정합니다.\n\n2. **반복적 개발 (Iterative Development):**  \n   프로젝트를 작고 관리 가능한 단위(스프린트)로 나누어, 짧은 주기마다 기능을 개발하고 테스트하며, 피드백을 반영합니다.\n\n3. **정기적인 회의 (Ceremonies):**  \n   - **스탠드업 미팅 (Daily Scrum):** 매일 짧게 진행되는 15분 회의로, 다음 날 계획과 장애물을 공유합니다.  \n   - **스프린트 계획 회의 (Sprint Planning):** 다음 스프린트 목표 설정과 작업 계획을 세웁니다.  \n   - **스프린트 리뷰 (Sprint Review):** 개발된 결과물을 검토하고 고객/이해관계자와 피드백을 받습니다.  \n   - **스프린트 회고 (Sprint Retrospective):** 팀이 프로세스를 개선하기	ASSISTANT	e674b9df-f4ef-4539-9a91-d097d7bbd5ab
70a8b280-bc73-4351-9af2-279ac00bce77	2026-01-26 08:13:07.248085	pm@insure.com	2026-01-26 08:13:07.248085	pm@insure.com	스크럼이 뭐야	USER	7210f8c0-8f35-4e57-b201-267be8a13b01
61ee2702-278b-43ad-ae4e-f0cd6c1f26d9	2026-01-26 08:13:07.314301	pm@insure.com	2026-01-26 08:13:07.314301	pm@insure.com	죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.	ASSISTANT	7210f8c0-8f35-4e57-b201-267be8a13b01
77884c1d-d4f4-4ef1-9970-fa61512b7534	2026-01-26 08:13:20.298134	pm@insure.com	2026-01-26 08:13:20.298134	pm@insure.com	스크럼이 뭐야	USER	a4c25bfd-4a7d-46dd-9493-c87a928e7f84
10855e70-2585-435a-9b42-6d2fc9e6d9a8	2026-01-26 08:13:45.51638	pm@insure.com	2026-01-26 08:13:45.51638	pm@insure.com	**스크럼**(Scrum)은 애자일(Agile) 프로젝트 관리 방법론 중 하나로, 빠르게 변화하는 환경 속에서 고객의 요구를 반영하며 지속적으로 제품을 개선하고 가치를 빠르게 제공하는 데 중점을 둡니다.\n\n### 정의\n스크럼은 짧은 주기의 반복적 개발 주기를 통해 제품을 진행시키는 방법으로, 팀의 자율성과 협업을 극대화하여 고객 피드백을 빠르게 반영하고 지속적인 개선을 추구합니다.\n\n### 핵심 특징\n1. **자기 조직화 팀**: 스크럼 팀은 자율적으로 구성되어 스스로 작업을 계획하고 실행합니다.\n2. **짧은 반복 주기 (스프린트)**: 일반적으로 2~4주 단위의 짧은 주기로 작업을 수행하며, 매 스프린트마다 결과를 검토하고 다음 계획을 세웁니다.\n3. **고객 참여**: 스크럼에서는 고객이나 이해관계자가 정기적으로 참여하여 요구사항을 확인하고 피드백을 제공합니다.\n4. **역할의 명확성**: 제품 책(Product Owner), 스크럼 마스터(Scrum Master), 개발 팀(Development Team)의 세 가지 핵심 역할이 명확히 정의됩니다.\n5. **지속적인 개선**: 각 스프린트 종료 후 회고(Retrospective)를 통해 프로세스를 점검하고 개선합니다.\n6. **투명성과 예측 가능성**: 일일 스크럼 미팅(Daily Stand-up), 스프린트 리뷰(Sprint Review), 스프린트 회고(Sprint Retrospective)를 통해 진행 상황을 투명하게 공유하고 예측 가능하게 관리합니다.\n\n즉, 스크럼은 고객 중심의 유연한 대응과 빠른 가치 창출을 목표로, 복잡하고 변화가 많은 프로젝트에서 특히 효과적인 방법입니다.	ASSISTANT	a4c25bfd-4a7d-46dd-9493-c87a928e7f84
\.


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: chat; Owner: pms_user
--

COPY chat.chat_sessions (id, created_at, created_by, updated_at, updated_by, active, title, user_id) FROM stdin;
07475858-47c7-4ced-b96a-cdf646b4aa2e	2026-01-23 18:53:09.838708	pm@insure.com	2026-01-23 18:53:09.838708	pm@insure.com	t	New Chat	U003
594b80dc-a39c-4a5d-8547-fc614e678436	2026-01-23 20:49:01.858584	pm@insure.com	2026-01-23 20:49:01.858584	pm@insure.com	t	New Chat	U003
ebcc4516-5826-4dbf-98b8-5c5c6e865f8f	2026-01-23 20:52:10.704573	pm@insure.com	2026-01-23 20:52:10.704573	pm@insure.com	t	New Chat	U003
bd756d08-1212-4e59-84af-1e1b4c139a32	2026-01-24 08:33:39.184158	pm@insure.com	2026-01-24 08:33:39.184158	pm@insure.com	t	New Chat	U003
32f4f282-9100-4bf6-b409-d38c468a4c9e	2026-01-24 08:40:50.824541	pmo@insure.com	2026-01-24 08:40:50.824541	pmo@insure.com	t	New Chat	U002
f7a05e5c-40ab-4172-b88e-71a9b351565c	2026-01-24 08:42:03.862064	pmo@insure.com	2026-01-24 08:42:03.862064	pmo@insure.com	t	New Chat	U002
c09919ce-865e-470f-af51-9cc1e68ccf51	2026-01-24 09:16:33.301963	pmo@insure.com	2026-01-24 09:16:33.301963	pmo@insure.com	t	New Chat	U002
0f2cd44e-e6b1-49dc-acf2-29bd4942d607	2026-01-24 09:18:36.65987	admin@insuretech.com	2026-01-24 09:18:36.65987	admin@insuretech.com	t	New Chat	user-admin-001
10230fd0-37a5-43f9-b9d7-45e02a815594	2026-01-24 09:18:59.850844	pmo@insure.com	2026-01-24 09:18:59.850844	pmo@insure.com	t	New Chat	U002
938342e4-301e-4940-ae32-ca00f724523f	2026-01-24 09:22:38.572538	anonymousUser	2026-01-24 09:22:38.572538	anonymousUser	t	New Chat	guest
4e7de0ff-7d57-4577-b71c-0a94d6b7b22d	2026-01-24 09:31:58.286085	pmo@insure.com	2026-01-24 09:31:58.286085	pmo@insure.com	t	New Chat	U002
e38fcb4e-de2f-402c-88e3-f25ae0223aa2	2026-01-24 09:43:20.502583	anonymousUser	2026-01-24 09:43:20.502583	anonymousUser	t	New Chat	guest
123c1948-21c1-44f3-af1c-6af261b11f47	2026-01-24 09:46:17.512154	anonymousUser	2026-01-24 09:46:17.512154	anonymousUser	t	New Chat	guest
4d213d74-35c5-4bb0-90b4-45133a71f2c9	2026-01-24 09:46:36.165203	anonymousUser	2026-01-24 09:46:36.165203	anonymousUser	t	New Chat	guest
61224ce1-f507-4bc4-95ba-675992013e13	2026-01-24 09:46:49.008842	anonymousUser	2026-01-24 09:46:49.008842	anonymousUser	t	New Chat	guest
d61cb225-0cb2-4e94-8d1f-c5d7f0a2b2a4	2026-01-24 09:48:58.391265	anonymousUser	2026-01-24 09:48:58.391265	anonymousUser	t	New Chat	guest
19f9713c-4097-4e74-b320-4eb17963c800	2026-01-24 09:49:38.377256	anonymousUser	2026-01-24 09:49:38.377256	anonymousUser	t	New Chat	guest
3e439c5c-994e-4a82-85c1-28cc0e7c5a59	2026-01-24 09:52:21.339976	pmo@insure.com	2026-01-24 09:52:21.339976	pmo@insure.com	t	New Chat	U002
0b5552af-6884-485c-81d3-a8833bfdb626	2026-01-24 17:58:40.546861	dev@insure.com	2026-01-24 17:58:40.546861	dev@insure.com	t	New Chat	U004
1488fd28-c0fa-41ee-8eb3-e9446fd27037	2026-01-24 18:16:33.523264	pm@insure.com	2026-01-24 18:16:33.523264	pm@insure.com	t	New Chat	U003
3004e57a-7d42-4261-8980-7fd0e718a393	2026-01-24 18:29:50.103799	dev@insure.com	2026-01-24 18:29:50.103799	dev@insure.com	t	New Chat	U004
2d48a4b9-29a8-4f7b-91ce-fdcbf2522801	2026-01-24 18:32:48.839129	dev@insure.com	2026-01-24 18:32:48.839129	dev@insure.com	t	New Chat	U004
4bd0e5e6-9fc9-40c7-8aac-cd700a3e0f36	2026-01-24 19:01:34.977719	dev@insure.com	2026-01-24 19:01:34.977719	dev@insure.com	t	New Chat	U004
275699fe-5b3a-4e8a-83e6-3be907ab38b0	2026-01-24 19:37:07.264428	dev@insure.com	2026-01-24 19:37:07.264428	dev@insure.com	t	New Chat	U004
1a92c61e-61bd-4539-a8e9-b01852d67af5	2026-01-24 19:41:07.81032	pm@insure.com	2026-01-24 19:41:07.81032	pm@insure.com	t	New Chat	U003
ec5f0fc6-2d0e-4921-b1b4-106c319bcc50	2026-01-24 19:51:54.303614	pm@insure.com	2026-01-24 19:51:54.303614	pm@insure.com	t	New Chat	U003
e674b9df-f4ef-4539-9a91-d097d7bbd5ab	2026-01-26 07:56:28.835215	pm@insure.com	2026-01-26 07:56:28.835215	pm@insure.com	t	New Chat	U003
7210f8c0-8f35-4e57-b201-267be8a13b01	2026-01-26 08:13:07.247873	pm@insure.com	2026-01-26 08:13:07.247873	pm@insure.com	t	New Chat	U003
a4c25bfd-4a7d-46dd-9493-c87a928e7f84	2026-01-26 08:13:20.297936	pm@insure.com	2026-01-26 08:13:20.297936	pm@insure.com	t	New Chat	U003
\.


--
-- Data for Name: backlog_items; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.backlog_items (id, created_at, created_by, updated_at, updated_by, acceptance_criteria, epic_id, estimated_effort_hours, origin_type, priority_order, sprint_id, status, story_points, backlog_id, epic_id_ref, requirement_id) FROM stdin;
bi-001-01	2026-01-26 08:56:33.012176	user-pm-001	2026-01-26 08:56:33.012176	\N	1. OCR 정확도 99% 이상\\n2. 처리 시간 2초 이내\\n3. 다양한 문서 형식 지원	\N	40	REQUIREMENT	1	\N	SPRINT	8	backlog-001	epic-001-01	req-001-01
bi-001-02	2026-01-26 08:56:33.012176	user-pm-001	2026-01-26 08:56:33.012176	\N	1. 사기 탐지율 95% 이상\\n2. 오탐률 5% 이하\\n3. 실시간 점수 산출	\N	60	REQUIREMENT	2	\N	SELECTED	13	backlog-001	epic-001-02	req-001-02
bi-001-03	2026-01-26 08:56:33.012176	user-pm-001	2026-01-26 08:56:33.012176	\N	1. RESTful API 설계\\n2. OpenAPI 문서화\\n3. 인증 토큰 지원	\N	32	REQUIREMENT	3	\N	BACKLOG	8	backlog-001	epic-001-03	req-001-03
bi-001-04	2026-01-26 08:56:33.012176	user-pm-001	2026-01-26 08:56:33.012176	\N	1. ESB 연동 완료\\n2. 데이터 동기화 검증\\n3. 에러 핸들링 완비	\N	48	REQUIREMENT	4	\N	BACKLOG	13	backlog-001	epic-001-03	req-001-04
bi-001-05	2026-01-26 08:56:33.012176	user-pm-001	2026-01-26 08:56:33.012176	\N	1. AES-256 암호화 적용\\n2. TLS 1.3 적용\\n3. 암호화 키 관리 정책 수립	\N	24	REQUIREMENT	5	\N	BACKLOG	5	backlog-001	epic-001-04	req-001-05
bi-001-06	2026-01-26 08:56:33.012176	user-pm-001	2026-01-26 08:56:33.012176	\N	1. 1000 동시 사용자 지원\\n2. 응답 시간 2초 이내\\n3. CPU 사용률 70% 이하	\N	32	REQUIREMENT	6	\N	BACKLOG	8	backlog-001	epic-001-05	req-001-06
bi-002-01	2026-01-26 08:56:33.012176	user-pm-002	2026-01-26 08:56:33.012176	\N	1. 생체인식 지원\\n2. PIN 번호 지원\\n3. 자동 로그아웃	\N	20	REQUIREMENT	1	\N	BACKLOG	5	backlog-002	epic-002-02	req-002-01
bi-002-02	2026-01-26 08:56:33.012176	user-pm-002	2026-01-26 08:56:33.012176	\N	1. 보험증권 목록 표시\\n2. 상세 정보 조회\\n3. 갱신일 알림	\N	32	REQUIREMENT	2	\N	BACKLOG	8	backlog-002	epic-002-01	req-002-02
bi-002-03	2026-01-26 08:56:33.012176	user-pm-002	2026-01-26 08:56:33.012176	\N	1. 사진 첨부 기능\\n2. 청구서 자동 작성\\n3. 제출 확인 알림	\N	48	REQUIREMENT	3	\N	BACKLOG	13	backlog-002	epic-002-02	req-002-03
bi-002-04	2026-01-26 08:56:33.012176	user-pm-002	2026-01-26 08:56:33.012176	\N	1. 실시간 푸시 알림\\n2. 알림 설정 관리\\n3. 알림 히스토리	\N	16	REQUIREMENT	4	\N	BACKLOG	5	backlog-002	epic-002-02	req-002-04
bi-002-05	2026-01-26 08:56:33.012176	user-pm-002	2026-01-26 08:56:33.012176	\N	1. 오프라인 데이터 캐시\\n2. 연결 복구 시 동기화\\n3. 충돌 해결 로직	\N	40	REQUIREMENT	5	\N	BACKLOG	8	backlog-002	epic-002-02	req-002-05
\.


--
-- Data for Name: backlogs; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.backlogs (id, created_at, created_by, updated_at, updated_by, description, name, project_id, status) FROM stdin;
backlog-001	2026-01-26 08:56:33.009854	user-pm-001	2026-01-26 08:56:33.009854	\N	AI 보험심사 처리 시스템의 제품 백로그	AI 보험심사 Product Backlog	proj-001	ACTIVE
backlog-002	2026-01-26 08:56:33.009854	user-pm-002	2026-01-26 08:56:33.009854	\N	모바일 보험 플랫폼의 제품 백로그	모바일 보험 Product Backlog	proj-002	ACTIVE
\.


--
-- Data for Name: deliverables; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.deliverables (id, created_at, created_by, updated_at, updated_by, approved_at, approver, description, file_name, file_path, file_size, name, status, type, uploaded_by, phase_id) FROM stdin;
\.


--
-- Data for Name: education_histories; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.education_histories (id, created_at, created_by, updated_at, updated_by, certificate_issued, completed_at, completion_status, feedback, participant_department, participant_id, participant_name, registered_at, score, session_id) FROM stdin;
\.


--
-- Data for Name: education_roadmaps; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.education_roadmaps (id, created_at, created_by, updated_at, updated_by, description, is_required, level, order_num, target_role, education_id) FROM stdin;
\.


--
-- Data for Name: education_sessions; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.education_sessions (id, created_at, created_by, updated_at, updated_by, current_participants, end_at, instructor, location, max_participants, notes, scheduled_at, session_name, status, education_id) FROM stdin;
\.


--
-- Data for Name: educations; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.educations (id, created_at, created_by, updated_at, updated_by, category, description, duration_hours, education_type, instructor, is_active, learning_objectives, materials, prerequisites, target_role, title) FROM stdin;
\.


--
-- Data for Name: epics; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.epics (id, created_at, created_by, updated_at, updated_by, business_value, description, goal, item_count, name, owner_id, project_id, status, target_completion_date, total_story_points, phase_id, color, progress, priority) FROM stdin;
epic-001-01	2026-01-26 08:56:32.926223	user-pm-001	2026-01-26 08:56:32.926223	\N	90	AI 기반 문서 OCR 및 자동 분류 시스템	문서 처리 시간 70% 단축	5	문서 처리 자동화	user-dev-002	proj-001	ACTIVE	2026-04-15	26	phase-001-03	#3B82F6	45	CRITICAL
epic-001-02	2026-01-26 08:56:32.926223	user-pm-001	2026-01-26 08:56:32.926223	\N	95	ML 기반 보험 사기 탐지 알고리즘 개발	사기 탐지율 95% 이상 달성	7	사기 탐지 시스템	user-dev-002	proj-001	ACTIVE	2026-05-01	34	phase-001-03	#EF4444	30	CRITICAL
epic-001-03	2026-01-26 08:56:32.926223	user-pm-001	2026-01-26 08:56:32.926223	\N	80	RESTful API 및 외부 연동 시스템	외부 시스템 연동 100% 완료	4	API 플랫폼 구축	user-dev-001	proj-001	DRAFT	2026-05-15	21	phase-001-04	#10B981	10	HIGH
epic-001-04	2026-01-26 08:56:32.926223	user-pm-001	2026-01-26 08:56:32.926223	\N	100	데이터 암호화 및 접근 제어 시스템	보안 인증 심사 통과	3	보안 인프라 구축	user-dev-003	proj-001	DRAFT	2026-06-01	13	phase-001-04	#8B5CF6	5	CRITICAL
epic-001-05	2026-01-26 08:56:32.926223	user-pm-001	2026-01-26 08:56:32.926223	\N	70	E2E 테스트 및 성능 테스트 자동화	테스트 커버리지 90% 달성	4	통합 테스트 프레임워크	user-qa-001	proj-001	DRAFT	2026-06-15	18	phase-001-05	#F59E0B	0	HIGH
epic-001-06	2026-01-26 08:56:32.926223	user-pm-001	2026-01-26 08:56:32.926223	\N	85	운영 환경 구축 및 모니터링 시스템	무중단 배포 환경 구축	3	운영 배포 및 모니터링	user-dev-001	proj-001	DRAFT	2026-06-30	15	phase-001-06	#6366F1	0	MEDIUM
epic-002-01	2026-01-26 08:56:32.926223	user-pm-002	2026-01-26 08:56:32.926223	\N	85	모바일 앱 UX/UI 디자인	사용자 만족도 4.5점 이상	3	사용자 경험 설계	user-ba-001	proj-002	ACTIVE	2026-03-31	13	phase-002-02	#EC4899	25	HIGH
epic-002-02	2026-01-26 08:56:32.926223	user-pm-002	2026-01-26 08:56:32.926223	\N	90	iOS/Android 네이티브 앱 개발	MVP 1.0 출시	8	모바일 앱 개발	user-dev-001	proj-002	DRAFT	2026-06-30	40	phase-002-03	#14B8A6	5	CRITICAL
epic-002-03	2026-01-26 08:56:32.926223	user-pm-002	2026-01-26 08:56:32.926223	\N	80	모바일 전용 백엔드 API	API 응답속도 200ms 이하	5	백엔드 API 시스템	user-dev-003	proj-002	DRAFT	2026-06-15	21	phase-002-04	#F97316	0	HIGH
\.


--
-- Data for Name: features; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.features (id, epic_id, wbs_group_id, name, description, status, priority, order_num, created_at, updated_at, created_by, updated_by) FROM stdin;
feat-001-03	epic-001-01	\N	텍스트 추출 최적화	비정형 문서 텍스트 추출 개선	OPEN	HIGH	3	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-002-03	epic-001-02	\N	사기 점수 대시보드	실시간 사기 위험 시각화	OPEN	MEDIUM	3	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-003-02	epic-001-03	\N	인증/인가 서비스	OAuth2 기반 인증 시스템	OPEN	CRITICAL	2	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-004-02	epic-001-04	\N	감사 로깅	보안 감사 로그 시스템	OPEN	HIGH	2	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-001-01	epic-001-01	wg-001-03-02	OCR 엔진 통합	다중 OCR 엔진 통합 및 앙상블 처리	IN_PROGRESS	CRITICAL	1	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-001-02	epic-001-01	wg-001-03-02	문서 분류 AI	보험 문서 유형 자동 분류	IN_PROGRESS	HIGH	2	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-002-01	epic-001-02	wg-001-03-03	이상치 탐지 모델	비정상 패턴 탐지 ML 모델	IN_PROGRESS	CRITICAL	1	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-002-02	epic-001-02	wg-001-03-03	규칙 기반 검증	규정 기반 사기 검증 로직	OPEN	HIGH	2	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-003-01	epic-001-03	wg-001-04-01	청구 관리 API	보험 청구 CRUD API	OPEN	HIGH	1	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-004-01	epic-001-04	wg-001-04-02	데이터 암호화	AES-256 암호화 구현	OPEN	CRITICAL	1	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-001	\N
feat-005-01	epic-002-01	wg-002-02-01	온보딩 화면 설계	신규 사용자 온보딩 UX	IN_PROGRESS	HIGH	1	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-002	\N
feat-005-02	epic-002-01	wg-002-02-02	대시보드 UI	메인 대시보드 인터페이스	OPEN	HIGH	2	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-002	\N
feat-006-01	epic-002-02	wg-002-03-01	iOS 앱 기본 구조	iOS Swift 앱 아키텍처	OPEN	CRITICAL	1	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-002	\N
feat-006-02	epic-002-02	wg-002-03-02	Android 앱 기본 구조	Android Kotlin 앱 아키텍처	OPEN	CRITICAL	2	2026-01-26 08:56:32.941048	2026-01-26 08:56:32.941048	user-pm-002	\N
\.


--
-- Data for Name: issues; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.issues (id, created_at, created_by, updated_at, updated_by, assignee, comments, description, due_date, issue_type, priority, reporter, resolution, resolved_at, reviewer, status, title, project_id) FROM stdin;
\.


--
-- Data for Name: kpis; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.kpis (id, created_at, created_by, updated_at, updated_by, current, name, status, target, phase_id) FROM stdin;
\.


--
-- Data for Name: meetings; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.meetings (id, created_at, created_by, updated_at, updated_by, actual_end_at, actual_start_at, attendees, description, location, meeting_type, minutes, organizer, scheduled_at, status, title, project_id) FROM stdin;
\.


--
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.outbox_events (id, aggregate_id, aggregate_type, created_at, event_type, idempotency_key, last_error, payload, published_at, retry_count, status) FROM stdin;
\.


--
-- Data for Name: part_members; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.part_members (part_id, user_id) FROM stdin;
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
part-001-01	user-dev-002
part-001-01	user-ba-001
part-001-02	user-dev-001
part-001-02	user-dev-003
part-001-03	user-qa-001
part-002-01	user-dev-001
part-002-01	user-dev-003
part-002-02	user-ba-001
part-002-03	user-dev-003
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.parts (id, created_at, created_by, updated_at, updated_by, description, end_date, leader_id, leader_name, name, progress, start_date, status, project_id) FROM stdin;
part-001-01	2026-01-23 14:54:00.229892	\N	2026-01-23 14:54:00.229892	\N	보험청구 처리를 위한 AI/ML 모델 개발팀	2026-06-30	user-dev-002	Choi Eunji	AI 개발	30	2026-01-15	ACTIVE	proj-001
part-001-02	2026-01-23 14:54:00.229892	\N	2026-01-23 14:54:00.229892	\N	백엔드 API 및 서비스 개발	2026-06-30	user-dev-001	Park Sungho	백엔드 개발	25	2026-01-15	ACTIVE	proj-001
part-001-03	2026-01-23 14:54:00.229892	\N	2026-01-23 14:54:00.229892	\N	품질 보증 및 테스트팀	2026-06-30	user-qa-001	Han Soojin	QA 및 테스트	20	2026-01-15	ACTIVE	proj-001
part-002-01	2026-01-23 14:54:00.229892	\N	2026-01-23 14:54:00.229892	\N	iOS 및 Android 앱 개발	2026-08-31	user-dev-001	Park Sungho	모바일 개발	10	2026-02-01	ACTIVE	proj-002
part-002-02	2026-01-23 14:54:00.229892	\N	2026-01-23 14:54:00.229892	\N	사용자 경험 및 인터페이스 디자인	2026-08-31	\N	\N	UX/UI 디자인	5	2026-02-01	ACTIVE	proj-002
part-002-03	2026-01-23 14:54:00.229892	\N	2026-01-23 14:54:00.229892	\N	모바일 백엔드 API 개발	2026-08-31	user-dev-003	Jung Wonjae	백엔드 API	0	2026-02-01	ACTIVE	proj-002
\.


--
-- Data for Name: phase_gates; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.phase_gates (id, created_at, created_by, updated_at, updated_by, approved_at, approved_by, comments, rejected_at, rejected_by, status, submitted_at, submitted_by, phase_id) FROM stdin;
\.


--
-- Data for Name: phases; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.phases (id, created_at, created_by, updated_at, updated_by, description, end_date, gate_status, name, order_num, progress, start_date, status, track_type, project_id) FROM stdin;
phase-001-01	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	AI 보험심사 처리에 대한 모든 요구사항 수집 및 분석	2026-01-31	APPROVED	요구사항 분석	1	100	2026-01-15	COMPLETED	COMMON	proj-001
phase-001-02	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	시스템 아키텍처 및 데이터 모델 설계	2026-02-28	PENDING	시스템 설계	2	60	2026-02-01	IN_PROGRESS	COMMON	proj-001
phase-001-03	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	문서 처리 및 사기 탐지를 위한 AI 모델 개발 및 훈련	2026-04-15	\N	AI 모델 개발	3	0	2026-03-01	NOT_STARTED	AI	proj-001
phase-001-04	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	백엔드 서비스 및 API 구현	2026-05-15	\N	백엔드 개발	4	0	2026-03-15	NOT_STARTED	SI	proj-001
phase-001-05	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	시스템 통합 및 종합 테스트	2026-06-15	\N	통합 및 테스트	5	0	2026-05-01	NOT_STARTED	COMMON	proj-001
phase-001-06	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	운영 환경 배포 및 사용자 교육	2026-06-30	\N	배포 및 오픈	6	0	2026-06-15	NOT_STARTED	COMMON	proj-001
phase-002-01	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	시장 니즈 조사 및 상세 프로젝트 계획 수립	2026-02-28	PENDING	시장조사 및 기획	1	30	2026-02-01	IN_PROGRESS	COMMON	proj-002
phase-002-02	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	모바일 앱 사용자 경험 및 인터페이스 디자인	2026-03-31	\N	UX/UI 디자인	2	0	2026-03-01	NOT_STARTED	COMMON	proj-002
phase-002-03	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	iOS 및 Android 애플리케이션 개발	2026-06-30	\N	모바일 앱 개발	3	0	2026-04-01	NOT_STARTED	SI	proj-002
phase-002-04	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	모바일 플랫폼을 위한 백엔드 API 구축	2026-06-15	\N	백엔드 API 개발	4	0	2026-04-01	NOT_STARTED	SI	proj-002
phase-002-05	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	품질 보증 및 사용자 수용 테스트	2026-08-15	\N	테스트 및 QA	5	0	2026-06-15	NOT_STARTED	COMMON	proj-002
phase-002-06	2026-01-23 14:54:00.172279	\N	2026-01-23 14:54:00.172279	\N	앱스토어 등록 및 마케팅 캠페인	2026-08-31	\N	출시 및 마케팅	6	0	2026-08-15	NOT_STARTED	COMMON	proj-002
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.project_members (id, created_at, created_by, updated_at, updated_by, active, department, joined_at, role, user_email, user_id, user_name, project_id) FROM stdin;
pm-001-01	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Executive	\N	SPONSOR	sponsor.kang@insuretech.com	user-sponsor-001	Kang Daehyun	proj-001
pm-001-02	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Project Management	\N	PM	pm.kim@insuretech.com	user-pm-001	Kim Minsu	proj-001
pm-001-03	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	PMO	\N	PMO_HEAD	pmo.head@insuretech.com	user-pmo-001	James Wilson	proj-001
pm-001-04	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Development	\N	DEVELOPER	dev.park@insuretech.com	user-dev-001	Park Sungho	proj-001
pm-001-05	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Development	\N	DEVELOPER	dev.choi@insuretech.com	user-dev-002	Choi Eunji	proj-001
pm-001-06	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Development	\N	DEVELOPER	dev.jung@insuretech.com	user-dev-003	Jung Wonjae	proj-001
pm-001-07	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Quality Assurance	\N	QA	qa.han@insuretech.com	user-qa-001	Han Soojin	proj-001
pm-001-08	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Business Analysis	\N	BUSINESS_ANALYST	ba.yoon@insuretech.com	user-ba-001	Yoon Hyemi	proj-001
pm-002-01	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Executive	\N	SPONSOR	sponsor.kang@insuretech.com	user-sponsor-001	Kang Daehyun	proj-002
pm-002-02	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Project Management	\N	PM	pm.lee@insuretech.com	user-pm-002	Lee Jihye	proj-002
pm-002-03	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Development	\N	DEVELOPER	dev.park@insuretech.com	user-dev-001	Park Sungho	proj-002
pm-002-04	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Development	\N	DEVELOPER	dev.jung@insuretech.com	user-dev-003	Jung Wonjae	proj-002
pm-002-05	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	Business Analysis	\N	BUSINESS_ANALYST	ba.yoon@insuretech.com	user-ba-001	Yoon Hyemi	proj-002
pm-002-06	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	IT	\N	AUDITOR	admin@insuretech.com	user-admin-001	System Admin	proj-002
pm-demo-001	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	경영진	\N	SPONSOR	sponsor@insure.com	U001	이사장	proj-001
pm-demo-002	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	PMO	\N	PMO_HEAD	pmo@insure.com	U002	PMO 총괄	proj-001
pm-demo-003	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	IT혁신팀	\N	PM	pm@insure.com	U003	김철수	proj-001
pm-demo-004	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	AI개발팀	\N	DEVELOPER	dev@insure.com	U004	박민수	proj-001
pm-demo-005	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	품질보증팀	\N	QA	qa@insure.com	U005	최지훈	proj-001
pm-demo-006	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	보험심사팀	\N	BUSINESS_ANALYST	ba@insure.com	U006	이영희	proj-001
pm-demo-007	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	외부감리법인	\N	AUDITOR	auditor@insure.com	U007	감리인	proj-001
pm-demo-008	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	IT운영팀	\N	AUDITOR	admin@insure.com	U008	시스템관리자	proj-001
pm-demo-009	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	PMO	\N	PMO_HEAD	pmo@insure.com	U002	PMO 총괄	proj-002
pm-demo-010	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	IT혁신팀	\N	PM	pm@insure.com	U003	김철수	proj-002
pm-demo-011	2026-01-23 14:54:00.241392	\N	2026-01-23 14:54:00.241392	\N	t	AI개발팀	\N	DEVELOPER	dev@insure.com	U004	박민수	proj-002
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.projects (id, created_at, created_by, updated_at, updated_by, budget, description, end_date, name, progress, start_date, status, is_default) FROM stdin;
proj-001	2026-01-23 14:54:00.167502	user-pm-001	2026-01-23 14:54:00.167502	\N	500000000.00	AI 기반 보험 청구 처리 시스템 개발. 자동 문서 분석, 사기 탐지, 지능형 라우팅 기능 포함. 청구 처리 시간 60% 단축 및 정확도 40% 향상 목표.	2026-06-30	AI 보험심사 처리 시스템	32	2026-01-15	IN_PROGRESS	f
proj-002	2026-01-23 14:54:00.167502	user-pm-002	2026-01-23 14:54:00.167502	\N	350000000.00	보험 서비스를 위한 종합 모바일 플랫폼 구축. 보험증권 관리, 청구 제출, 실시간 상태 조회, 고객지원 통합 기능 포함. 목표: 출시 1년 내 10만 활성 사용자 확보.	2026-08-31	모바일 보험 플랫폼	12	2026-02-01	PLANNING	f
\.


--
-- Data for Name: requirement_task_links; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.requirement_task_links (requirement_id, task_id) FROM stdin;
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
req-001-01	task-001-01
req-001-01	task-001-02
req-001-02	task-001-09
req-001-02	task-001-10
req-001-03	task-001-11
\.


--
-- Data for Name: requirements; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.requirements (id, created_at, created_by, updated_at, updated_by, acceptance_criteria, actual_effort, actual_effort_hours, assignee_id, category, requirement_code, description, due_date, estimated_effort, estimated_effort_hours, last_progress_update, neo4j_node_id, page_number, priority, progress, progress_calc_method, progress_percentage, project_id, remaining_effort_hours, source_text, status, story_points, tenant_id, title, rfp_id) FROM stdin;
req-001-01	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	AI	REQ-AI-001	시스템은 스캔된 보험 문서에서 99% 정확도로 텍스트를 추출할 수 있어야 함	\N	\N	\N	\N	\N	\N	CRITICAL	60	\N	\N	proj-001	\N	\N	APPROVED	8	tenant-001	문서 OCR 처리	rfp-001
req-001-02	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	AI	REQ-AI-002	설정 가능한 민감도 임계값을 가진 ML 기반 사기 탐지 구현	\N	\N	\N	\N	\N	\N	CRITICAL	30	\N	\N	proj-001	\N	\N	ANALYZED	13	tenant-001	사기 탐지 알고리즘	rfp-001
req-001-03	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	FUNCTIONAL	REQ-SI-001	보험청구 전체 생명주기 관리를 위한 RESTful API	\N	\N	\N	\N	\N	\N	HIGH	0	\N	\N	proj-001	\N	\N	IDENTIFIED	8	tenant-001	보험청구 관리 API	rfp-001
req-001-04	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	INTEGRATION	REQ-SI-002	ESB를 통한 기존 보험증권 관리 시스템과의 연동	\N	\N	\N	\N	\N	\N	HIGH	0	\N	\N	proj-001	\N	\N	IDENTIFIED	13	tenant-001	레거시 시스템 연동	rfp-001
req-001-05	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	SECURITY	REQ-SEC-001	모든 개인정보는 AES-256을 사용하여 저장 및 전송 시 암호화되어야 함	\N	\N	\N	\N	\N	\N	CRITICAL	0	\N	\N	proj-001	\N	\N	APPROVED	5	tenant-001	데이터 암호화	rfp-001
req-001-06	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	NON_FUNCTIONAL	REQ-NF-001	시스템은 2초 미만의 응답 시간으로 1000명의 동시 사용자를 처리할 수 있어야 함	\N	\N	\N	\N	\N	\N	HIGH	0	\N	\N	proj-001	\N	\N	ANALYZED	8	tenant-001	성능 요구사항	rfp-001
req-002-01	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	SECURITY	REQ-MOB-001	모바일 앱을 위한 생체인식 및 비밀번호 기반 인증	\N	\N	\N	\N	\N	\N	CRITICAL	0	\N	\N	proj-002	\N	\N	IDENTIFIED	5	tenant-001	사용자 인증	rfp-002
req-002-02	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	FUNCTIONAL	REQ-MOB-002	대시보드에 모든 사용자 보험증권과 주요 정보 표시	\N	\N	\N	\N	\N	\N	HIGH	0	\N	\N	proj-002	\N	\N	IDENTIFIED	8	tenant-001	보험증권 대시보드	rfp-002
req-002-03	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	FUNCTIONAL	REQ-MOB-003	사용자가 모바일에서 사진 업로드와 함께 청구를 제출할 수 있도록 허용	\N	\N	\N	\N	\N	\N	CRITICAL	0	\N	\N	proj-002	\N	\N	IDENTIFIED	13	tenant-001	청구 제출	rfp-002
req-002-04	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	FUNCTIONAL	REQ-MOB-004	청구 상태 업데이트를 위한 실시간 알림	\N	\N	\N	\N	\N	\N	MEDIUM	0	\N	\N	proj-002	\N	\N	IDENTIFIED	5	tenant-001	푸시 알림	rfp-002
req-002-05	2026-01-23 14:54:00.22341	\N	2026-01-23 14:54:00.22341	\N	\N	\N	\N	\N	NON_FUNCTIONAL	REQ-MOB-005	앱은 오프라인에서 작동하고 연결 시 데이터 동기화 가능해야 함	\N	\N	\N	\N	\N	\N	MEDIUM	0	\N	\N	proj-002	\N	\N	IDENTIFIED	8	tenant-001	오프라인 모드	rfp-002
\.


--
-- Data for Name: rfps; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.rfps (id, created_at, created_by, updated_at, updated_by, content, file_name, file_path, file_size, file_type, processing_message, processing_status, project_id, status, submitted_at, tenant_id, title) FROM stdin;
rfp-001	2026-01-23 14:54:00.218498	user-sponsor-001	2026-01-23 14:54:00.218498	\N	AI 기반 보험 청구 처리 시스템 개발을 위한 제안요청서. 주요 요구사항: 자동 문서 분석, 사기 탐지 기능, 기존 시스템과의 연동, 보험 규정 준수.	\N	\N	\N	\N	\N	COMPLETED	proj-001	APPROVED	\N	tenant-001	AI 보험심사 처리 시스템 RFP
rfp-002	2026-01-23 14:54:00.218498	user-sponsor-001	2026-01-23 14:54:00.218498	\N	보험 서비스를 위한 종합 모바일 플랫폼 구축 제안요청서. 필수 포함사항: 보험증권 관리, 청구 제출, 실시간 알림, 보안 인증, 오프라인 기능.	\N	\N	\N	\N	\N	PENDING	proj-002	SUBMITTED	\N	tenant-001	모바일 보험 플랫폼 RFP
\.


--
-- Data for Name: wbs_groups; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.wbs_groups (id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, actual_start_date, actual_end_date, weight, order_num, linked_epic_id, created_at, updated_at, created_by, updated_by) FROM stdin;
wg-001-01-01	phase-001-01	1.1	요구사항 수집	RFP 분석 및 요구사항 수집	COMPLETED	100	2026-01-15	2026-01-22	2026-01-15	2026-01-21	40	1	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-01-02	phase-001-01	1.2	이해관계자 분석	주요 이해관계자 인터뷰 및 분석	COMPLETED	100	2026-01-20	2026-01-27	2026-01-20	2026-01-26	30	2	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-01-03	phase-001-01	1.3	요구사항 검증	요구사항 문서 검토 및 승인	COMPLETED	100	2026-01-27	2026-01-31	2026-01-27	2026-01-30	30	3	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-02-01	phase-001-02	2.1	아키텍처 설계	시스템 아키텍처 및 기술 스택 정의	IN_PROGRESS	75	2026-02-01	2026-02-10	2026-02-01	\N	35	1	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-02-02	phase-001-02	2.2	데이터 모델링	데이터베이스 스키마 및 ERD 설계	IN_PROGRESS	60	2026-02-08	2026-02-18	2026-02-08	\N	30	2	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-02-03	phase-001-02	2.3	API 설계	RESTful API 명세 및 인터페이스 정의	IN_PROGRESS	40	2026-02-15	2026-02-25	2026-02-15	\N	25	3	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-02-04	phase-001-02	2.4	보안 설계	보안 아키텍처 및 인증 방식 설계	NOT_STARTED	0	2026-02-22	2026-02-28	\N	\N	10	4	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-03-01	phase-001-03	3.1	AI 개발환경 구축	ML 개발 인프라 및 파이프라인 구성	NOT_STARTED	0	2026-03-01	2026-03-10	\N	\N	20	1	epic-001-01	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-03-02	phase-001-03	3.2	OCR 모델 개발	문서 인식 및 텍스트 추출 모델	NOT_STARTED	0	2026-03-08	2026-03-25	\N	\N	30	2	epic-001-01	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-03-03	phase-001-03	3.3	사기 탐지 모델	보험 사기 탐지 ML 모델 개발	NOT_STARTED	0	2026-03-20	2026-04-10	\N	\N	35	3	epic-001-02	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-03-04	phase-001-03	3.4	모델 최적화	AI 모델 성능 튜닝 및 최적화	NOT_STARTED	0	2026-04-05	2026-04-15	\N	\N	15	4	epic-001-02	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-04-01	phase-001-04	4.1	핵심 API 개발	청구 관리 핵심 API 구현	NOT_STARTED	0	2026-03-15	2026-04-05	\N	\N	30	1	epic-001-03	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-04-02	phase-001-04	4.2	인증 서비스	OAuth2 인증/인가 서비스 구현	NOT_STARTED	0	2026-03-25	2026-04-15	\N	\N	25	2	epic-001-04	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-04-03	phase-001-04	4.3	외부 연동	레거시 시스템 연동 어댑터 개발	NOT_STARTED	0	2026-04-10	2026-04-30	\N	\N	25	3	epic-001-03	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-04-04	phase-001-04	4.4	데이터 마이그레이션	기존 데이터 이관 및 검증	NOT_STARTED	0	2026-04-25	2026-05-15	\N	\N	20	4	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-05-01	phase-001-05	5.1	통합 테스트	시스템 통합 테스트 수행	NOT_STARTED	0	2026-05-01	2026-05-20	\N	\N	35	1	epic-001-05	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-05-02	phase-001-05	5.2	성능 테스트	부하 테스트 및 성능 최적화	NOT_STARTED	0	2026-05-15	2026-06-01	\N	\N	30	2	epic-001-05	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-05-03	phase-001-05	5.3	보안 테스트	보안 취약점 점검 및 조치	NOT_STARTED	0	2026-05-25	2026-06-10	\N	\N	25	3	epic-001-04	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-05-04	phase-001-05	5.4	UAT	사용자 인수 테스트	NOT_STARTED	0	2026-06-05	2026-06-15	\N	\N	10	4	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-06-01	phase-001-06	6.1	운영 환경 구축	프로덕션 인프라 구성	NOT_STARTED	0	2026-06-15	2026-06-22	\N	\N	40	1	epic-001-06	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-06-02	phase-001-06	6.2	배포 및 오픈	시스템 배포 및 모니터링 설정	NOT_STARTED	0	2026-06-20	2026-06-28	\N	\N	35	2	epic-001-06	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-001-06-03	phase-001-06	6.3	교육 및 인수인계	운영자 교육 및 문서화	NOT_STARTED	0	2026-06-25	2026-06-30	\N	\N	25	3	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-001	\N
wg-002-01-01	phase-002-01	1.1	시장 분석	보험 모바일 앱 시장 조사	IN_PROGRESS	50	2026-02-01	2026-02-12	2026-02-01	\N	40	1	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-01-02	phase-002-01	1.2	사용자 리서치	타겟 사용자 인터뷰 및 설문	IN_PROGRESS	30	2026-02-08	2026-02-20	2026-02-08	\N	35	2	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-01-03	phase-002-01	1.3	기획 문서화	제품 요구사항 문서 작성	NOT_STARTED	0	2026-02-18	2026-02-28	\N	\N	25	3	\N	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-02-01	phase-002-02	2.1	UX 설계	사용자 경험 흐름 설계	NOT_STARTED	0	2026-03-01	2026-03-15	\N	\N	40	1	epic-002-01	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-02-02	phase-002-02	2.2	UI 디자인	비주얼 디자인 및 디자인 시스템	NOT_STARTED	0	2026-03-12	2026-03-28	\N	\N	40	2	epic-002-01	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-02-03	phase-002-02	2.3	프로토타입	인터랙티브 프로토타입 제작	NOT_STARTED	0	2026-03-25	2026-03-31	\N	\N	20	3	epic-002-01	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-03-01	phase-002-03	3.1	iOS 개발	iOS 네이티브 앱 개발	NOT_STARTED	0	2026-04-01	2026-05-31	\N	\N	45	1	epic-002-02	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-03-02	phase-002-03	3.2	Android 개발	Android 네이티브 앱 개발	NOT_STARTED	0	2026-04-01	2026-05-31	\N	\N	45	2	epic-002-02	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
wg-002-03-03	phase-002-03	3.3	공통 모듈	크로스 플랫폼 공통 로직	NOT_STARTED	0	2026-04-15	2026-06-15	\N	\N	10	3	epic-002-02	2026-01-26 08:56:32.946418	2026-01-26 08:56:32.946418	user-pm-002	\N
\.


--
-- Data for Name: wbs_item_story_links; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.wbs_item_story_links (id, wbs_item_id, story_id, linked_at, linked_by) FROM stdin;
wisl-001	wi-001-01-01-01	story-001-01	2026-01-26 08:56:32.966821	user-pm-001
wisl-002	wi-001-02-01-02	story-001-02	2026-01-26 08:56:32.966821	user-pm-001
wisl-003	wi-001-02-03-01	story-001-03	2026-01-26 08:56:32.966821	user-pm-001
wisl-004	wi-001-02-04-02	story-001-04	2026-01-26 08:56:32.966821	user-pm-001
wisl-005	wi-002-01-02-01	story-002-01	2026-01-26 08:56:32.966821	user-pm-002
\.


--
-- Data for Name: wbs_items; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, actual_start_date, actual_end_date, weight, order_num, estimated_hours, actual_hours, assignee_id, created_at, updated_at, created_by, updated_by) FROM stdin;
wi-001-01-01-01	wg-001-01-01	phase-001-01	1.1.1	RFP 문서 분석	RFP 문서 상세 분석 및 요구사항 추출	COMPLETED	100	2026-01-15	2026-01-18	2026-01-15	2026-01-17	50	1	24	20	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-01-02	wg-001-01-01	phase-001-01	1.1.2	기능 요구사항 정의	기능 요구사항 목록 작성	COMPLETED	100	2026-01-17	2026-01-20	2026-01-17	2026-01-19	30	2	16	14	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-01-03	wg-001-01-01	phase-001-01	1.1.3	비기능 요구사항 정의	성능, 보안 등 비기능 요구사항 정의	COMPLETED	100	2026-01-19	2026-01-22	2026-01-19	2026-01-21	20	3	12	12	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-02-01	wg-001-01-02	phase-001-01	1.2.1	이해관계자 식별	주요 이해관계자 목록 작성	COMPLETED	100	2026-01-20	2026-01-22	2026-01-20	2026-01-22	30	1	8	8	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-02-02	wg-001-01-02	phase-001-01	1.2.2	인터뷰 수행	이해관계자 인터뷰 진행	COMPLETED	100	2026-01-22	2026-01-25	2026-01-22	2026-01-24	50	2	20	18	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-02-03	wg-001-01-02	phase-001-01	1.2.3	분석 결과 정리	인터뷰 결과 분석 및 문서화	COMPLETED	100	2026-01-25	2026-01-27	2026-01-25	2026-01-26	20	3	8	6	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-03-01	wg-001-01-03	phase-001-01	1.3.1	요구사항 검토회의	요구사항 리뷰 미팅 진행	COMPLETED	100	2026-01-27	2026-01-28	2026-01-27	2026-01-27	40	1	8	8	user-pm-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-03-02	wg-001-01-03	phase-001-01	1.3.2	피드백 반영	검토 의견 반영 및 수정	COMPLETED	100	2026-01-28	2026-01-30	2026-01-28	2026-01-29	30	2	12	10	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-01-03-03	wg-001-01-03	phase-001-01	1.3.3	최종 승인	요구사항 최종 승인 획득	COMPLETED	100	2026-01-30	2026-01-31	2026-01-30	2026-01-30	30	3	4	4	user-sponsor-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-01-01	wg-001-02-01	phase-001-02	2.1.1	기술 스택 선정	프레임워크 및 라이브러리 선정	COMPLETED	100	2026-02-01	2026-02-03	2026-02-01	2026-02-03	25	1	16	16	user-dev-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-01-02	wg-001-02-01	phase-001-02	2.1.2	시스템 아키텍처	전체 시스템 아키텍처 설계	IN_PROGRESS	80	2026-02-03	2026-02-07	2026-02-03	\N	35	2	24	20	user-dev-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-01-03	wg-001-02-01	phase-001-02	2.1.3	인프라 설계	클라우드 인프라 아키텍처 설계	IN_PROGRESS	50	2026-02-06	2026-02-10	2026-02-06	\N	40	3	20	10	user-dev-003	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-02-01	wg-001-02-02	phase-001-02	2.2.1	ERD 설계	엔티티 관계 다이어그램 작성	COMPLETED	100	2026-02-08	2026-02-11	2026-02-08	2026-02-10	40	1	20	18	user-dev-002	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-02-02	wg-001-02-02	phase-001-02	2.2.2	스키마 정의	데이터베이스 스키마 상세 정의	IN_PROGRESS	60	2026-02-11	2026-02-15	2026-02-11	\N	35	2	16	10	user-dev-002	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-02-03	wg-001-02-02	phase-001-02	2.2.3	인덱스 설계	쿼리 최적화를 위한 인덱스 설계	NOT_STARTED	0	2026-02-15	2026-02-18	\N	\N	25	3	12	0	user-dev-002	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-03-01	wg-001-02-03	phase-001-02	2.3.1	API 명세 작성	OpenAPI 스펙 문서 작성	IN_PROGRESS	70	2026-02-15	2026-02-19	2026-02-15	\N	50	1	20	14	user-dev-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-03-02	wg-001-02-03	phase-001-02	2.3.2	에러 코드 정의	표준 에러 응답 체계 정의	NOT_STARTED	0	2026-02-19	2026-02-22	\N	\N	25	2	8	0	user-dev-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-03-03	wg-001-02-03	phase-001-02	2.3.3	API 검증	API 설계 리뷰 및 검증	NOT_STARTED	0	2026-02-22	2026-02-25	\N	\N	25	3	8	0	user-qa-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-04-01	wg-001-02-04	phase-001-02	2.4.1	인증 방식 설계	OAuth2/JWT 인증 아키텍처	NOT_STARTED	0	2026-02-22	2026-02-25	\N	\N	50	1	16	0	user-dev-003	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-02-04-02	wg-001-02-04	phase-001-02	2.4.2	암호화 설계	데이터 암호화 전략 수립	NOT_STARTED	0	2026-02-25	2026-02-28	\N	\N	50	2	12	0	user-dev-003	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-03-01-01	wg-001-03-01	phase-001-03	3.1.1	ML 파이프라인 구축	MLOps 파이프라인 설정	NOT_STARTED	0	2026-03-01	2026-03-05	\N	\N	50	1	24	0	user-dev-002	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-03-01-02	wg-001-03-01	phase-001-03	3.1.2	학습 환경 구성	GPU 클러스터 및 학습 환경	NOT_STARTED	0	2026-03-05	2026-03-10	\N	\N	50	2	20	0	user-dev-002	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-03-02-01	wg-001-03-02	phase-001-03	3.2.1	OCR 데이터 수집	학습용 문서 데이터셋 구축	NOT_STARTED	0	2026-03-08	2026-03-15	\N	\N	30	1	32	0	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-03-02-02	wg-001-03-02	phase-001-03	3.2.2	OCR 모델 훈련	Transformer 기반 OCR 모델 학습	NOT_STARTED	0	2026-03-15	2026-03-25	\N	\N	70	2	60	0	user-dev-002	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-03-03-01	wg-001-03-03	phase-001-03	3.3.1	사기 패턴 분석	과거 사기 케이스 분석	NOT_STARTED	0	2026-03-20	2026-03-28	\N	\N	35	1	24	0	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-001-03-03-02	wg-001-03-03	phase-001-03	3.3.2	탐지 모델 개발	XGBoost/Random Forest 앙상블	NOT_STARTED	0	2026-03-28	2026-04-10	\N	\N	65	2	60	0	user-dev-002	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-001	\N
wi-002-01-01-01	wg-002-01-01	phase-002-01	1.1.1	경쟁사 앱 분석	주요 경쟁 앱 기능 비교	IN_PROGRESS	70	2026-02-01	2026-02-06	2026-02-01	\N	50	1	16	12	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-002	\N
wi-002-01-01-02	wg-002-01-01	phase-002-01	1.1.2	시장 트렌드 조사	모바일 보험 시장 트렌드	IN_PROGRESS	40	2026-02-06	2026-02-12	2026-02-06	\N	50	2	20	8	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-002	\N
wi-002-01-02-01	wg-002-01-02	phase-002-01	1.2.1	페르소나 정의	목표 사용자 페르소나 작성	IN_PROGRESS	50	2026-02-08	2026-02-13	2026-02-08	\N	40	1	12	6	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-002	\N
wi-002-01-02-02	wg-002-01-02	phase-002-01	1.2.2	사용자 인터뷰	잠재 사용자 심층 인터뷰	NOT_STARTED	0	2026-02-13	2026-02-20	\N	\N	60	2	24	0	user-ba-001	2026-01-26 08:56:32.951833	2026-01-26 08:56:32.951833	user-pm-002	\N
\.


--
-- Data for Name: wbs_tasks; Type: TABLE DATA; Schema: project; Owner: pms_user
--

COPY project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by, updated_by) FROM stdin;
wt-001-01-01-01-01	wi-001-01-01-01	wg-001-01-01	phase-001-01	1.1.1.1	RFP 문서 수령	RFP 원본 문서 확보	COMPLETED	100	20	1	2	2	user-ba-001	task-001-01	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-01-01-01-02	wi-001-01-01-01	wg-001-01-01	phase-001-01	1.1.1.2	RFP 구조 분석	문서 구조 및 섹션 분석	COMPLETED	100	30	2	6	5	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-01-01-01-03	wi-001-01-01-01	wg-001-01-01	phase-001-01	1.1.1.3	요구사항 추출	개별 요구사항 항목 추출	COMPLETED	100	50	3	16	13	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-01-01-02-01	wi-001-01-01-02	wg-001-01-01	phase-001-01	1.1.2.1	기능 분류	기능 요구사항 카테고리 분류	COMPLETED	100	40	1	6	5	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-01-01-02-02	wi-001-01-01-02	wg-001-01-01	phase-001-01	1.1.2.2	우선순위 지정	기능별 우선순위 결정	COMPLETED	100	30	2	4	4	user-pm-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-01-01-02-03	wi-001-01-01-02	wg-001-01-01	phase-001-01	1.1.2.3	문서화	기능 요구사항 문서 작성	COMPLETED	100	30	3	6	5	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-01-01	wi-001-02-01-01	wg-001-02-01	phase-001-02	2.1.1.1	기술 후보 조사	사용 가능한 기술 스택 조사	COMPLETED	100	30	1	8	8	user-dev-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-01-02	wi-001-02-01-01	wg-001-02-01	phase-001-02	2.1.1.2	기술 비교 평가	성능/확장성/비용 비교	COMPLETED	100	40	2	4	4	user-dev-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-01-03	wi-001-02-01-01	wg-001-02-01	phase-001-02	2.1.1.3	최종 선정	기술 스택 최종 결정	COMPLETED	100	30	3	4	4	user-dev-001	task-001-04	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-02-01	wi-001-02-01-02	wg-001-02-01	phase-001-02	2.1.2.1	컴포넌트 정의	시스템 컴포넌트 식별	COMPLETED	100	25	1	6	6	user-dev-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-02-02	wi-001-02-01-02	wg-001-02-01	phase-001-02	2.1.2.2	인터페이스 설계	컴포넌트 간 인터페이스 정의	COMPLETED	100	25	2	8	8	user-dev-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-02-03	wi-001-02-01-02	wg-001-02-01	phase-001-02	2.1.2.3	배포 아키텍처	배포 및 스케일링 설계	IN_PROGRESS	60	30	3	6	4	user-dev-003	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-02-04	wi-001-02-01-02	wg-001-02-01	phase-001-02	2.1.2.4	아키텍처 문서화	ADR 및 설계 문서 작성	NOT_STARTED	0	20	4	4	0	user-dev-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-03-01	wi-001-02-01-03	wg-001-02-01	phase-001-02	2.1.3.1	VPC 설계	AWS VPC 및 네트워크 설계	COMPLETED	100	35	1	6	6	user-dev-003	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-03-02	wi-001-02-01-03	wg-001-02-01	phase-001-02	2.1.3.2	EKS 클러스터 설계	Kubernetes 클러스터 구성	IN_PROGRESS	40	40	2	8	3	user-dev-003	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-01-03-03	wi-001-02-01-03	wg-001-02-01	phase-001-02	2.1.3.3	DR 계획	재해 복구 계획 수립	NOT_STARTED	0	25	3	6	0	user-dev-003	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-02-01-01	wi-001-02-02-01	wg-001-02-02	phase-001-02	2.2.1.1	엔티티 식별	핵심 엔티티 도출	COMPLETED	100	30	1	6	5	user-dev-002	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-02-01-02	wi-001-02-02-01	wg-001-02-02	phase-001-02	2.2.1.2	관계 정의	엔티티 간 관계 설정	COMPLETED	100	40	2	8	8	user-dev-002	task-001-05	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-02-01-03	wi-001-02-02-01	wg-001-02-02	phase-001-02	2.2.1.3	ERD 문서화	ERD 다이어그램 작성	COMPLETED	100	30	3	6	5	user-dev-002	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-02-02-01	wi-001-02-02-02	wg-001-02-02	phase-001-02	2.2.2.1	테이블 설계	물리 테이블 스키마 정의	COMPLETED	100	40	1	8	8	user-dev-002	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-02-02-02	wi-001-02-02-02	wg-001-02-02	phase-001-02	2.2.2.2	제약조건 정의	PK, FK, 제약조건 설정	IN_PROGRESS	50	35	2	4	2	user-dev-002	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-02-02-03	wi-001-02-02-02	wg-001-02-02	phase-001-02	2.2.2.3	마이그레이션 작성	DB 마이그레이션 스크립트	NOT_STARTED	0	25	3	4	0	user-dev-002	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-03-01-01	wi-001-02-03-01	wg-001-02-03	phase-001-02	2.3.1.1	API 엔드포인트 정의	REST 엔드포인트 목록 작성	COMPLETED	100	30	1	6	6	user-dev-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-03-01-02	wi-001-02-03-01	wg-001-02-03	phase-001-02	2.3.1.2	Request/Response 설계	요청/응답 스키마 정의	COMPLETED	100	35	2	8	8	user-dev-001	task-001-06	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-001-02-03-01-03	wi-001-02-03-01	wg-001-02-03	phase-001-02	2.3.1.3	OpenAPI 문서화	Swagger/OpenAPI 스펙 작성	IN_PROGRESS	40	35	3	6	2	user-dev-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-001	\N
wt-002-01-01-01-01	wi-002-01-01-01	wg-002-01-01	phase-002-01	1.1.1.1	앱 다운로드	경쟁사 앱 설치 및 계정 생성	COMPLETED	100	20	1	2	2	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
wt-002-01-01-01-02	wi-002-01-01-01	wg-002-01-01	phase-002-01	1.1.1.2	기능 분석	핵심 기능 사용 및 분석	IN_PROGRESS	70	50	2	8	6	user-ba-001	task-002-01	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
wt-002-01-01-01-03	wi-002-01-01-01	wg-002-01-01	phase-002-01	1.1.1.3	비교표 작성	기능 비교 매트릭스 작성	IN_PROGRESS	50	30	3	6	3	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
wt-002-01-01-02-01	wi-002-01-01-02	wg-002-01-01	phase-002-01	1.1.2.1	리포트 조사	시장 조사 리포트 수집	IN_PROGRESS	60	40	1	8	5	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
wt-002-01-01-02-02	wi-002-01-01-02	wg-002-01-01	phase-002-01	1.1.2.2	트렌드 분석	주요 트렌드 분석 및 정리	IN_PROGRESS	30	35	2	8	2	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
wt-002-01-01-02-03	wi-002-01-01-02	wg-002-01-01	phase-002-01	1.1.2.3	기회 식별	시장 기회 및 갭 분석	NOT_STARTED	0	25	3	4	0	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
wt-002-01-02-01-01	wi-002-01-02-01	wg-002-01-02	phase-002-01	1.2.1.1	세그먼트 정의	사용자 세그먼트 분류	COMPLETED	100	40	1	4	4	user-ba-001	\N	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
wt-002-01-02-01-02	wi-002-01-02-01	wg-002-01-02	phase-002-01	1.2.1.2	페르소나 작성	상세 페르소나 문서 작성	IN_PROGRESS	30	60	2	8	2	user-ba-001	task-002-02	2026-01-26 08:56:32.958178	2026-01-26 08:56:32.958178	user-pm-002	\N
\.


--
-- Data for Name: kanban_columns; Type: TABLE DATA; Schema: task; Owner: pms_user
--

COPY task.kanban_columns (id, created_at, created_by, updated_at, updated_by, color, is_bottleneck_column, name, order_num, project_id, wip_limit, wip_limit_hard, wip_limit_soft) FROM stdin;
col-001-01	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#6B7280	f	백로그	1	proj-001	\N	\N	\N
col-001-02	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#3B82F6	f	할 일	2	proj-001	10	\N	\N
col-001-03	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#F59E0B	f	진행 중	3	proj-001	5	\N	\N
col-001-04	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#8B5CF6	f	검토	4	proj-001	3	\N	\N
col-001-05	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#10B981	f	완료	5	proj-001	\N	\N	\N
col-002-01	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#6B7280	f	백로그	1	proj-002	\N	\N	\N
col-002-02	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#3B82F6	f	할 일	2	proj-002	8	\N	\N
col-002-03	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#F59E0B	f	진행 중	3	proj-002	4	\N	\N
col-002-04	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#8B5CF6	f	검토	4	proj-002	3	\N	\N
col-002-05	2026-01-23 14:54:00.176829	\N	2026-01-23 14:54:00.176829	\N	#10B981	f	완료	5	proj-002	\N	\N	\N
\.


--
-- Data for Name: sprints; Type: TABLE DATA; Schema: task; Owner: pms_user
--

COPY task.sprints (id, created_at, created_by, updated_at, updated_by, conwip_limit, enable_wip_validation, end_date, goal, name, neo4j_node_id, project_id, start_date, status) FROM stdin;
sprint-001-01	2026-01-23 14:54:00.189485	\N	2026-01-23 14:54:00.189485	\N	\N	t	2026-01-31	프로젝트 기반 구축 및 요구사항 분석 완료	스프린트 1 - 기반 구축	\N	proj-001	2026-01-15	COMPLETED
sprint-001-02	2026-01-23 14:54:00.189485	\N	2026-01-23 14:54:00.189485	\N	\N	t	2026-02-14	시스템 설계 및 아키텍처 완료	스프린트 2 - 설계	\N	proj-001	2026-02-01	ACTIVE
sprint-001-03	2026-01-23 14:54:00.189485	\N	2026-01-23 14:54:00.189485	\N	\N	t	2026-02-28	핵심 AI 모델 개발	스프린트 3 - AI 개발	\N	proj-001	2026-02-15	PLANNED
sprint-002-01	2026-01-23 14:54:00.189485	\N	2026-01-23 14:54:00.189485	\N	\N	t	2026-02-14	시장조사 및 기획	스프린트 1 - 리서치	\N	proj-002	2026-02-01	ACTIVE
sprint-001-04	2026-01-26 08:56:33.003887	\N	2026-01-26 08:56:33.003887	\N	15	t	2026-03-14	OCR 데이터 수집 및 기초 모델 개발	스프린트 4 - AI 모델 기초	\N	proj-001	2026-03-01	PLANNED
sprint-001-05	2026-01-26 08:56:33.003887	\N	2026-01-26 08:56:33.003887	\N	15	t	2026-03-28	OCR/사기탐지 모델 훈련 및 검증	스프린트 5 - AI 모델 훈련	\N	proj-001	2026-03-15	PLANNED
sprint-002-02	2026-01-26 08:56:33.003887	\N	2026-01-26 08:56:33.003887	\N	12	t	2026-02-28	UX 리서치 완료 및 와이어프레임	스프린트 2 - UX 설계	\N	proj-002	2026-02-15	PLANNED
sprint-002-03	2026-01-26 08:56:33.003887	\N	2026-01-26 08:56:33.003887	\N	12	t	2026-03-14	UI 디자인 및 프로토타입	스프린트 3 - UI 디자인	\N	proj-002	2026-03-01	PLANNED
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: task; Owner: pms_user
--

COPY task.tasks (id, created_at, created_by, updated_at, updated_by, assignee_id, description, due_date, order_num, phase_id, priority, sprint_id, status, tags, title, track_type, user_story_id, column_id, requirement_id) FROM stdin;
task-001-06	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-001	모든 엔드포인트에 대한 OpenAPI 명세서 작성	2026-02-18	1	phase-001-02	HIGH	\N	REVIEW	api,documentation	API 명세서 초안	SI	story-001-03	col-001-04	\N
task-001-11	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-001	보험청구 관리를 위한 REST API 구축	2026-04-15	3	phase-001-04	HIGH	\N	TODO	api,backend	보험청구 API 구현	SI	story-001-03	col-001-01	\N
task-001-03	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-pm-001	문서화된 요구사항에 대한 공식 승인 획득	2026-01-31	3	phase-001-01	CRITICAL	\N	DONE	requirements,approval	요구사항 승인	COMMON	\N	col-001-05	\N
task-001-07	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-003	보안 조치 검토 및 문서화	2026-02-25	1	phase-001-02	HIGH	\N	TODO	security,architecture	보안 아키텍처 검토	COMMON	\N	col-001-02	\N
task-001-08	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-002	AI 모델 훈련을 위한 개발 환경 구성	2026-03-05	2	phase-001-03	MEDIUM	\N	TODO	ai,setup	ML 개발환경 구축	AI	\N	col-001-02	\N
task-001-09	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-002	문서 유형 분류를 위한 AI 모델 개발 및 훈련	2026-03-20	1	phase-001-03	HIGH	\N	TODO	ai,ml,training	문서 분류 모델 훈련	AI	\N	col-001-01	\N
task-001-10	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-002	과거 데이터를 활용한 사기 탐지 모델 개발	2026-04-01	2	phase-001-03	CRITICAL	\N	TODO	ai,fraud,ml	사기 탐지 알고리즘 구현	AI	\N	col-001-01	\N
task-001-12	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-003	문서 업로드 및 처리 서비스 구축	2026-04-20	4	phase-001-04	MEDIUM	\N	TODO	backend,files	문서 업로드 서비스 구현	SI	\N	col-001-01	\N
task-002-01	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-ba-001	경쟁 모바일 보험 앱 분석	2026-02-15	1	phase-002-01	HIGH	\N	IN_PROGRESS	research,competitor	경쟁사 분석	COMMON	\N	col-002-03	\N
task-001-01	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-ba-001	RFP 문서의 모든 요구사항 분석 및 문서화	2026-01-20	1	phase-001-01	HIGH	\N	DONE	requirements,documentation	RFP 요구사항 문서화	COMMON	story-001-01	col-001-05	\N
task-001-02	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-ba-001	핵심 이해관계자 인터뷰를 통한 요구사항 수집	2026-01-25	2	phase-001-01	HIGH	\N	DONE	requirements,stakeholder	이해관계자 인터뷰	COMMON	story-001-01	col-001-05	\N
task-001-04	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-001	고수준 시스템 아키텍처 다이어그램 작성	2026-02-15	1	phase-001-02	CRITICAL	\N	IN_PROGRESS	architecture,design	시스템 아키텍처 설계	SI	story-001-02	col-001-03	\N
task-001-05	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-002	데이터베이스 스키마 및 엔티티 관계 설계	2026-02-20	2	phase-001-02	HIGH	\N	IN_PROGRESS	database,design	데이터 모델 설계	SI	story-001-02	col-001-03	\N
task-002-02	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-ba-001	조사 기반 목표 사용자 페르소나 작성	2026-02-20	2	phase-002-01	MEDIUM	\N	IN_PROGRESS	research,ux	사용자 페르소나 개발	COMMON	\N	col-002-03	\N
task-002-03	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-pm-002	MVP 출시를 위한 기능 우선순위 결정	2026-02-25	1	phase-002-01	HIGH	\N	TODO	planning,mvp	기능 우선순위 선정	COMMON	\N	col-002-02	\N
task-002-04	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	\N	주요 앱 화면 와이어프레임 작성	2026-03-10	2	phase-002-02	HIGH	\N	TODO	ux,design	와이어프레임 디자인	COMMON	\N	col-002-02	\N
task-002-05	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	\N	종합 디자인 시스템 및 스타일 가이드 작성	2026-03-20	1	phase-002-02	MEDIUM	\N	TODO	design,ui	비주얼 디자인 시스템	COMMON	\N	col-002-01	\N
task-002-06	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-001	Swift로 iOS 프로젝트 설정	2026-04-05	2	phase-002-03	MEDIUM	\N	TODO	ios,mobile	iOS 앱 초기 설정	SI	\N	col-002-01	\N
task-002-07	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-003	Kotlin으로 Android 프로젝트 설정	2026-04-05	3	phase-002-03	MEDIUM	\N	TODO	android,mobile	Android 앱 초기 설정	SI	\N	col-002-01	\N
task-002-08	2026-01-23 14:54:00.181143	\N	2026-01-23 14:54:00.181143	\N	user-dev-001	사용자 인증 엔드포인트 구현	2026-04-15	4	phase-002-04	CRITICAL	\N	TODO	api,auth,backend	인증 API 구현	SI	\N	col-002-01	\N
task-001-13	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-qa-001	통합 테스트 및 성능 테스트 계획서 작성	2026-05-05	5	phase-001-05	HIGH	\N	TODO	qa,testing,planning	테스트 계획서 작성	COMMON	\N	col-001-01	\N
task-001-14	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-qa-001	E2E 테스트 케이스 설계 및 문서화	2026-05-10	6	phase-001-05	HIGH	\N	TODO	qa,testcase	테스트 케이스 설계	COMMON	\N	col-001-01	\N
task-001-15	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-qa-001	Selenium/Playwright 기반 자동화 환경	2026-05-15	7	phase-001-05	MEDIUM	\N	TODO	qa,automation	자동화 테스트 환경 구축	COMMON	\N	col-001-01	\N
task-001-16	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-ba-001	문서 분류를 위한 학습 데이터 라벨링	2026-03-15	8	phase-001-03	HIGH	\N	TODO	ai,data,labeling	AI 학습 데이터 라벨링	AI	\N	col-001-01	\N
task-001-17	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-ba-001	과거 사기 사례 데이터 분석 및 패턴 추출	2026-03-25	9	phase-001-03	CRITICAL	\N	TODO	ai,fraud,analysis	사기 패턴 데이터 분석	AI	\N	col-001-01	\N
task-001-18	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-pm-001	아키텍처 설계 리뷰 미팅 진행	2026-02-12	3	phase-001-02	HIGH	\N	TODO	meeting,review	설계 검토 회의 주관	COMMON	\N	col-001-02	\N
task-001-19	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-pm-001	사용자 인수 테스트 일정 및 시나리오 계획	2026-06-01	4	phase-001-05	HIGH	\N	TODO	uat,planning	UAT 계획 수립	COMMON	\N	col-001-02	\N
task-001-20	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-sponsor-001	운영 환경 배포 최종 승인	2026-06-25	5	phase-001-06	CRITICAL	\N	TODO	approval,deployment	오픈 승인	COMMON	\N	col-001-02	\N
task-002-09	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	\N	Figma 기반 디자인 시스템 설정	2026-03-15	5	phase-002-02	HIGH	\N	TODO	design,figma	디자인 시스템 구축	COMMON	\N	col-002-01	\N
task-002-10	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-dev-001	iOS/Android 공통 API 클라이언트 모듈	2026-04-20	6	phase-002-03	HIGH	\N	TODO	mobile,api	API 클라이언트 구현	SI	\N	col-002-01	\N
task-002-11	2026-01-26 08:56:33.006317	\N	2026-01-26 08:56:33.006317	\N	user-dev-003	Firebase 기반 푸시 알림 백엔드	2026-05-15	7	phase-002-04	MEDIUM	\N	TODO	backend,push	푸시 알림 서비스	SI	\N	col-002-01	\N
\.


--
-- Data for Name: user_stories; Type: TABLE DATA; Schema: task; Owner: pms_user
--

COPY task.user_stories (id, created_at, created_by, updated_at, updated_by, acceptance_criteria, assignee_id, description, epic, priority, priority_order, project_id, status, story_points, title, sprint_id, feature_id, wbs_item_id) FROM stdin;
story-001-03	2026-01-23 14:54:00.194304	\N	2026-01-23 14:54:00.194304	\N	\N	\N	개발자로서, RESTful API를 통해 외부 시스템이 보험청구 관리 시스템과 연동할 수 있게 하고 싶습니다	API 개발	HIGH	\N	proj-001	SELECTED	8	보험청구 API 연동	sprint-001-02	\N	wi-001-02-03-01
story-001-04	2026-01-23 14:54:00.194304	\N	2026-01-23 14:54:00.194304	\N	\N	\N	보안 담당자로서, 모든 개인정보가 암호화되어 규정을 준수할 수 있게 하고 싶습니다	보안	CRITICAL	\N	proj-001	BACKLOG	5	데이터 암호화 구현	\N	\N	wi-001-02-04-02
story-002-01	2026-01-23 14:54:00.194304	\N	2026-01-23 14:54:00.194304	\N	\N	\N	제품 오너로서, 사용자 리서치 인사이트를 확보하여 더 나은 UX를 설계하고 싶습니다	리서치	HIGH	\N	proj-002	IN_PROGRESS	5	사용자 리서치 분석	sprint-002-01	\N	wi-002-01-02-01
story-001-05	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	AI 엔지니어로서, GPU 클러스터에서 모델을 훈련할 수 있는 환경이 필요합니다	AI 개발	HIGH	\N	proj-001	BACKLOG	8	AI 모델 훈련 환경 구축	\N	\N	wi-001-03-01-01
story-001-06	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	QA 담당자로서, OCR 정확도가 99% 이상인지 검증할 수 있어야 합니다	품질 보증	HIGH	\N	proj-001	BACKLOG	5	OCR 정확도 검증	\N	\N	wi-001-03-02-02
story-001-07	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	개발자로서, 기존 보험증권 시스템과 데이터를 주고받을 수 있어야 합니다	시스템 연동	CRITICAL	\N	proj-001	BACKLOG	13	레거시 시스템 연동 어댑터	\N	\N	\N
story-001-08	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	DevOps 엔지니어로서, CI/CD 파이프라인을 통해 자동 배포할 수 있어야 합니다	DevOps	MEDIUM	\N	proj-001	BACKLOG	8	배포 자동화 파이프라인	\N	\N	\N
story-002-02	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	사용자로서, 생체인식 또는 비밀번호로 앱에 로그인할 수 있어야 합니다	인증	CRITICAL	\N	proj-002	BACKLOG	5	로그인 화면 구현	\N	\N	\N
story-002-03	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	사용자로서, 내 보험증권 목록을 대시보드에서 한눈에 볼 수 있어야 합니다	UI/UX	HIGH	\N	proj-002	BACKLOG	8	보험증권 목록 조회	\N	\N	\N
story-002-04	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	사용자로서, 모바일에서 사진과 함께 보험 청구를 제출할 수 있어야 합니다	청구 관리	CRITICAL	\N	proj-002	BACKLOG	13	청구 제출 기능	\N	\N	\N
story-002-05	2026-01-26 08:56:33.001085	\N	2026-01-26 08:56:33.001085	\N	\N	\N	사용자로서, 청구 상태가 변경되면 푸시 알림을 받을 수 있어야 합니다	알림	MEDIUM	\N	proj-002	BACKLOG	5	푸시 알림 수신	\N	\N	\N
story-001-01	2026-01-23 14:54:00.194304	\N	2026-01-23 14:54:00.194304	\N	\N	\N	보험심사 담당자로서, 스캔한 문서를 업로드하여 시스템이 자동으로 텍스트를 추출할 수 있게 하고 싶습니다	문서 처리	CRITICAL	\N	proj-001	COMPLETED	8	OCR 문서 업로드	sprint-001-01	\N	wi-001-01-01-01
story-001-02	2026-01-23 14:54:00.194304	\N	2026-01-23 14:54:00.194304	\N	\N	\N	사기 분석가로서, 사기 위험 점수를 확인하여 조사 우선순위를 정할 수 있게 하고 싶습니다	사기 탐지	CRITICAL	\N	proj-001	IN_PROGRESS	13	사기 탐지 대시보드	sprint-001-02	\N	wi-001-02-01-02
\.


--
-- Data for Name: user_story_requirement_links; Type: TABLE DATA; Schema: task; Owner: pms_user
--

COPY task.user_story_requirement_links (user_story_id, requirement_id) FROM stdin;
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
story-001-01	req-001-01
story-001-02	req-001-02
story-001-03	req-001-03
story-001-04	req-001-05
\.


--
-- Data for Name: weekly_reports; Type: TABLE DATA; Schema: task; Owner: pms_user
--

COPY task.weekly_reports (id, created_at, created_by, updated_at, updated_by, average_wip_count, blocked_tasks, bottlenecks, completed_tasks, completion_rate, completion_trend, flow_efficiency, generated_at, generated_by, generated_content, in_progress_tasks, llm_confidence_score, llm_model, peak_wip_count, project_id, recommendations, sprint_id, story_points_completed, story_points_in_progress, story_points_planned, summary, todo_tasks, total_tasks, velocity, velocity_trend, week_end_date, week_start_date) FROM stdin;
\.


--
-- Name: backup_history backup_history_pkey; Type: CONSTRAINT; Schema: admin; Owner: pms_user
--

ALTER TABLE ONLY admin.backup_history
    ADD CONSTRAINT backup_history_pkey PRIMARY KEY (id);


--
-- Name: sync_history sync_history_pkey; Type: CONSTRAINT; Schema: admin; Owner: pms_user
--

ALTER TABLE ONLY admin.sync_history
    ADD CONSTRAINT sync_history_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: auth; Owner: pms_user
--

ALTER TABLE ONLY auth.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: auth; Owner: pms_user
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: users uk_6dotkott2kjsp8vw4d0m25fb7; Type: CONSTRAINT; Schema: auth; Owner: pms_user
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT uk_6dotkott2kjsp8vw4d0m25fb7 UNIQUE (email);


--
-- Name: role_permissions ukriljgn66b857jm4uffdqtcsmy; Type: CONSTRAINT; Schema: auth; Owner: pms_user
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT ukriljgn66b857jm4uffdqtcsmy UNIQUE (role, permission_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: pms_user
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: chat; Owner: pms_user
--

ALTER TABLE ONLY chat.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: chat; Owner: pms_user
--

ALTER TABLE ONLY chat.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: backlog_items backlog_items_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.backlog_items
    ADD CONSTRAINT backlog_items_pkey PRIMARY KEY (id);


--
-- Name: backlogs backlogs_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.backlogs
    ADD CONSTRAINT backlogs_pkey PRIMARY KEY (id);


--
-- Name: deliverables deliverables_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.deliverables
    ADD CONSTRAINT deliverables_pkey PRIMARY KEY (id);


--
-- Name: education_histories education_histories_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.education_histories
    ADD CONSTRAINT education_histories_pkey PRIMARY KEY (id);


--
-- Name: education_roadmaps education_roadmaps_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.education_roadmaps
    ADD CONSTRAINT education_roadmaps_pkey PRIMARY KEY (id);


--
-- Name: education_sessions education_sessions_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.education_sessions
    ADD CONSTRAINT education_sessions_pkey PRIMARY KEY (id);


--
-- Name: educations educations_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.educations
    ADD CONSTRAINT educations_pkey PRIMARY KEY (id);


--
-- Name: epics epics_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.epics
    ADD CONSTRAINT epics_pkey PRIMARY KEY (id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);


--
-- Name: kpis kpis_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.kpis
    ADD CONSTRAINT kpis_pkey PRIMARY KEY (id);


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: phase_gates phase_gates_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.phase_gates
    ADD CONSTRAINT phase_gates_pkey PRIMARY KEY (id);


--
-- Name: phases phases_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.phases
    ADD CONSTRAINT phases_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- Name: rfps rfps_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.rfps
    ADD CONSTRAINT rfps_pkey PRIMARY KEY (id);


--
-- Name: requirements uk_bbc2glmhm0nqq604k5a2miv8u; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.requirements
    ADD CONSTRAINT uk_bbc2glmhm0nqq604k5a2miv8u UNIQUE (requirement_code);


--
-- Name: features uk_epic_feature_name; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.features
    ADD CONSTRAINT uk_epic_feature_name UNIQUE (epic_id, name);


--
-- Name: wbs_items uk_group_wbs_item_code; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_items
    ADD CONSTRAINT uk_group_wbs_item_code UNIQUE (group_id, code);


--
-- Name: wbs_tasks uk_item_wbs_task_code; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_tasks
    ADD CONSTRAINT uk_item_wbs_task_code UNIQUE (item_id, code);


--
-- Name: outbox_events uk_ndatjktgs02jyasj8s7onvfsb; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.outbox_events
    ADD CONSTRAINT uk_ndatjktgs02jyasj8s7onvfsb UNIQUE (idempotency_key);


--
-- Name: wbs_groups uk_phase_wbs_group_code; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_groups
    ADD CONSTRAINT uk_phase_wbs_group_code UNIQUE (phase_id, code);


--
-- Name: wbs_item_story_links uk_wbs_item_story; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_item_story_links
    ADD CONSTRAINT uk_wbs_item_story UNIQUE (wbs_item_id, story_id);


--
-- Name: project_members ukaydweb1re2g5786xaugww4u0; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.project_members
    ADD CONSTRAINT ukaydweb1re2g5786xaugww4u0 UNIQUE (project_id, user_id);


--
-- Name: wbs_groups wbs_groups_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_groups
    ADD CONSTRAINT wbs_groups_pkey PRIMARY KEY (id);


--
-- Name: wbs_item_story_links wbs_item_story_links_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_item_story_links
    ADD CONSTRAINT wbs_item_story_links_pkey PRIMARY KEY (id);


--
-- Name: wbs_items wbs_items_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_items
    ADD CONSTRAINT wbs_items_pkey PRIMARY KEY (id);


--
-- Name: wbs_tasks wbs_tasks_pkey; Type: CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_tasks
    ADD CONSTRAINT wbs_tasks_pkey PRIMARY KEY (id);


--
-- Name: kanban_columns kanban_columns_pkey; Type: CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.kanban_columns
    ADD CONSTRAINT kanban_columns_pkey PRIMARY KEY (id);


--
-- Name: sprints sprints_pkey; Type: CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.sprints
    ADD CONSTRAINT sprints_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_stories user_stories_pkey; Type: CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.user_stories
    ADD CONSTRAINT user_stories_pkey PRIMARY KEY (id);


--
-- Name: weekly_reports weekly_reports_pkey; Type: CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.weekly_reports
    ADD CONSTRAINT weekly_reports_pkey PRIMARY KEY (id);


--
-- Name: idx_epics_phase_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_epics_phase_id ON project.epics USING btree (phase_id);


--
-- Name: idx_features_epic_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_features_epic_id ON project.features USING btree (epic_id);


--
-- Name: idx_features_priority; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_features_priority ON project.features USING btree (priority);


--
-- Name: idx_features_status; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_features_status ON project.features USING btree (status);


--
-- Name: idx_features_wbs_group_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_features_wbs_group_id ON project.features USING btree (wbs_group_id);


--
-- Name: idx_wbs_groups_linked_epic_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_groups_linked_epic_id ON project.wbs_groups USING btree (linked_epic_id);


--
-- Name: idx_wbs_groups_order; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_groups_order ON project.wbs_groups USING btree (order_num);


--
-- Name: idx_wbs_groups_phase_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_groups_phase_id ON project.wbs_groups USING btree (phase_id);


--
-- Name: idx_wbs_groups_status; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_groups_status ON project.wbs_groups USING btree (status);


--
-- Name: idx_wbs_items_assignee_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_items_assignee_id ON project.wbs_items USING btree (assignee_id);


--
-- Name: idx_wbs_items_group_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_items_group_id ON project.wbs_items USING btree (group_id);


--
-- Name: idx_wbs_items_order; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_items_order ON project.wbs_items USING btree (order_num);


--
-- Name: idx_wbs_items_phase_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_items_phase_id ON project.wbs_items USING btree (phase_id);


--
-- Name: idx_wbs_items_status; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_items_status ON project.wbs_items USING btree (status);


--
-- Name: idx_wbs_tasks_assignee_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_tasks_assignee_id ON project.wbs_tasks USING btree (assignee_id);


--
-- Name: idx_wbs_tasks_group_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_tasks_group_id ON project.wbs_tasks USING btree (group_id);


--
-- Name: idx_wbs_tasks_item_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_tasks_item_id ON project.wbs_tasks USING btree (item_id);


--
-- Name: idx_wbs_tasks_linked_task_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_tasks_linked_task_id ON project.wbs_tasks USING btree (linked_task_id);


--
-- Name: idx_wbs_tasks_phase_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_tasks_phase_id ON project.wbs_tasks USING btree (phase_id);


--
-- Name: idx_wbs_tasks_status; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wbs_tasks_status ON project.wbs_tasks USING btree (status);


--
-- Name: idx_wis_links_story_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wis_links_story_id ON project.wbs_item_story_links USING btree (story_id);


--
-- Name: idx_wis_links_wbs_item_id; Type: INDEX; Schema: project; Owner: pms_user
--

CREATE INDEX idx_wis_links_wbs_item_id ON project.wbs_item_story_links USING btree (wbs_item_id);


--
-- Name: idx_user_stories_feature_id; Type: INDEX; Schema: task; Owner: pms_user
--

CREATE INDEX idx_user_stories_feature_id ON task.user_stories USING btree (feature_id);


--
-- Name: idx_user_stories_wbs_item_id; Type: INDEX; Schema: task; Owner: pms_user
--

CREATE INDEX idx_user_stories_wbs_item_id ON task.user_stories USING btree (wbs_item_id);


--
-- Name: role_permissions fkegdk29eiy7mdtefy5c7eirr6e; Type: FK CONSTRAINT; Schema: auth; Owner: pms_user
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT fkegdk29eiy7mdtefy5c7eirr6e FOREIGN KEY (permission_id) REFERENCES auth.permissions(id);


--
-- Name: chat_messages fk3cpkdtwdxndrjhrx3gt9q5ux9; Type: FK CONSTRAINT; Schema: chat; Owner: pms_user
--

ALTER TABLE ONLY chat.chat_messages
    ADD CONSTRAINT fk3cpkdtwdxndrjhrx3gt9q5ux9 FOREIGN KEY (session_id) REFERENCES chat.chat_sessions(id);


--
-- Name: issues fk4j2x3reshuu7qj5svh6eacnpt; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.issues
    ADD CONSTRAINT fk4j2x3reshuu7qj5svh6eacnpt FOREIGN KEY (project_id) REFERENCES project.projects(id);


--
-- Name: education_roadmaps fk5dq8ve03gtx7ngvgklmjhqfk0; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.education_roadmaps
    ADD CONSTRAINT fk5dq8ve03gtx7ngvgklmjhqfk0 FOREIGN KEY (education_id) REFERENCES project.educations(id);


--
-- Name: education_sessions fk7mtfidgoh2o9fnk4wumui0idl; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.education_sessions
    ADD CONSTRAINT fk7mtfidgoh2o9fnk4wumui0idl FOREIGN KEY (education_id) REFERENCES project.educations(id);


--
-- Name: phase_gates fk7uks9k66rxkyycybmcelu3qgy; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.phase_gates
    ADD CONSTRAINT fk7uks9k66rxkyycybmcelu3qgy FOREIGN KEY (phase_id) REFERENCES project.phases(id);


--
-- Name: backlog_items fk826yfnvgitrmim7317fis8wa0; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.backlog_items
    ADD CONSTRAINT fk826yfnvgitrmim7317fis8wa0 FOREIGN KEY (epic_id_ref) REFERENCES project.epics(id);


--
-- Name: epics fk_epic_phase; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.epics
    ADD CONSTRAINT fk_epic_phase FOREIGN KEY (phase_id) REFERENCES project.phases(id) ON DELETE SET NULL;


--
-- Name: features fk_feature_epic; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.features
    ADD CONSTRAINT fk_feature_epic FOREIGN KEY (epic_id) REFERENCES project.epics(id) ON DELETE CASCADE;


--
-- Name: features fk_feature_wbs_group; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.features
    ADD CONSTRAINT fk_feature_wbs_group FOREIGN KEY (wbs_group_id) REFERENCES project.wbs_groups(id) ON DELETE SET NULL;


--
-- Name: wbs_groups fk_wbs_group_epic; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_groups
    ADD CONSTRAINT fk_wbs_group_epic FOREIGN KEY (linked_epic_id) REFERENCES project.epics(id) ON DELETE SET NULL;


--
-- Name: wbs_groups fk_wbs_group_phase; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_groups
    ADD CONSTRAINT fk_wbs_group_phase FOREIGN KEY (phase_id) REFERENCES project.phases(id) ON DELETE CASCADE;


--
-- Name: wbs_items fk_wbs_item_group; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_items
    ADD CONSTRAINT fk_wbs_item_group FOREIGN KEY (group_id) REFERENCES project.wbs_groups(id) ON DELETE CASCADE;


--
-- Name: wbs_items fk_wbs_item_phase; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_items
    ADD CONSTRAINT fk_wbs_item_phase FOREIGN KEY (phase_id) REFERENCES project.phases(id) ON DELETE CASCADE;


--
-- Name: wbs_tasks fk_wbs_task_group; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_tasks
    ADD CONSTRAINT fk_wbs_task_group FOREIGN KEY (group_id) REFERENCES project.wbs_groups(id) ON DELETE CASCADE;


--
-- Name: wbs_tasks fk_wbs_task_item; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_tasks
    ADD CONSTRAINT fk_wbs_task_item FOREIGN KEY (item_id) REFERENCES project.wbs_items(id) ON DELETE CASCADE;


--
-- Name: wbs_tasks fk_wbs_task_phase; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_tasks
    ADD CONSTRAINT fk_wbs_task_phase FOREIGN KEY (phase_id) REFERENCES project.phases(id) ON DELETE CASCADE;


--
-- Name: wbs_item_story_links fk_wis_link_wbs_item; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.wbs_item_story_links
    ADD CONSTRAINT fk_wis_link_wbs_item FOREIGN KEY (wbs_item_id) REFERENCES project.wbs_items(id) ON DELETE CASCADE;


--
-- Name: backlog_items fkakluvqav0ismo22t6ryq1c33d; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.backlog_items
    ADD CONSTRAINT fkakluvqav0ismo22t6ryq1c33d FOREIGN KEY (requirement_id) REFERENCES project.requirements(id);


--
-- Name: backlog_items fkaxepsnspse4d7q4x73bk9kos2; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.backlog_items
    ADD CONSTRAINT fkaxepsnspse4d7q4x73bk9kos2 FOREIGN KEY (backlog_id) REFERENCES project.backlogs(id);


--
-- Name: meetings fkbt3vmcde0efob60esnfkyaeg0; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.meetings
    ADD CONSTRAINT fkbt3vmcde0efob60esnfkyaeg0 FOREIGN KEY (project_id) REFERENCES project.projects(id);


--
-- Name: requirements fkcauiebj13mq4kuavdv109ga66; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.requirements
    ADD CONSTRAINT fkcauiebj13mq4kuavdv109ga66 FOREIGN KEY (rfp_id) REFERENCES project.rfps(id);


--
-- Name: deliverables fkcd22r03cehbp5p2jn2mkv34oh; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.deliverables
    ADD CONSTRAINT fkcd22r03cehbp5p2jn2mkv34oh FOREIGN KEY (phase_id) REFERENCES project.phases(id);


--
-- Name: project_members fkdki1sp2homqsdcvqm9yrix31g; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.project_members
    ADD CONSTRAINT fkdki1sp2homqsdcvqm9yrix31g FOREIGN KEY (project_id) REFERENCES project.projects(id);


--
-- Name: education_histories fkffc3rfeufwg3lbole9n1ejcs8; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.education_histories
    ADD CONSTRAINT fkffc3rfeufwg3lbole9n1ejcs8 FOREIGN KEY (session_id) REFERENCES project.education_sessions(id);


--
-- Name: requirement_task_links fkg70pc3ndm2g0dvqgpcub61ey5; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.requirement_task_links
    ADD CONSTRAINT fkg70pc3ndm2g0dvqgpcub61ey5 FOREIGN KEY (requirement_id) REFERENCES project.requirements(id);


--
-- Name: kpis fknh1feih4rmq1l3scneefwlh66; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.kpis
    ADD CONSTRAINT fknh1feih4rmq1l3scneefwlh66 FOREIGN KEY (phase_id) REFERENCES project.phases(id);


--
-- Name: part_members fkotdeupkma2mns1044mk6lv7do; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.part_members
    ADD CONSTRAINT fkotdeupkma2mns1044mk6lv7do FOREIGN KEY (part_id) REFERENCES project.parts(id);


--
-- Name: phases fkp0vs31guyj5itugskrstnrm4y; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.phases
    ADD CONSTRAINT fkp0vs31guyj5itugskrstnrm4y FOREIGN KEY (project_id) REFERENCES project.projects(id);


--
-- Name: parts fkrjpcnvx0068nwbunx4uoaqd1m; Type: FK CONSTRAINT; Schema: project; Owner: pms_user
--

ALTER TABLE ONLY project.parts
    ADD CONSTRAINT fkrjpcnvx0068nwbunx4uoaqd1m FOREIGN KEY (project_id) REFERENCES project.projects(id);


--
-- Name: user_stories fkhs7f69eg9suwnn7h81anvhutk; Type: FK CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.user_stories
    ADD CONSTRAINT fkhs7f69eg9suwnn7h81anvhutk FOREIGN KEY (sprint_id) REFERENCES task.sprints(id);


--
-- Name: user_story_requirement_links fkmnaa7l7i1o951c1m6dyg33c2; Type: FK CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.user_story_requirement_links
    ADD CONSTRAINT fkmnaa7l7i1o951c1m6dyg33c2 FOREIGN KEY (user_story_id) REFERENCES task.user_stories(id);


--
-- Name: tasks fkqgwaiqxymudd3ega3in76ydsi; Type: FK CONSTRAINT; Schema: task; Owner: pms_user
--

ALTER TABLE ONLY task.tasks
    ADD CONSTRAINT fkqgwaiqxymudd3ega3in76ydsi FOREIGN KEY (column_id) REFERENCES task.kanban_columns(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 09R4jehvD3xDRdfkXI3Y4gji4nhRzDA6HAYtAbMHfWVjbu3YsWQZ9yfaUrsnlL8

