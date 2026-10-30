const API_BASE = '/api/v1';

export interface AttachmentItem {
  id: string;
  name: string;
  size: string;
  type?: string;
  blobId?: string;
  url?: string;
}

export async function fetchConfig(): Promise<{ defaultServerUrl: string; port: string } | null> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function apiSwitchAccount(email: string) {
  try {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function apiRemoveAccount(email: string) {
  try {
    const res = await fetch('/api/auth/remove-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  } catch {}
  return false;
}

export async function fetchMailboxes() {
  try {
    const res = await fetch(`${API_BASE}/mailboxes`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // offline fallback
  }
  return null;
}

export async function fetchEmails(folder: string = 'inbox', label?: string, search?: string) {
  try {
    const params = new URLSearchParams();
    if (folder) params.set('folder', folder);
    if (label) params.set('label', label);
    if (search) params.set('search', search);

    const res = await fetch(`${API_BASE}/emails?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // offline fallback
  }
  return null;
}

export async function fetchEmailDetail(id: string, allowRemote: boolean = false) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}?allow_remote=${allowRemote}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function apiToggleStar(id: string) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}/star`, { method: 'POST' });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function apiToggleRead(id: string, isRead?: boolean) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}/read`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isRead !== undefined ? { isRead } : {}),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function apiArchive(id: string) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}/archive`, { method: 'POST' });
    return res.ok;
  } catch {}
  return false;
}

export async function apiSnooze(id: string) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}/snooze`, { method: 'POST' });
    return res.ok;
  } catch {}
  return false;
}

export async function apiMove(id: string, folderId: string) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
    return res.ok;
  } catch {}
  return false;
}

export async function apiToggleLabel(id: string, label: string) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', label }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function apiSetLabels(id: string, labels: string[]) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', labels }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function apiDelete(id: string) {
  try {
    const res = await fetch(`${API_BASE}/emails/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {}
  return false;
}

export async function apiSendEmail(data: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  attachments?: AttachmentItem[];
}) {
  try {
    const res = await fetch(`${API_BASE}/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

export async function uploadAttachment(file: File): Promise<AttachmentItem | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/attachments/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        id: data.blobId,
        blobId: data.blobId,
        name: data.name,
        size: formatBytes(data.size),
        type: data.type,
        url: `${API_BASE}/attachments/${data.blobId}`,
      };
    }
  } catch (err) {
    console.error('Attachment upload failed:', err);
  }
  return null;
}

export function subscribeEvents(
  onEvent: (event: string, data: any) => void
): () => void {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }

  const es = new EventSource(`${API_BASE}/events`);

  es.addEventListener('email_created', (e) => {
    try {
      onEvent('email_created', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('email_updated', (e) => {
    try {
      onEvent('email_updated', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('email_read', (e) => {
    try {
      onEvent('email_read', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('email_starred', (e) => {
    try {
      onEvent('email_starred', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('email_deleted', (e) => {
    try {
      onEvent('email_deleted', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('email_moved', (e) => {
    try {
      onEvent('email_moved', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('email_labels_updated', (e) => {
    try {
      onEvent('email_labels_updated', JSON.parse(e.data));
    } catch {}
  });

  return () => {
    es.close();
  };
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
