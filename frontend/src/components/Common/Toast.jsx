// Toast Notification Component
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../../utils/formatters';

const Toast = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose, 
  showTimestamp = false,
  actions = [],
  id
}) => {
  const toastTypes = {
    success: {
      icon: '✅',
      bgColor: 'bg-safe-green',
      textColor: 'text-cyber-black',
      borderColor: 'border-safe-green',
      glowColor: 'shadow-glow-green'
    },
    error: {
      icon: '❌',
      bgColor: 'bg-danger-red',
      textColor: 'text-white',
      borderColor: 'border-danger-red',
      glowColor: 'shadow-glow-red'
    },
    warning: {
      icon: '⚠️',
      bgColor: 'bg-warning-yellow',
      textColor: 'text-cyber-black',
      borderColor: 'border-warning-yellow',
      glowColor: 'shadow-glow-yellow'
    },
    info: {
      icon: 'ℹ️',
      bgColor: 'bg-neon-cyan',
      textColor: 'text-cyber-black',
      borderColor: 'border-neon-cyan',
      glowColor: 'shadow-glow-cyan'
    },
    loading: {
      icon: '⏳',
      bgColor: 'bg-cyber-light',
      textColor: 'text-neon-green',
      borderColor: 'border-neon-green',
      glowColor: 'shadow-glow-green'
    }
  };

  const currentType = toastTypes[type] || toastTypes.info;

  // Auto-close after duration
  useEffect(() => {
    if (duration > 0 && type !== 'loading') {
      const timer = setTimeout(() => {
        onClose?.(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, type, onClose, id]);

  const handleActionClick = (action) => {
    if (action.onClick) {
      action.onClick();
    }
    if (action.closeOnClick !== false) {
      onClose?.(id);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.8 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 30 
        }}
        className={`
          max-w-sm w-full ${currentType.bgColor} ${currentType.textColor}
          border ${currentType.borderColor} rounded-lg p-4 shadow-lg
          ${currentType.glowColor} backdrop-blur-sm
        `}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg"
            >
              {currentType.icon}
            </motion.span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {typeof message === 'string' ? (
                  <p className="text-sm font-mono">{message}</p>
                ) : (
                  message
                )}
                
                {showTimestamp && (
                  <p className="text-xs opacity-75 mt-1">
                    {formatDate(new Date(), 'time')}
                  </p>
                )}
              </div>

              {/* Close button */}
              {type !== 'loading' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onClose?.(id)}
                  className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </motion.button>
              )}
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex space-x-2 mt-3">
                {actions.map((action, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleActionClick(action)}
                    className={`
                      px-3 py-1 text-xs font-mono rounded border
                      ${action.primary ? 
                        'bg-black bg-opacity-20 border-current hover:bg-opacity-30' : 
                        'bg-transparent border-current hover:bg-current hover:bg-opacity-10'
                      }
                      transition-colors
                    `}
                  >
                    {action.label}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, position = 'top-right' }) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} space-y-2`}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={toast.onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast Manager Hook
export const useToast = () => {
  const [toasts, setToasts] = React.useState([]);

  const addToast = React.useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = React.useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = React.useCallback((message, options = {}) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const error = React.useCallback((message, options = {}) => {
    return addToast({ type: 'error', message, duration: 8000, ...options });
  }, [addToast]);

  const warning = React.useCallback((message, options = {}) => {
    return addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const info = React.useCallback((message, options = {}) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const loading = React.useCallback((message, options = {}) => {
    return addToast({ type: 'loading', message, duration: 0, ...options });
  }, [addToast]);

  const updateToast = React.useCallback((id, updates) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    loading,
    updateToast,
    ToastContainer: ({ position }) => (
      <ToastContainer toasts={toasts} position={position} />
    )
  };
};

export default Toast;