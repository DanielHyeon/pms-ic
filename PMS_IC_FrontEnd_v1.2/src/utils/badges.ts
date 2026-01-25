/**
 * Badge styling utilities for consistent UI across the application
 */

export interface BadgeStyle {
  bg: string;
  text: string;
  label: string;
}

export interface BadgeStyleSimple {
  bg: string;
  text: string;
}

// Announcement Categories
export const ANNOUNCEMENT_CATEGORY_BADGES: Record<string, BadgeStyle> = {
  NOTICE: { bg: 'bg-blue-100', text: 'text-blue-700', label: '공지' },
  UPDATE: { bg: 'bg-green-100', text: 'text-green-700', label: '업데이트' },
  MAINTENANCE: { bg: 'bg-amber-100', text: 'text-amber-700', label: '점검' },
  EVENT: { bg: 'bg-purple-100', text: 'text-purple-700', label: '이벤트' },
  POLICY: { bg: 'bg-red-100', text: 'text-red-700', label: '정책' },
};

// Audit Log Categories
export const AUDIT_CATEGORY_BADGES: Record<string, BadgeStyleSimple> = {
  AUTH: { bg: 'bg-blue-100', text: 'text-blue-700' },
  DATA: { bg: 'bg-green-100', text: 'text-green-700' },
  SYSTEM: { bg: 'bg-purple-100', text: 'text-purple-700' },
  USER: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  PROJECT: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  SECURITY: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  AUTH: '인증',
  DATA: '데이터',
  SYSTEM: '시스템',
  USER: '사용자',
  PROJECT: '프로젝트',
  SECURITY: '보안',
};

// Severity Badges
export const SEVERITY_BADGES: Record<string, BadgeStyleSimple> = {
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
  WARNING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  INFO: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

// User Roles
export const USER_ROLE_BADGES: Record<string, BadgeStyleSimple> = {
  SPONSOR: { bg: 'bg-purple-100', text: 'text-purple-700' },
  PMO_HEAD: { bg: 'bg-blue-100', text: 'text-blue-700' },
  PM: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  DEVELOPER: { bg: 'bg-green-100', text: 'text-green-700' },
  QA: { bg: 'bg-amber-100', text: 'text-amber-700' },
  BUSINESS_ANALYST: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  AUDITOR: { bg: 'bg-gray-100', text: 'text-gray-700' },
  ADMIN: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const USER_ROLE_LABELS: Record<string, string> = {
  SPONSOR: '스폰서',
  PMO_HEAD: 'PMO 총괄',
  PM: 'PM',
  DEVELOPER: '개발자',
  QA: 'QA',
  BUSINESS_ANALYST: '비즈니스 분석가',
  AUDITOR: '감사자',
  ADMIN: '관리자',
};

// User Status
export const USER_STATUS_BADGES: Record<string, BadgeStyleSimple> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-500' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  LOCKED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  PENDING: '대기',
  LOCKED: '잠김',
};

// Audit Actions
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: '생성',
  UPDATE: '수정',
  DELETE: '삭제',
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
  EXPORT: '내보내기',
  ACCESS: '접근',
  PERMISSION_CHANGE: '권한변경',
};

// Priority Badges
export const PRIORITY_BADGES: Record<string, BadgeStyleSimple> = {
  HIGH: { bg: 'bg-red-100', text: 'text-red-700' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
  LOW: { bg: 'bg-green-100', text: 'text-green-700' },
};

// Generic Status Badges
export const STATUS_BADGES: Record<string, BadgeStyleSimple> = {
  PUBLISHED: { bg: 'bg-green-100', text: 'text-green-700' },
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-500' },
  ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-500' },
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-amber-100', text: 'text-amber-700' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * Get badge classes for a given key from a badge map
 */
export function getBadgeClasses(
  badges: Record<string, BadgeStyleSimple>,
  key: string,
  fallback: BadgeStyleSimple = { bg: 'bg-gray-100', text: 'text-gray-700' }
): string {
  const badge = badges[key] || fallback;
  return `${badge.bg} ${badge.text}`;
}

/**
 * Get badge style object for a given key
 */
export function getBadgeStyle<T extends BadgeStyle | BadgeStyleSimple>(
  badges: Record<string, T>,
  key: string,
  fallback?: T
): T | undefined {
  return badges[key] || fallback;
}
