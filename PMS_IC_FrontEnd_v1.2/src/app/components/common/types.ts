// Common Management Type Definitions

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingType: 'KICKOFF' | 'WEEKLY' | 'MONTHLY' | 'MILESTONE' | 'CLOSING' | 'TECHNICAL' | 'STAKEHOLDER' | 'OTHER';
  scheduledAt: string;
  location?: string;
  organizer?: string;
  attendees: string[];
  minutes?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  actualStartAt?: string;
  actualEndAt?: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  issueType: 'BUG' | 'RISK' | 'BLOCKER' | 'CHANGE_REQUEST' | 'QUESTION' | 'IMPROVEMENT' | 'OTHER';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'CLOSED' | 'REOPENED' | 'DEFERRED';
  assignee?: string;
  reporter?: string;
  reviewer?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolution?: string;
  comments: { author: string; content: string; commentedAt: string }[];
  createdAt: string;
}

export interface Deliverable {
  id: string;
  name: string;
  description?: string;
  type: 'DOCUMENT' | 'CODE' | 'REPORT' | 'PRESENTATION' | 'OTHER';
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  version?: string;
  uploadedAt?: string;
  dueDate?: string;
  fileName?: string;
  uploadedBy?: string;
  approver?: string;
  approvedBy?: string;
  approvedAt?: string;
  phaseId?: string;
  phaseName?: string;
}

export type TabType = 'deliverables' | 'meetings' | 'issues';
