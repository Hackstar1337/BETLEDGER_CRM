import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import { io } from "socket.io-client";
import { trpc } from "@/lib/trpc";

interface PanelMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastAccess: Date;
  activeConnections: number;
}

interface SystemMetrics {
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  queueLength: number;
  activeConnections: number;
  panelCount: number;
  averageResponseTime: number;
}

interface RealtimeDashboardProps {
  className?: string;
}

export const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({
  className,
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "1h" | "6h" | "24h" | "7d"
  >("24h");
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // tRPC queries
  const {
    data: panels,
    isLoading: panelsLoading,
    error: panelsError,
    refetch: refetchPanels,
  } = trpc.enhancedPanels.list.useQuery(
    {
      timePeriod: selectedTimeRange === "24h" ? "today" : selectedTimeRange as "7d" | "30d" | "all",
      includeMetrics: true,
      useCache: false,
    },
    {
      refetchInterval: isRealtimeEnabled ? 5000 : false,
      enabled: isRealtimeEnabled,
    }
  );

  const {
    data: systemMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = trpc.enhancedPanels.getMetrics.useQuery(
    { includeSystem: true },
    {
      refetchInterval: isRealtimeEnabled ? 3000 : false,
      enabled: isRealtimeEnabled,
    }
  );

  const { data: healthData, refetch: refetchHealth } =
    trpc.enhancedPanels.healthCheck.useQuery(undefined, {
      refetchInterval: isRealtimeEnabled ? 10000 : false,
      enabled: isRealtimeEnabled,
    });

  const forceSyncMutation = trpc.enhancedPanels.forceSync.useMutation();

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isRealtimeEnabled) return;

    const socket = io({
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("panelUpdate", () => {
      refetchPanels();
      setLastUpdate(new Date());
    });

    socket.on("systemMetrics", () => {
      refetchMetrics();
      setLastUpdate(new Date());
    });

    socket.on("healthCheck", () => {
      setLastUpdate(new Date());
    });

    socket.on("connect_error", error => {
      console.error("Socket.IO error:", error);
      setIsRealtimeEnabled(false);
    });

    return () => {
      socket.close();
    };
  }, [isRealtimeEnabled, refetchPanels, refetchMetrics]);

  const handleForceSync = useCallback(async () => {
    try {
      await forceSyncMutation.mutateAsync({ fullSync: true });
      refetchPanels();
      refetchMetrics();
      refetchHealth();
    } catch (error) {
      console.error("Force sync failed:", error);
    }
  }, [forceSyncMutation, refetchPanels, refetchMetrics, refetchHealth]);

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPerformanceColor = (
    value: number,
    type: "responseTime" | "errorRate" | "cacheHitRate"
  ) => {
    switch (type) {
      case "responseTime":
        if (value < 200) return "text-green-600";
        if (value < 500) return "text-yellow-600";
        return "text-red-600";
      case "errorRate":
        if (value < 1) return "text-green-600";
        if (value < 5) return "text-yellow-600";
        return "text-red-600";
      case "cacheHitRate":
        if (value > 0.8) return "text-green-600";
        if (value > 0.6) return "text-yellow-600";
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Real-time Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor panel performance and system health in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isRealtimeEnabled ? "default" : "secondary"}>
            {isRealtimeEnabled ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRealtimeEnabled(!isRealtimeEnabled)}
          >
            {isRealtimeEnabled ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceSync}
            disabled={forceSyncMutation.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${forceSyncMutation.isPending ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Panels</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {panels?.panels?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active betting panels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getPerformanceColor(systemMetrics?.system?.cacheHitRate || 0, "cacheHitRate")}`}
            >
              {((systemMetrics?.system?.cacheHitRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics?.system?.cacheHits || 0} hits /{" "}
              {systemMetrics?.system?.cacheMisses || 0} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getPerformanceColor(systemMetrics?.system?.averageResponseTime || 0, "responseTime")}`}
            >
              {formatResponseTime(
                systemMetrics?.system?.averageResponseTime || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Across all panels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {healthData?.loadBalancer?.overall ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${healthData?.loadBalancer?.overall ? "text-green-600" : "text-red-600"}`}
            >
              {healthData?.loadBalancer?.overall ? "Healthy" : "Issues"}
            </div>
            <p className="text-xs text-muted-foreground">
              Last check: {lastUpdate.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <Tabs
        value={selectedTimeRange}
        onValueChange={(value: any) => setSelectedTimeRange(value)}
      >
        <TabsList>
          <TabsTrigger value="1h">1 Hour</TabsTrigger>
          <TabsTrigger value="6h">6 Hours</TabsTrigger>
          <TabsTrigger value="24h">24 Hours</TabsTrigger>
          <TabsTrigger value="7d">7 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTimeRange} className="space-y-4">
          {/* Panel Performance Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {panels?.panels?.map((panel: any) => (
              <Card key={panel.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{panel.name}</CardTitle>
                    <Badge
                      variant={
                        panel.profitLoss >= 0 ? "default" : "destructive"
                      }
                    >
                      {panel.profitLoss >= 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {formatCurrency(Math.abs(panel.profitLoss))}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Balance Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Points Balance</p>
                      <p className="font-medium">
                        {formatCurrency(panel.pointsBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Closing Balance</p>
                      <p className="font-medium">
                        {formatCurrency(panel.closingBalance)}
                      </p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  {panel._metrics && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Response Time</span>
                        <span
                          className={getPerformanceColor(
                            panel._metrics.averageResponseTime,
                            "responseTime"
                          )}
                        >
                          {formatResponseTime(
                            panel._metrics.averageResponseTime
                          )}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          (panel._metrics.averageResponseTime / 1000) * 100,
                          100
                        )}
                        className="h-1"
                      />

                      <div className="flex justify-between text-sm">
                        <span>Error Rate</span>
                        <span
                          className={getPerformanceColor(
                            panel._metrics.errorRate,
                            "errorRate"
                          )}
                        >
                          {(panel._metrics.errorRate * 100).toFixed(2)}%
                        </span>
                      </div>
                      <Progress
                        value={panel._metrics.errorRate * 100}
                        className="h-1"
                      />

                      <div className="flex justify-between text-sm">
                        <span>Requests</span>
                        <span>{panel._metrics.requestCount}</span>
                      </div>
                    </div>
                  )}

                  {/* Status Indicators */}
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{panel._metrics?.activeConnections || 0} active</span>
                    <span>•</span>
                    <span>
                      Last:{" "}
                      {new Date(
                        panel._metrics?.lastAccess || panel.updatedAt
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* System Metrics Details */}
      {systemMetrics?.system && (
        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
            <CardDescription>
              Detailed performance and load balancing metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Queue Length</p>
                <p className="text-2xl font-bold">
                  {systemMetrics.system.queueLength}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pending requests
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Active Connections</p>
                <p className="text-2xl font-bold">
                  {systemMetrics.system.activeConnections}
                </p>
                <p className="text-xs text-muted-foreground">
                  Database connections
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Cache Performance</p>
                <p className="text-2xl font-bold">
                  {((systemMetrics.system.cacheHitRate || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Hit rate efficiency
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Sync Status</p>
                <p className="text-2xl font-bold">
                  {systemMetrics.sync?.pendingUpdates || 0}
                </p>
                <p className="text-xs text-muted-foreground">Pending updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
