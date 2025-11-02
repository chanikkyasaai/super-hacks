import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fetchCompliance, generateCompliance, getComplianceStats } from "@/lib/api";
import { ComplianceFramework, StatCardProps } from "@/types/dashboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	FileDown,
	Filter,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const ComplianceView = () => {
	const [isGenerating, setIsGenerating] = useState(false);
	const queryClient = useQueryClient();

	// Fetch compliance stats
	const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
		queryKey: ["complianceStats"],
		queryFn: getComplianceStats,
	});

	// Fetch compliance frameworks/reports
	const { data: complianceData, isLoading: complianceLoading, error: complianceError } = useQuery({
		queryKey: ["compliance"],
		queryFn: fetchCompliance,
	});

	// Build stats array from real data
	const stats: StatCardProps[] = statsData ? [
		{
			title: "Overall Compliance",
			value: `${statsData.overallCompliance || 0}%`,
			subtitle: statsData.complianceChange || "No change",
		},
		{
			title: "Compliant Frameworks",
			value: `${statsData.compliantFrameworks || 0}/${statsData.totalFrameworks || 10}`,
			subtitle: `${statsData.pendingFrameworks || 0} pending review`,
		},
		{
			title: "Last Audit",
			value: `${statsData.daysSinceAudit || 0} days`,
			subtitle: `Next audit in ${statsData.nextAuditDays || 0} days`,
		},
		{
			title: "Patches Deployed",
			value: `${statsData.patchesDeployed || 0}`,
			subtitle: statsData.quarter || "This quarter",
		},
	] : [
		{
			title: "Overall Compliance",
			value: "Loading...",
			subtitle: "",
		},
		{
			title: "Compliant Frameworks",
			value: "Loading...",
			subtitle: "",
		},
		{
			title: "Last Audit",
			value: "Loading...",
			subtitle: "",
		},
		{
			title: "Patches Deployed",
			value: "Loading...",
			subtitle: "",
		},
	];

	const handleGenerate = async () => {
		setIsGenerating(true);
		try {
			await toast.promise(
				generateCompliance(),
				{
					loading: 'Generating compliance report...',
					success: (result) => {
						// Refresh compliance data
						queryClient.invalidateQueries({ queryKey: ["compliance"] });
						queryClient.invalidateQueries({ queryKey: ["complianceStats"] });
						return `Report generated successfully! Total patches: ${result.summary?.totalPatches || 'N/A'}`;
					},
					error: (err) => `Failed to generate report: ${err instanceof Error ? err.message : 'Unknown error'}`,
				}
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleExport = () => {
		// Export the current compliance data as JSON
		const dataToExport = {
			stats: statsData,
			frameworks: complianceData?.frameworks || [],
			exportedAt: new Date().toISOString(),
		};
		
		const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `compliance-export-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		
		toast.success('Compliance report exported successfully!');
	};

	const frameworks: ComplianceFramework[] = complianceData?.frameworks || [];

	const getStatusIcon = (status: ComplianceFramework["status"]) => {
		switch (status) {
			case "compliant":
				return <CheckCircle className="h-5 w-5 text-success" />;
			case "pending":
				return <Clock className="h-5 w-5 text-warning" />;
			case "non-compliant":
				return <AlertCircle className="h-5 w-5 text-danger" />;
		}
	};

	const getStatusColor = (status: ComplianceFramework["status"]) => {
		switch (status) {
			case "compliant":
				return "bg-success text-success-foreground";
			case "pending":
				return "bg-warning text-warning-foreground";
			case "non-compliant":
				return "bg-danger text-danger-foreground";
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
								Regulatory framework compliance and audit
								tracking
							</p>
						</div>
						<div className="flex gap-2">
							<Button 
								variant="outline" 
								onClick={handleGenerate}
								disabled={isGenerating}
							>
								{isGenerating ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Generating...
									</>
								) : (
									<>
										<Filter className="h-4 w-4 mr-2" />
										Generate Report
									</>
								)}
							</Button>
							<Button variant="default" onClick={handleExport}>
								<FileDown className="h-4 w-4 mr-2" />
								Export Report
							</Button>
						</div>
					</div>
				</header>

				{statsLoading ? (
					<div className="text-center py-8 text-muted-foreground">
						Loading compliance statistics...
					</div>
				) : statsError ? (
					<div className="text-center py-8 text-destructive">
						Failed to load compliance statistics
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{stats.map((stat, index) => (
							<StatCard key={index} {...stat} />
						))}
					</div>
				)}

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
						{complianceLoading ? (
							<div className="p-8 text-center text-muted-foreground">
								Loading compliance frameworks...
							</div>
						) : complianceError ? (
							<div className="p-8 text-center text-destructive">
								Failed to load compliance frameworks
							</div>
						) : frameworks.length === 0 ? (
							<div className="p-8 text-center text-muted-foreground">
								No compliance frameworks found. Click "Generate Report" to create one.
							</div>
						) : (
							frameworks.map((framework, index) => (
							<div key={index} className="p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3">
										{getStatusIcon(framework.status)}
										<div>
											<h3 className="font-semibold text-foreground">
												{framework.name}
											</h3>
											<p className="text-sm text-muted-foreground">
												Last audit:{" "}
												{new Date(
													framework.lastAudit
												).toLocaleDateString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
												})}
											</p>
										</div>
									</div>
									<Badge
										className={getStatusColor(
											framework.status
										)}
									>
										{framework.status.toUpperCase()}
									</Badge>
								</div>
								<div>
									<div className="flex justify-between text-sm mb-2">
										<span className="text-muted-foreground">
											Compliance Score
										</span>
										<span className="font-medium text-foreground">
											{framework.score}%
										</span>
									</div>
									<Progress
										value={framework.score}
										className="h-3"
									/>
								</div>
							</div>
						)))
						}
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
