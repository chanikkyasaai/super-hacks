import ComplianceDonutChart from "@/components/ComplianceDonutChart";
import PatchQueueItem from "@/components/PatchQueueItem";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UpcomingDeployment from "@/components/UpcomingDeployment";
import { fetchAssets, fetchPatches } from "@/lib/api";
import { DeploymentItem, PatchItem, StatCardProps } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";
import { Play, RotateCcw } from "lucide-react";

const DashboardView = () => {
	const { data: assetsData } = useQuery({
		queryKey: ["assets"],
		queryFn: fetchAssets,
	});

	const assetCount = (assetsData?.assets ?? []).length;

	const stats: StatCardProps[] = [
		{
			title: "Critical Patches",
			value: "18",
			subtitle: "Requires immediate attention",
		},
		{
			title: "Compliance Score",
			value: "94%",
			subtitle: "+2% from last week",
		},
		{
			title: "Assets",
			value: String(assetCount || 0),
			subtitle: "Known devices & services",
		},
		{
			title: "Success Rate",
			value: "97.3%",
			subtitle: "Last 30 days",
		},
	];

	const { data, isLoading, error } = useQuery({
		queryKey: ["patches"],
		queryFn: fetchPatches,
	});
	// Normalize backend patch items to the frontend PatchItem shape
	const rawPatches = data?.patches ?? [];
	const patches: PatchItem[] = rawPatches.map((p: any, idx: number) => {
		// prefer patchId from backend, fall back to id or generate one
		let id = p.patchId ?? p.id ?? `patch-${idx}`;
		if (!id || id === "undefined") id = `patch-${idx}`;

		return {
			id,
			description: p.description ?? p.title ?? "",
			cve: p.cve ?? "",
			severity: (p.severity as any) ?? "LOW",
			impactScore:
				typeof p.impactScore === "number"
					? p.impactScore
					: p.impactScore
					? Number(p.impactScore)
					: 0,
		} as PatchItem;
	});

	const deployments: DeploymentItem[] = [
		{
			title: "Production Database Migration",
			time: "Today, 2:00 PM",
		},
		{
			title: "API Gateway Update v3.2.1",
			time: "Today, 4:30 PM",
		},
		{
			title: "Security Patch Rollout",
			time: "Tomorrow, 10:00 AM",
		},
		{
			title: "Frontend Build Deployment",
			time: "Tomorrow, 2:00 PM",
		},
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
								{isLoading ? (
									<div className="p-6">
										Loading patches...
									</div>
								) : error ? (
									<div className="p-6 text-destructive">
										Failed to load patches
									</div>
								) : (
									patches.map((patch, idx) => (
										<PatchQueueItem
											key={patch.id ?? idx}
											patch={patch}
										/>
									))
								)}
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
								<ComplianceDonutChart
									percentage={compliancePercentage}
								/>
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
									<UpcomingDeployment
										key={index}
										deployment={deployment}
									/>
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
