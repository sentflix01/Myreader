const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

class DatabaseHealthChecker {
  constructor() {
    this.connectionStatus = 'disconnected';
    this.lastCheck = null;
    this.metrics = {
      connectionTime: null,
      queryCount: 0,
      slowQueries: 0,
      errors: 0,
    };
  }

  async checkConnection() {
    try {
      const startTime = Date.now();
      
      if (mongoose.connection.readyState !== 1) {
        const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
        await mongoose.connect(DB);
      }
      
      this.connectionStatus = 'connected';
      this.metrics.connectionTime = Date.now() - startTime;
      this.lastCheck = new Date();
      
      return {
        status: 'healthy',
        connectionTime: this.metrics.connectionTime,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      };
    } catch (error) {
      this.connectionStatus = 'error';
      this.metrics.errors++;
      
      return {
        status: 'unhealthy',
        error: error.message,
        readyState: mongoose.connection.readyState,
      };
    }
  }

  async checkPerformance() {
    try {
      const startTime = Date.now();
      
      // Simple query to test performance
      await mongoose.connection.db.admin().ping();\n      
      const queryTime = Date.now() - startTime;\n      this.metrics.queryCount++;\n      \n      if (queryTime > 1000) {\n        this.metrics.slowQueries++;\n      }\n      \n      return {\n        queryTime,\n        isSlowQuery: queryTime > 1000,\n      };\n    } catch (error) {\n      this.metrics.errors++;\n      throw error;\n    }\n  }\n\n  async getCollectionStats() {\n    try {\n      const collections = await mongoose.connection.db.listCollections().toArray();\n      const stats = {};\n      \n      for (const collection of collections) {\n        try {\n          const collStats = await mongoose.connection.db.collection(collection.name).stats();\n          stats[collection.name] = {\n            count: collStats.count || 0,\n            size: Math.round((collStats.size || 0) / 1024), // KB\n            avgObjSize: Math.round(collStats.avgObjSize || 0),\n            indexes: collStats.nindexes || 0,\n          };\n        } catch (err) {\n          stats[collection.name] = { error: err.message };\n        }\n      }\n      \n      return stats;\n    } catch (error) {\n      return { error: error.message };\n    }\n  }\n\n  async getIndexStats() {\n    try {\n      const collections = ['users', 'chats', 'documents', 'reviews'];\n      const indexStats = {};\n      \n      for (const collectionName of collections) {\n        try {\n          const collection = mongoose.connection.db.collection(collectionName);\n          const indexes = await collection.indexes();\n          indexStats[collectionName] = indexes.map(index => ({\n            name: index.name,\n            keys: index.key,\n            unique: index.unique || false,\n            sparse: index.sparse || false,\n          }));\n        } catch (err) {\n          indexStats[collectionName] = { error: err.message };\n        }\n      }\n      \n      return indexStats;\n    } catch (error) {\n      return { error: error.message };\n    }\n  }\n\n  async runFullHealthCheck() {\n    console.log('🔍 Running database health check...');\n    \n    const results = {\n      timestamp: new Date().toISOString(),\n      connection: await this.checkConnection(),\n      performance: null,\n      collections: null,\n      indexes: null,\n      metrics: this.metrics,\n    };\n    \n    if (results.connection.status === 'healthy') {\n      try {\n        results.performance = await this.checkPerformance();\n        results.collections = await this.getCollectionStats();\n        results.indexes = await getIndexStats();\n      } catch (error) {\n        results.error = error.message;\n      }\n    }\n    \n    return results;\n  }\n\n  logHealthSummary(results) {\n    console.log('\\n📊 Database Health Summary:');\n    console.log(`🔗 Connection: ${results.connection.status}`);\n    \n    if (results.connection.status === 'healthy') {\n      console.log(`⚡ Connection Time: ${results.connection.connectionTime}ms`);\n      console.log(`🏠 Host: ${results.connection.host}`);\n      console.log(`📁 Database: ${results.connection.name}`);\n      \n      if (results.performance) {\n        console.log(`🚀 Query Time: ${results.performance.queryTime}ms`);\n      }\n      \n      if (results.collections) {\n        console.log('📚 Collections:');\n        Object.entries(results.collections).forEach(([name, stats]) => {\n          if (stats.error) {\n            console.log(`  ❌ ${name}: ${stats.error}`);\n          } else {\n            console.log(`  📄 ${name}: ${stats.count} docs, ${stats.size}KB, ${stats.indexes} indexes`);\n          }\n        });\n      }\n      \n      console.log(`📈 Total Queries: ${this.metrics.queryCount}`);\n      console.log(`🐌 Slow Queries: ${this.metrics.slowQueries}`);\n      console.log(`❌ Errors: ${this.metrics.errors}`);\n    } else {\n      console.error(`❌ Connection Error: ${results.connection.error}`);\n    }\n  }\n\n  async startMonitoring(intervalMinutes = 5) {\n    console.log(`🔄 Starting database monitoring (every ${intervalMinutes} minutes)`);\n    \n    const runCheck = async () => {\n      try {\n        const results = await this.runFullHealthCheck();\n        this.logHealthSummary(results);\n        \n        // Alert on issues\n        if (results.connection.status !== 'healthy') {\n          console.error('🚨 DATABASE CONNECTION ISSUE!');\n        }\n        if (results.performance && results.performance.queryTime > 1000) {\n          console.warn('⚠️  Slow database queries detected!');\n        }\n      } catch (error) {\n        console.error('Database health check failed:', error);\n      }\n    };\n    \n    // Run initial check\n    await runCheck();\n    \n    // Schedule periodic checks\n    setInterval(runCheck, intervalMinutes * 60 * 1000);\n  }\n}\n\n// CLI usage\nif (require.main === module) {\n  const checker = new DatabaseHealthChecker();\n  \n  if (process.argv.includes('--monitor')) {\n    checker.startMonitoring(5);\n  } else {\n    checker.runFullHealthCheck()\n      .then(results => {\n        checker.logHealthSummary(results);\n        process.exit(results.connection.status === 'healthy' ? 0 : 1);\n      })\n      .catch(error => {\n        console.error('Health check failed:', error);\n        process.exit(1);\n      });\n  }\n}\n\nmodule.exports = DatabaseHealthChecker;