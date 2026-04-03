const os = require('os');
const process = require('process');
const mongoose = require('mongoose');

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      dbConnections: 0,
    };
    
    // Start monitoring
    this.startMonitoring();
  }

  startMonitoring() {
    // Monitor every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Log summary every 5 minutes
    setInterval(() => {
      this.logSummary();
    }, 300000);
  }

  collectMetrics() {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    });

    // CPU usage
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system,
    });

    // Database connections
    if (mongoose.connection.readyState === 1) {
      this.metrics.dbConnections = mongoose.connections.length;
    }

    // Keep only last 100 entries
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
    }
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
  }

  recordRequest(responseTime) {
    this.metrics.requests++;
    this.metrics.responseTime.push({
      timestamp: Date.now(),
      time: responseTime,
    });
  }

  recordError() {
    this.metrics.errors++;
  }

  getAverageResponseTime() {
    if (this.metrics.responseTime.length === 0) return 0;
    const sum = this.metrics.responseTime.reduce((acc, curr) => acc + curr.time, 0);
    return sum / this.metrics.responseTime.length;
  }

  getCurrentMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    };
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
      uptime: Math.round(os.uptime() / 3600), // hours
      nodeVersion: process.version,
    };
  }

  logSummary() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000 / 60); // minutes
    const avgResponseTime = this.getAverageResponseTime();
    const memUsage = this.getCurrentMemoryUsage();
    const systemInfo = this.getSystemInfo();
    const errorRate = this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0;

    console.log('\n📊 Performance Summary:');
    console.log(`⏱️  Uptime: ${uptime} minutes`);
    console.log(`📈 Requests: ${this.metrics.requests}`);
    console.log(`❌ Errors: ${this.metrics.errors} (${errorRate}%)`);
    console.log(`⚡ Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`💾 Memory Usage: ${memUsage.heapUsed}MB / ${memUsage.heapTotal}MB`);
    console.log(`🔗 DB Connections: ${this.metrics.dbConnections}`);
    console.log(`🖥️  System Memory: ${systemInfo.freeMemory}GB free / ${systemInfo.totalMemory}GB total`);
    
    // Alert if metrics are concerning
    if (errorRate > 5) {
      console.warn('⚠️  High error rate detected!');
    }
    if (avgResponseTime > 1000) {
      console.warn('⚠️  Slow response times detected!');
    }
    if (memUsage.heapUsed > 500) {
      console.warn('⚠️  High memory usage detected!');
    }
    if (systemInfo.freeMemory < 1) {
      console.warn('⚠️  Low system memory!');
    }
  }

  getHealthStatus() {
    const avgResponseTime = this.getAverageResponseTime();
    const memUsage = this.getCurrentMemoryUsage();
    const errorRate = this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100) : 0;
    
    let status = 'healthy';
    const issues = [];
    
    if (errorRate > 5) {
      status = 'warning';
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }
    
    if (avgResponseTime > 1000) {
      status = 'warning';
      issues.push(`Slow response time: ${avgResponseTime.toFixed(2)}ms`);
    }
    
    if (memUsage.heapUsed > 500) {
      status = 'warning';
      issues.push(`High memory usage: ${memUsage.heapUsed}MB`);
    }
    
    if (errorRate > 10 || avgResponseTime > 2000 || memUsage.heapUsed > 1000) {
      status = 'critical';
    }
    
    return {
      status,
      issues,
      metrics: {
        uptime: Math.round((Date.now() - this.startTime) / 1000 / 60),
        requests: this.metrics.requests,
        errors: this.metrics.errors,
        errorRate: errorRate.toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(2),
        memoryUsage: memUsage,
        dbConnections: this.metrics.dbConnections,
      }
    };
  }

  // Middleware to track request performance
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.recordRequest(responseTime);
        
        if (res.statusCode >= 400) {
          this.recordError();
        }
      });
      
      next();
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;