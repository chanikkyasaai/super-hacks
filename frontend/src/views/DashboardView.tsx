import ComplianceDonutChart from "@/components/ComplianceDonutChart";
import PatchQueueItem from "@/components/PatchQueueItem";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UpcomingDeployment from "@/components/UpcomingDeployment";
import {
	bulkDeploy,
	bulkRollback,
	fetchAssets,
	fetchDeployments,
	fetchPatches,
} from "@/lib/api";
import { DeploymentItem, PatchItem, StatCardProps } from "@/types/dashboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const DashboardView = () => {
	const queryClient = useQueryClient();
	
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
	const patches: PatchItem[] = rawPatches
		.map((p: any, idx: number) => {
			// prefer patchId from backend, fall back to id or generate unique one
			let id = p.patchId ?? p.id;
			// If no valid ID, generate a unique one based on index and timestamp
			if (!id || id === "undefined" || id === "null") {
				id = `patch-${Date.now()}-${idx}`;
			}

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
		})
		// Sort by impact score descending (highest priority first)
		.sort((a, b) => b.impactScore - a.impactScore);

	const { data: deploymentsData, isLoading: depLoading } = useQuery({
		queryKey: ["deployments"],
		queryFn: fetchDeployments,
	});
	const deployments: DeploymentItem[] = (
		deploymentsData?.deployments ?? []
	).map((d: any) => ({
		title: `${d.patchId ?? "-"} — ${d.message ?? "deployment"}`,
		time: d.timestamp ?? "",
	}));

	const [selected, setSelected] = useState<Record<string, boolean>>({});

	const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

	const selectAll = () => {
		const map: Record<string, boolean> = {};
		(rawPatches || []).forEach((p: any, i: number) => {
			const id = p.patchId ?? p.id ?? `patch-${i}`;
			map[id] = true;
		});
		setSelected(map);
	};

	const deploySelected = async () => {
		const ids = Object.keys(selected).filter((k) => selected[k]);
		if (!ids.length) {
			toast.error("No patches selected");
			return;
		}
		
		await toast.promise(
			bulkDeploy(ids),
			{
				loading: `Deploying ${ids.length} patch${ids.length > 1 ? 'es' : ''}...`,
				success: (data) => {
					// Refresh patches and deployments
					queryClient.invalidateQueries({ queryKey: ["patches"] });
					queryClient.invalidateQueries({ queryKey: ["deployments"] });
					setSelected({}); // Clear selection
					return `Successfully deployed ${ids.length} patch${ids.length > 1 ? 'es' : ''}!`;
				},
				error: (err) => `Deployment failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
			}
		);
	};

	const rollbackSelected = async () => {
		const ids = Object.keys(selected).filter((k) => selected[k]);
		if (!ids.length) {
			toast.error("No patches selected");
			return;
		}
		
		const reason = prompt("Reason for rollback (optional):") || undefined;
		
		await toast.promise(
			bulkRollback(ids, reason),
			{
				loading: `Rolling back ${ids.length} patch${ids.length > 1 ? 'es' : ''}...`,
				success: (data) => {
					// Refresh patches and deployments
					queryClient.invalidateQueries({ queryKey: ["patches"] });
					queryClient.invalidateQueries({ queryKey: ["deployments"] });
					setSelected({}); // Clear selection
					return `Successfully rolled back ${ids.length} patch${ids.length > 1 ? 'es' : ''}!`;
				},
				error: (err) => `Rollback failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
			}
		);
	};

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
										<Button
											size="sm"
											variant="default"
											onClick={selectAll}
										>
											Select All
										</Button>
										<Button
											size="sm"
											variant="default"
											onClick={deploySelected}
										>
											<Play className="h-4 w-4 mr-2" />
											Deploy Selected
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={rollbackSelected}
										>
											<RotateCcw className="h-4 w-4 mr-2" />
											Rollback Selected
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
									patches.map((patch, idx) => {
										const id = patch.id ?? `patch-${idx}`;
										return (
											<div
												key={id}
												className="flex items-center"
											>
												<input
													type="checkbox"
													checked={!!selected[id]}
													onChange={() => toggle(id)}
													className="m-4"
													id={`chk-${id}`}
												/>
												<div className="flex-1">
													<PatchQueueItem
														patch={patch}
													/>
												</div>
											</div>
										);
									})
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
