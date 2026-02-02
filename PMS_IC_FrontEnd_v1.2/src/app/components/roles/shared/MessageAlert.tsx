import { Check, AlertCircle } from 'lucide-react';
import type { Message } from '../types';

interface MessageAlertProps {
  message: Message;
}

/**
 * Displays a success or error message alert with appropriate styling and icon
 */
export function MessageAlert({ message }: MessageAlertProps) {
  return (
    <div
      className={`rounded-xl p-4 ${
        message.type === 'success'
          ? 'bg-green-50 border-2 border-green-300'
          : 'bg-red-50 border-2 border-red-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {message.type === 'success' ? (
          <Check className="text-green-600" size={20} />
        ) : (
          <AlertCircle className="text-red-600" size={20} />
        )}
        <p
          className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}
        >
          {message.text}
        </p>
      </div>
    </div>
  );
}
