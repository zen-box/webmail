export type FolderType = 
  | 'inbox' 
  | 'starred' 
  | 'sent' 
  | 'drafts' 
  | 'snoozed' 
  | 'archive' 
  | 'spam' 
  | 'trash';

export type LabelType = 'work' | 'personal' | 'billing' | 'travel' | 'urgent';

export interface Participant {
  name: string;
  email: string;
  avatar: string;
}

export interface Attachment {
  id: string;
  kind?: string;
  name: string;
  size: string;
  blobId?: string;
  url?: string;
}

export interface Message {
  id: string;
  from: Participant;
  to: Participant[];
  receivedAt: string;
  body: string[];
  attachments?: Attachment[];
  hasBlockedImages?: boolean;
}

export interface AccountItem {
  email: string;
  name: string;
  serverUrl?: string;
  avatar?: string;
  isCurrent?: boolean;
}

export interface Thread {
  id: string;
  folderId: FolderType;
  subject: string;
  preview: string;
  updatedAt: string;
  rawDate?: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant?: boolean;
  labelIds: LabelType[];
  participants: Participant[];
  messages: Message[];
  hasBlockedImages?: boolean;
}
