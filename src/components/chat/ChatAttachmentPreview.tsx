import React, { useEffect, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2, RefreshCw, X } from 'lucide-react';
import { ApiClient } from '../../api/client';
import type { ChatAttachmentItem } from '../../types';

interface ChatAttachmentPreviewProps {
  attachment: ChatAttachmentItem;
  isMine?: boolean;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ChatAttachmentPreview: React.FC<ChatAttachmentPreviewProps> = ({ attachment, isMine }) => {
  const isImage = Boolean(attachment.isImage || attachment.mimeType?.startsWith('image/'));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isImage);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [retryToken, setRetryToken] = useState<number>(0);

  useEffect(() => {
    if (!isImage || !attachment.url) return;
    let active = true;
    let createdUrl: string | null = null;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const blob = await ApiClient.fetchChatAttachmentBlob(attachment.url);
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch {
        if (active) setHasError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isImage, attachment.url, retryToken]);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setHasError(false);
    try {
      const blob = await ApiClient.fetchChatAttachmentBlob(attachment.url);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setHasError(true);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isImage) {
    return (
      <div className="mt-1.5 space-y-1">
        {isLoading ? (
          <div className="w-44 h-32 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin opacity-70" />
          </div>
        ) : hasError || !objectUrl ? (
          <button
            type="button"
            onClick={() => setRetryToken((c) => c + 1)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold border ${
              isMine
                ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-[140px]">{attachment.filename}</span>
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="block rounded-xl overflow-hidden border border-black/10 dark:border-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label={`Preview ${attachment.filename}`}
            >
              <img
                src={objectUrl}
                alt={attachment.filename}
                className="max-w-[220px] max-h-48 object-cover block"
              />
            </button>
            <div className="flex items-center justify-between gap-2 text-[10px] opacity-80">
              <span className="truncate max-w-[150px]">{attachment.filename}</span>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-0.5 hover:underline font-semibold"
                title={`Download ${attachment.filename}`}
              >
                <Download className="w-3 h-3" />
                <span>{formatFileSize(attachment.sizeBytes)}</span>
              </button>
            </div>
            {isExpanded && (
              <div
                className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4"
                onClick={() => setIsExpanded(false)}
                role="dialog"
                aria-modal="true"
                aria-label={attachment.filename}
              >
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  aria-label="Close image preview"
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <X className="w-5 h-5" />
                </button>
                <img
                  src={objectUrl}
                  alt={attachment.filename}
                  className="max-w-full max-h-[85vh] rounded-2xl object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={`mt-1.5 w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition ${
        isMine
          ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:border-emerald-500'
      }`}
      aria-label={`Download ${attachment.filename}`}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold truncate">{attachment.filename}</p>
        <p className="text-[10px] opacity-75">
          {formatFileSize(attachment.sizeBytes)}
          {hasError ? ' • Failed, tap to retry' : ''}
        </p>
      </div>
      {isDownloading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <Download className="w-4 h-4 shrink-0 opacity-85" />
      )}
    </button>
  );
};
