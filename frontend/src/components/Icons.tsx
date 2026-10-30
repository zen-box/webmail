import React from 'react';

export const InboxIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M13.5 8.5h-2.388a3.422 3.422 0 0 1-6.224 0H2.5V11A1.5 1.5 0 0 0 4 12.5h8a1.5 1.5 0 0 0 1.5-1.5zm-2.204-4.757L13.251 7H10l-.136.545a1.921 1.921 0 0 1-3.728 0L6 7H2.75l1.954-3.257a.5.5 0 0 1 .428-.243h5.736a.5.5 0 0 1 .428.243M15 8.5v-.67a3 3 0 0 0-.428-1.543l-1.99-3.316A2 2 0 0 0 10.869 2H5.132a2 2 0 0 0-1.715.971l-1.99 3.316A3 3 0 0 0 1 7.831V11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3z" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const StarredIcon: React.FC<{ className?: string; filled?: boolean }> = ({ className = 'size-4', filled = false }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6.886.773C7.29-.231 8.71-.231 9.114.773l1.472 3.667 3.943.268c1.08.073 1.518 1.424.688 2.118L12.185 9.36l.964 3.832c.264 1.05-.886 1.884-1.802 1.31L8 12.4l-3.347 2.101c-.916.575-2.066-.26-1.802-1.309l.964-3.832L.783 6.826c-.83-.694-.391-2.045.688-2.118l3.943-.268z" fill={filled ? 'currentColor' : 'currentColor'}></path>
  </svg>
);

export const SentIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M7.29 13.904 5.25 10.75 2.096 8.71a2.4 2.4 0 0 1 .5-4.278l9.273-3.296a2.346 2.346 0 0 1 2.996 2.995L13.45 3.63a.844.844 0 0 0-1.08-1.08L3.1 5.846a.9.9 0 0 0-.19 1.604l2.78 1.799 3.279-3.28a.75.75 0 1 1 1.06 1.061L6.75 10.31l1.799 2.779a.9.9 0 0 0 1.604-.188l3.297-9.272 1.413.502-3.296 9.273a2.4 2.4 0 0 1-4.277.5" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const DraftsIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M5 13.5h6a1.5 1.5 0 0 0 1.5-1.5V7.243a1.5 1.5 0 0 0-.44-1.061L8.819 2.939a1.5 1.5 0 0 0-1.06-.439H5A1.5 1.5 0 0 0 3.5 4v8A1.5 1.5 0 0 0 5 13.5m9-6.257a3 3 0 0 0-.879-2.122L9.88 1.88A3 3 0 0 0 7.757 1H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3zM5 8.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8.25m.75 2.25a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5z" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const SnoozedIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M6.25 0a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5zM13 9A5 5 0 1 1 3 9a5 5 0 0 1 10 0m1.5 0a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0m-2.28-7.28a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06M8.75 6a.75.75 0 0 0-1.5 0v3a.75.75 0 0 0 .3.6l1.333 1a.75.75 0 1 0 .9-1.2L8.75 8.625z" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const ArchiveIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M2.5 8h11v3a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 11zm10.697-1.5-1.851-2.777a.5.5 0 0 0-.416-.223H5.07a.5.5 0 0 0-.416.223L2.803 6.5zM15 7.408V11a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7.408a3 3 0 0 1 .504-1.664l1.902-2.853A2 2 0 0 1 5.07 2h5.86a2 2 0 0 1 1.664.89l1.902 2.854A3 3 0 0 1 15 7.408M9.25 11a.75.75 0 0 0 0-1.5h-2.5a.75.75 0 0 0 0 1.5z" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const SpamIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 11.5 3m-7-1.5a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3zm4.5 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0M8.75 5a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0z" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M9 2H7a.5.5 0 0 0-.5.5V3h3v-.5A.5.5 0 0 0 9 2m2 1v-.5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2V3H2.251a.75.75 0 0 0 0 1.5h.312l.317 7.625A3 3 0 0 0 5.878 15h4.245a3 3 0 0 0 2.997-2.875l.318-7.625h.312a.75.75 0 0 0 0-1.5zm.936 1.5H4.064l.315 7.562A1.5 1.5 0 0 0 5.878 13.5h4.245a1.5 1.5 0 0 0 1.498-1.438zm-6.186 2v5a.75.75 0 0 0 1.5 0v-5a.75.75 0 0 0-1.5 0m3.75-.75a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const TagIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 24 24" width="16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </svg>
);

export const SearchIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M11.5 7a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-.82 4.74a6 6 0 1 1 1.06-1.06l2.79 2.79a.75.75 0 1 1-1.06 1.06z" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M3.47 3.47a.75.75 0 0 1 1.06 0L8 6.94l3.47-3.47a.75.75 0 1 1 1.06 1.06L9.06 8l3.47 3.47a.75.75 0 1 1-1.06 1.06L8 9.06l-3.47 3.47a.75.75 0 0 1-1.06-1.06L6.94 8 3.47 4.53a.75.75 0 0 1 0-1.06" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const ReplyIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M7 9v2.665a.335.335 0 0 1-.55.257L1.73 7.988a.635.635 0 0 1 0-.976l4.72-3.934a.335.335 0 0 1 .55.257V6h1.5c1.584 0 3.182.571 4.241 1.692.9.951 1.549 2.446 1.31 4.723-.65-1.026-1.365-1.837-2.201-2.413C10.802 9.279 9.677 9 8.5 9zm3 1.731c1.162.396 2.165 1.337 3.151 3.106.223.4.64.663 1.098.663.552 0 1.04-.376 1.143-.917C16.598 7.237 12.322 4.5 8.501 4.5V3.335a1.835 1.835 0 0 0-3.01-1.41L.768 5.86a2.135 2.135 0 0 0 0 3.28l4.721 3.935a1.835 1.835 0 0 0 3.01-1.41V10.5c.533 0 1.03.07 1.5.231" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const MoreIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M8 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M9.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const PrevIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const NextIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = 'size-3' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M4.177 6.705A.73.73 0 0 1 4.729 5.5h6.542a.73.73 0 0 1 .552 1.205L8.8 10.214a1 1 0 0 1-.757.347h-.084a1 1 0 0 1-.757-.347z" fill="currentColor" fillRule="evenodd"></path>
  </svg>
);

export const ComposeIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M11.06 1.44a1.5 1.5 0 0 1 2.12 0l1.38 1.38a1.5 1.5 0 0 1 0 2.12l-8.5 8.5a1.5 1.5 0 0 1-.62.37l-3.5 1a.75.75 0 0 1-.93-.93l1-3.5a1.5 1.5 0 0 1 .37-.62l8.5-8.5zM12.12 2.5l-1.06 1.06 2.38 2.38 1.06-1.06a.5.5 0 0 0 0-.71l-1.38-1.38a.5.5 0 0 0-.71 0zm-2.12 2.12L3.18 11.44a.5.5 0 0 0-.12.21l-.68 2.39 2.39-.68a.5.5 0 0 0 .21-.12l6.82-6.82-2.38-2.38z" fill="currentColor"></path>
  </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className = 'size-3.5' }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export const MoonIcon: React.FC<{ className?: string }> = ({ className = 'size-3.5' }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export const MonitorIcon: React.FC<{ className?: string }> = ({ className = 'size-3.5' }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l2 1h2l2-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
