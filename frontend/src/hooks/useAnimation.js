// Custom hook for animation helpers
import { useState, useEffect, useCallback, useRef } from 'react';

export const useAnimation = (enabled = true) => {
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Refs
  const animationFrameRef = useRef();
  const animationQueueRef = useRef([]);
  const startTimeRef = useRef();
  
  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Queue animation
  const queueAnimation = useCallback((animationFn, duration = 1000) => {
    if (prefersReducedMotion || !enabled) {
      // Execute immediately without animation
      animationFn();
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const animation = {
        fn: animationFn,
        duration,
        startTime: null,
        resolve
      };
      
      animationQueueRef.current.push(animation);
      processAnimationQueue();
    });
  }, [prefersReducedMotion, enabled]);
  
  // Process animation queue
  const processAnimationQueue = useCallback(() => {
    if (animationQueueRef.current.length === 0) {
      setIsAnimating(false);
      return;
    }
    
    setIsAnimating(true);
    
    const animation = animationQueueRef.current[0];
    
    if (!animation.startTime) {
      animation.startTime = performance.now();
    }
    
    const now = performance.now();
    const elapsed = now - animation.startTime;
    const progress = Math.min(elapsed / (animation.duration / animationSpeed), 1);
    
    // Apply easing function (ease-out)
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    try {
      animation.fn(easedProgress, progress);
    } catch (error) {
      console.error('[useAnimation] Error in animation function:', error);
    }
    
    if (progress >= 1) {
      // Animation complete
      animationQueueRef.current.shift();
      animation.resolve();
    } else {
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(processAnimationQueue);
    }
  }, [animationSpeed]);
  
  // Stop current animation
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Resolve all pending animations
    animationQueueRef.current.forEach(animation => {
      try {
        animation.fn(1, 1); // Complete the animation
        animation.resolve();
      } catch (error) {
        console.error('[useAnimation] Error completing animation:', error);
      }
    });
    
    animationQueueRef.current = [];
    setIsAnimating(false);
  }, []);
  
  // Set animation speed
  const setSpeed = useCallback((speed) => {
    setAnimationSpeed(Math.max(0.1, Math.min(3, speed)));
  }, []);
  
  // Fade animation
  const fadeIn = useCallback((element, duration = 300) => {
    return queueAnimation((progress) => {
      element.style.opacity = progress;
      element.style.display = progress > 0 ? 'block' : 'none';
    }, duration);
  }, [queueAnimation]);
  
  const fadeOut = useCallback((element, duration = 300) => {
    return queueAnimation((progress) => {
      const opacity = 1 - progress;
      element.style.opacity = opacity;
      if (opacity <= 0) {
        element.style.display = 'none';
      }
    }, duration);
  }, [queueAnimation]);
  
  // Slide animation
  const slideIn = useCallback((element, direction = 'left', duration = 300) => {
    const transforms = {
      left: { start: 'translateX(-100%)', end: 'translateX(0)' },
      right: { start: 'translateX(100%)', end: 'translateX(0)' },
      up: { start: 'translateY(-100%)', end: 'translateY(0)' },
      down: { start: 'translateY(100%)', end: 'translateY(0)' }
    };
    
    const transform = transforms[direction] || transforms.left;
    
    return queueAnimation((progress) => {
      const startTransform = `translateX(${transform.start.includes('X') ? transform.start : 'translateX(0)'})`;
      const endTransform = `translateX(${transform.end.includes('X') ? transform.end : 'translateX(0)'})`;
      
      if (direction === 'up' || direction === 'down') {
        element.style.transform = `translateY(${transform.start}) translateY(${progress * 100}%)`;
      } else {
        element.style.transform = `translateX(${transform.start}) translateX(${progress * 100}%)`;
      }
    }, duration);
  }, [queueAnimation]);
  
  // Scale animation
  const scale = useCallback((element, from = 0.8, to = 1, duration = 300) => {
    element.style.transformOrigin = 'center';
    
    return queueAnimation((progress) => {
      const scale = from + (to - from) * progress;
      element.style.transform = `scale(${scale})`;
    }, duration);
  }, [queueAnimation]);
  
  // Pulse animation
  const pulse = useCallback((element, intensity = 0.1, duration = 1000) => {
    return queueAnimation((progress) => {
      const pulseValue = 1 + Math.sin(progress * Math.PI * 2) * intensity;
      element.style.transform = `scale(${pulseValue})`;
    }, duration);
  }, [queueAnimation]);
  
  // Glow animation
  const glow = useCallback((element, color = '#00ff41', intensity = 0.5, duration = 2000) => {
    return queueAnimation((progress) => {
      const glowStrength = Math.sin(progress * Math.PI * 2) * intensity;
      element.style.boxShadow = `0 0 ${10 + glowStrength * 20}px ${color}`;
    }, duration);
  }, [queueAnimation]);
  
  // Stagger animation for multiple elements
  const stagger = useCallback((elements, animationFn, staggerDelay = 100, duration = 300) => {
    if (!Array.isArray(elements)) {
      elements = [elements];
    }
    
    const promises = elements.map((element, index) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          animationFn(element, index).then(resolve);
        }, index * staggerDelay);
      });
    });
    
    return Promise.all(promises);
  }, []);
  
  // Elastic animation
  const elastic = useCallback((element, from = 1, to = 1.2, duration = 600) => {
    element.style.transformOrigin = 'center';
    
    return queueAnimation((progress) => {
      // Elastic easing function
      const c4 = (2 * Math.PI) / 3;
      const easedProgress = progress === 0 ? 0 :
                           progress === 1 ? 1 :
                           -Math.pow(2, 10 * progress - 10) * Math.sin((progress * 10 - 10.75) * c4);
      
      const scale = from + (to - from) * easedProgress;
      element.style.transform = `scale(${scale})`;
    }, duration);
  }, [queueAnimation]);
  
  // Bounce animation
  const bounce = useCallback((element, height = 20, duration = 600) => {
    return queueAnimation((progress) => {
      // Bounce easing
      const c1 = 1.70158;
      const c3 = c1 + 1;
      
      const easedProgress = progress === 0 ? 0 :
                           progress === 1 ? 1 :
                           c3 * progress * progress * progress - c1 * progress * progress;
      
      const translateY = -height * (1 - easedProgress);
      element.style.transform = `translateY(${translateY}px)`;
    }, duration);
  }, [queueAnimation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);
  
  return {
    // State
    isAnimating,
    animationSpeed,
    prefersReducedMotion,
    enabled,
    
    // Controls
    setSpeed,
    stopAnimation,
    queueAnimation,
    
    // Basic animations
    fadeIn,
    fadeOut,
    slideIn,
    scale,
    pulse,
    glow,
    
    // Advanced animations
    stagger,
    elastic,
    bounce,
    
    // Utilities
    processAnimationQueue,
    
    // Computed values
    isEnabled: enabled && !prefersReducedMotion
  };
};

// Animation presets
export const animationPresets = {
  fast: { duration: 150 },
  normal: { duration: 300 },
  slow: { duration: 500 },
  verySlow: { duration: 1000 }
};

// Easing functions
export const easingFunctions = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 10.75) * c4) + 1;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
};