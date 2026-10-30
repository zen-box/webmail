import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Thread, FolderType, LabelType, Participant, AccountItem } from './types';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { ComposeModal } from './components/ComposeModal';
import { LoginPage } from './components/LoginPage';
import { 
  apiToggleStar, 
  apiToggleRead, 
  apiArchive, 
  apiDelete, 
  apiSendEmail,
  apiSwitchAccount,
  apiRemoveAccount,
  apiSnooze,
  apiMove,
  apiToggleLabel,
  fetchEmails,
  fetchEmailDetail,
  subscribeEvents,
  type AttachmentItem,
} from './api/client';
import { getDiceBearAvatar } from './utils/avatar';

export function App() {
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [isEmailsLoading, setIsEmailsLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<FolderType>('inbox');
  const [selectedLabel, setSelectedLabel] = useState<LabelType | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{
    to: string;
    subject: string;
    body: string;
  }>({ to: '', subject: '', body: '' });

  const loadBackendEmails = useCallback((userObj: Participant, folder: FolderType = 'inbox', label?: LabelType | null) => {
    setIsEmailsLoading(true);
    fetchEmails(folder, label || undefined)
      .then((backendEmails) => {
        if (backendEmails && Array.isArray(backendEmails)) {
          if (backendEmails.length === 0) {
            setThreads([]);
            setSelectedThreadId(null);
            return;
          }

          const mapped: Thread[] = backendEmails.map((be: any) => {
            return {
              id: be.id,
              folderId: (be.folderId || folder) as FolderType,
              subject: be.subject,
              preview: be.preview,
              updatedAt: be.updatedAt,
              rawDate: be.rawDate,
              isRead: be.isRead,
              isStarred: be.isStarred,
              labelIds: be.labelIds || ['work'],
              participants: [
                {
                  name: be.authorName || 'Sender',
                  email: be.authorMail || 'sender@heroui.dev',
                  avatar: be.avatar || getDiceBearAvatar(be.authorMail || be.authorName),
                },
              ],
              messages: be.messages && be.messages.length > 0 ? be.messages : [
                {
                  id: `msg-${be.id}`,
                  from: {
                    name: be.authorName || 'Sender',
                    email: be.authorMail || 'sender@heroui.dev',
                    avatar: be.avatar || getDiceBearAvatar(be.authorMail || be.authorName),
                  },
                  to: [userObj],
                  receivedAt: be.updatedAt,
                  body: Array.isArray(be.body) ? be.body : [be.preview],
                  attachments: be.attachments,
                },
              ],
            };
          });

          setThreads((prev) => {
            const prevMap = new Map(prev.map((t) => [t.id, t]));
            return mapped.map((m) => {
              const existing = prevMap.get(m.id);
              if (existing && existing.messages && existing.messages.length > 0) {
                return {
                  ...m,
                  messages: existing.messages,
                  hasBlockedImages: existing.hasBlockedImages ?? m.hasBlockedImages,
                };
              }
              return m;
            });
          });
          setSelectedThreadId((prev) => {
            if (prev && mapped.some((m) => m.id === prev)) return prev;
            return mapped[0]?.id || null;
          });
        } else {
          setThreads([]);
          setSelectedThreadId(null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch emails:', err);
        setThreads([]);
        setSelectedThreadId(null);
      })
      .finally(() => {
        setIsEmailsLoading(false);
      });
  }, []);

  // Check auth on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && data.authenticated) {
          const userObj: Participant = {
            name: data.name || 'User',
            email: data.email,
            avatar: data.avatar || getDiceBearAvatar(data.email || data.name),
          };
          setCurrentUser(userObj);
          if (data.accounts) {
            setAccounts(data.accounts);
          }
          loadBackendEmails(userObj, 'inbox', null);
        } else {
          setCurrentUser(null);
        }
        setAuthChecked(true);
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null);
          setAuthChecked(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadBackendEmails]);

  // Refetch when folder or label changes
  useEffect(() => {
    if (currentUser) {
      loadBackendEmails(currentUser, currentFolder, selectedLabel);
    }
  }, [currentUser, currentFolder, selectedLabel, loadBackendEmails]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeEvents((event, data) => {
      if (event === 'email_created' && data && data.id) {
        setThreads((prev) => {
          if (prev.some((t) => t.id === data.id)) return prev;
          const newThread: Thread = {
            id: data.id,
            folderId: data.folderId || 'sent',
            subject: data.subject,
            preview: data.preview,
            updatedAt: data.updatedAt || 'Just now',
            isRead: data.isRead,
            isStarred: data.isStarred,
            labelIds: data.labelIds || ['work'],
            participants: [
              {
                name: data.authorName || currentUser.name,
                email: data.authorMail || currentUser.email,
                avatar: data.avatar || currentUser.avatar,
              },
            ],
            messages: [
              {
                id: `msg-${data.id}`,
                from: {
                  name: data.authorName || currentUser.name,
                  email: data.authorMail || currentUser.email,
                  avatar: data.avatar || currentUser.avatar,
                },
                to: [currentUser],
                receivedAt: data.updatedAt || 'Just now',
                body: Array.isArray(data.body) ? data.body : [data.preview],
                attachments: data.attachments,
              },
            ],
          };
          return [newThread, ...prev];
        });
      } else if (event === 'email_read' && data && data.id) {
        setThreads((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, isRead: data.isRead } : t))
        );
      } else if (event === 'email_starred' && data && data.id) {
        setThreads((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, isStarred: data.isStarred } : t))
        );
      } else if (event === 'email_moved' && data && data.id) {
        setThreads((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, folderId: data.folderId } : t))
        );
      } else if (event === 'email_labels_updated' && data && data.id && data.labelIds) {
        setThreads((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, labelIds: data.labelIds } : t))
        );
      } else if (event === 'email_deleted' && data && data.id) {
        if (data.status === 'destroyed') {
          setThreads((prev) => prev.filter((t) => t.id !== data.id));
        } else {
          setThreads((prev) =>
            prev.map((t) => (t.id === data.id ? { ...t, folderId: 'trash' } : t))
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const handleLoginSuccess = (userObj: { name: string; email: string; avatar: string }) => {
    const newUser: Participant = {
      name: userObj.name || 'User',
      email: userObj.email,
      avatar: userObj.avatar,
    };
    setCurrentUser(newUser);
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.accounts) setAccounts(data.accounts);
      });
    loadBackendEmails(newUser);
  };

  const handleSwitchAccount = async (targetEmail: string) => {
    setIsEmailsLoading(true);
    setThreads([]);
    setSelectedThreadId(null);
    const res = await apiSwitchAccount(targetEmail);
    if (res && res.success && res.user) {
      const newUser: Participant = {
        name: res.user.name,
        email: res.user.email,
        avatar: res.user.avatar,
      };
      setCurrentUser(newUser);
      setAccounts((prev) =>
        prev.map((acc) => ({ ...acc, isCurrent: acc.email === targetEmail }))
      );
      loadBackendEmails(newUser, 'inbox', null);
    }
  };

  const handleRemoveAccount = async (targetEmail: string) => {
    const success = await apiRemoveAccount(targetEmail);
    if (success) {
      setAccounts((prev) => prev.filter((acc) => acc.email !== targetEmail));
    }
  };

  const handleAddAccountSuccess = (userObj: { name: string; email: string; avatar: string }) => {
    const newUser: Participant = {
      name: userObj.name || 'User',
      email: userObj.email,
      avatar: userObj.avatar,
    };
    setCurrentUser(newUser);
    setIsAddingAccount(false);
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.accounts) setAccounts(data.accounts);
      });
    loadBackendEmails(newUser, 'inbox', null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
  };

  // Filter threads
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      // Label filter
      if (selectedLabel) {
        if (!thread.labelIds.includes(selectedLabel)) return false;
      } else {
        // Folder filter
        if (currentFolder === 'starred') {
          if (!thread.isStarred) return false;
        } else {
          if (thread.folderId !== currentFolder) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const author = thread.messages[0]?.from || thread.participants[0];
        const matchAuthor = author.name.toLowerCase().includes(q) || author.email.toLowerCase().includes(q);
        const matchSubject = thread.subject.toLowerCase().includes(q);
        const matchPreview = thread.preview.toLowerCase().includes(q);
        const matchBody = thread.messages.some((m) =>
          m.body.some((p) => p.toLowerCase().includes(q))
        );
        return matchAuthor || matchSubject || matchPreview || matchBody;
      }

      return true;
    });
  }, [threads, currentFolder, selectedLabel, searchQuery]);

  // Selected thread
  const selectedThread = useMemo(() => {
    return threads.find((t) => t.id === selectedThreadId) || null;
  }, [threads, selectedThreadId]);

  // Current index in filtered list
  const currentIndex = useMemo(() => {
    if (!selectedThreadId) return -1;
    return filteredThreads.findIndex((t) => t.id === selectedThreadId);
  }, [filteredThreads, selectedThreadId]);

  // Unread inbox count
  const inboxUnreadCount = useMemo(() => {
    return threads.filter((t) => t.folderId === 'inbox' && !t.isRead).length;
  }, [threads]);

  // Starred count
  const starredCount = useMemo(() => {
    return threads.filter((t) => t.isStarred).length;
  }, [threads]);

  // Snoozed count
  const snoozedCount = useMemo(() => {
    return threads.filter((t) => t.folderId === 'snoozed').length;
  }, [threads]);

  // Dynamic label counts across conversations
  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      work: 0,
      personal: 0,
      billing: 0,
      travel: 0,
      urgent: 0,
    };
    threads.forEach((t) => {
      (t.labelIds || []).forEach((l) => {
        if (counts[l] !== undefined) counts[l]++;
      });
    });
    return counts;
  }, [threads]);

  // Automatically load full HTML detail whenever selectedThreadId changes
  useEffect(() => {
    if (!selectedThreadId) return;
    let isCurrent = true;

    fetchEmailDetail(selectedThreadId).then((detail) => {
      if (!isCurrent || !detail || detail.id !== selectedThreadId) return;
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThreadId
            ? {
                ...t,
                isRead: true,
                isStarred: detail.isStarred ?? t.isStarred,
                messages:
                  detail.messages && detail.messages.length > 0
                    ? detail.messages
                    : [
                        {
                          id: `msg-${detail.id}`,
                          from: {
                            name: detail.authorName || 'Sender',
                            email: detail.authorMail || '',
                            avatar:
                              detail.avatar ||
                              getDiceBearAvatar(detail.authorMail || detail.authorName),
                          },
                          to: [currentUser || { name: 'User', email: '', avatar: '' }],
                          receivedAt: detail.updatedAt,
                          body: Array.isArray(detail.body) ? detail.body : [detail.preview],
                          attachments: detail.attachments,
                        },
                      ],
                hasBlockedImages: detail.hasBlockedImages,
              }
            : t
        )
      );
    });

    return () => {
      isCurrent = false;
    };
  }, [selectedThreadId, currentUser]);

  // Handlers with Optimistic Updates + Backend Sync
  const handleSelectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isRead: true } : t))
    );
    apiToggleRead(threadId, true);
  }, []);

  const handleToggleStar = useCallback((threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isStarred: !t.isStarred } : t))
    );
    apiToggleStar(threadId);
  }, []);

  const handleDelete = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, folderId: 'trash' } : t))
    );
    apiDelete(threadId);
    const nextList = filteredThreads.filter((t) => t.id !== threadId);
    setSelectedThreadId(nextList[0]?.id || null);
  }, [filteredThreads]);

  const handleArchive = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, folderId: 'archive' } : t))
    );
    apiArchive(threadId);
    const nextList = filteredThreads.filter((t) => t.id !== threadId);
    setSelectedThreadId(nextList[0]?.id || null);
  }, [filteredThreads]);

  const handleSnooze = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, folderId: 'snoozed' } : t))
    );
    apiSnooze(threadId);
    const nextList = filteredThreads.filter((t) => t.id !== threadId);
    setSelectedThreadId(nextList[0]?.id || null);
  }, [filteredThreads]);

  const handleMoveToInbox = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, folderId: 'inbox' } : t))
    );
    apiMove(threadId, 'inbox');
    const nextList = filteredThreads.filter((t) => t.id !== threadId);
    setSelectedThreadId(nextList[0]?.id || null);
  }, [filteredThreads]);

  const handleToggleLabel = useCallback(async (threadId: string, labelId: string) => {
    const res = await apiToggleLabel(threadId, labelId);
    if (res && res.labelIds) {
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, labelIds: res.labelIds } : t))
      );
    }
  }, []);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      handleSelectThread(filteredThreads[currentIndex - 1].id);
    }
  }, [currentIndex, filteredThreads, handleSelectThread]);

  const handleNext = useCallback(() => {
    if (currentIndex < filteredThreads.length - 1) {
      handleSelectThread(filteredThreads[currentIndex + 1].id);
    }
  }, [currentIndex, filteredThreads, handleSelectThread]);

  const handleOpenCompose = (initial = { to: '', subject: '', body: '' }) => {
    setComposeDefaults(initial);
    setIsComposeOpen(true);
  };

  const handleReply = (threadId: string, type: 'reply' | 'forward' = 'reply') => {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;

    const firstMsg = target.messages[0];
    const author = firstMsg?.from.email || '';
    const subjectPrefix = type === 'reply' ? 'Re: ' : 'Fwd: ';
    const cleanSubject = target.subject.replace(/^(Re:\s*|Fwd:\s*)+/i, '');
    const quoteHeader = `\n\n---------- Original Message ----------\nFrom: ${firstMsg?.from.name} <${firstMsg?.from.email}>\nDate: ${firstMsg?.receivedAt}\nSubject: ${target.subject}\n\n`;
    const quoteBody = firstMsg?.body.map((line) => `> ${line}`).join('\n') || '';

    handleOpenCompose({
      to: type === 'reply' ? author : '',
      subject: `${subjectPrefix}${cleanSubject}`,
      body: quoteHeader + quoteBody,
    });
  };

  const handleSendNewEmail = ({ 
    to, 
    cc,
    bcc,
    subject, 
    body, 
    attachments 
  }: { 
    to: string; 
    cc?: string;
    bcc?: string;
    subject: string; 
    body: string; 
    attachments?: AttachmentItem[];
  }) => {
    if (!currentUser) return;

    const firstTo = to.split(/[,;]/)[0].trim();
    const newThread: Thread = {
      id: `sent-${Date.now()}`,
      folderId: 'sent',
      subject,
      preview: body.slice(0, 75) + '...',
      updatedAt: 'Just now',
      isRead: true,
      isStarred: false,
      labelIds: ['work'],
      participants: [currentUser],
      messages: [
        {
          id: `msg-${Date.now()}`,
          from: currentUser,
          to: [{ name: firstTo.split('@')[0], email: firstTo, avatar: getDiceBearAvatar(firstTo) }],
          receivedAt: 'Just now',
          body: [body],
          attachments: attachments?.map((a) => ({
            id: a.id,
            name: a.name,
            size: a.size,
            blobId: a.blobId,
            url: a.url,
          })),
        },
      ],
    };

    setThreads((prev) => [newThread, ...prev]);
    apiSendEmail({ to, cc, bcc, subject, body, attachments });
  };

  // If waiting for auth check
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin size-6 text-[#006FEE]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span className="text-xs text-muted">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show Login Screen!
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div 
      className="sidebar__provider flex h-svh w-screen overflow-hidden bg-background text-foreground"
      data-sidebar="provider"
      data-slot="sidebar-provider"
      data-state="expanded"
      data-app-layout=""
      data-scroll-mode="page"
    >
      {/* 1. Left Sidebar */}
      <Sidebar
        currentFolder={currentFolder}
        onSelectFolder={(f) => {
          setCurrentFolder(f);
          setSelectedLabel(null);
          setSelectedThreadId(null);
        }}
        selectedLabel={selectedLabel}
        onSelectLabel={(lbl) => {
          setSelectedLabel(lbl);
          setSelectedThreadId(null);
        }}
        inboxUnreadCount={inboxUnreadCount}
        starredCount={starredCount}
        snoozedCount={snoozedCount}
        labelCounts={labelCounts}
        onCompose={() => handleOpenCompose()}
        user={currentUser}
        accounts={accounts}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => setIsAddingAccount(true)}
        onRemoveAccount={handleRemoveAccount}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Grid (Middle: List, Right: Reader) */}
      <div className="app-layout__body flex-1 h-svh overflow-hidden" data-slot="app-layout-body">
        <main 
          className="app-layout__main h-svh overflow-hidden lg:grid lg:grid-cols-[minmax(320px,360px)_1fr] bg-background"
          data-scroll-mode="page"
          data-slot="app-layout-main"
        >
          {/* Middle Email List */}
          <div className={`min-h-0 overflow-hidden flex flex-1 flex-col border-r border-separator/40 ${
            selectedThreadId ? 'hidden lg:flex' : 'flex'
          }`}>
            <EmailList
              threads={filteredThreads}
              selectedThreadId={selectedThreadId}
              onSelectThread={handleSelectThread}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleStar={handleToggleStar}
              isLoading={isEmailsLoading}
              currentFolder={currentFolder}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            />
          </div>

          {/* Right Reading Card Pane */}
          <div className={`min-h-0 overflow-hidden flex flex-1 flex-col ${
            selectedThreadId ? 'flex' : 'hidden lg:flex'
          }`}>
            <EmailDetail
              thread={selectedThread}
              currentFolder={currentFolder}
              onClose={() => setSelectedThreadId(null)}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onSnooze={handleSnooze}
              onMoveToInbox={handleMoveToInbox}
              onToggleLabel={handleToggleLabel}
              onToggleStar={handleToggleStar}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < filteredThreads.length - 1}
              onReply={handleReply}
            />
          </div>
        </main>
      </div>

      {/* Mobile Floating Action Button (FAB) to write email */}
      {!selectedThreadId && (
        <button
          type="button"
          onClick={() => handleOpenCompose()}
          className="md:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-[#006FEE] hover:bg-[#005BC4] active:scale-95 text-white px-4 py-3 rounded-full shadow-lg shadow-blue-500/30 font-semibold text-xs transition-transform cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>写邮件</span>
        </button>
      )}

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendNewEmail}
        initialTo={composeDefaults.to}
        initialSubject={composeDefaults.subject}
        initialBody={composeDefaults.body}
      />

      {/* Add Account Modal */}
      {isAddingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <LoginPage
            isAddingAccount={true}
            onLoginSuccess={handleAddAccountSuccess}
            onCancel={() => setIsAddingAccount(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
