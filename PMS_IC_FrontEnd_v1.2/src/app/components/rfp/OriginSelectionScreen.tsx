import { useState } from 'react';
import { FileText, Lightbulb, RefreshCw, Combine, Play, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import type { OriginType } from '../../../types/rfp';
import { ORIGIN_TYPE_LABELS } from '../../../types/rfp';
import { cn } from '../ui/utils';

const ORIGIN_CARDS: { type: OriginType; icon: typeof FileText; accent: string }[] = [
  { type: 'EXTERNAL_RFP', icon: FileText, accent: 'border-blue-300 hover:border-blue-500 hover:bg-blue-50' },
  { type: 'INTERNAL_INITIATIVE', icon: Lightbulb, accent: 'border-green-300 hover:border-green-500 hover:bg-green-50' },
  { type: 'MODERNIZATION', icon: RefreshCw, accent: 'border-orange-300 hover:border-orange-500 hover:bg-orange-50' },
  { type: 'MIXED', icon: Combine, accent: 'border-purple-300 hover:border-purple-500 hover:bg-purple-50' },
];

interface OriginSelectionScreenProps {
  onOriginSelected: (type: OriginType) => void;
  isLoading?: boolean;
}

export function OriginSelectionScreen({ onOriginSelected, isLoading }: OriginSelectionScreenProps) {
  const [selected, setSelected] = useState<OriginType | null>(null);

  const handleSelect = (type: OriginType) => {
    setSelected(type);
    onOriginSelected(type);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center mb-10 mt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          이 프로젝트의 출발점을 정의하세요
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          RFP 기반/내부 기획/고도화 유형에 따라 요구사항 추출, 변경관리 방식이 달라집니다.
          Origin을 선택하면 프로젝트 거버넌스 정책이 자동으로 설정됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {ORIGIN_CARDS.map(({ type, icon: Icon, accent }) => {
          const label = ORIGIN_TYPE_LABELS[type];
          const isSelected = selected === type;
          return (
            <Card
              key={type}
              className={cn(
                'cursor-pointer border-2 transition-all',
                accent,
                isSelected && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50',
                isLoading && 'opacity-50 pointer-events-none'
              )}
              onClick={() => handleSelect(type)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    {isLoading && isSelected ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    ) : (
                      <Icon className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{label.title}</h3>
                    <p className="text-sm text-gray-500">{label.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 text-sm">
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <Play className="h-4 w-4 mr-1" />
          샘플 RFP로 체험
        </Button>
        <span className="text-gray-300">|</span>
        <Button variant="ghost" size="sm" className="text-gray-400" disabled={isLoading}>
          <AlertCircle className="h-4 w-4 mr-1" />
          Origin 없이 진행 (제한 모드)
        </Button>
      </div>
    </div>
  );
}
