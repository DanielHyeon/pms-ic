import { useState, useCallback } from 'react';
import {
  FileUp,
  FileText,
  Sparkles,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { OriginPolicy } from '../../../types/rfp';
import { cn } from '../ui/utils';

const STEPS = [
  { id: 1, label: 'RFP 메타데이터', icon: FileText },
  { id: 2, label: '파일 업로드', icon: Upload },
  { id: 3, label: 'AI 사전 분석', icon: Sparkles },
  { id: 4, label: '요구사항 전개', icon: CheckCircle },
];

interface RfpUploadWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: { title: string; publisher: string; rfpType: string; file?: File; content?: string }) => void;
  originPolicy: OriginPolicy;
  isSubmitting?: boolean;
}

export function RfpUploadWizard({ open, onClose, onComplete, originPolicy, isSubmitting }: RfpUploadWizardProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [rfpType, setRfpType] = useState('proposal');
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [extractFR, setExtractFR] = useState(true);
  const [extractNFR, setExtractNFR] = useState(true);
  const [extractConstraint, setExtractConstraint] = useState(true);
  const [dupStrategy, setDupStrategy] = useState<'merge' | 'split' | 'keep'>('merge');

  const canNext = useCallback(() => {
    switch (step) {
      case 1: return title.trim().length > 0;
      case 2: return file !== null || content.trim().length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  }, [step, title, file, content]);

  const handleNext = () => {
    if (step < 4) {
      if (step === 2 && originPolicy.autoAnalysisEnabled) {
        setAnalysisStarted(true);
      }
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    onComplete({
      title,
      publisher,
      rfpType,
      file: file || undefined,
      content: content || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const reset = () => {
    setStep(1);
    setTitle('');
    setPublisher('');
    setRfpType('proposal');
    setFile(null);
    setContent('');
    setAnalysisStarted(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>RFP 업로드/등록</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                  isActive ? 'bg-blue-100 text-blue-700' : isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                )}>
                  {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-1', step > s.id ? 'bg-green-300' : 'bg-gray-200')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <div className="space-y-4">
              {/* Origin policy summary (read-only) */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="font-medium">Origin Policy</span>
                    <Badge className="bg-blue-100 text-blue-600 text-xs ml-auto">
                      {originPolicy.originType.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-blue-600">
                    <span>Evidence: {originPolicy.evidenceLevel}</span>
                    <span>Lineage: {originPolicy.lineageEnforcement}</span>
                    <span>Auto-analysis: {originPolicy.autoAnalysisEnabled ? 'ON' : 'OFF'}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="rfp-title">RFP 제목 *</Label>
                  <Input
                    id="rfp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="RFP 제목을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="rfp-publisher">발행처 / 고객명</Label>
                  <Input
                    id="rfp-publisher"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="발행처 또는 고객명"
                  />
                </div>
                <div>
                  <Label htmlFor="rfp-type">RFP 유형</Label>
                  <Select value={rfpType} onValueChange={setRfpType}>
                    <SelectTrigger id="rfp-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proposal">제안요청서</SelectItem>
                      <SelectItem value="technical">기술사양서</SelectItem>
                      <SelectItem value="contract">계약서</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* File upload */}
              <div>
                <Label>파일 업로드</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors mt-1">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.hwp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="wizard-file-upload"
                  />
                  <label htmlFor="wizard-file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <FileUp className="h-6 w-6" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileUp className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">클릭하여 파일을 선택하거나 드래그하세요</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, TXT, HWP</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">또는 직접 입력</span>
                </div>
              </div>

              <div>
                <Label htmlFor="rfp-content">RFP 내용</Label>
                <Textarea
                  id="rfp-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="RFP 내용을 직접 입력하세요..."
                  rows={8}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Sparkles className="h-10 w-10 mx-auto text-blue-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">AI 사전 분석</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {originPolicy.autoAnalysisEnabled
                    ? '업로드된 문서를 AI가 자동으로 분석합니다.'
                    : '분석을 시작하려면 아래 버튼을 클릭하세요.'}
                </p>
              </div>

              {analysisStarted || originPolicy.autoAnalysisEnabled ? (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">분석 진행 중...</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>- 핵심 범위 요약 추출 중</p>
                      <p>- 주요 제약 조건 식별 중</p>
                      <p>- 불명확한 항목 탐지 중</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center">
                  <Button onClick={() => setAnalysisStarted(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI 분석 시작
                  </Button>
                </div>
              )}

              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-2">미리보기</h4>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>- 프로젝트 목표: (분석 완료 후 표시)</p>
                    <p>- 범위 요약: (분석 완료 후 표시)</p>
                    <p>- 위험 사항: (분석 완료 후 표시)</p>
                    <p>- 불명확 항목: (분석 완료 후 표시)</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">요구사항으로 전개</h3>
                <p className="text-sm text-gray-500">
                  추출 규칙과 저장 방식을 설정하세요.
                </p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">추출 범위</Label>
                    <div className="flex gap-3 mt-2">
                      {[
                        { key: 'fr', label: 'Functional', checked: extractFR, toggle: setExtractFR },
                        { key: 'nfr', label: 'Non-Functional', checked: extractNFR, toggle: setExtractNFR },
                        { key: 'con', label: 'Constraint', checked: extractConstraint, toggle: setExtractConstraint },
                      ].map(({ key, label, checked, toggle }) => (
                        <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggle(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">중복 처리 전략</Label>
                    <div className="flex gap-3 mt-2">
                      {[
                        { value: 'merge' as const, label: 'Merge (병합)' },
                        { value: 'split' as const, label: 'Split (분리)' },
                        { value: 'keep' as const, label: 'Keep All (유지)' },
                      ].map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="dupStrategy"
                            checked={dupStrategy === value}
                            onChange={() => setDupStrategy(value)}
                            className="border-gray-300"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
                    저장 모드: Draft → Review Required (확정 전 검토 필수)
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            이전
          </Button>
          <div className="text-xs text-gray-400">{step} / {STEPS.length}</div>
          {step < 4 ? (
            <Button onClick={handleNext} disabled={!canNext()}>
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  요구사항으로 전개
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
