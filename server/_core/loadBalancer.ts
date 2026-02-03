import { EventEmitter } from "events";
import { getDb } from "../db";
import { panels } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Load Balancer for High-Traffic Panels
 * Distributes load across multiple database connections and implements caching
 */
export class PanelLoadBalancer extends EventEmitter {
  private dbConnections: Array<any> = [];
  private currentConnectionIndex = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private requestQueue: Array<any> = [];
  private processingQueue = false;
  private cache = new Map<string, { value: unknown; expiresAt: number }>();

  // Panel load metrics
  private panelMetrics: Map<
    string,
    {
      requestCount: number;
      averageResponseTime: number;
      errorRate: number;
      lastAccess: Date;
      activeConnections: number;
    }
  > = new Map();

  constructor() {
    super();
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Reset metrics every hour
    setInterval(
      () => {
        this.resetMetrics();
      },
      60 * 60 * 1000
    );
  }

  private resetMetrics() {
    this.panelMetrics.forEach((metrics, panelName) => {
      metrics.requestCount = 0;
      metrics.averageResponseTime = 0;
      metrics.errorRate = 0;
    });
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get the least loaded database connection
   */
  private getAvailableConnection() {
    if (this.dbConnections.length === 0) {
      return getDb(); // Fallback to single connection
    }

    // Round-robin load balancing
    const connection = this.dbConnections[this.currentConnectionIndex];
    this.currentConnectionIndex =
      (this.currentConnectionIndex + 1) % this.dbConnections.length;
    return connection;
  }

  /**
   * Cache panel data with TTL
   */
  private async cachePanelData(panelName: string, data: any, ttl = 30) {
    const key = `panel:${panelName}`;
    this.cache.set(key, { value: data, expiresAt: Date.now() + ttl * 1000 });
  }

  /**
   * Get cached panel data
   */
  private async getCachedPanelData(panelName: string) {
    const key = `panel:${panelName}`;
    const cached = this.cache.get(key);
    if (!cached) {
      this.cacheMisses++;
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.cacheMisses++;
      return null;
    }

    this.cacheHits++;
    return cached.value;
  }

  /**
   * Update panel metrics
   */
  private updatePanelMetrics(
    panelName: string,
    responseTime: number,
    success: boolean
  ) {
    const existing = this.panelMetrics.get(panelName) || {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastAccess: new Date(),
      activeConnections: 0,
    };

    existing.requestCount++;
    existing.lastAccess = new Date();

    // Update average response time
    existing.averageResponseTime =
      (existing.averageResponseTime * (existing.requestCount - 1) +
        responseTime) /
      existing.requestCount;

    // Update error rate
    if (!success) {
      existing.errorRate =
        (existing.errorRate * (existing.requestCount - 1) + 1) /
        existing.requestCount;
    } else {
      existing.errorRate =
        (existing.errorRate * (existing.requestCount - 1)) /
        existing.requestCount;
    }

    this.panelMetrics.set(panelName, existing);
  }

  /**
   * Get panel with load balancing and caching
   */
  async getPanel(panelName: string, useCache = true) {
    const startTime = Date.now();
    let success = false;

    try {
      // Try cache first
      if (useCache) {
        const cached = await this.getCachedPanelData(panelName);
        if (cached) {
          this.emit("cacheHit", { panelName, data: cached });
          return cached;
        }
      }

      // Queue request if too many concurrent requests
      if (this.requestQueue.length > 100) {
        return new Promise((resolve, reject) => {
          this.requestQueue.push({ panelName, resolve, reject });
          this.processQueue();
        });
      }

      // Get from database
      const db = await this.getAvailableConnection();
      if (!db) {
        throw new Error("Database not available");
      }
      const result = await db
        .select()
        .from(panels)
        .where(eq(panels.name, panelName))
        .limit(1);

      if (result.length > 0) {
        const panelData = result[0];

        // Cache the result
        await this.cachePanelData(panelName, panelData);

        success = true;
        this.emit("panelRetrieved", {
          panelName,
          data: panelData,
          cached: false,
        });
        return panelData;
      }

      throw new Error(`Panel ${panelName} not found`);
    } catch (error) {
      console.error(`[LoadBalancer] Error getting panel ${panelName}:`, error);
      this.emit("panelError", { panelName, error });
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      this.updatePanelMetrics(panelName, responseTime, success);
    }
  }

  /**
   * Update panel with real-time synchronization
   */
  async updatePanel(panelName: string, updates: any) {
    const startTime = Date.now();
    let success = false;

    try {
      const db = await this.getAvailableConnection();
      if (!db) {
        throw new Error("Database not available");
      }

      // Update database
      await db
        .update(panels)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(panels.name, panelName));

      // Invalidate cache
      this.cache.delete(`panel:${panelName}`);

      // Get updated data
      const updated = await this.getPanel(panelName, false);

      // Broadcast update to all connected clients
      this.emit("panelUpdated", {
        panelName,
        updates,
        updatedData: updated,
        timestamp: new Date(),
      });

      success = true;
      return updated;
    } catch (error) {
      console.error(`[LoadBalancer] Error updating panel ${panelName}:`, error);
      this.emit("panelUpdateError", { panelName, error });
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      this.updatePanelMetrics(panelName, responseTime, success);
    }
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) return;

    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, 10); // Process 10 at a time

      await Promise.allSettled(
        batch.map(async ({ panelName, resolve, reject }) => {
          try {
            const result = await this.getPanel(panelName);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
      );

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.processingQueue = false;
  }

  /**
   * Get real-time panel metrics
   */
  getPanelMetrics(panelName?: string) {
    if (panelName) {
      return this.panelMetrics.get(panelName);
    }

    return Object.fromEntries(this.panelMetrics);
  }

  /**
   * Get system performance metrics
   */
  getSystemMetrics() {
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
      queueLength: this.requestQueue.length,
      activeConnections: this.dbConnections.length,
      panelCount: this.panelMetrics.size,
      averageResponseTime:
        Array.from(this.panelMetrics.values()).reduce(
          (sum, m) => sum + m.averageResponseTime,
          0
        ) / this.panelMetrics.size || 0,
    };
  }

  /**
   * Health check for load balancer
   */
  async healthCheck() {
    const health = {
      database: false,
      overall: false,
    };

    try {
      const db = await this.getAvailableConnection();
      if (!db) {
        return health;
      }
      await db.select().from(panels).limit(1);
      health.database = true;
    } catch (error) {
      console.error("[LoadBalancer] Database health check failed:", error);
    }

    health.overall = health.database;
    return health;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log("[LoadBalancer] Shutting down...");

    this.removeAllListeners();
    console.log("[LoadBalancer] Shutdown complete");
  }
}

