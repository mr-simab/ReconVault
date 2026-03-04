// Modal/Dialog Component
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', 
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  header,
  footer
}) => {
  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-cyber-black bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeOnOverlayClick ? onClose : undefined}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30 
              }}
              className={`
                ${sizeClasses[size]} w-full glass-panel-dark
                border border-cyber-border rounded-lg overflow-hidden
                shadow-2xl max-h-[90vh] flex flex-col
                ${className}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || header || showCloseButton) && (
                <div className="flex items-center justify-between p-6 border-b border-cyber-border">
                  <div className="flex-1">
                    {header || (
                      <h2 className="text-xl font-cyber text-neon-green">
                        {title}
                      </h2>
                    )}
                  </div>
                  
                  {showCloseButton && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="ml-4 p-2 text-cyber-gray hover:text-neon-green hover:bg-cyber-light rounded transition-colors"
                    >
                      <span className="sr-only">Close</span>
                      ✕
                    </motion.button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto scrollable-cyber p-6">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-cyber-border p-6">
                  {footer}
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Confirmation Modal
export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger', 'warning', 'info'
  loading = false
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose?.();
  };

  const typeStyles = {
    danger: {
      confirmButton: 'btn-cyber-danger',
      icon: '⚠️'
    },
    warning: {
      confirmButton: 'btn-cyber-secondary',
      icon: '⚠️'
    },
    info: {
      confirmButton: 'btn-cyber-primary',
      icon: 'ℹ️'
    }
  };

  const styles = typeStyles[type] || typeStyles.info;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={!loading}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{styles.icon}</span>
          <p className="text-cyber-gray">{message}</p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-cyber-ghost"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`${styles.confirmButton} relative`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Form Modal
export const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  disabled = false
}) => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onSubmit && !disabled && !loading) {
      await onSubmit(e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      showCloseButton={false}
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-h-96 overflow-y-auto scrollable-cyber">
          {children}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-cyber-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-cyber-ghost"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={disabled || loading}
            className="btn-cyber-primary relative"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              submitText
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default Modal;