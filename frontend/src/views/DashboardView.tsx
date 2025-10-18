import StatCard from "@/components/StatCard";
import PatchQueueItem from "@/components/PatchQueueItem";
import UpcomingDeployment from "@/components/UpcomingDeployment";
import ComplianceDonutChart from "@/components/ComplianceDonutChart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCardProps, PatchItem, DeploymentItem } from "@/types/dashboard";
import { Play, RotateCcw } from "lucide-react";

const DashboardView = () => {
  const stats: StatCardProps[] = [
    {
      title: "Critical Patches",
      value: "18",
      subtitle: "Requires immediate attention"
    },
    {
      title: "Compliance Score",
      value: "94%",
      subtitle: "+2% from last week"
    },
    {
      title: "Active Tests",
      value: "12",
      subtitle: "Running in sandbox"
    },
    {
      title: "Success Rate",
      value: "97.3%",
      subtitle: "Last 30 days"
    }
  ];

  const patches: PatchItem[] = [
    {
      id: "PATCH-2024-001",
      description: "Critical security vulnerability in authentication module",
      cve: "CVE-2024-0123",
      severity: "CRITICAL",
      impactScore: 95
    },
    {
      id: "PATCH-2024-002",
      description: "Memory leak in data processing pipeline",
      cve: "CVE-2024-0124",
      severity: "HIGH",
      impactScore: 87
    },
    {
      id: "PATCH-2024-003",
      description: "Performance optimization for database queries",
      cve: "CVE-2024-0125",
      severity: "MEDIUM",
      impactScore: 64
    },
    {
      id: "PATCH-2024-004",
      description: "UI component rendering issue in dashboard",
      cve: "CVE-2024-0126",
      severity: "LOW",
      impactScore: 42
    },
    {
      id: "PATCH-2024-005",
      description: "API rate limiting configuration update",
      cve: "CVE-2024-0127",
      severity: "MEDIUM",
      impactScore: 58
    }
  ];

  const deployments: DeploymentItem[] = [
    {
      title: "Production Database Migration",
      time: "Today, 2:00 PM"
    },
    {
      title: "API Gateway Update v3.2.1",
      time: "Today, 4:30 PM"
    },
    {
      title: "Security Patch Rollout",
      time: "Tomorrow, 10:00 AM"
    },
    {
      title: "Frontend Build Deployment",
      time: "Tomorrow, 2:00 PM"
    }
  ];

  const compliancePercentage = 94;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Patch Orchestration Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring and management of system patches
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      AI Priority Queue
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patches ranked by impact and urgency
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default">
                      <Play className="h-4 w-4 mr-2" />
                      Deploy Selected
                    </Button>
                    <Button size="sm" variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rollback
                    </Button>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {patches.map((patch) => (
                  <PatchQueueItem key={patch.id} patch={patch} />
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <h2 className="text-xl font-semibold text-foreground">
                  Global Compliance
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  System-wide compliance status
                </p>
              </div>
              <div className="p-6">
                <ComplianceDonutChart percentage={compliancePercentage} />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <h2 className="text-xl font-semibold text-foreground">
                  Upcoming Deployments
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Scheduled maintenance windows
                </p>
              </div>
              <div className="divide-y divide-border">
                {deployments.map((deployment, index) => (
                  <UpcomingDeployment key={index} deployment={deployment} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
