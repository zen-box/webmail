import React, { createContext, useContext, useState } from 'react';

export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    // Folders
    inbox: '收件箱',
    starred: '已加星标',
    sent: '已发送',
    drafts: '草稿箱',
    snoozed: '待办邮件',
    archive: '已归档',
    spam: '垃圾邮件',
    trash: '废纸篓',

    // Labels
    labels: '标签分类',
    work: '工作',
    personal: '个人',
    billing: '账单',
    travel: '行程',
    urgent: '紧急',

    // Email List & Search
    searchPlaceholder: '搜索邮件主题、发件人或内容...',
    noConversations: '暂无邮件',
    noConversationsInFolder: '该文件夹暂无邮件',
    noMatchingConversations: '未找到匹配的邮件',
    tryAdjustingSearch: '请尝试更换搜索关键词',
    newMessagesArriveHere: '新收到的邮件将展示在此处',
    loadingEmails: '正在加载邮件...',

    // Email Detail
    selectEmailToRead: '请选择一封邮件进行阅读',
    from: '发件人',
    to: '收件人',
    toMe: '发给我',
    date: '日期',
    subject: '主题',
    reply: '回复',
    forward: '转发',
    archiveAction: '归档',
    snoozeAction: '设为待办',
    moveToInbox: '移至收件箱',
    manageLabels: '管理标签',
    addLabel: '添加标签',
    removeLabel: '移除标签',
    deleteAction: '删除',
    moreOptions: '更多操作',
    threadReplies: '往来回复记录',
    remoteImagesBlocked: '已拦截外部追踪图片以保护您的隐私',
    showImages: '显示图片',
    attachments: '附件',
    download: '下载',

    // Compose
    newEmail: '写新邮件',
    composeTitle: '撰写邮件',
    toRecipient: '收件人',
    toPlaceholder: '输入收件人邮箱，多个以逗号或分号隔开...',
    ccRecipient: '抄送',
    ccPlaceholder: '输入抄送邮箱，多个以逗号或分号隔开...',
    bccRecipient: '密送',
    bccPlaceholder: '输入密送邮箱，多个以逗号或分号隔开...',
    subjectField: '邮件主题',
    subjectPlaceholder: '输入邮件主题...',
    bodyPlaceholder: '在此输入邮件正文内容...',
    send: '发送邮件',
    sending: '发送中...',
    discard: '放弃草稿',
    addAttachment: '添加附件',
    dropFiles: '拖拽文件至此上传',

    // Account & Multi-account
    accounts: '邮箱账号',
    currentAccount: '当前邮箱',
    switchAccount: '切换邮箱',
    addAccount: '添加其他邮箱账号',
    logout: '退出当前登录',
    serverAddress: '服务器地址',
    emailAddress: '邮箱地址',
    password: '密码',
    login: '登 录',
    loggingIn: '正在连接服务器...',
    removeAccountConfirm: '确定要移除此邮箱账号吗？',
    defaultServerTip: '默认使用系统内置服务器，无需手动修改',

    // Theme & Settings
    theme: '主题外观',
    themeSystem: '跟随系统',
    themeLight: '浅色模式',
    themeDark: '深色模式',
    language: '语言设置',
    langZh: '简体中文',
    langEn: 'English',
    minimalView: '紧凑视图',
    expandedView: '标准视图',
  },
  en: {
    // Folders
    inbox: 'Inbox',
    starred: 'Starred',
    sent: 'Sent',
    drafts: 'Drafts',
    snoozed: 'Snoozed',
    archive: 'Archive',
    spam: 'Spam',
    trash: 'Trash',

    // Labels
    labels: 'Labels',
    work: 'Work',
    personal: 'Personal',
    billing: 'Billing',
    travel: 'Travel',
    urgent: 'Urgent',

    // Email List & Search
    searchPlaceholder: 'Search subject, author or content...',
    noConversations: 'No conversations found',
    noConversationsInFolder: 'No conversations in {folder}',
    noMatchingConversations: 'No matching conversations',
    tryAdjustingSearch: 'Try adjusting your search terms',
    newMessagesArriveHere: 'New messages will appear here',
    loadingEmails: 'Loading conversations...',

    // Email Detail
    selectEmailToRead: 'Select a conversation to read',
    from: 'From',
    to: 'To',
    toMe: 'to me',
    date: 'Date',
    subject: 'Subject',
    reply: 'Reply',
    forward: 'Forward',
    archiveAction: 'Archive',
    snoozeAction: 'Snooze',
    moveToInbox: 'Move to Inbox',
    manageLabels: 'Manage labels',
    addLabel: 'Add label',
    removeLabel: 'Remove label',
    deleteAction: 'Delete',
    moreOptions: 'More options',
    threadReplies: 'THREAD REPLIES',
    remoteImagesBlocked: 'External images were blocked to protect your privacy',
    showImages: 'Show images',
    attachments: 'Attachments',
    download: 'Download',

    // Compose
    newEmail: 'New email',
    composeTitle: 'New Message',
    toRecipient: 'To',
    toPlaceholder: 'Recipients, separated by commas or semicolons...',
    ccRecipient: 'Cc',
    ccPlaceholder: 'Cc recipients, separated by commas...',
    bccRecipient: 'Bcc',
    bccPlaceholder: 'Bcc recipients, separated by commas...',
    subjectField: 'Subject',
    subjectPlaceholder: 'Subject of the email...',
    bodyPlaceholder: 'Write your message here...',
    send: 'Send',
    sending: 'Sending...',
    discard: 'Discard',
    addAttachment: 'Attach file',
    dropFiles: 'Drop files to attach',

    // Account & Multi-account
    accounts: 'Email Accounts',
    currentAccount: 'Current Account',
    switchAccount: 'Switch Account',
    addAccount: 'Add Another Account',
    logout: 'Log out',
    serverAddress: 'Server Address',
    emailAddress: 'Email Address',
    password: 'Password',
    login: 'Sign In',
    loggingIn: 'Connecting to server...',
    removeAccountConfirm: 'Are you sure you want to remove this account?',
    defaultServerTip: 'Using default system server address',

    // Theme & Settings
    theme: 'Appearance',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    langZh: '简体中文',
    langEn: 'English',
    minimalView: 'Minimal View',
    expandedView: 'Expanded View',
  },
};

type TranslationKey = keyof typeof translations.zh;

interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('heroui_mail_lang');
    if (saved === 'zh' || saved === 'en') return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('heroui_mail_lang', newLang);
  };

  const t = (key: TranslationKey, vars?: Record<string, string>): string => {
    let str = translations[lang][key] || translations.en[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
