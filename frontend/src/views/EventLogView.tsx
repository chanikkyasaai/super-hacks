import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventLog } from "@/types/dashboard";
import { 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  Activity
} from "lucide-react";

const EventLogView = () => {
  const workflowStages = [
    { name: "AI Analysis", status: "completed" },

    { name: "Sandbox Testing", status: "active" },
    { name: "Deployment", status: "pending" }
  ];

  const eventLogs: EventLog[] = [
    {
      timestamp: "2024-02-10T14:32:15Z",
      source: "AI Engine",
      patchId: "PATCH-2024-001",
      message: "Security vulnerability detected in authentication module",
      status: "error"
    },
    {
      timestamp: "2024-02-10T14:28:42Z",
      source: "Sandbox",
      patchId: "PATCH-2024-002",
      message: "Test suite completed successfully with 100% pass rate",
      status: "success"
    },
    {
      timestamp: "2024-02-10T14:25:18Z",
      source: "Deployment",
      patchId: "PATCH-2024-003",
      message: "Patch deployment initiated for production environment",
      status: "info"
    },
    {
      timestamp: "2024-02-10T14:22:56Z",
      source: "AI Engine",
      patchId: "PATCH-2024-004",
      message: "Performance degradation detected during load testing",
      status: "warning"
    },
    {
      timestamp: "2024-02-10T14:18:33Z",
      source: "Sandbox",
      patchId: "PATCH-2024-005",
      message: "Compatibility test passed for all target systems",
      status: "success"
    },
    {
      timestamp: "2024-02-10T14:15:09Z",
      source: "Deployment",
      patchId: "PATCH-2024-001",
      message: "Rollback completed successfully",
      status: "success"
    },
    {
      timestamp: "2024-02-10T14:12:44Z",
      source: "AI Engine",
      patchId: "PATCH-2024-006",
      message: "Analyzing impact score for new security patch",
      status: "info"
    },
    {
      timestamp: "2024-02-10T14:08:21Z",
      source: "Sandbox",
      patchId: "PATCH-2024-002",
      message: "Memory leak detected during stress testing",
      status: "error"
    },
    {
      timestamp: "2024-02-10T14:05:57Z",
      source: "Deployment",
      patchId: "PATCH-2024-007",
      message: "Scheduled deployment queued for 16:00",
      status: "info"
    },
    {
      timestamp: "2024-02-10T14:02:33Z",
      source: "AI Engine",
      patchId: "PATCH-2024-003",
      message: "Low priority patch identified for next maintenance window",
      status: "warning"
    }
  ];

  const activeAlerts = [
    {
      title: "High CPU Usage",
      description: "Sandbox environment showing elevated CPU usage",
      severity: "warning",
      time: "5 min ago"
    },
    {
      title: "Critical Patch Pending",
      description: "PATCH-2024-001 requires immediate attention",
      severity: "error",
      time: "12 min ago"
    },
    {
      title: "Deployment Scheduled",
      description: "3 patches scheduled for tonight",
      severity: "info",
      time: "1 hour ago"
    }
  ];

  const getStatusIcon = (status: EventLog['status']) => {
    switch (status) {
      case 'info':
        return <Info className="h-5 w-5 text-info" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-danger" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
    }
  };

  const getStatusColor = (status: EventLog['status']) => {
    switch (status) {
      case 'info':
        return 'bg-info text-info-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      case 'error':
        return 'bg-danger text-danger-foreground';
      case 'success':
        return 'bg-success text-success-foreground';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'border-info bg-info/10';
      case 'warning':
        return 'border-warning bg-warning/10';
      case 'error':
        return 'border-danger bg-danger/10';
      default:
        return 'border-border bg-muted/30';
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Orchestration & Event Log
          </h1>
          <p className="text-muted-foreground">
            Real-time system events and workflow monitoring
          </p>
        </header>

        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/30">
            <h2 className="text-xl font-semibold text-foreground">
              Current Workflow
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Active patch processing pipeline
            </p>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {workflowStages.map((stage, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`
                        w-16 h-16 rounded-full flex items-center justify-center
                        ${stage.status === 'completed' ? 'bg-success text-success-foreground' : ''}
                        ${stage.status === 'active' ? 'bg-primary text-primary-foreground animate-pulse' : ''}
                        ${stage.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                      `}
                    >
                      <Activity className="h-8 w-8" />
                    </div>
                    <p className="mt-3 font-medium text-foreground">{stage.name}</p>
                    <Badge 
                      variant="outline" 
                      className="mt-2"
                    >
                      {stage.status}
                    </Badge>
                  </div>
                  {index < workflowStages.length - 1 && (
                    <ArrowRight className="h-8 w-8 text-muted-foreground mx-8" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <h2 className="text-xl font-semibold text-foreground">
                  System Event Log
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Chronological record of all system events
                </p>
              </div>
              <div className="divide-y divide-border">
                {eventLogs.map((log, index) => (
                  <div key={index} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(log.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(log.status)} variant="default">
                            {log.status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.source}
                          </span>
                          <span className="text-sm font-mono text-muted-foreground">
                            {log.patchId}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-1">
                          {log.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <h2 className="text-xl font-semibold text-foreground">
                  Active Alerts
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  System notifications
                </p>
              </div>
              <div className="p-4 space-y-4">
                {activeAlerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border-l-4 ${getAlertColor(alert.severity)}`}
                  >
                    <h3 className="font-semibold text-foreground mb-1">
                      {alert.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.time}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventLogView;
