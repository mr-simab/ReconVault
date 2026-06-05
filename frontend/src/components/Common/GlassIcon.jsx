import React from 'react';

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

const ICONS = {
  search: <><circle cx="10" cy="10" r="5.2" {...strokeProps} /><path d="m14 14 4 4" {...strokeProps} /></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" {...strokeProps} /><circle cx="8" cy="6" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /></>,
  history: <><path d="M4 12a8 8 0 1 0 2.3-5.7M4 5v5h5" {...strokeProps} /><path d="M12 8v5l3 2" {...strokeProps} /></>,
  tasks: <><path d="M7 7h11M7 12h11M7 17h11" {...strokeProps} /><path d="M4 7h.01M4 12h.01M4 17h.01" {...strokeProps} /></>,
  target: <><circle cx="12" cy="12" r="8" {...strokeProps} /><circle cx="12" cy="12" r="3" {...strokeProps} /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" {...strokeProps} /></>,
  graph: <><circle cx="6" cy="7" r="2.4" {...strokeProps} /><circle cx="17" cy="6" r="2.4" {...strokeProps} /><circle cx="18" cy="17" r="2.4" {...strokeProps} /><circle cx="7" cy="18" r="2.4" {...strokeProps} /><path d="m8.2 7.2 6.6-1M16.7 8.2l1 6.4M15.8 17.2l-6.4.6M7 15.6 6.4 9.4M8.1 8.6l7.8 6.8" {...strokeProps} /></>,
  relationship: <><path d="M8 7h8a4 4 0 0 1 0 8h-1" {...strokeProps} /><path d="M16 17H8a4 4 0 0 1 0-8h1" {...strokeProps} /><path d="M13 11h-2" {...strokeProps} /></>,
  risk: <><path d="M12 3 21 20H3L12 3Z" {...strokeProps} /><path d="M12 9v4M12 17h.01" {...strokeProps} /></>,
  shield: <><path d="M12 3 5 6v5.5c0 4.2 2.8 7.5 7 9.5 4.2-2 7-5.3 7-9.5V6l-7-3Z" {...strokeProps} /><path d="m9 12 2 2 4-5" {...strokeProps} /></>,
  settings: <><circle cx="12" cy="12" r="3" {...strokeProps} /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2-1.1L14.2 3h-4.4l-.3 2.8a7.8 7.8 0 0 0-2 1.1l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7.8 7.8 0 0 0 2 1.1l.3 2.8h4.4l.3-2.8a7.8 7.8 0 0 0 2-1.1l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" {...strokeProps} /></>,
  user: <><circle cx="12" cy="8" r="4" {...strokeProps} /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...strokeProps} /></>,
  docs: <><path d="M7 3h7l4 4v14H7V3Z" {...strokeProps} /><path d="M14 3v5h4M9 13h6M9 17h6" {...strokeProps} /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h4M16 17l5-5-5-5M21 12H9" {...strokeProps} /></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" {...strokeProps} /><path d="M5 15H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v1" {...strokeProps} /></>,
  export: <><path d="M12 3v12M7 8l5-5 5 5" {...strokeProps} /><path d="M5 15v4h14v-4" {...strokeProps} /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5" {...strokeProps} /><path d="M5 19h14" {...strokeProps} /></>,
  edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z" {...strokeProps} /><path d="m14 6 4 4" {...strokeProps} /></>,
  delete: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" {...strokeProps} /></>,
  refresh: <><path d="M20 12a8 8 0 0 1-13.7 5.7M4 12A8 8 0 0 1 17.7 6.3" {...strokeProps} /><path d="M20 5v5h-5M4 19v-5h5" {...strokeProps} /></>,
  close: <path d="M6 6l12 12M18 6 6 18" {...strokeProps} />,
  check: <path d="m5 12 4 4L19 6" {...strokeProps} />,
  alert: <><path d="M12 3 21 20H3L12 3Z" {...strokeProps} /><path d="M12 9v5M12 17h.01" {...strokeProps} /></>,
  info: <><circle cx="12" cy="12" r="9" {...strokeProps} /><path d="M12 10v6M12 7h.01" {...strokeProps} /></>,
  clock: <><circle cx="12" cy="12" r="9" {...strokeProps} /><path d="M12 7v5l3 2" {...strokeProps} /></>,
  nodes: <><circle cx="7" cy="7" r="3" {...strokeProps} /><circle cx="17" cy="10" r="3" {...strokeProps} /><circle cx="9" cy="18" r="3" {...strokeProps} /><path d="m9.5 8.2 4.8 1M10.2 15.8l4.4-4" {...strokeProps} /></>,
  edges: <><path d="M5 12h14M15 8l4 4-4 4" {...strokeProps} /><circle cx="5" cy="12" r="2" {...strokeProps} /><circle cx="19" cy="12" r="2" {...strokeProps} /></>,
  density: <><path d="M4 18V6M4 18h16" {...strokeProps} /><path d="M8 15v-4M12 15V8M16 15v-7" {...strokeProps} /></>,
  globe: <><circle cx="12" cy="12" r="9" {...strokeProps} /><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" {...strokeProps} /></>,
  network: <><rect x="4" y="4" width="6" height="6" rx="1.5" {...strokeProps} /><rect x="14" y="4" width="6" height="6" rx="1.5" {...strokeProps} /><rect x="9" y="14" width="6" height="6" rx="1.5" {...strokeProps} /><path d="M10 7h4M7 10v3l2 2M17 10v3l-2 2" {...strokeProps} /></>,
  server: <><rect x="4" y="4" width="16" height="6" rx="2" {...strokeProps} /><rect x="4" y="14" width="16" height="6" rx="2" {...strokeProps} /><path d="M8 7h.01M8 17h.01M12 7h6M12 17h6" {...strokeProps} /></>,
  database: <><ellipse cx="12" cy="5" rx="7" ry="3" {...strokeProps} /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" {...strokeProps} /></>,
  websocket: <><path d="M5 8a10 10 0 0 1 14 0M8 11a6 6 0 0 1 8 0M11 14a2 2 0 0 1 2 0" {...strokeProps} /><circle cx="12" cy="18" r="1.5" fill="currentColor" /></>,
  mcp: <><path d="M6 7h12v10H6V7Z" {...strokeProps} /><path d="M9 7V4M15 7V4M9 17v3M15 17v3M6 10H3M6 14H3M21 10h-3M21 14h-3" {...strokeProps} /></>,
  operations: <><path d="M4 16l5-5 3 3 7-8" {...strokeProps} /><path d="M14 6h5v5" {...strokeProps} /><path d="M4 20h16" {...strokeProps} /></>,
  investigation: <><circle cx="10" cy="10" r="6" {...strokeProps} /><path d="m15 15 5 5M8 10h4M10 8v4" {...strokeProps} /></>,
  policy: <><path d="M7 3h10v18H7V3Z" {...strokeProps} /><path d="M10 8h4M10 12h4M10 16h2" {...strokeProps} /></>,
  report: <><path d="M5 4h14v18H5V4Z" {...strokeProps} /><path d="M8 8h8M8 12h8M8 16h4" {...strokeProps} /><path d="M15 17l2 2 3-4" {...strokeProps} /></>,
  queue: <><path d="M5 7h14M5 12h14M5 17h10" {...strokeProps} /><path d="M17 16l2 2 3-4" {...strokeProps} /></>,
  play: <path d="M8 5v14l11-7L8 5Z" {...strokeProps} />,
  pause: <><path d="M8 5v14M16 5v14" {...strokeProps} /></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" {...strokeProps} />,
  'collapse-left': <><path d="M15 6 9 12l6 6" {...strokeProps} /><path d="M5 4v16" {...strokeProps} /></>,
  'collapse-right': <><path d="m9 6 6 6-6 6" {...strokeProps} /><path d="M19 4v16" {...strokeProps} /></>,
  'collapse-up': <><path d="m6 15 6-6 6 6" {...strokeProps} /><path d="M4 5h16" {...strokeProps} /></>,
  'collapse-down': <><path d="m6 9 6 6 6-6" {...strokeProps} /><path d="M4 19h16" {...strokeProps} /></>,
  'zoom-in': <><circle cx="10" cy="10" r="5.5" {...strokeProps} /><path d="m14 14 4 4M10 7v6M7 10h6" {...strokeProps} /></>,
  'zoom-out': <><circle cx="10" cy="10" r="5.5" {...strokeProps} /><path d="m14 14 4 4M7 10h6" {...strokeProps} /></>,
  fit: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...strokeProps} /></>,
  labels: <><path d="M4 6h12l4 6-4 6H4V6Z" {...strokeProps} /><path d="M8 12h6" {...strokeProps} /></>,
  hidden: <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" {...strokeProps} /><path d="M4 4l16 16" {...strokeProps} /></>,
  save: <><path d="M5 4h12l2 2v14H5V4Z" {...strokeProps} /><path d="M8 4v6h7V4M8 20v-6h8v6" {...strokeProps} /></>,
  terminal: <><path d="m5 8 4 4-4 4M11 17h8" {...strokeProps} /></>,
  memory: <><rect x="5" y="5" width="14" height="14" rx="2" {...strokeProps} /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" {...strokeProps} /></>,
  source: <><path d="M4 6h16M4 12h16M4 18h10" {...strokeProps} /><circle cx="17" cy="18" r="2" {...strokeProps} /></>,
  evidence: <><path d="M7 3h10l3 3v15H7V3Z" {...strokeProps} /><path d="M17 3v4h3M10 11h7M10 15h7M10 19h4" {...strokeProps} /></>,
  media: <><rect x="4" y="5" width="16" height="14" rx="2" {...strokeProps} /><circle cx="9" cy="10" r="1.5" {...strokeProps} /><path d="m4 17 5-5 4 4 2-2 5 5" {...strokeProps} /></>,
  darkweb: <><path d="M12 3a9 9 0 0 0 0 18 7 7 0 0 1 0-18Z" {...strokeProps} /><path d="M15 9h4M15 13h3M15 17h1" {...strokeProps} /></>,
  email: <><rect x="4" y="6" width="16" height="12" rx="2" {...strokeProps} /><path d="m4 8 8 6 8-6" {...strokeProps} /></>,
  phone: <><path d="M7 3h10v18H7V3Z" {...strokeProps} /><path d="M11 18h2" {...strokeProps} /></>,
  hash: <><path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16" {...strokeProps} /></>,
  org: <><path d="M4 21V7l8-4 8 4v14" {...strokeProps} /><path d="M9 21v-7h6v7M8 10h.01M12 10h.01M16 10h.01" {...strokeProps} /></>,
  document: <><path d="M7 3h7l4 4v14H7V3Z" {...strokeProps} /><path d="M14 3v5h4M10 13h5M10 17h5" {...strokeProps} /></>,
  device: <><rect x="4" y="5" width="16" height="12" rx="2" {...strokeProps} /><path d="M8 21h8M12 17v4" {...strokeProps} /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.6 5" {...strokeProps} /><path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8" {...strokeProps} /></>,
  home: <><path d="M3 11 12 3l9 8" {...strokeProps} /><path d="M5 10v11h14V10" {...strokeProps} /><path d="M10 21v-6h4v6" {...strokeProps} /></>,
  help: <><circle cx="12" cy="12" r="9" {...strokeProps} /><path d="M9.5 9a2.7 2.7 0 0 1 5.1 1.2c0 2-2.6 2.3-2.6 4M12 17h.01" {...strokeProps} /></>,
  keyboard: <><rect x="3" y="6" width="18" height="12" rx="2" {...strokeProps} /><path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h8" {...strokeProps} /></>,
  eye: <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" {...strokeProps} /><circle cx="12" cy="12" r="2.5" {...strokeProps} /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" {...strokeProps} />,
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" />
};

const sizeClass = {
  xs: 'glass-icon--xs',
  sm: 'glass-icon--sm',
  md: 'glass-icon--md',
  lg: 'glass-icon--lg',
  xl: 'glass-icon--xl'
};

const GlassIcon = ({
  name = 'info',
  size = 'md',
  tone = 'default',
  className = '',
  title,
  bare = false
}) => {
  const icon = ICONS[name] || ICONS.info;
  const classes = [
    bare ? 'glass-icon-bare' : 'glass-icon',
    sizeClass[size] || sizeClass.md,
    `glass-icon--${tone}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} title={title} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      <svg viewBox="0 0 24 24" focusable="false" aria-label={title}>
        {icon}
      </svg>
    </span>
  );
};

export default GlassIcon;
