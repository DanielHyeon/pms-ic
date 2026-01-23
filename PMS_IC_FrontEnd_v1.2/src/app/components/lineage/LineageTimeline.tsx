import { useMemo } from 'react';
import {
  Clock,
  Plus,
  Edit,
  Trash,
  RefreshCw,
  Link,
  Unlink,
  Play,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  LineageEventDto,
  PageResponse,
  EVENT_TYPE_CONFIG,
  LineageEventType,
} from '../../../types/lineage';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface LineageTimelineProps {
  data: PageResponse<LineageEventDto>;
  onPageChange: (page: number) => void;
  onEventClick?: (event: LineageEventDto) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Plus,
  Edit,
  Trash,
  RefreshCw,
  Link,
  Unlink,
  Play,
  CheckCircle,
  Calendar,
};

export default function LineageTimeline({
  data,
  onPageChange,
  onEventClick,
}: LineageTimelineProps) {
  const { content: events, totalPages, number: currentPage, totalElements } = data;

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, LineageEventDto[]> = {};
    events.forEach((event) => {
      const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    return groups;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
        <Clock className="h-16 w-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium">활동 내역이 없습니다</p>
        <p className="text-sm">요구사항, 스토리, 태스크의 변경 사항이 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">
                {format(new Date(date), 'yyyy년 M월 d일', { locale: ko })}
              </span>
              <Badge variant="secondary" className="text-xs">
                {dateEvents.length}건
              </Badge>
            </div>

            <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
              {dateEvents.map((event) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick?.(event)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            전체 {totalElements}건 중 {events.length}건 표시
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <span className="text-sm text-gray-600 px-2">
              {currentPage + 1} / {totalPages} 페이지
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelineEventProps {
  event: LineageEventDto;
  onClick?: () => void;
}

function TimelineEvent({ event, onClick }: TimelineEventProps) {
  const config = EVENT_TYPE_CONFIG[event.eventType as LineageEventType] || {
    label: event.eventType,
    icon: 'Edit',
    color: '#6b7280',
  };

  const Icon = iconMap[config.icon] || Edit;
  const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ko });

  return (
    <div
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      {/* Timeline dot */}
      <div
        className="absolute -left-[25px] w-4 h-4 rounded-full border-2 bg-white"
        style={{ borderColor: config.color }}
      />

      {/* Event card */}
      <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{event.description}</p>
              {event.entityCode && (
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                    {event.entityCode}
                  </span>
                  {event.entityTitle && (
                    <span className="ml-2">{event.entityTitle}</span>
                  )}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {event.actorName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo}
                </span>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="flex-shrink-0 text-xs"
            style={{ borderColor: config.color, color: config.color }}
          >
            {event.aggregateType}
          </Badge>
        </div>

        {/* Changes preview */}
        {event.changes && Object.keys(event.changes).length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-400 mb-1">변경 항목:</p>
            <div className="flex flex-wrap gap-1">
              {Object.keys(event.changes).slice(0, 5).map((key) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {key}
                </Badge>
              ))}
              {Object.keys(event.changes).length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{Object.keys(event.changes).length - 5}개 더
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
