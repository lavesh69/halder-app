import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    info: <Info className="w-4 h-4 text-blue-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] pointer-events-none">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 rounded-2xl shadow-xl border border-zinc-800 dark:border-zinc-200 backdrop-blur-md animate-slide-up text-sm font-medium">
        {icons[toast.type]}
        <span className="truncate">{toast.message}</span>
      </div>
    </div>
  );
};
