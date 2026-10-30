import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon } from './Icons';
import { uploadAttachment, type AttachmentItem } from '../api/client';
import { useI18n } from '../i18n';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: { 
    to: string; 
    cc?: string;
    bcc?: string;
    subject: string; 
    body: string; 
    attachments?: AttachmentItem[] 
  }) => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSend,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
}) => {
  const { t } = useI18n();
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setCc('');
      setBcc('');
      setShowCc(false);
      setShowBcc(false);
      setSubject(initialSubject);
      setBody(initialBody);
      setAttachments([]);
    }
  }, [isOpen, initialTo, initialSubject, initialBody]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadAttachment(file);
      if (result) {
        setAttachments((prev) => [...prev, result]);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) return;
    onSend({ 
      to, 
      cc: showCc && cc.trim() ? cc.trim() : undefined, 
      bcc: showBcc && bcc.trim() ? bcc.trim() : undefined, 
      subject, 
      body, 
      attachments 
    });
    setTo('');
    setCc('');
    setBcc('');
    setShowCc(false);
    setShowBcc(false);
    setSubject('');
    setBody('');
    setAttachments([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-end justify-center sm:justify-end p-0 sm:p-4 md:p-6">
      <div className="pointer-events-auto w-full h-[100dvh] sm:h-[520px] sm:max-w-lg bg-surface sm:rounded-2xl shadow-2xl border-0 sm:border border-separator/60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-default/40 border-b border-separator/60 select-none">
          <span className="text-xs font-semibold text-foreground">
            {subject.startsWith('Re:') ? t('reply') : t('composeTitle')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-default/50"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="space-y-0 text-xs">
            <div className="flex items-center px-4 py-2 border-b border-separator/40">
              <span className="text-muted w-14 font-medium shrink-0">{t('toRecipient')}:</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={t('toPlaceholder')}
                required
                className="flex-1 min-w-0 bg-transparent text-foreground focus:outline-none placeholder:text-muted/60"
              />
              <div className="flex items-center gap-1 shrink-0 ml-1.5">
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    showCc ? 'bg-[#006FEE]/15 text-[#006FEE] font-semibold' : 'text-muted hover:text-foreground hover:bg-default/50'
                  }`}
                  title="抄送"
                >
                  {t('ccRecipient')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBcc(!showBcc)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    showBcc ? 'bg-[#006FEE]/15 text-[#006FEE] font-semibold' : 'text-muted hover:text-foreground hover:bg-default/50'
                  }`}
                  title="密送"
                >
                  {t('bccRecipient')}
                </button>
              </div>
            </div>

            {showCc && (
              <div className="flex items-center px-4 py-2 border-b border-separator/40 animate-in fade-in duration-150">
                <span className="text-muted w-14 font-medium shrink-0">{t('ccRecipient')}:</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder={t('ccPlaceholder')}
                  className="flex-1 min-w-0 bg-transparent text-foreground focus:outline-none placeholder:text-muted/60"
                  autoFocus
                />
              </div>
            )}

            {showBcc && (
              <div className="flex items-center px-4 py-2 border-b border-separator/40 animate-in fade-in duration-150">
                <span className="text-muted w-14 font-medium shrink-0">{t('bccRecipient')}:</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder={t('bccPlaceholder')}
                  className="flex-1 min-w-0 bg-transparent text-foreground focus:outline-none placeholder:text-muted/60"
                  autoFocus={!showCc}
                />
              </div>
            )}

            <div className="flex items-center px-4 py-2 border-b border-separator/40">
              <span className="text-muted w-14 font-medium shrink-0">{t('subjectField')}:</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('subjectPlaceholder')}
                required
                className="flex-1 min-w-0 bg-transparent text-foreground focus:outline-none placeholder:text-muted/60"
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('bodyPlaceholder')}
              required
              className="w-full h-full bg-transparent resize-none text-xs text-foreground focus:outline-none placeholder:text-muted/60 leading-relaxed font-sans"
            />
          </div>

          {/* Attachments pills preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-separator/30 bg-default/10 max-h-24 overflow-y-auto">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-default/40 text-[11px] text-foreground border border-separator/40"
                >
                  <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                  <span className="text-muted text-[10px]">({att.size})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-muted hover:text-red-500 ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-default/30 border-t border-separator/60">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title={t('addAttachment')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-separator/60 text-xs text-muted hover:text-foreground hover:bg-default/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>{isUploading ? 'Uploading...' : t('addAttachment')}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-muted hover:text-foreground cursor-pointer transition-colors"
              >
                {t('discard')}
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#006FEE] hover:bg-[#005BC4] active:bg-[#004BB0] text-white px-5 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                {t('send')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
