import React, { useMemo } from 'react';
import type { Thread } from '../types';
import { SearchIcon, CloseIcon } from './Icons';
import { useI18n } from '../i18n';
import { getDiceBearAvatar } from '../utils/avatar';

interface EmailListProps {
  threads: Thread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleStar: (threadId: string, e: React.MouseEvent) => void;
  isLoading?: boolean;
  currentFolder?: string;
  onOpenMobileSidebar?: () => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  searchQuery,
  onSearchChange,
  onToggleStar,
  isLoading = false,
  currentFolder = 'inbox',
  onOpenMobileSidebar,
}) => {
  const { t } = useI18n();

  // Double-check sorting by rawDate descending (newest first)
  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (a.rawDate && b.rawDate) {
        return b.rawDate.localeCompare(a.rawDate);
      }
      return 0;
    });
  }, [threads]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-clip px-2 pb-2 pt-3 md:pt-4 w-full">
      {/* Search Bar & Mobile Hamburger Menu */}
      <div className="flex items-center gap-2 px-1">
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="md:hidden flex items-center justify-center size-9 rounded-full bg-surface border border-separator/60 text-muted hover:text-foreground shrink-0 shadow-xs cursor-pointer active:scale-95 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="search-field search-field--primary flex-1">
          <div className="search-field__group flex items-center bg-surface border border-separator/60 rounded-full px-3.5 py-1.5 shadow-xs">
            <SearchIcon className="search-field__search-icon size-4 text-muted shrink-0 mr-2" />
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-field__input w-full bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-muted hover:text-foreground text-xs ml-1 cursor-pointer"
              >
                <CloseIcon className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Email List */}
      <div className="scroll-shadow flex-1 overflow-y-auto px-1">
        {isLoading ? (
          <div className="flex flex-col gap-1.5 p-1 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl p-3 bg-surface/50 border border-separator/30"
              >
                {/* Avatar Skeleton */}
                <div className="size-9 shrink-0 rounded-full bg-default/40 mt-0.5" />

                {/* Content Skeleton */}
                <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-24 bg-default/40 rounded-full" />
                    <div className="h-3 w-12 bg-default/30 rounded-full" />
                  </div>
                  <div className="h-3.5 w-4/5 bg-default/40 rounded-full" />
                  <div className="h-3 w-full bg-default/20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center px-4">
            <div className="size-12 rounded-full bg-default/30 flex items-center justify-center text-muted mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="opacity-70">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.91a2.25 2.25 0 00-2.15 1.588L2.35 12.677a2.25 2.25 0 00-.1.661z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-foreground">
              {searchQuery ? t('noMatchingConversations') : t('noConversationsInFolder', { folder: t(currentFolder as any) || currentFolder })}
            </p>
            <p className="text-[11px] text-muted mt-1 max-w-[200px]">
              {searchQuery ? t('tryAdjustingSearch') : t('newMessagesArriveHere')}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sortedThreads.map((thread) => {
              const isSelected = selectedThreadId === thread.id;
              const author = thread.messages[0]?.from || thread.participants[0];

              return (
                <li key={thread.id} className="relative">
                  <div
                    onClick={() => onSelectThread(thread.id)}
                    className={`relative flex items-start gap-3 rounded-2xl p-3 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-surface shadow-surface border border-separator/50'
                        : 'hover:bg-default/60 border border-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <span className="avatar avatar--md size-9 shrink-0 rounded-full overflow-hidden shadow-xs ring-1 ring-black/5 dark:ring-white/10 mt-0.5 bg-default/20 flex items-center justify-center">
                      <img
                        src={author.avatar || getDiceBearAvatar(author.email || author.name)}
                        alt={author.name}
                        className="size-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          const fallback = getDiceBearAvatar(author.email || author.name);
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                    </span>

                    {/* Content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {/* Name & Time */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`truncate text-sm leading-tight text-foreground ${
                            thread.isRead ? '' : 'font-medium'
                          }`}
                        >
                          {author.name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`whitespace-nowrap text-xs leading-tight ${
                              thread.isRead ? 'text-muted' : 'text-foreground font-medium'
                            }`}
                          >
                            {thread.updatedAt}
                          </span>
                          {!thread.isRead && (
                            <span
                              aria-hidden="true"
                              className="bg-[#006FEE] size-1.5 shrink-0 rounded-full"
                            />
                          )}
                        </div>
                      </div>

                      {/* Subject */}
                      <span
                        className={`description truncate text-xs leading-tight ${
                          thread.isRead ? 'text-muted' : 'text-foreground font-medium'
                        }`}
                      >
                        {thread.subject}
                      </span>

                      {/* Preview Snippet */}
                      <span className="description text-muted truncate pr-8 text-xs leading-tight">
                        {thread.preview}
                      </span>

                      {/* Star Icon Button */}
                      <span
                        onClick={(e) => onToggleStar(thread.id, e)}
                        className="absolute bottom-3 right-3 cursor-pointer p-0.5 transition-transform active:scale-90"
                        title={thread.isStarred ? 'Unstar' : 'Star'}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="none"
                          viewBox="0 0 16 16"
                          className={`size-4 ${
                            thread.isStarred
                              ? 'text-[#f5a524]'
                              : 'text-muted opacity-35 hover:opacity-100'
                          }`}
                        >
                          <path
                            fill="currentColor"
                            d="M6.886.773C7.29-.231 8.71-.231 9.114.773l1.472 3.667 3.943.268c1.08.073 1.518 1.424.688 2.118L12.185 9.36l.964 3.832c.264 1.05-.886 1.884-1.802 1.31L8 12.4l-3.347 2.101c-.916.575-2.066-.26-1.802-1.309l.964-3.832L.783 6.826c-.83-.694-.391-2.045.688-2.118l3.943-.268z"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
