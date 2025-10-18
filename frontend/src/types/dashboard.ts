export interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
}

export interface PatchItem {
  id: string;
  description: string;
  cve: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  impactScore: number;
}

export interface DeploymentItem {
  title: string;
  time: string;
}

export interface SandboxTest {
  name: string;
  compatibility: number;
  performance: number;
  security: number;
  stability: number;
}

export interface AIRecommendation {
  patchId: string;
  action: 'DEPLOY' | 'DELAY';
  reason: string;
}

export interface ComplianceFramework {
  name: string;
  lastAudit: string;
  status: 'compliant' | 'pending' | 'non-compliant';
  score: number;
}

export interface EventLog {
  timestamp: string;
  source: string;
  patchId: string;
  message: string;
  status: 'info' | 'warning' | 'error' | 'success';
}
