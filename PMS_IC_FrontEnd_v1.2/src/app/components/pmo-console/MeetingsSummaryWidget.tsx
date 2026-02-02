import { Calendar, ArrowRight, Clock, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MeetingsSummaryWidgetProps {
  projectId: string;
}

export default function MeetingsSummaryWidget({ projectId }: MeetingsSummaryWidgetProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/meetings');
  };

  // Mock data (would be replaced with actual API call)
  const upcomingMeetings = [
    {
      id: '1',
      title: '스프린트 리뷰',
      date: '2026-01-29',
      time: '10:00',
      type: 'video',
      attendees: 8,
    },
    {
      id: '2',
      title: '기술 검토 회의',
      date: '2026-01-30',
      time: '14:00',
      type: 'inperson',
      attendees: 5,
    },
    {
      id: '3',
      title: '주간 PM 회의',
      date: '2026-01-31',
      time: '09:00',
      type: 'video',
      attendees: 4,
    },
  ];

  const stats = {
    thisWeek: 3,
    pending: 2,
    completed: 12,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '내일';
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar size={20} className="text-amber-600" />
          회의 일정
        </h3>
        <button
          type="button"
          onClick={handleNavigate}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          자세히 보기
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{stats.thisWeek}</div>
          <div className="text-xs text-gray-500">이번 주</div>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{stats.pending}</div>
          <div className="text-xs text-gray-500">의사록 대기</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{stats.completed}</div>
          <div className="text-xs text-gray-500">완료 (월)</div>
        </div>
      </div>

      {/* Upcoming Meetings */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 mb-2">예정 회의</p>
        <div className="space-y-3">
          {upcomingMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${meeting.type === 'video' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {meeting.type === 'video' ? (
                  <Video size={16} className="text-blue-600" />
                ) : (
                  <Users size={16} className="text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{meeting.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(meeting.date)}</span>
                  <span>{meeting.time}</span>
                  <span className="flex items-center gap-0.5">
                    <Users size={10} />
                    {meeting.attendees}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
