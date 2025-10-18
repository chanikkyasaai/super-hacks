import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatCardProps, ComplianceFramework } from "@/types/dashboard";
import { Filter, FileDown, CheckCircle, AlertCircle, Clock } from "lucide-react";

const ComplianceView = () => {
  const stats: StatCardProps[] = [
    {
      title: "Overall Compliance",
      value: "94%",
      subtitle: "+2% from last quarter"
    },
    {
      title: "Compliant Frameworks",
      value: "8/10",
      subtitle: "2 pending review"
    },
    {
      title: "Last Audit",
      value: "7 days",
      subtitle: "Next audit in 23 days"
    },
    {
      title: "Patches Deployed",
      value: "156",
      subtitle: "This quarter"
    }
  ];

  const frameworks: ComplianceFramework[] = [
    {
      name: "SOC 2 Type II",
      lastAudit: "2024-01-15",
      status: "compliant",
      score: 98
    },
    {
      name: "ISO 27001",
      lastAudit: "2024-01-20",
      status: "compliant",
      score: 96
    },
    {
      name: "HIPAA",
      lastAudit: "2024-02-01",
      status: "compliant",
      score: 94
    },
    {
      name: "PCI DSS",
      lastAudit: "2024-01-28",
      status: "pending",
      score: 88
    },
    {
      name: "GDPR",
      lastAudit: "2024-01-10",
      status: "compliant",
      score: 95
    },
    {
      name: "FedRAMP",
      lastAudit: "2024-02-05",
      status: "pending",
      score: 82
    },
    {
      name: "NIST Cybersecurity Framework",
      lastAudit: "2024-01-25",
      status: "compliant",
      score: 92
    },
    {
      name: "CIS Controls",
      lastAudit: "2024-01-18",
      status: "compliant",
      score: 90
    },
    {
      name: "FISMA",
      lastAudit: "2023-12-15",
      status: "non-compliant",
      score: 68
    },
    {
      name: "COBIT",
      lastAudit: "2024-01-22",
      status: "compliant",
      score: 91
    }
  ];

  const getStatusIcon = (status: ComplianceFramework['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'non-compliant':
        return <AlertCircle className="h-5 w-5 text-danger" />;
    }
  };

  const getStatusColor = (status: ComplianceFramework['status']) => {
    switch (status) {
      case 'compliant':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'non-compliant':
        return 'bg-danger text-danger-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Compliance & Reporting
              </h1>
              <p className="text-muted-foreground mt-2">
                Regulatory framework compliance and audit tracking
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="default">
                <FileDown className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/30">
            <h2 className="text-xl font-semibold text-foreground">
              Regulatory Frameworks
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Compliance status across all frameworks
            </p>
          </div>
          <div className="divide-y divide-border">
            {frameworks.map((framework, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(framework.status)}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {framework.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Last audit: {new Date(framework.lastAudit).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(framework.status)}>
                    {framework.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Compliance Score</span>
                    <span className="font-medium text-foreground">{framework.score}%</span>
                  </div>
                  <Progress value={framework.score} className="h-3" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/30">
            <h2 className="text-xl font-semibold text-foreground">
              Patch Deployment History
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recent compliance-related deployments
            </p>
          </div>
          <div className="p-6">
            <p className="text-muted-foreground text-center py-8">
              Deployment history visualization would appear here
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceView;
