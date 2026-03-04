// Loading Spinner Component
import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'neon-green', 
  text = 'Loading...', 
  className = '',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-xl'
  };

  const spinnerVariants = {
    default: (
      <div 
        className={`
          ${sizeClasses[size]} 
          border-2 border-cyber-border 
          border-t-${color} 
          border-solid rounded-full animate-spin
        `}
      />
    ),
    pulse: (
      <motion.div
        className={`${sizeClasses[size]} bg-${color} rounded-full`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ),
    dots: (
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 bg-${color} rounded-full`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    ),
    bars: (
      <div className="flex space-x-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={`w-1 bg-${color} rounded-full`}
            style={{ height: sizeClasses[size] }}
            animate={{
              scaleY: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    ),
    cyber: (
      <div className="relative">
        <div 
          className={`
            ${sizeClasses[size]} 
            border-2 border-cyber-border 
            border-t-${color} 
            border-solid rounded-full animate-spin
          `}
        />
        <motion.div
          className={`absolute inset-0 border-2 border-transparent border-r-${color} rounded-full`}
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    )
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {spinnerVariants[variant] || spinnerVariants.default}
      {text && (
        <motion.p
          className={`${textSizeClasses[size]} text-${color} font-mono text-center`}
          animate={{
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;