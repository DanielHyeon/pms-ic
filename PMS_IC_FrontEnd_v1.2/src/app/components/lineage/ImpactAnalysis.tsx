import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  AlertTriangle,
  CheckSquare,
  BookOpen,
  Zap,
  ChevronRight,
  Loader2,
  Search,
} from 'lucide-react';
import { apiService } from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ImpactAnalysisDto,
  ImpactedEntityDto,
  LineageNodeDto,
  NODE_TYPE_CONFIG,
  LineageNodeType,
} from '../../../types/lineage';

interface ImpactAnalysisProps {
  projectId: string;
  selectedNode?: LineageNodeDto | null;
  onNodeSelect?: (node: LineageNodeDto) => void;
}

export default function ImpactAnalysis({
  projectId,
  selectedNode,
  onNodeSelect,
}: ImpactAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [impactData, setImpactData] = useState<ImpactAnalysisDto | null>(null);
  const [searchType, setSearchType] = useState<string>('REQUIREMENT');
  const [searchId, setSearchId] = useState<string>('');

  const loadImpactAnalysis = useCallback(async (type: string, id: string) => {
    if (!type || !id) return;

    setLoading(true);
    try {
      const data = await apiService.getImpactAnalysis(type, id);
      setImpactData(data);
    } catch (error) {
      console.error('Failed to load impact analysis:', error);
      setImpactData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNode) {
      loadImpactAnalysis(selectedNode.type, selectedNode.id);
    }
  }, [selectedNode, loadImpactAnalysis]);

  const handleSearch = () => {
    if (searchId.trim()) {
      loadImpactAnalysis(searchType, searchId.trim());
    }
  };

  const getImpactLevelColor = (level: string) => {
    switch (level) {
      case 'DIRECT':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'INDIRECT':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'TRANSITIVE':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getImpactLevelLabel = (level: string) => {
    switch (level) {
      case 'DIRECT':
        return '직접';
      case 'INDIRECT':
        return '간접';
      case 'TRANSITIVE':
        return '전이';
      default:
        return level;
    }
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      DRAFT: '초안',
      SUBMITTED: '제출됨',
      IN_REVIEW: '검토중',
      APPROVED: '승인됨',
      REJECTED: '반려됨',
      IMPLEMENTED: '구현됨',
      TODO: '할일',
      IN_PROGRESS: '진행중',
      DONE: '완료',
      BLOCKED: '차단됨',
      PLANNING: '계획중',
      ACTIVE: '활성',
      COMPLETED: '완료',
      CANCELLED: '취소됨',
    };
    return statusLabels[status] || status;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TASK':
        return <CheckSquare className="h-4 w-4" />;
      case 'USER_STORY':
        return <BookOpen className="h-4 w-4" />;
      case 'SPRINT':
        return <Zap className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const renderImpactedEntity = (entity: ImpactedEntityDto) => {
    const typeConfig = NODE_TYPE_CONFIG[entity.type as LineageNodeType];

    return (
      <div
        key={entity.id}
        className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
        onClick={() => {
          if (onNodeSelect) {
            onNodeSelect({
              id: entity.id,
              type: entity.type as LineageNodeType,
              title: entity.title,
              code: entity.code,
              status: entity.status,
              metadata: {},
            });
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: typeConfig?.bgColor || '#f3f4f6',
              color: typeConfig?.color || '#6b7280',
            }}
          >
            {getTypeIcon(entity.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {entity.code && (
                <span className="text-xs font-mono text-gray-500">{entity.code}</span>
              )}
              <span className="font-medium text-gray-900">{entity.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {getStatusLabel(entity.status)}
              </Badge>
              <Badge className={`text-xs ${getImpactLevelColor(entity.impactLevel)}`}>
                {getImpactLevelLabel(entity.impactLevel)}
              </Badge>
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4" />
            영향도 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="항목 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REQUIREMENT">요구사항</SelectItem>
                <SelectItem value="USER_STORY">유저스토리</SelectItem>
                <SelectItem value="TASK">태스크</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="항목 ID 입력..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || !searchId.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '분석'}
            </Button>
          </div>
          {selectedNode && (
            <p className="text-xs text-gray-500 mt-2">
              그래프에서 노드를 클릭하여 영향도를 분석할 수도 있습니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Impact Results */}
      {!loading && impactData && (
        <>
          {/* Source Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">영향도 분석 대상</p>
                  <p className="font-semibold text-lg">{impactData.sourceTitle || impactData.sourceId}</p>
                  <Badge variant="outline">{impactData.sourceType}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{impactData.impactedStories}</p>
                    <p className="text-xs text-gray-500">영향받는 스토리</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{impactData.impactedTasks}</p>
                    <p className="text-xs text-gray-500">영향받는 태스크</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">{impactData.impactedSprints}</p>
                    <p className="text-xs text-gray-500">영향받는 스프린트</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Direct Impacts */}
          {impactData.directImpacts && impactData.directImpacts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  직접 영향 ({impactData.directImpacts.length}건)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {impactData.directImpacts.map(renderImpactedEntity)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Indirect Impacts */}
          {impactData.indirectImpacts && impactData.indirectImpacts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  간접 영향 ({impactData.indirectImpacts.length}건)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {impactData.indirectImpacts.map(renderImpactedEntity)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affected Sprints */}
          {impactData.affectedSprintNames && impactData.affectedSprintNames.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  영향받는 스프린트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {impactData.affectedSprintNames.map((name, idx) => (
                    <Badge key={idx} variant="outline" className="bg-red-50 text-red-700">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Impact */}
          {impactData.directImpacts?.length === 0 &&
            impactData.indirectImpacts?.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>이 항목에 대한 하위 영향이 없습니다</p>
                </CardContent>
              </Card>
            )}
        </>
      )}

      {/* Empty State */}
      {!loading && !impactData && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">분석할 항목을 선택하세요</p>
            <p className="text-sm mt-1">
              리니지 그래프에서 노드를 클릭하거나 위에서 ID로 검색하세요
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
