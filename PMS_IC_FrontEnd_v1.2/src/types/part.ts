// 파트(서브 프로젝트) 관련 타입 정의

export type PartStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';

export interface Part {
  id: string;
  projectId: string;          // 상위 프로젝트 ID
  name: string;               // 예: "UI/UX 파트", "백엔드 파트"
  description: string;
  leaderId: string;           // 파트장 사용자 ID
  leaderName?: string;        // 파트장 이름 (조회용)
  status: PartStatus;
  startDate: string;
  endDate: string;
  progress: number;           // 진행률 (0-100)
  memberCount?: number;       // 구성원 수 (조회용)
  createdAt: string;
  updatedAt: string;
}

export interface PartSummary {
  id: string;
  name: string;
  leaderName: string;
  status: PartStatus;
  progress: number;
  memberCount: number;
}

// 파트 구성원 정보
export interface PartMember {
  id: string;
  partId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

// 파트 생성/수정용 DTO
export interface CreatePartDto {
  projectId: string;
  name: string;
  description?: string;
  leaderId: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdatePartDto {
  name?: string;
  description?: string;
  leaderId?: string;
  status?: PartStatus;
  startDate?: string;
  endDate?: string;
}

// 파트 상태 표시 정보
export const PART_STATUS_INFO: Record<PartStatus, { label: string; color: string; bgColor: string }> = {
  ACTIVE: { label: '진행 중', color: 'text-green-700', bgColor: 'bg-green-100' },
  COMPLETED: { label: '완료', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ON_HOLD: { label: '보류', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

// Part Dashboard for PL Cockpit
export interface PartDashboard {
  partId: string;
  partName: string;
  plUserId: string;
  plName: string;
  // Story Points metrics (calculated from user stories)
  totalStoryPoints: number;
  completedStoryPoints: number;
  inProgressStoryPoints: number;
  plannedStoryPoints: number;
  // Count metrics
  featureCount: number;
  storyCount: number;
  completedStoryCount: number;
  inProgressStoryCount: number;
  taskCount: number;
  completedTaskCount: number;
  blockedTaskCount: number;
  // Issues
  openIssueCount: number;
  highPriorityIssueCount: number;
}

// Part Metrics for detailed analysis
export interface PartMetrics {
  partId: string;
  completionRate: number;       // (completedStoryPoints / totalStoryPoints) * 100
  storyCompletionRate: number;  // (completedStoryCount / storyCount) * 100
  taskCompletionRate: number;   // (completedTaskCount / taskCount) * 100
  velocity: number;             // Story points completed per sprint (average)
  wipCount: number;             // Work In Progress (in_progress stories + tasks)
  blockerCount: number;         // Blocked tasks count
  avgCycleTime: number;         // Average days from IN_PROGRESS to DONE
  avgLeadTime: number;          // Average days from TODO to DONE
}