/**
 * Real-time Data Synchronization Manager
 * Handles real-time updates across multiple panel instances
 */
export class RealtimeSyncManager extends EventEmitter {
  private loadBalancer: PanelLoadBalancer;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;
  private pendingUpdates: Map<string, any> = new Map();

  constructor(loadBalancer: PanelLoadBalancer) {
    super();
    this.loadBalancer = loadBalancer;
    this.initializeSync();
  }

  private initializeSync() {
    // Listen for panel updates
    this.loadBalancer.on("panelUpdated", data => {
      this.handlePanelUpdate(data);
    });

    // Periodic sync every 5 minutes (reduced from 30 seconds to avoid spam)
    this.syncInterval = setInterval(() => {
      this.performPeriodicSync();
    }, 5 * 60 * 1000); // 5 minutes
  }

  private handlePanelUpdate(data: {
    panelName: string;
    updates: any;
    timestamp: Date;
  }) {
    const { panelName, updates, timestamp } = data;

    // Store pending update
    this.pendingUpdates.set(panelName, {
      updates,
      timestamp,
      synced: false,
    });

    // Emit real-time update event
    this.emit("realtimeUpdate", {
      type: "panel",
      panelName,
      updates,
      timestamp,
    });

    // Trigger immediate sync for high-priority updates
    const highPriorityUpdates = [
      "pointsBalance",
      "closingBalance",
      "profitLoss",
    ];
    const hasHighPriority = highPriorityUpdates.some(key => key in updates);

    if (hasHighPriority) {
      this.syncPanel(panelName);
    }
  }

  private async syncPanel(panelName: string) {
    try {
      const pending = this.pendingUpdates.get(panelName);
      if (!pending || pending.synced) return;

      // Get current panel state
      const currentPanel = await this.loadBalancer.getPanel(panelName, false);

      // Broadcast to all connected clients
      this.emit("syncUpdate", {
        type: "panel",
        panelName,
        data: currentPanel,
        lastUpdate: pending.timestamp,
      });

      // Mark as synced
      pending.synced = true;
      this.lastSyncTime = new Date();

      console.log(`[SyncManager] Synced panel: ${panelName}`);
    } catch (error) {
      console.error(`[SyncManager] Error syncing panel ${panelName}:`, error);
    }
  }

  /**
   * Perform periodic sync of all panels
   */
  private async performPeriodicSync() {
    try {
      // Only sync if there are pending updates or it's been a while
      const hasPendingUpdates = this.pendingUpdates.size > 0;
      const timeSinceLastSync = this.lastSyncTime 
        ? Date.now() - this.lastSyncTime.getTime()
        : Infinity;

      // Skip sync if no updates and recent sync (within 4 minutes)
      if (!hasPendingUpdates && timeSinceLastSync < 4 * 60 * 1000) {
        return;
      }

      const allPanels = await this.loadBalancer.getAllPanels();
      
      this.emit("fullSync", {
        type: "allPanels",
        data: allPanels,
        timestamp: new Date(),
      });

      // Clean up old pending updates
      const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      this.pendingUpdates.forEach((update, panelName) => {
        if (update.timestamp < cutoff) {
          this.pendingUpdates.delete(panelName);
        }
      });

      this.lastSyncTime = new Date();
      
      // Only log if there were actual updates
      if (hasPendingUpdates || timeSinceLastSync > 10 * 60 * 1000) {
        console.log("[SyncManager] Periodic sync completed");
      }
    } catch (error) {
      console.error("[SyncManager] Periodic sync error:", error);
    }
  }

  /**
   * Force immediate sync of all panels
   */
  async forceFullSync() {
    await this.performPeriodicSync();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      pendingUpdates: this.pendingUpdates.size,
      connectedClients: this.listenerCount("realtimeUpdate"),
    };
  }

  /**
   * Cleanup
   */
  shutdown() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.removeAllListeners();
    console.log("[SyncManager] Shutdown complete");
  }
}

// Singleton instances
export const panelLoadBalancer = new PanelLoadBalancer();
export const realtimeSyncManager = new RealtimeSyncManager(panelLoadBalancer);

// Graceful shutdown
process.on("SIGTERM", async () => {
  await panelLoadBalancer.shutdown();
  realtimeSyncManager.shutdown();
});

process.on("SIGINT", async () => {
  await panelLoadBalancer.shutdown();
  realtimeSyncManager.shutdown();
});
