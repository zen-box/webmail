import React, { useState, useRef, useEffect } from 'react';
import type { FolderType, LabelType, AccountItem } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { getDiceBearAvatar } from '../utils/avatar';
import { 
  InboxIcon, 
  StarredIcon, 
  SentIcon, 
  DraftsIcon, 
  SnoozedIcon, 
  ArchiveIcon, 
  SpamIcon, 
  TrashIcon, 
  ComposeIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from './Icons';

interface SidebarProps {
  currentFolder: FolderType;
  onSelectFolder: (folder: FolderType) => void;
  selectedLabel: LabelType | null;
  onSelectLabel: (label: LabelType | null) => void;
  inboxUnreadCount: number;
  starredCount: number;
  snoozedCount?: number;
  labelCounts?: Record<string, number>;
  onCompose: () => void;
  user?: { name: string; email: string; avatar: string };
  accounts?: AccountItem[];
  onSwitchAccount?: (email: string) => void;
  onAddAccount?: () => void;
  onRemoveAccount?: (email: string) => void;
  onLogout?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFolder,
  onSelectFolder,
  selectedLabel,
  onSelectLabel,
  inboxUnreadCount,
  starredCount,
  snoozedCount,
  labelCounts,
  onCompose,
  user,
  accounts = [],
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { t, lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();

  const currentUser = user || { name: 'User', email: '', avatar: getDiceBearAvatar('user') };
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAccountMenu]);

  const folders: Array<{
    id: FolderType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'inbox', label: t('inbox'), icon: InboxIcon, count: inboxUnreadCount },
    { id: 'starred', label: t('starred'), icon: StarredIcon, count: starredCount },
    { id: 'sent', label: t('sent'), icon: SentIcon },
    { id: 'drafts', label: t('drafts'), icon: DraftsIcon },
    { id: 'snoozed', label: t('snoozed'), icon: SnoozedIcon, count: snoozedCount },
    { id: 'archive', label: t('archive'), icon: ArchiveIcon },
    { id: 'spam', label: t('spam'), icon: SpamIcon },
    { id: 'trash', label: t('trash'), icon: TrashIcon },
  ];

  const labels: Array<{ id: LabelType; label: string; dotClass: string }> = [
    { id: 'work', label: t('work'), dotClass: 'bg-[#006FEE]' },
    { id: 'personal', label: t('personal'), dotClass: 'bg-[#71717A]' },
    { id: 'billing', label: t('billing'), dotClass: 'bg-[#F5A524]' },
    { id: 'travel', label: t('travel'), dotClass: 'bg-[#17C964]' },
    { id: 'urgent', label: t('urgent'), dotClass: 'bg-[#F31260]' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside 
        className={`sidebar sidebar--left sidebar--default w-64 shrink-0 flex flex-col justify-between h-svh bg-background select-none p-2 border-r border-separator/40 z-50 md:z-20 transition-transform duration-200 ease-in-out ${
          isOpenMobile 
            ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl' 
            : 'fixed inset-y-0 left-0 -translate-x-full md:relative md:translate-x-0'
        }`}
        data-slot="sidebar"
      >
        <div className="flex flex-col gap-3 min-h-0">
          {/* Header Row on mobile */}
          <div className="flex items-center justify-between mb-0.5 md:hidden px-2 pt-1">
            <span className="text-xs font-bold tracking-wider text-muted uppercase">webmaill</span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-default/50 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Profile & Multi-Account Switcher */}
          <div className="relative" ref={accountMenuRef}>
          <div 
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center justify-between px-2.5 py-2 rounded-2xl hover:bg-default/50 transition-colors cursor-pointer border border-transparent hover:border-separator/40 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="avatar avatar--md size-9 shrink-0 rounded-full overflow-hidden shadow-xs ring-1 ring-black/5 dark:ring-white/10 bg-default/20 flex items-center justify-center">
                <img 
                  src={currentUser.avatar || getDiceBearAvatar(currentUser.email || currentUser.name)} 
                  alt={currentUser.name} 
                  className="size-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const fallback = getDiceBearAvatar(currentUser.email || currentUser.name);
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }} 
                />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-foreground text-xs font-semibold leading-tight truncate">
                  {currentUser.name}
                </span>
                <span className="text-muted text-[11px] font-normal leading-tight truncate mt-0.5">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <div className="p-1 rounded-md text-muted group-hover:text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Multi-Account Dropdown Menu */}
          {showAccountMenu && (
            <div className="absolute left-1 top-full mt-1.5 w-60 rounded-2xl bg-surface/95 backdrop-blur-xl border border-separator/60 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted uppercase">
                {t('accounts')}
              </div>

              {/* Accounts list */}
              <div className="flex flex-col gap-1 my-1 max-h-48 overflow-y-auto">
                {accounts.length > 0 ? (
                  accounts.map((acc) => {
                    const isCurrent = acc.email === currentUser.email;

                    return (
                      <div
                        key={acc.email}
                        onClick={() => {
                          if (!isCurrent && onSwitchAccount) {
                            onSwitchAccount(acc.email);
                            setShowAccountMenu(false);
                            onCloseMobile?.();
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer group/acc ${
                          isCurrent
                            ? 'bg-default/60 text-foreground font-medium'
                            : 'hover:bg-default/40 text-muted hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="size-6 rounded-full overflow-hidden shrink-0 bg-default/40">
                            <img
                              src={acc.avatar || getDiceBearAvatar(acc.email || acc.name)}
                              alt={acc.name}
                              className="size-full object-cover"
                            />
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate leading-tight font-medium">
                              {acc.name}
                            </span>
                            <span className="text-[10px] text-muted truncate">
                              {acc.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isCurrent && (
                            <span className="size-2 rounded-full bg-emerald-500" title={t('currentAccount')} />
                          )}
                          {!isCurrent && onRemoveAccount && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(t('removeAccountConfirm'))) {
                                  onRemoveAccount(acc.email);
                                }
                              }}
                              className="opacity-0 group-hover/acc:opacity-100 p-1 hover:text-red-500 rounded text-muted transition-opacity cursor-pointer"
                              title="Remove"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2 text-xs text-foreground font-medium">
                    {currentUser.email}
                  </div>
                )}
              </div>

              <div className="my-1 border-t border-separator/40" />

              {/* Add Account button */}
              {onAddAccount && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountMenu(false);
                    onAddAccount();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#006FEE] hover:bg-[#006FEE]/10 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t('addAccount')}</span>
                </button>
              )}

              {/* Logout button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer mt-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{t('logout')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Folders Navigation */}
        <div className="flex flex-col gap-0.5 px-1 overflow-y-auto" role="treegrid" aria-label="Email folders">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = !selectedLabel && currentFolder === folder.id;

            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  onSelectLabel(null);
                  onSelectFolder(folder.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-default/60 text-foreground font-semibold'
                    : 'text-muted hover:bg-default/40 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0" />
                  <span className="text-xs leading-none">{folder.label}</span>
                </div>
                {folder.count !== undefined && folder.count > 0 && (
                  <span className="text-xs tabular-nums text-muted font-normal">
                    {folder.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Separator line */}
        <hr className="separator separator--horizontal separator--default my-0.5 mx-2 border-t border-separator/40" />

        {/* Labels Section */}
        <div className="px-3">
          <div className="text-muted text-xs font-medium mb-2">
            {t('labels')}
          </div>
          <div className="flex flex-col gap-0.5">
            {labels.map((lbl) => {
              const isActive = selectedLabel === lbl.id;

              return (
                <button
                  key={lbl.id}
                  type="button"
                  onClick={() => {
                    onSelectLabel(isActive ? null : lbl.id);
                    onCloseMobile?.();
                  }}
                  className={`flex min-h-8 items-center justify-between px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive ? 'bg-default/60 text-foreground font-semibold' : 'text-foreground hover:bg-default/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${lbl.dotClass}`} />
                    <span>{lbl.label}</span>
                  </div>
                  {labelCounts && (labelCounts[lbl.id] || 0) > 0 && (
                    <span className="text-[10px] text-muted font-normal">
                      {labelCounts[lbl.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Tools: Compose + Theme & Language Switcher */}
      <div className="p-1 flex flex-col gap-2.5 border-t border-separator/40 pt-3">
        <button
          type="button"
          onClick={() => {
            onCompose();
            onCloseMobile?.();
          }}
          className="button button--primary button--md w-full rounded-full gap-2 font-medium bg-[#006FEE] hover:bg-[#005BC4] active:bg-[#004BB0] text-white py-2.5 px-4 flex items-center justify-center shadow-sm transition-all cursor-pointer text-xs"
        >
          <ComposeIcon className="size-4" />
          <span>{t('newEmail')}</span>
        </button>

        {/* Settings Bar: Theme & Language */}
        <div className="flex items-center justify-between px-1">
          {/* Theme Selector Pill */}
          <div className="flex items-center bg-default/40 rounded-full p-0.5 border border-separator/40">
            <button
              type="button"
              onClick={() => setMode('light')}
              title={t('themeLight')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                mode === 'light' ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground'
              }`}
            >
              <SunIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode('system')}
              title={t('themeSystem')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                mode === 'system' ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground'
              }`}
            >
              <MonitorIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode('dark')}
              title={t('themeDark')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                mode === 'dark' ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground'
              }`}
            >
              <MoonIcon className="size-3.5" />
            </button>
          </div>

          {/* Language Selector Pill */}
          <div className="flex items-center bg-default/40 rounded-full p-0.5 border border-separator/40 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setLang('zh')}
              className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                lang === 'zh' ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground'
              }`}
            >
              中
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
