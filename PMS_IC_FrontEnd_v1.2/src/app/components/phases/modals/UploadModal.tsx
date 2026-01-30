import { Upload } from 'lucide-react';
import type { Deliverable } from '../types';

interface UploadModalProps {
  isNewDeliverable: boolean;
  selectedDeliverable: Deliverable | null;
  uploadFile: File | null;
  newDeliverableName: string;
  newDeliverableDescription: string;
  newDeliverableType: string;
  onFileChange: (file: File | null) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTypeChange: (type: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function UploadModal({
  isNewDeliverable,
  selectedDeliverable,
  uploadFile,
  newDeliverableName,
  newDeliverableDescription,
  newDeliverableType,
  onFileChange,
  onNameChange,
  onDescriptionChange,
  onTypeChange,
  onConfirm,
  onClose,
}: UploadModalProps) {
  const isDisabled = !uploadFile || (isNewDeliverable && !newDeliverableName.trim());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isNewDeliverable ? '새 산출물 업로드' : '산출물 업로드'}
        </h3>
        <div className="mb-4">
          {isNewDeliverable ? (
            <NewDeliverableForm
              name={newDeliverableName}
              description={newDeliverableDescription}
              type={newDeliverableType}
              onNameChange={onNameChange}
              onDescriptionChange={onDescriptionChange}
              onTypeChange={onTypeChange}
            />
          ) : (
            selectedDeliverable && (
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">문서명:</span> {selectedDeliverable.name}
              </p>
            )
          )}
          <FileUploadArea uploadFile={uploadFile} onFileChange={onFileChange} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isDisabled}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            업로드
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-components

interface NewDeliverableFormProps {
  name: string;
  description: string;
  type: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTypeChange: (type: string) => void;
}

function NewDeliverableForm({
  name,
  description,
  type,
  onNameChange,
  onDescriptionChange,
  onTypeChange,
}: NewDeliverableFormProps) {
  return (
    <div className="space-y-3 mb-4">
      <div>
        <label className="block text-sm text-gray-700 mb-1">문서명</label>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">설명</label>
        <input
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">유형</label>
        <select
          value={type}
          onChange={(event) => onTypeChange(event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="DOCUMENT">문서</option>
          <option value="REPORT">보고서</option>
          <option value="PRESENTATION">발표자료</option>
          <option value="CODE">코드</option>
          <option value="OTHER">기타</option>
        </select>
      </div>
    </div>
  );
}

interface FileUploadAreaProps {
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
}

function FileUploadArea({ uploadFile, onFileChange }: FileUploadAreaProps) {
  return (
    <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer block">
      <input
        type="file"
        className="hidden"
        onChange={(event) => onFileChange(event.target.files ? event.target.files[0] : null)}
      />
      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
      <p className="text-sm text-gray-600">
        {uploadFile ? uploadFile.name : '파일을 선택하거나 드래그하세요'}
      </p>
      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX (최대 10MB)</p>
    </label>
  );
}
