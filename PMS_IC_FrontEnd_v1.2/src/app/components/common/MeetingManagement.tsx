import { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Pencil, Trash2 } from 'lucide-react';
import type { Meeting } from './types';
import { getMeetingTypeLabel, getStatusColor, formatDateTime } from './utils';
import {
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
} from '../../../hooks/api/useCommon';

interface MeetingManagementProps {
  projectId: string | undefined;
  meetings: Meeting[];
  isLoading: boolean;
  canManage: boolean;
  searchQuery: string;
  filter: string;
}

export default function MeetingManagement({
  projectId,
  meetings,
  isLoading,
  canManage,
  searchQuery,
  filter,
}: MeetingManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();
  const deleteMeetingMutation = useDeleteMeeting();

  const filteredMeetings = meetings.filter(m => {
    if (filter && m.status !== filter) return false;
    if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSaveMeeting = async (meetingData: Partial<Meeting>) => {
    if (!projectId) return;

    try {
      if (editingMeeting) {
        await updateMeetingMutation.mutateAsync({
          projectId,
          meetingId: editingMeeting.id,
          data: meetingData,
        });
      } else {
        await createMeetingMutation.mutateAsync({
          projectId,
          data: meetingData,
        });
      }
      setShowModal(false);
      setEditingMeeting(null);
    } catch (error) {
      console.warn('Failed to save meeting:', error);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!projectId || !confirm('이 회의를 삭제하시겠습니까?')) return;

    try {
      await deleteMeetingMutation.mutateAsync({
        projectId,
        meetingId,
      });
    } catch (error) {
      console.warn('Failed to delete meeting:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">데이터를 불러오는 중...</div>;
  }

  if (filteredMeetings.length === 0) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>등록된 회의가 없습니다.</p>
        </div>
        {showModal && (
          <MeetingModal
            meeting={editingMeeting}
            onSave={handleSaveMeeting}
            onClose={() => {
              setShowModal(false);
              setEditingMeeting(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {filteredMeetings.map((meeting) => (
          <div
            key={meeting.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(meeting.status)}`}>
                    {meeting.status === 'SCHEDULED' ? '예정' : meeting.status === 'COMPLETED' ? '완료' : meeting.status === 'IN_PROGRESS' ? '진행중' : meeting.status}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    {getMeetingTypeLabel(meeting.meetingType)}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">{meeting.title}</h3>
                {meeting.description && (
                  <p className="text-sm text-gray-500 mt-1">{meeting.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatDateTime(meeting.scheduledAt)}
                  </span>
                  {meeting.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {meeting.location}
                    </span>
                  )}
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {meeting.attendees.length}명
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingMeeting(meeting);
                      setShowModal(true);
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <MeetingModal
          meeting={editingMeeting}
          onSave={handleSaveMeeting}
          onClose={() => {
            setShowModal(false);
            setEditingMeeting(null);
          }}
        />
      )}
    </>
  );
}

// Expose modal trigger for parent component
export function useMeetingModal() {
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  return {
    showModal,
    editingMeeting,
    openModal: (meeting?: Meeting) => {
      setEditingMeeting(meeting || null);
      setShowModal(true);
    },
    closeModal: () => {
      setShowModal(false);
      setEditingMeeting(null);
    },
  };
}

// Meeting Modal Component
function MeetingModal({
  meeting,
  onSave,
  onClose,
}: {
  meeting: Meeting | null;
  onSave: (data: Partial<Meeting>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    title: meeting?.title || '',
    description: meeting?.description || '',
    meetingType: meeting?.meetingType || 'WEEKLY',
    scheduledAt: meeting?.scheduledAt ? meeting.scheduledAt.slice(0, 16) : '',
    location: meeting?.location || '',
    organizer: meeting?.organizer || '',
    attendees: meeting?.attendees?.join(', ') || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
      attendees: formData.attendees.split(',').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {meeting ? '회의 수정' : '회의 등록'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">회의 유형 *</label>
            <select
              value={formData.meetingType}
              onChange={(e) => setFormData(prev => ({ ...prev, meetingType: e.target.value as Meeting['meetingType'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="KICKOFF">착수 보고</option>
              <option value="WEEKLY">주간 보고</option>
              <option value="MONTHLY">월간 보고</option>
              <option value="MILESTONE">마일스톤</option>
              <option value="CLOSING">종료 보고</option>
              <option value="TECHNICAL">기술 회의</option>
              <option value="STAKEHOLDER">이해관계자</option>
              <option value="OTHER">기타</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">일시 *</label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="예: 회의실 A, 온라인(Zoom)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주최자</label>
            <input
              type="text"
              value={formData.organizer}
              onChange={(e) => setFormData(prev => ({ ...prev, organizer: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">참석자 (쉼표로 구분)</label>
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="예: 홍길동, 김철수, 이영희"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { MeetingModal };
