import { useParams } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatCardProps, SandboxTest, AIRecommendation } from "@/types/dashboard";
import { Pause, X, Play, Clock } from "lucide-react";

const SandboxView = () => {
  const { patchId } = useParams<{ patchId: string }>();

  const stats: StatCardProps[] = [
    {
      title: "Active Tests",
      value: "4",
      subtitle: "Currently running"
    },
    {
      title: "Passed Tests",
      value: "28",
      subtitle: "+3 from last run"
    },
    {
      title: "Failed Tests",
      value: "2",
      subtitle: "Requires attention"
    }
  ];

  const sandboxTests: SandboxTest[] = [
    {
      name: "Authentication Module Integration Test",
      compatibility: 98,
      performance: 92,
      security: 95,
      stability: 97
    },
    {
      name: "Database Connection Pool Test",
      compatibility: 85,
      performance: 88,
      security: 90,
      stability: 86
    },
    {
      name: "API Gateway Load Test",
      compatibility: 94,
      performance: 78,
      security: 92,
      stability: 89
    },
    {
      name: "Memory Leak Detection Test",
      compatibility: 91,
      performance: 95,
      security: 88,
      stability: 93
    }
  ];

  const aiRecommendations: AIRecommendation[] = [
    {
      patchId: patchId || "PATCH-2024-001",
      action: "DEPLOY",
      reason: "All tests passed with high scores. Security improvements validated. Minimal risk of regression."
    },
    {
      patchId: patchId || "PATCH-2024-001",
      action: "DELAY",
      reason: "Performance tests show 12% degradation under peak load. Recommend optimization before deployment."
    }
  ];

  const handlePauseTest = (testName: string) => {
    console.log("Pausing test:", testName);
  };

  const handleAbortTest = (testName: string) => {
    console.log("Aborting test:", testName);
  };

  const handleRecommendationAction = (action: string, patchId: string) => {
    console.log(`${action} action for patch:`, patchId);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-foreground">
              Sandbox Testing Environment
            </h1>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {patchId}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Interactive testing and validation for patch deployment
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <h2 className="text-xl font-semibold text-foreground">
                  Sandbox Test Results
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time test execution and metrics
                </p>
              </div>
              <div className="divide-y divide-border">
                {sandboxTests.map((test, index) => (
                  <div key={index} className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-4">
                          {test.name}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Compatibility</span>
                              <span className="font-medium text-foreground">{test.compatibility}%</span>
                            </div>
                            <Progress value={test.compatibility} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Performance</span>
                              <span className="font-medium text-foreground">{test.performance}%</span>
                            </div>
                            <Progress value={test.performance} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Security</span>
                              <span className="font-medium text-foreground">{test.security}%</span>
                            </div>
                            <Progress value={test.security} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Stability</span>
                              <span className="font-medium text-foreground">{test.stability}%</span>
                            </div>
                            <Progress value={test.stability} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePauseTest(test.name)}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Test
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAbortTest(test.name)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Abort
                      </Button>
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
                  AI Recommendations
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                                    Intelligent deployment suggestions
                </p>
              </div>
              <div className="divide-y divide-border">
                {aiRecommendations.map((recommendation, index) => (
                  <div key={index} className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      {recommendation.action === 'DEPLOY' ? (
                        <Play className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                      <Badge 
                        className={
                          recommendation.action === 'DEPLOY'
                            ? 'bg-success text-success-foreground'
                            : 'bg-warning text-warning-foreground'
                        }
                      >
                        {recommendation.action}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {recommendation.reason}
                    </p>
                    <Button 
                      className="w-full"
                      variant={recommendation.action === 'DEPLOY' ? 'default' : 'outline'}
                      onClick={() => handleRecommendationAction(recommendation.action, recommendation.patchId)}
                    >
                      {recommendation.action === 'DEPLOY' ? 'Deploy Now' : 'Schedule Later'}
                    </Button>
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

export default SandboxView;
