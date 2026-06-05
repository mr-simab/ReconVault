// Badge Component for status indicators
import React from 'react';
import { motion } from 'framer-motion';
import { formatStatus } from '../../utils/formatters';
import GlassIcon from './GlassIcon';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  color = 'neon-green',
  icon = null,
  pulse = false,
  glow = false,
  clickable = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-mono font-medium',
    'rounded-md border transition-all duration-200',
    'select-none whitespace-nowrap'
  ];

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
    xl: 'px-5 py-2.5 text-lg'
  };

  const colorClasses = {
    default: 'bg-cyber-light border-cyber-border text-neon-green',
    primary: 'bg-transparent border-neon-green text-neon-green hover:bg-neon-green hover:text-cyber-black',
    secondary: 'bg-transparent border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-cyber-black',
    success: 'bg-safe-green border-safe-green text-cyber-black',
    warning: 'bg-warning-yellow border-warning-yellow text-cyber-black',
    error: 'bg-danger-red border-danger-red text-white',
    danger: 'bg-danger-red border-danger-red text-white',
    info: 'bg-neon-cyan border-neon-cyan text-cyber-black',
    critical: 'bg-danger-red border-danger-red text-white',
    high: 'bg-neon-orange border-neon-orange text-cyber-black',
    medium: 'bg-warning-yellow border-warning-yellow text-cyber-black',
    low: 'bg-safe-green border-safe-green text-cyber-black'
  };

  const riskClasses = {
    CRITICAL: 'bg-danger-red border-danger-red text-white shadow-glow-red',
    HIGH: 'bg-neon-orange border-neon-orange text-cyber-black shadow-glow-orange',
    MEDIUM: 'bg-warning-yellow border-warning-yellow text-cyber-black shadow-glow-yellow',
    LOW: 'bg-safe-green border-safe-green text-cyber-black shadow-glow-green',
    INFO: 'bg-neon-cyan border-neon-cyan text-cyber-black shadow-glow-cyan'
  };

  const statusClasses = {
    connected: 'bg-safe-green border-safe-green text-cyber-black',
    disconnected: 'bg-danger-red border-danger-red text-white',
    connecting: 'bg-warning-yellow border-warning-yellow text-cyber-black animate-pulse',
    healthy: 'bg-safe-green border-safe-green text-cyber-black',
    ready: 'bg-safe-green border-safe-green text-cyber-black',
    unavailable: 'bg-danger-red border-danger-red text-white',
    offline: 'bg-danger-red border-danger-red text-white',
    unknown: 'bg-cyber-light border-cyber-border text-cyber-gray',
    active: 'bg-safe-green border-safe-green text-cyber-black',
    inactive: 'bg-cyber-gray border-cyber-gray text-cyber-black',
    running: 'bg-neon-cyan border-neon-cyan text-cyber-black animate-pulse',
    pending: 'bg-warning-yellow border-warning-yellow text-cyber-black',
    completed: 'bg-safe-green border-safe-green text-cyber-black',
    failed: 'bg-danger-red border-danger-red text-white',
    loading: 'bg-cyber-light border-neon-green text-neon-green animate-pulse'
  };

  let finalColorClasses = colorClasses[variant] || colorClasses.default;

  if (riskClasses[variant]) {
    finalColorClasses = riskClasses[variant];
  }

  if (statusClasses[variant]) {
    finalColorClasses = statusClasses[variant];
  }

  if (variant === 'custom' && color) {
    finalColorClasses = `bg-transparent border-${color} text-${color} hover:bg-${color} hover:text-cyber-black`;
  }

  const badgeClasses = [
    ...baseClasses,
    sizeClasses[size],
    finalColorClasses,
    pulse && 'animate-pulse-neon',
    glow && 'shadow-glow-green',
    clickable && 'cursor-pointer hover:scale-105',
    className
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {icon && (
        <span className="mr-1.5 text-current">
          {typeof icon === 'string' ? <GlassIcon name={icon} size="xs" bare /> : icon}
        </span>
      )}
      <span>{children}</span>
    </>
  );

  if (pulse || glow || clickable) {
    return (
      <motion.span
        whileHover={clickable ? { scale: 1.05 } : undefined}
        whileTap={clickable ? { scale: 0.95 } : undefined}
        className={badgeClasses}
        onClick={clickable ? onClick : undefined}
        {...props}
      >
        {content}
      </motion.span>
    );
  }

  return (
    <span
      className={badgeClasses}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {content}
    </span>
  );
};

export const StatusBadge = ({ status, ...props }) => {
  const statusInfo = formatStatus(status);
  const statusKey = (status || 'unknown').toLowerCase();

  return (
    <Badge
      variant={statusKey}
      icon={statusInfo.icon}
      {...props}
    >
      {statusInfo.text}
    </Badge>
  );
};

export const RiskBadge = ({ level, score = null, ...props }) => {
  const levelConfig = {
    CRITICAL: { variant: 'critical', icon: 'alert' },
    HIGH: { variant: 'high', icon: 'risk' },
    MEDIUM: { variant: 'medium', icon: 'alert' },
    LOW: { variant: 'low', icon: 'info' },
    INFO: { variant: 'info', icon: 'info' }
  };

  const config = levelConfig[level?.toUpperCase()] || levelConfig.INFO;
  const displayText = score !== null ? `${config.variant.toUpperCase()} (${Math.round(score * 100)}%)` : config.variant.toUpperCase();

  return (
    <Badge
      variant={config.variant}
      icon={config.icon}
      glow={level === 'CRITICAL' || level === 'HIGH'}
      {...props}
    >
      {displayText}
    </Badge>
  );
};

export const ConnectionBadge = ({ connected, ...props }) => (
  <Badge
    variant={connected ? 'connected' : 'disconnected'}
    icon={connected ? 'link' : 'close'}
    pulse={!connected}
    {...props}
  >
    {connected ? 'Connected' : 'Disconnected'}
  </Badge>
);

export const TaskBadge = ({ status, ...props }) => {
  const statusConfig = {
    PENDING: { variant: 'warning', icon: 'clock' },
    RUNNING: { variant: 'info', icon: 'refresh', pulse: true },
    COMPLETED: { variant: 'success', icon: 'check' },
    FAILED: { variant: 'danger', icon: 'close' },
    CANCELLED: { variant: 'error', icon: 'stop' }
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <Badge
      variant={config.variant}
      icon={config.icon}
      pulse={config.pulse}
      {...props}
    >
      {status}
    </Badge>
  );
};

export const EntityTypeBadge = ({ type, ...props }) => {
  const typeConfig = {
    USERNAME: { variant: 'secondary', icon: 'user' },
    EMAIL: { variant: 'secondary', icon: 'email' },
    DOMAIN: { variant: 'primary', icon: 'globe' },
    IP_ADDRESS: { variant: 'warning', icon: 'link' },
    ORG: { variant: 'info', icon: 'org' },
    PHONE: { variant: 'warning', icon: 'phone' },
    HASH: { variant: 'danger', icon: 'hash' },
    URL: { variant: 'primary', icon: 'link' },
    SOCIAL_PROFILE: { variant: 'secondary', icon: 'user' },
    DOCUMENT: { variant: 'info', icon: 'document' },
    DEVICE: { variant: 'warning', icon: 'device' },
    NETWORK: { variant: 'warning', icon: 'network' }
  };

  const config = typeConfig[type] || { variant: 'default', icon: 'info' };

  return (
    <Badge
      variant={config.variant}
      icon={config.icon}
      {...props}
    >
      {type}
    </Badge>
  );
};

export default Badge;
