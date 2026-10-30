import React, { useState, useRef, useEffect } from 'react';
import type { Thread, FolderType, LabelType } from '../types';
import { useI18n } from '../i18n';
import { getDiceBearAvatar } from '../utils/avatar';
import { 
  CloseIcon, 
  TrashIcon, 
  ArchiveIcon, 
  SnoozedIcon,
  InboxIcon,
  TagIcon,
  ReplyIcon, 
  MoreIcon, 
  PrevIcon, 
  NextIcon, 
  ChevronDownIcon 
} from './Icons';

interface EmailDetailProps {
  thread: Thread | null;
  currentFolder?: FolderType;
  onClose: () => void;
  onDelete: (threadId: string) => void;
  onArchive: (threadId: string) => void;
  onSnooze?: (threadId: string) => void;
  onMoveToInbox?: (threadId: string) => void;
  onToggleLabel?: (threadId: string, labelId: string) => void;
  onToggleStar: (threadId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onReply?: (threadId: string, type?: 'reply' | 'forward') => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  thread,
  currentFolder,
  onClose,
  onDelete,
  onArchive,
  onSnooze,
  onMoveToInbox,
  onToggleLabel,
  onToggleStar,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onReply,
}) => {
  const { t } = useI18n();
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showRemoteImages, setShowRemoteImages] = useState(false);
  const labelMenuRef = useRef<HTMLDivElement>(null);

  // Close label dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (labelMenuRef.current && !labelMenuRef.current.contains(e.target as Node)) {
        setShowLabelMenu(false);
      }
    };
    if (showLabelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLabelMenu]);

  const ALL_LABELS: Array<{ id: LabelType; label: string; dotClass: string }> = [
    { id: 'work', label: t('work'), dotClass: 'bg-[#006FEE]' },
    { id: 'personal', label: t('personal'), dotClass: 'bg-[#71717A]' },
    { id: 'billing', label: t('billing'), dotClass: 'bg-[#F5A524]' },
    { id: 'travel', label: t('travel'), dotClass: 'bg-[#17C964]' },
    { id: 'urgent', label: t('urgent'), dotClass: 'bg-[#F31260]' },
  ];

  if (!thread) {
    return (
      <div className="min-h-0 overflow-hidden hidden lg:flex lg:flex-col h-full items-center justify-center">
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="bg-surface shadow-surface flex size-12 items-center justify-center rounded-2xl border border-separator/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
              className="text-muted size-5"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M13.5 8.5h-2.388a3.422 3.422 0 0 1-6.224 0H2.5V11A1.5 1.5 0 0 0 4 12.5h8a1.5 1.5 0 0 0 1.5-1.5zm-2.204-4.757L13.251 7H10l-.136.545a1.921 1.921 0 0 1-3.728 0L6 7H2.75l1.954-3.257a.5.5 0 0 1 .428-.243h5.736a.5.5 0 0 1 .428.243M15 8.5v-.67a3 3 0 0 0-.428-1.543l-1.99-3.316A2 2 0 0 0 10.869 2H5.132a2 2 0 0 0-1.715.971l-1.99 3.316A3 3 0 0 0 1 7.831V11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-foreground text-base font-semibold">{t('noConversations')}</h2>
            <p className="text-muted max-w-[320px] text-xs">
              {t('selectEmailToRead')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Detect whether body has blocked external tracking images
  const hasBlockedExternalImages = thread.hasBlockedImages || thread.messages.some((m) =>
    m.body.some((p) => p.includes('data-blocked-src') || p.includes('<img'))
  );

  const mainMessage = thread.messages[0];
  const replyMessages = thread.messages.slice(1);

  const isHtml = (str: string) => /<[a-z][\s\S]*>/i.test(str);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-clip lg:py-4 lg:pl-0.5 lg:pr-4">
      <div className="bg-surface lg:shadow-surface flex max-h-full flex-1 flex-col gap-4 sm:gap-6 overflow-clip p-3 sm:p-6 lg:rounded-2xl border-0 lg:border border-separator/40">
        {/* Top Action Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Back Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to email list"
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-default/40 hover:bg-default text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>返回</span>
            </button>

            {/* Desktop Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="bg-default/70 text-muted hover:bg-default hover:text-foreground hidden size-6 shrink-0 items-center justify-center rounded-xl transition-colors lg:inline-flex cursor-pointer"
            >
              <CloseIcon className="size-3.5" />
            </button>

            {/* Trash, Archive, Star */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDelete(thread.id)}
                aria-label="Move to trash"
                title={t('deleteAction')}
                className="button button--icon-only button--sm button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <TrashIcon className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => onArchive(thread.id)}
                aria-label="Archive"
                title={t('archiveAction')}
                className="button button--icon-only button--sm button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <ArchiveIcon className="size-4" />
              </button>

              {currentFolder === 'snoozed' ? (
                <button
                  type="button"
                  onClick={() => onMoveToInbox && onMoveToInbox(thread.id)}
                  aria-label="Move to Inbox"
                  title={t('moveToInbox')}
                  className="button button--icon-only button--sm button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <InboxIcon className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSnooze && onSnooze(thread.id)}
                  aria-label="Snooze"
                  title={t('snoozeAction')}
                  className="button button--icon-only button--sm button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <SnoozedIcon className="size-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onToggleStar(thread.id)}
                aria-label={thread.isStarred ? 'Unstar' : 'Star'}
                title={thread.isStarred ? 'Unstar' : 'Star'}
                className="button button--icon-only button--sm button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                  className={`size-4 ${
                    thread.isStarred ? 'text-[#f5a524]' : 'text-muted'
                  }`}
                >
                  <path
                    fill="currentColor"
                    d="M6.886.773C7.29-.231 8.71-.231 9.114.773l1.472 3.667 3.943.268c1.08.073 1.518 1.424.688 2.118L12.185 9.36l.964 3.832c.264 1.05-.886 1.884-1.802 1.31L8 12.4l-3.347 2.101c-.916.575-2.066-.26-1.802-1.309l.964-3.832L.783 6.826c-.83-.694-.391-2.045.688-2.118l3.943-.268z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Controls: Prev / Next */}
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">
              {thread.messages.length} {t('threadReplies')}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Previous conversation"
                className="button button--icon-only button--sm button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <PrevIcon className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Next conversation"
                className="button button--icon-only button--sm button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <NextIcon className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Thread Content */}
        <div className="scroll-shadow flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
          {/* Email Subject Line & Label Badges */}
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-foreground text-lg font-bold leading-tight">
                {thread.subject}
              </h1>

              {/* Interactive Labels & Tag Selector */}
              <div className="relative flex flex-wrap shrink-0 items-center gap-1.5" ref={labelMenuRef}>
                {thread.labelIds.map((labelId) => {
                  const def = ALL_LABELS.find((l) => l.id === labelId);
                  return (
                    <span
                      key={labelId}
                      className="group inline-flex items-center gap-1 bg-default/40 hover:bg-default/60 text-foreground rounded-full pl-2 pr-1.5 py-0.5 text-[11px] font-medium border border-separator/40 transition-colors"
                    >
                      <span className={`size-1.5 shrink-0 rounded-full ${def?.dotClass || 'bg-primary'}`} />
                      <span>{t(labelId as any) || labelId}</span>
                      {onToggleLabel && (
                        <button
                          type="button"
                          onClick={() => onToggleLabel(thread.id, labelId)}
                          title={`${t('removeLabel')}: ${t(labelId as any) || labelId}`}
                          className="size-3.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 inline-flex items-center justify-center text-muted hover:text-foreground cursor-pointer transition-colors"
                        >
                          <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </span>
                  );
                })}

                {/* Add/Manage Labels Button */}
                {onToggleLabel && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLabelMenu(!showLabelMenu)}
                      className="inline-flex items-center gap-1 rounded-full bg-default/30 hover:bg-default/60 text-muted hover:text-foreground px-2 py-0.5 text-[11px] font-medium border border-dashed border-separator/60 transition-colors cursor-pointer"
                      title={t('manageLabels')}
                    >
                      <TagIcon className="size-3" />
                      <span>{t('addLabel')}</span>
                    </button>

                    {/* Labels Dropdown Popover */}
                    {showLabelMenu && (
                      <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface rounded-xl shadow-xl border border-separator/60 p-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider border-b border-separator/40 mb-1">
                          {t('labels')}
                        </div>
                        {ALL_LABELS.map((lbl) => {
                          const isAssigned = thread.labelIds.includes(lbl.id);
                          return (
                            <button
                              key={lbl.id}
                              type="button"
                              onClick={() => {
                                onToggleLabel(thread.id, lbl.id);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                isAssigned ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-default/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`size-2 shrink-0 rounded-full ${lbl.dotClass}`} />
                                <span>{lbl.label}</span>
                              </div>
                              {isAssigned && (
                                <svg className="size-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* External Images Blocker Notice */}
          {hasBlockedExternalImages && !showRemoteImages && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-separator/60 bg-default/20 p-3 text-xs">
              <div className="flex items-center gap-2 text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{t('remoteImagesBlocked')}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRemoteImages(true)}
                className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 font-medium transition-colors cursor-pointer"
              >
                {t('showImages')}
              </button>
            </div>
          )}

          {/* Primary Message */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              {/* Message Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="avatar avatar--md size-10 shrink-0 rounded-full overflow-hidden shadow-xs ring-1 ring-black/5 dark:ring-white/10 bg-default/20 flex items-center justify-center">
                    <img
                      src={mainMessage.from.avatar || getDiceBearAvatar(mainMessage.from.email || mainMessage.from.name)}
                      alt={mainMessage.from.name}
                      className="size-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const fallback = getDiceBearAvatar(mainMessage.from.email || mainMessage.from.name);
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground text-sm font-semibold leading-tight">
                        {mainMessage.from.name}
                      </span>
                      <span className="text-muted text-xs font-normal leading-tight">
                        {mainMessage.from.email}
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
                        className="text-muted hover:text-foreground flex items-center gap-0.5 text-xs font-medium leading-tight cursor-pointer pt-0.5"
                      >
                        <span>{t('toMe')}</span>
                        <ChevronDownIcon className="size-3 text-muted" />
                      </button>

                      {/* To me details popover */}
                      {showRecipientDropdown && (
                        <div className="absolute left-0 top-full mt-2 w-64 bg-surface rounded-xl shadow-lg border border-separator/60 p-3 z-30 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                          <div className="flex justify-between">
                            <span className="text-muted">{t('from')}:</span>
                            <span className="text-foreground font-medium truncate">{mainMessage.from.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">{t('to')}:</span>
                            <span className="text-foreground truncate">{mainMessage.to.map((t) => t.email).join(', ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">{t('date')}:</span>
                            <span className="text-foreground">{mainMessage.receivedAt}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side tools */}
                <div className="flex flex-col items-end gap-2 px-2">
                  <span className="text-muted whitespace-nowrap text-xs">
                    {mainMessage.receivedAt}
                  </span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => onReply && onReply(thread.id, 'reply')}
                      aria-label="Reply"
                      title={t('reply')}
                      className="button button--icon-only button--md button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <ReplyIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStar(thread.id)}
                      aria-label={thread.isStarred ? 'Remove star' : 'Star'}
                      title={thread.isStarred ? 'Remove star' : 'Star'}
                      className="button button--icon-only button--md button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 16 16"
                        className={`size-4 ${
                          thread.isStarred ? 'text-[#f5a524]' : 'text-muted'
                        }`}
                      >
                        <path
                          fill="currentColor"
                          d="M6.886.773C7.29-.231 8.71-.231 9.114.773l1.472 3.667 3.943.268c1.08.073 1.518 1.424.688 2.118L12.185 9.36l.964 3.832c.264 1.05-.886 1.884-1.802 1.31L8 12.4l-3.347 2.101c-.916.575-2.066-.26-1.802-1.309l.964-3.832L.783 6.826c-.83-.694-.391-2.045.688-2.118l3.943-.268z"
                        />
                      </svg>
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        aria-label="More"
                        title={t('moreOptions')}
                        className="button button--icon-only button--md button--ghost text-muted hover:text-foreground hover:bg-default/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreIcon className="size-4" />
                      </button>

                      {showMoreMenu && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-surface rounded-xl shadow-lg border border-separator/60 py-1 z-30 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              onReply && onReply(thread.id, 'reply');
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-default/50 text-foreground cursor-pointer"
                          >
                            {t('reply')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onReply && onReply(thread.id, 'forward');
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-default/50 text-foreground cursor-pointer"
                          >
                            {t('forward')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onArchive(thread.id);
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-default/50 text-foreground cursor-pointer"
                          >
                            {t('archiveAction')}
                          </button>
                          {currentFolder === 'snoozed' ? (
                            <button
                              type="button"
                              onClick={() => {
                                onMoveToInbox && onMoveToInbox(thread.id);
                                setShowMoreMenu(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-default/50 text-foreground cursor-pointer"
                            >
                              {t('moveToInbox')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSnooze && onSnooze(thread.id);
                                setShowMoreMenu(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-default/50 text-foreground cursor-pointer"
                            >
                              {t('snoozeAction')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(thread.id);
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-default/50 text-[#f31260] cursor-pointer"
                          >
                            {t('deleteAction')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Paragraphs (HTML and Rich Text Support) */}
              <div className="text-foreground text-sm leading-relaxed space-y-4 py-2 email-rendered-container">
                {mainMessage.body.map((p, idx) => {
                  let processed = p;
                  if (showRemoteImages && p.includes('data-blocked-src')) {
                    processed = p.replace(/data-blocked-src="([^"]+)"/g, 'src="$1"');
                  }

                  if (isHtml(processed)) {
                    return (
                      <div
                        key={idx}
                        dangerouslySetInnerHTML={{ __html: processed }}
                        className="email-html-body prose dark:prose-invert max-w-none text-foreground text-sm break-words overflow-x-auto"
                      />
                    );
                  }

                  // Plain text fallback with preserve whitespaces and newlines
                  return (
                    <div
                      key={idx}
                      className="whitespace-pre-wrap font-sans text-sm text-foreground break-words leading-relaxed"
                    >
                      {processed}
                    </div>
                  );
                })}
              </div>

              {/* Attachments if any */}
              {mainMessage.attachments && mainMessage.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-separator/40">
                  {mainMessage.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url || `/api/v1/attachments/${att.blobId || att.id}`}
                      target="_blank"
                      rel="noreferrer"
                      download={att.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-separator/60 bg-default/40 text-xs hover:bg-default/60 transition-colors cursor-pointer text-foreground group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16" className="size-4 text-muted group-hover:text-primary">
                        <path clipRule="evenodd" d="M3 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5.414A1 1 0 0 0 13.707 4.707l-3.414-3.414A1 1 0 0 0 9.586 1H3zm6 1v3a1 1 0 0 0 1 1h3v7H3V3h6z" fill="currentColor" fillRule="evenodd"/>
                      </svg>
                      <span className="font-medium group-hover:text-primary">{att.name}</span>
                      <span className="text-[10px] text-muted">{att.size}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Quick Actions at bottom of main message */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onReply && onReply(thread.id, 'reply')}
                  className="rounded-full bg-default/40 hover:bg-default/60 px-4 py-2 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ReplyIcon className="size-3.5" />
                  <span>{t('reply')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReply && onReply(thread.id, 'forward')}
                  className="rounded-full bg-default/40 hover:bg-default/60 px-4 py-2 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span>{t('forward')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Thread Replies Section */}
          {replyMessages.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-separator/40 pt-6">
              <span className="text-muted text-[11px] font-semibold tracking-wider">
                {t('threadReplies')} ({replyMessages.length})
              </span>

              {replyMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-default/20 rounded-2xl p-4 flex flex-col gap-3 border border-separator/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="avatar size-6 rounded-full overflow-hidden">
                        <img
                          src={msg.from.avatar}
                          alt={msg.from.name}
                          className="size-full object-cover"
                        />
                      </span>
                      <span className="text-foreground text-xs font-medium">
                        {msg.from.name}
                      </span>
                      <span className="text-muted text-[10px]">
                        &lt;{msg.from.email}&gt;
                      </span>
                    </div>
                    <span className="text-muted text-[11px]">{msg.receivedAt}</span>
                  </div>

                  <div className="text-foreground text-xs leading-relaxed space-y-2">
                    {msg.body.map((line, lIdx) => (
                      <p key={lIdx}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
