// Performance Monitoring Service
// Tracks and reports performance metrics for the application

class PerformanceService {
  constructor() {
    this.metrics = {
      fps: [],
      renderTime: [],
      apiLatency: [],
      wsLatency: [],
      memoryUsage: [],
      componentRenders: new Map()
    };
    
    this.monitoring = false;
    this.fpsInterval = null;
    this.memoryInterval = null;
    this.listeners = new Set();
    
    this.config = {
      sampleSize: 60, // Keep last 60 samples
      updateInterval: 1000, // Update every second
      enableMemoryMonitoring: true,
      enableFPSMonitoring: true
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.monitoring) {
      console.log('[PerformanceService] Already monitoring');
      return;
    }
    
    this.monitoring = true;
    console.log('[PerformanceService] Monitoring started');
    
    // Start FPS monitoring
    if (this.config.enableFPSMonitoring) {
      this.startFPSMonitoring();
    }
    
    // Start memory monitoring
    if (this.config.enableMemoryMonitoring && performance.memory) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.monitoring = false;
    
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }
    
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    
    console.log('[PerformanceService] Monitoring stopped');
  }

  /**
   * Start FPS monitoring
   */
  startFPSMonitoring() {
    let lastTime = performance.now();
    let frames = 0;
    
    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      
      if (delta >= 1000) {
        const fps = Math.round((frames * 1000) / delta);
        this.recordFPS(fps);
        
        frames = 0;
        lastTime = currentTime;
      }
      
      if (this.monitoring) {
        requestAnimationFrame(measureFPS);
      }
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      if (performance.memory) {
        const memory = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };
        
        this.recordMemoryUsage(memory);
      }
    }, this.config.updateInterval);
  }

  /**
   * Record FPS measurement
   */
  recordFPS(fps) {
    this.metrics.fps.push({
      value: fps,
      timestamp: Date.now()
    });
    
    // Keep only last N samples
    if (this.metrics.fps.length > this.config.sampleSize) {
      this.metrics.fps.shift();
    }
    
    this.notifyListeners('fps', fps);
  }

  /**
   * Record render time
   */
  recordRenderTime(componentName, duration) {
    this.metrics.renderTime.push({
      component: componentName,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only last N samples
    if (this.metrics.renderTime.length > this.config.sampleSize) {
      this.metrics.renderTime.shift();
    }
    
    // Update component render count
    const count = this.metrics.componentRenders.get(componentName) || 0;
    this.metrics.componentRenders.set(componentName, count + 1);
    
    this.notifyListeners('renderTime', { componentName, duration });
  }

  /**
   * Record API latency
   */
  recordAPILatency(endpoint, duration, success = true) {
    this.metrics.apiLatency.push({
      endpoint,
      duration,
      success,
      timestamp: Date.now()
    });
    
    // Keep only last N samples
    if (this.metrics.apiLatency.length > this.config.sampleSize) {
      this.metrics.apiLatency.shift();
    }
    
    this.notifyListeners('apiLatency', { endpoint, duration, success });
  }

  /**
   * Record WebSocket latency
   */
  recordWSLatency(messageType, duration) {
    this.metrics.wsLatency.push({
      messageType,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only last N samples
    if (this.metrics.wsLatency.length > this.config.sampleSize) {
      this.metrics.wsLatency.shift();
    }
    
    this.notifyListeners('wsLatency', { messageType, duration });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(memory) {
    this.metrics.memoryUsage.push(memory);
    
    // Keep only last N samples
    if (this.metrics.memoryUsage.length > this.config.sampleSize) {
      this.metrics.memoryUsage.shift();
    }
    
    this.notifyListeners('memoryUsage', memory);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics() {
    return {
      fps: this.getAverageFPS(),
      avgRenderTime: this.getAverageRenderTime(),
      avgAPILatency: this.getAverageAPILatency(),
      avgWSLatency: this.getAverageWSLatency(),
      memoryUsage: this.getCurrentMemoryUsage(),
      componentRenders: Object.fromEntries(this.metrics.componentRenders)
    };
  }

  /**
   * Get average FPS
   */
  getAverageFPS() {
    if (this.metrics.fps.length === 0) return 0;
    
    const sum = this.metrics.fps.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / this.metrics.fps.length);
  }

  /**
   * Get latest FPS
   */
  getLatestFPS() {
    if (this.metrics.fps.length === 0) return 0;
    return this.metrics.fps[this.metrics.fps.length - 1].value;
  }

  /**
   * Get FPS history
   */
  getFPSHistory(limit = 60) {
    return this.metrics.fps.slice(-limit);
  }

  /**
   * Get average render time
   */
  getAverageRenderTime() {
    if (this.metrics.renderTime.length === 0) return 0;
    
    const sum = this.metrics.renderTime.reduce((acc, m) => acc + m.duration, 0);
    return Math.round(sum / this.metrics.renderTime.length);
  }

  /**
   * Get render time by component
   */
  getRenderTimeByComponent(componentName) {
    const componentMetrics = this.metrics.renderTime.filter(m => m.component === componentName);
    
    if (componentMetrics.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    
    const durations = componentMetrics.map(m => m.duration);
    
    return {
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: componentMetrics.length
    };
  }

  /**
   * Get average API latency
   */
  getAverageAPILatency() {
    if (this.metrics.apiLatency.length === 0) return 0;
    
    const sum = this.metrics.apiLatency.reduce((acc, m) => acc + m.duration, 0);
    return Math.round(sum / this.metrics.apiLatency.length);
  }

  /**
   * Get API success rate
   */
  getAPISuccessRate() {
    if (this.metrics.apiLatency.length === 0) return 100;
    
    const successCount = this.metrics.apiLatency.filter(m => m.success).length;
    return Math.round((successCount / this.metrics.apiLatency.length) * 100);
  }

  /**
   * Get API latency by endpoint
   */
  getAPILatencyByEndpoint(endpoint) {
    const endpointMetrics = this.metrics.apiLatency.filter(m => m.endpoint === endpoint);
    
    if (endpointMetrics.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    
    const durations = endpointMetrics.map(m => m.duration);
    
    return {
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: endpointMetrics.length,
      successRate: Math.round((endpointMetrics.filter(m => m.success).length / endpointMetrics.length) * 100)
    };
  }

  /**
   * Get average WebSocket latency
   */
  getAverageWSLatency() {
    if (this.metrics.wsLatency.length === 0) return 0;
    
    const sum = this.metrics.wsLatency.reduce((acc, m) => acc + m.duration, 0);
    return Math.round(sum / this.metrics.wsLatency.length);
  }

  /**
   * Get WebSocket latency history
   */
  getWSLatencyHistory(limit = 60) {
    return this.metrics.wsLatency.slice(-limit);
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) {
      return { used: 0, total: 0, limit: 0, percentage: 0 };
    }
    
    const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    
    return {
      used: latest.used,
      total: latest.total,
      limit: latest.limit,
      percentage: Math.round((latest.used / latest.limit) * 100)
    };
  }

  /**
   * Get memory usage history
   */
  getMemoryUsageHistory(limit = 60) {
    return this.metrics.memoryUsage.slice(-limit);
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      monitoring: this.monitoring,
      metrics: {
        fps: {
          current: this.getLatestFPS(),
          average: this.getAverageFPS(),
          history: this.getFPSHistory(20)
        },
        renderTime: {
          average: this.getAverageRenderTime(),
          byComponent: {}
        },
        api: {
          averageLatency: this.getAverageAPILatency(),
          successRate: this.getAPISuccessRate(),
          requestCount: this.metrics.apiLatency.length
        },
        websocket: {
          averageLatency: this.getAverageWSLatency(),
          messageCount: this.metrics.wsLatency.length
        },
        memory: this.getCurrentMemoryUsage()
      },
      recommendations: this.generateRecommendations()
    };
    
    // Add component-specific render times
    this.metrics.componentRenders.forEach((count, component) => {
      report.metrics.renderTime.byComponent[component] = this.getRenderTimeByComponent(component);
    });
    
    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check FPS
    const avgFPS = this.getAverageFPS();
    if (avgFPS > 0 && avgFPS < 30) {
      recommendations.push({
        type: 'warning',
        category: 'fps',
        message: 'Low FPS detected. Consider reducing visual effects or graph complexity.',
        severity: 'high'
      });
    } else if (avgFPS > 0 && avgFPS < 45) {
      recommendations.push({
        type: 'info',
        category: 'fps',
        message: 'FPS could be improved. Try enabling performance mode.',
        severity: 'medium'
      });
    }
    
    // Check memory
    const memory = this.getCurrentMemoryUsage();
    if (memory.percentage > 90) {
      recommendations.push({
        type: 'warning',
        category: 'memory',
        message: 'High memory usage detected. Consider clearing graph data or reducing node count.',
        severity: 'high'
      });
    } else if (memory.percentage > 75) {
      recommendations.push({
        type: 'info',
        category: 'memory',
        message: 'Memory usage is elevated. Monitor for potential issues.',
        severity: 'medium'
      });
    }
    
    // Check API latency
    const apiLatency = this.getAverageAPILatency();
    if (apiLatency > 2000) {
      recommendations.push({
        type: 'warning',
        category: 'api',
        message: 'High API latency detected. Check network connection or backend performance.',
        severity: 'high'
      });
    }
    
    // Check API success rate
    const successRate = this.getAPISuccessRate();
    if (successRate < 90) {
      recommendations.push({
        type: 'warning',
        category: 'api',
        message: 'API requests are failing frequently. Check backend connectivity.',
        severity: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Measure async operation
   */
  async measureAsync(name, operation, category = 'general') {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      if (category === 'api') {
        this.recordAPILatency(name, duration, true);
      } else if (category === 'render') {
        this.recordRenderTime(name, duration);
      }
      
      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      if (category === 'api') {
        this.recordAPILatency(name, duration, false);
      }
      
      throw error;
    }
  }

  /**
   * Measure sync operation
   */
  measureSync(name, operation, category = 'render') {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      if (category === 'render') {
        this.recordRenderTime(name, duration);
      }
      
      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[PerformanceService] Error in ${name}:`, error);
      throw error;
    }
  }

  /**
   * Mark performance point
   */
  mark(name) {
    performance.mark(name);
  }

  /**
   * Measure between marks
   */
  measure(name, startMark, endMark) {
    try {
      performance.measure(name, startMark, endMark);
      
      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        this.recordRenderTime(name, duration);
        return duration;
      }
    } catch (error) {
      console.error('[PerformanceService] Error measuring:', error);
    }
    
    return null;
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics.fps = [];
    this.metrics.renderTime = [];
    this.metrics.apiLatency = [];
    this.metrics.wsLatency = [];
    this.metrics.memoryUsage = [];
    this.metrics.componentRenders.clear();
    
    console.log('[PerformanceService] Metrics cleared');
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics() {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: {
        fps: this.metrics.fps,
        renderTime: this.metrics.renderTime,
        apiLatency: this.metrics.apiLatency,
        wsLatency: this.metrics.wsLatency,
        memoryUsage: this.metrics.memoryUsage,
        componentRenders: Object.fromEntries(this.metrics.componentRenders)
      },
      summary: this.getCurrentMetrics(),
      report: this.getPerformanceReport()
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-metrics-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Add listener for metric updates
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify listeners of metric update
   */
  notifyListeners(metricType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(metricType, data);
      } catch (error) {
        console.error('[PerformanceService] Error in listener:', error);
      }
    });
  }

  /**
   * Get debug overlay data
   */
  getDebugOverlayData() {
    return {
      fps: this.getLatestFPS(),
      avgRenderTime: this.getAverageRenderTime(),
      apiLatency: this.getAverageAPILatency(),
      wsLatency: this.getAverageWSLatency(),
      memory: this.getCurrentMemoryUsage(),
      monitoring: this.monitoring
    };
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  performanceService.startMonitoring();
}

export default performanceService;
