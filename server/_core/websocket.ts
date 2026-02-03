import { Server as SocketIOServer, type Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { panelLoadBalancer, realtimeSyncManager } from "./loadBalancer";
import { parse as parseCookie } from "cookie";
import { getAdminUserById } from "../standalone-auth";
import { z } from "zod";

const zSubscription = z.object({
  type: z.enum(["panel", "metrics"]),
  id: z.string().optional(),
});

const zPanelRequest = z.object({
  panelName: z.string().min(1),
});

/**
 * WebSocket Manager for Real-time Panel Communication
 * Handles real-time updates, notifications, and collaborative features
 */
export class WebSocketManager {
  private io: SocketIOServer;
  private connectedClients: Map<
    string,
    {
      socketId: string;
      adminId: number;
      username: string;
      connectedAt: Date;
      lastActivity: Date;
      subscriptions: Set<string>;
    }
  > = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.initializeMiddleware();
    this.initializeEventHandlers();
    this.initializeRealtimeSync();
  }

  private initializeMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const rawCookieHeader = socket.handshake.headers.cookie;
        if (!rawCookieHeader) {
          return next(new Error("Authentication cookie required"));
        }

        const cookies = parseCookie(rawCookieHeader);
        const adminIdRaw = cookies["admin_session"];
        if (!adminIdRaw) {
          return next(new Error("Not authenticated"));
        }

        const adminId = Number(adminIdRaw);
        if (!Number.isFinite(adminId)) {
          return next(new Error("Invalid session"));
        }

        const admin = await getAdminUserById(adminId);
        if (!admin || !admin.isActive) {
          return next(new Error("Invalid session"));
        }

        socket.data.admin = {
          id: admin.id,
          username: admin.username,
          email: admin.email,
        };

        next();
      } catch (error) {
        console.error("[WebSocket] Authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  private initializeEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      const admin = socket.data.admin;
      console.log(
        `[WebSocket] Admin ${admin.username} connected: ${socket.id}`
      );

      // Register client
      this.connectedClients.set(socket.id, {
        socketId: socket.id,
        adminId: admin.id,
        username: admin.username,
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(),
      });

      // Send initial data
      this.sendInitialData(socket);

      // Handle client events
      socket.on("subscribe", (data: unknown) =>
        this.handleSubscribe(socket, data)
      );
      socket.on("unsubscribe", (data: unknown) =>
        this.handleUnsubscribe(socket, data)
      );
      socket.on("requestPanelUpdate", (data: unknown) =>
        this.handlePanelRequest(socket, data)
      );
      socket.on("ping", () => this.handlePing(socket));
      socket.on("disconnect", () => this.handleDisconnect(socket));

      // Join admin to their personal room
      socket.join(`admin:${admin.id}`);
    });
  }

  private initializeRealtimeSync() {
    // Listen for load balancer events
    panelLoadBalancer.on("panelUpdated", data => {
      this.broadcastPanelUpdate(data);
    });

    realtimeSyncManager.on("realtimeUpdate", data => {
      this.broadcastRealtimeUpdate(data);
    });

    realtimeSyncManager.on("fullSync", data => {
      this.broadcastFullSync(data);
    });

    // Periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  private async sendInitialData(socket: Socket) {
    try {
      // Send all panels data
      const db = await import("../db");
      const panels = await db.getAllPanels();

      socket.emit("initialData", {
        type: "panels",
        data: panels,
        timestamp: new Date(),
      });

      // Send system metrics
      const metrics = panelLoadBalancer.getSystemMetrics();
      socket.emit("systemMetrics", metrics);

      // Send connected admins list
      this.broadcastConnectedAdmins();
    } catch (error) {
      console.error("[WebSocket] Error sending initial data:", error);
      socket.emit("error", { message: "Failed to load initial data" });
    }
  }

  private handleSubscribe(socket: Socket, data: unknown) {
    const parsed = zSubscription.safeParse(data);
    if (!parsed.success) return;
    const { type, id } = parsed.data;
    const client = this.connectedClients.get(socket.id);

    if (!client) return;

    switch (type) {
      case "panel":
        client.subscriptions.add(`panel:${id}`);
        socket.join(`panel:${id}`);
        console.log(
          `[WebSocket] ${client.username} subscribed to panel: ${id}`
        );
        break;

      case "metrics":
        client.subscriptions.add("metrics");
        socket.join("metrics");
        console.log(`[WebSocket] ${client.username} subscribed to metrics`);
        break;
    }

    // Update last activity
    client.lastActivity = new Date();
  }

  private handleUnsubscribe(socket: Socket, data: unknown) {
    const parsed = zSubscription.safeParse(data);
    if (!parsed.success) return;
    const { type, id } = parsed.data;
    const client = this.connectedClients.get(socket.id);

    if (!client) return;

    switch (type) {
      case "panel":
        client.subscriptions.delete(`panel:${id}`);
        socket.leave(`panel:${id}`);
        break;

      case "metrics":
        client.subscriptions.delete("metrics");
        socket.leave("metrics");
        break;
    }

    client.lastActivity = new Date();
  }

  private async handlePanelRequest(socket: Socket, data: unknown) {
    try {
      const parsed = zPanelRequest.safeParse(data);
      if (!parsed.success) {
        return;
      }

      const { panelName } = parsed.data;
      const panel = await panelLoadBalancer.getPanel(panelName);

      socket.emit("panelData", {
        panelName,
        data: panel,
        timestamp: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      socket.emit("error", {
        message: "Failed to get panel",
        error: message,
      });
    }
  }

  private handlePing(socket: Socket) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.lastActivity = new Date();
      socket.emit("pong", { timestamp: new Date() });
    }
  }

  private handleDisconnect(socket: Socket) {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      console.log(
        `[WebSocket] Admin ${client.username} disconnected: ${socket.id}`
      );
      this.connectedClients.delete(socket.id);
      this.broadcastConnectedAdmins();
    }
  }

  broadcastPanelUpdate(data: {
    panelName: string;
    updates: any;
    updatedData: any;
  }) {
    this.io.to(`panel:${data.panelName}`).emit("panelUpdate", {
      panelName: data.panelName,
      updates: data.updates,
      data: data.updatedData,
      timestamp: new Date(),
    });

    console.log(`[WebSocket] Broadcasted update for panel: ${data.panelName}`);
  }

  broadcastRealtimeUpdate(data: any) {
    this.io.emit("realtimeUpdate", data);
  }

  broadcastSystemUpdate() {
    this.io.emit("systemMetrics", {
      timestamp: new Date(),
      type: "systemUpdate",
    });
  }

  private broadcastFullSync(data: any) {
    this.io.emit("fullSync", data);
  }

  private broadcastConnectedAdmins() {
    const connectedAdmins = Array.from(this.connectedClients.values()).map(
      client => ({
        username: client.username,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity,
      })
    );

    this.io.emit("connectedAdmins", connectedAdmins);
  }

  private async performHealthCheck() {
    const health = await panelLoadBalancer.healthCheck();

    this.io.to("metrics").emit("healthCheck", {
      ...health,
      timestamp: new Date(),
      connectedClients: this.connectedClients.size,
    });

    // Remove inactive clients
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
    for (const [socketId, client] of Array.from(
      this.connectedClients.entries()
    )) {
      if (client.lastActivity < cutoff) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        this.connectedClients.delete(socketId);
      }
    }
  }

  /**
   * Send notification to specific admin
   */
  sendNotificationToAdmin(
    adminId: number,
    notification: {
      type: "info" | "warning" | "error" | "success";
      title: string;
      message: string;
      data?: any;
    }
  ) {
    this.io.to(`admin:${adminId}`).emit("notification", {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast notification to all connected admins
   */
  broadcastNotification(notification: {
    type: "info" | "warning" | "error" | "success";
    title: string;
    message: string;
    data?: any;
  }) {
    this.io.emit("notification", {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * Get WebSocket statistics
   */
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      totalSubscriptions: Array.from(this.connectedClients.values()).reduce(
        (sum, client) => sum + client.subscriptions.size,
        0
      ),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log("[WebSocket] Shutting down...");

    // Notify all clients
    this.io.emit("serverShutdown", {
      message: "Server is shutting down",
      timestamp: new Date(),
    });

    // Close all connections
    this.io.close();
    console.log("[WebSocket] Shutdown complete");
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: HTTPServer) {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
  }
  return wsManager;
}

export function getWebSocketManager() {
  return wsManager;
}
