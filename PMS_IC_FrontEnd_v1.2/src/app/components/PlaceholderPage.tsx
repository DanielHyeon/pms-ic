import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export default function PlaceholderPage({
  title,
  description = '이 기능은 현재 개발 중입니다.',
  icon: Icon = Construction,
}: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
          <Icon className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft size={16} />
          이전 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}

// Pre-configured placeholder pages for specific features
export function WbsManagementPage() {
  return (
    <PlaceholderPage
      title="일정 관리 (WBS)"
      description="WBS 기반 일정 관리 및 Gantt 차트 기능이 곧 추가됩니다."
    />
  );
}

export function TraceabilityPage() {
  return (
    <PlaceholderPage
      title="추적 매트릭스"
      description="요구사항-설계-테스트 추적 매트릭스 기능이 곧 추가됩니다."
    />
  );
}

export function TestingManagementPage() {
  return (
    <PlaceholderPage
      title="테스트 관리"
      description="테스트 케이스 및 테스트 결과 관리 기능이 곧 추가됩니다."
    />
  );
}

export function IssueManagementPage() {
  return (
    <PlaceholderPage
      title="이슈 관리"
      description="프로젝트 이슈 추적 및 관리 기능이 곧 추가됩니다."
    />
  );
}

export function DeliverableManagementPage() {
  return (
    <PlaceholderPage
      title="산출물 관리"
      description="프로젝트 산출물 관리 기능이 곧 추가됩니다."
    />
  );
}

export function MeetingManagementPage() {
  return (
    <PlaceholderPage
      title="회의 관리"
      description="회의 일정 및 회의록 관리 기능이 곧 추가됩니다."
    />
  );
}

export function AnnouncementsPage() {
  return (
    <PlaceholderPage
      title="공지사항"
      description="프로젝트 공지사항 관리 기능이 곧 추가됩니다."
    />
  );
}

export function AiAssistantPage() {
  return (
    <PlaceholderPage
      title="AI 어시스턴트"
      description="AI 기반 프로젝트 관리 지원 기능이 곧 추가됩니다."
    />
  );
}

export function ReportsPage() {
  return (
    <PlaceholderPage
      title="프로젝트 리포트"
      description="프로젝트 현황 리포트 생성 기능이 곧 추가됩니다."
    />
  );
}

export function StatisticsPage() {
  return (
    <PlaceholderPage
      title="통계 대시보드"
      description="프로젝트 통계 및 분석 대시보드가 곧 추가됩니다."
    />
  );
}

export function UserManagementPage() {
  return (
    <PlaceholderPage
      title="사용자 관리"
      description="사용자 계정 및 권한 관리 기능이 곧 추가됩니다."
    />
  );
}

export function AuditLogsPage() {
  return (
    <PlaceholderPage
      title="감사 로그"
      description="시스템 감사 로그 조회 기능이 곧 추가됩니다."
    />
  );
}
