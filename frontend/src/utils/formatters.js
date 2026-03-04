// Data formatting utilities

// Format date/time
export const formatDate = (date, format = 'short') => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString();
    case 'long':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'time':
      return d.toLocaleTimeString();
    case 'datetime':
      return d.toLocaleString();
    case 'relative':
      return getRelativeTime(d);
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString();
  }
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return formatDate(date, 'short');
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Format numbers with commas
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

// Format percentage
export const formatPercentage = (value, total, decimals = 1) => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

// Format confidence score (0-1 to percentage)
export const formatConfidence = (confidence, showPercentage = true) => {
  if (confidence === null || confidence === undefined) return 'N/A';
  
  const percentage = Math.round(confidence * 100);
  
  if (!showPercentage) {
    return confidence.toFixed(2);
  }
  
  return `${percentage}%`;
};

// Format risk score (0-1 to 0-100)
export const formatRiskScore = (score) => {
  if (score === null || score === undefined) return 'N/A';
  return Math.round(score * 100);
};

// Format duration in milliseconds to human readable
export const formatDuration = (ms) => {
  if (!ms || ms < 1000) return `${ms}ms`;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Format entity value for display
export const formatEntityValue = (value, type, maxLength = 30) => {
  if (!value) return 'N/A';
  
  switch (type?.toUpperCase()) {
    case 'EMAIL':
      // Truncate email but keep domain
      const parts = value.split('@');
      if (parts.length === 2 && value.length > maxLength) {
        const username = parts[0].length > 10 ? parts[0].substring(0, 7) + '...' : parts[0];
        return `${username}@${parts[1]}`;
      }
      break;
    case 'URL':
      // Show domain and path
      try {
        const url = new URL(value);
        const domain = url.hostname;
        const path = url.pathname;
        let display = domain;
        if (path && path !== '/' && display.length < maxLength - 5) {
          display += path.length > 20 ? path.substring(0, 17) + '...' : path;
        }
        return display;
      } catch {
        return truncateText(value, maxLength);
      }
    case 'IP_ADDRESS':
      return value; // IP addresses are fixed length
    case 'PHONE':
      // Format phone number
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
      }
      break;
    case 'HASH':
      // Show first and last few characters
      if (value.length > 20) {
        return `${value.substring(0, 8)}...${value.substring(value.length - 8)}`;
      }
      break;
  }
  
  return truncateText(value, maxLength);
};

// Format JSON data for display
export const formatJSON = (obj, indent = 2) => {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return 'Invalid JSON';
  }
};

// Format collection progress
export const formatCollectionProgress = (progress) => {
  if (!progress) return 'Not Started';
  
  const { completed = 0, total = 0, percentage = 0 } = progress;
  
  if (total === 0) return 'Initializing...';
  if (percentage >= 100) return 'Completed';
  
  return `${completed}/${total} (${Math.round(percentage)}%)`;
};

// Format connection count
export const formatConnectionCount = (count) => {
  if (!count) return '0 connections';
  if (count === 1) return '1 connection';
  return `${count} connections`;
};

// Format relationship type for display
export const formatRelationshipType = (type) => {
  return type?.toLowerCase()
    .split('_')
    .map(word => capitalize(word))
    .join(' ') || 'Unknown';
};

// Format source name
export const formatSourceName = (source) => {
  const sourceMap = {
    'MANUAL': 'Manual Entry',
    'WEB_SCRAPER': 'Web Scraper',
    'SOCIAL_MEDIA': 'Social Media',
    'DNS_LOOKUP': 'DNS Lookup',
    'WHOIS': 'WHOIS',
    'SHODAN': 'Shodan',
    'CENSYS': 'Censys',
    'VIRUSTOTAL': 'VirusTotal',
    'UNKNOWN': 'Unknown Source'
  };
  
  return sourceMap[source?.toUpperCase()] || source || 'Unknown';
};

// Format status with icons
export const formatStatus = (status, type = 'general') => {
  const statusMap = {
    // General status
    'active': { text: 'Active', icon: '🟢', class: 'text-safe-green' },
    'inactive': { text: 'Inactive', icon: '🔴', class: 'text-danger-red' },
    'pending': { text: 'Pending', icon: '🟡', class: 'text-warning-yellow' },
    'completed': { text: 'Completed', icon: '✅', class: 'text-safe-green' },
    'failed': { text: 'Failed', icon: '❌', class: 'text-danger-red' },
    'running': { text: 'Running', icon: '🔄', class: 'text-neon-cyan animate-spin' },
    'stopped': { text: 'Stopped', icon: '⏹️', class: 'text-cyber-gray' },
    
    // Connection status
    'connected': { text: 'Connected', icon: '🔗', class: 'text-safe-green' },
    'disconnected': { text: 'Disconnected', icon: '❌', class: 'text-danger-red' },
    'connecting': { text: 'Connecting...', icon: '🔄', class: 'text-warning-yellow animate-pulse' },
    
    // Risk levels
    'critical': { text: 'Critical', icon: '🚨', class: 'text-danger-red' },
    'high': { text: 'High', icon: '⚠️', class: 'text-neon-orange' },
    'medium': { text: 'Medium', icon: '⚡', class: 'text-warning-yellow' },
    'low': { text: 'Low', icon: 'ℹ️', class: 'text-safe-green' },
    'info': { text: 'Info', icon: 'ℹ️', class: 'text-neon-cyan' }
  };
  
  const statusKey = status?.toLowerCase();
  const mapped = statusMap[statusKey] || { text: status || 'Unknown', icon: '❓', class: 'text-cyber-gray' };
  
  return {
    text: mapped.text,
    icon: mapped.icon,
    className: mapped.class
  };
};

// Format bytes to network speed (if applicable)
export const formatBytesPerSecond = (bytesPerSecond) => {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
  
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  
  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Export all utilities
export default {
  formatDate,
  getRelativeTime,
  formatFileSize,
  formatNumber,
  formatPercentage,
  formatConfidence,
  formatRiskScore,
  formatDuration,
  truncateText,
  capitalize,
  formatEntityValue,
  formatJSON,
  formatCollectionProgress,
  formatConnectionCount,
  formatRelationshipType,
  formatSourceName,
  formatStatus,
  formatBytesPerSecond
};