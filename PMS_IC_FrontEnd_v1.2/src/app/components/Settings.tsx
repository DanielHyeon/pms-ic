import { useState } from 'react';
import { UserRole } from '../App';
import { User } from 'lucide-react';

interface SettingsProps {
  userRole: UserRole;
}

export default function Settings({ userRole }: SettingsProps) {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleSaveSettings = () => {
    setStatusMessage({ type: 'success', text: '설정이 저장되었습니다.' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">개인 설정</h1>
          <p className="text-gray-600">알림, 테마 등 개인 환경을 설정합니다.</p>
        </div>

        {/* Personal Settings */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">개인 설정</h2>
                <p className="text-sm text-gray-600">알림, 테마 등 개인 환경을 설정합니다</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Theme Settings */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">테마 설정</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" value="light" defaultChecked className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">라이트 모드</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" value="dark" className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">다크 모드</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="theme" value="system" className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">시스템 설정</span>
                </label>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">알림 설정</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">이메일 알림</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">브라우저 알림</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">이슈 할당 알림</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">회의 알림</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </label>
              </div>
            </div>

            {/* Language Settings */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <label htmlFor="language-select" className="block font-semibold text-gray-900 mb-4">언어 설정</label>
              <select
                id="language-select"
                title="언어 선택"
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                설정 저장
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              statusMessage.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : statusMessage.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <p className={`text-sm ${
              statusMessage.type === 'success'
                ? 'text-green-700'
                : statusMessage.type === 'error'
                ? 'text-red-700'
                : 'text-blue-700'
            }`}>
              {statusMessage.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
