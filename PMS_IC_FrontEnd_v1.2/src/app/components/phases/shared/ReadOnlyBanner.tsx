import { Lock } from 'lucide-react';

export function ReadOnlyBanner() {
  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
      <Lock className="text-amber-600" size={20} />
      <div>
        <p className="text-sm font-medium text-amber-900">읽기 전용 모드</p>
        <p className="text-xs text-amber-700">현재 역할은 조회 권한만 가지고 있습니다.</p>
      </div>
    </div>
  );
}
