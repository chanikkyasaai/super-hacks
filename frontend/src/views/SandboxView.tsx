import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSandboxWSContext } from "@/context/SandboxWSContext";
import useSandboxWS from "@/hooks/useSandboxWS";
import { deployPatch, rollbackPatch } from "@/lib/api";
import {
	AIRecommendation as Recommendation,
	SandboxTest,
	StatCardProps,
} from "@/types/dashboard";
import { Clock, Pause, Play, X } from "lucide-react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const SandboxView = () => {
	const { patchId } = useParams<{ patchId: string }>();
	const navigate = useNavigate();

	// WS URL from Vite env (set VITE_SANDBOX_WS in dev .env or replace with actual URL)
	const WS_URL = (import.meta as any).env?.VITE_SANDBOX_WS as
		| string
		| undefined;

	// Prefer the shared WS connection from context when available to avoid multiple connections
	const ctx = useSandboxWSContext();
	const local = useSandboxWS(WS_URL, patchId);
	const {
		logs,
		result: sandboxResult,
		send,
		isConnected,
		lastError,
		logContainerRef,
	} = ctx ?? local;

	// If we're using the shared ctx (no patchId bound) then explicitly subscribe
	// to this patchId so the server will forward logs/results for it.
	const subscribedRef = useRef(false);
	useEffect(() => {
		if (!ctx) return; // only when using shared provider
		if (!patchId) return;
		if (!isConnected) return;
		if (subscribedRef.current) return;
		try {
			send({ type: "subscribe", patchId });
			subscribedRef.current = true;
			console.debug(
				"SandboxView: subscribed to patch via shared WS provider",
				patchId
			);
		} catch (e) {
			console.warn("SandboxView: failed to subscribe", e);
		}
	}, [ctx, patchId, isConnected, send]);

	const location = useLocation();
	const wantAutoRun = useRef(false);

	// When sandbox result arrives, optionally show a toast summary
	useEffect(() => {
		if (!sandboxResult) return;
		toast.success(`Sandbox result: ${sandboxResult.status}`);
	}, [sandboxResult]);

	const triggerRun = (pid?: string) => {
		if (!pid) {
			toast.error("No patch id");
			return;
		}
		if (isConnected) {
			send({ type: "run_test", patchId: pid });
			toast.success("Sandbox run requested via WebSocket");
		} else {
			toast.error("Cannot run sandbox: WebSocket not connected");
		}
	};

	// If the URL includes ?run=true, request a run when connected (or immediately if already connected)
	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const auto = params.get("run");
		if (!auto) return;
		if (!patchId) return;
		if (isConnected) {
			triggerRun(patchId);
		} else {
			wantAutoRun.current = true;
		}
	}, [location.search, isConnected, patchId]);

	useEffect(() => {
		if (wantAutoRun.current && isConnected && patchId) {
			triggerRun(patchId);
			wantAutoRun.current = false;
		}
	}, [isConnected, patchId]);

	const stats: StatCardProps[] = [
		{
			title: "Active Tests",
			value: "4",
			subtitle: "Currently running",
		},
		{
			title: "Passed Tests",
			value: "28",
			subtitle: "+3 from last run",
		},
		{
			title: "Failed Tests",
			value: "2",
			subtitle: "Requires attention",
		},
	];

	const sandboxTests: SandboxTest[] = [
		{
			name: "Authentication Module Integration Test",
			compatibility: 98,
			performance: 92,
			security: 95,
			stability: 97,
		},
		{
			name: "Database Connection Pool Test",
			compatibility: 85,
			performance: 88,
			security: 90,
			stability: 86,
		},
		{
			name: "API Gateway Load Test",
			compatibility: 94,
			performance: 78,
			security: 92,
			stability: 89,
		},
		{
			name: "Memory Leak Detection Test",
			compatibility: 91,
			performance: 95,
			security: 88,
			stability: 93,
		},
	];

	const aiRecommendations: Recommendation[] = [
		{
			patchId: patchId || "PATCH-2024-001",
			action: "DEPLOY",
			reason: "All tests passed with high scores. Security improvements validated. Minimal risk of regression.",
		},
		{
			patchId: patchId || "PATCH-2024-001",
			action: "DELAY",
			reason: "Performance tests show 12% degradation under peak load. Recommend optimization before deployment.",
		},
	];

	const handlePauseTest = (testName: string) => {
		console.log("Pausing test:", testName);
		toast.success(`Paused: ${testName}`);
	};

	const handleAbortTest = (testName: string) => {
		console.log("Aborting test:", testName);
		toast.error(`Aborted: ${testName}`);
	};

	const handleRecommendationAction = async (
		action: string,
		patchId: string
	) => {
		if (!patchId) {
			toast.error("No patch ID provided");
			return;
		}

		if (action === "DEPLOY") {
			// Prefer WebSocket-triggered runs. If WS connected send run_test, else notify user.
			if (isConnected) {
				send({ type: "run_test", patchId });
				toast.success("Sandbox run requested via WebSocket");
			} else {
				toast.error("Cannot run sandbox: WebSocket not connected");
			}
		}
	};

	const handleDeploy = async () => {
		if (!patchId) {
			toast.error("No patch ID");
			return;
		}

		// Require sandbox PASS + an AI recommendation to allow deploy
		const canDeploy =
			sandboxResult?.status === "PASS" &&
			aiRecommendations.some((r) => r.action === "DEPLOY");
		if (!canDeploy) {
			toast.error(
				"Deploy disabled: require sandbox PASS and AI recommendation to deploy."
			);
			return;
		}

		await toast.promise(deployPatch(patchId), {
			loading: `Deploying patch ${patchId}...`,
			success: (data) => {
				// Navigate back to dashboard after successful deployment
				setTimeout(() => navigate("/"), 1500);
				return `Patch ${patchId} deployed successfully!`;
			},
			error: (err) =>
				`Deployment failed: ${
					err instanceof Error ? err.message : "Unknown error"
				}`,
		});
	};

	const handleRollback = async () => {
		if (!patchId) {
			toast.error("No patch ID");
			return;
		}

		const reason = prompt("Reason for rollback (optional):") || undefined;

		await toast.promise(rollbackPatch(patchId, reason), {
			loading: `Rolling back patch ${patchId}...`,
			success: (data) => {
				// Navigate back to dashboard after successful rollback
				setTimeout(() => navigate("/"), 1500);
				return `Patch ${patchId} rolled back successfully!`;
			},
			error: (err) =>
				`Rollback failed: ${
					err instanceof Error ? err.message : "Unknown error"
				}`,
		});
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
						<div className="ml-4 flex gap-2">
							<Button
								variant="default"
								onClick={handleDeploy}
								disabled={!(sandboxResult?.status === "PASS")}
							>
								Deploy
							</Button>
							<Button variant="outline" onClick={handleRollback}>
								Rollback
							</Button>
						</div>
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
															<span className="text-muted-foreground">
																Compatibility
															</span>
															<span className="font-medium text-foreground">
																{
																	test.compatibility
																}
																%
															</span>
														</div>
														<Progress
															value={
																test.compatibility
															}
															className="h-2"
														/>
													</div>
													<div>
														<div className="flex justify-between text-sm mb-1">
															<span className="text-muted-foreground">
																Performance
															</span>
															<span className="font-medium text-foreground">
																{
																	test.performance
																}
																%
															</span>
														</div>
														<Progress
															value={
																test.performance
															}
															className="h-2"
														/>
													</div>
													<div>
														<div className="flex justify-between text-sm mb-1">
															<span className="text-muted-foreground">
																Security
															</span>
															<span className="font-medium text-foreground">
																{test.security}%
															</span>
														</div>
														<Progress
															value={
																test.security
															}
															className="h-2"
														/>
													</div>
													<div>
														<div className="flex justify-between text-sm mb-1">
															<span className="text-muted-foreground">
																Stability
															</span>
															<span className="font-medium text-foreground">
																{test.stability}
																%
															</span>
														</div>
														<Progress
															value={
																test.stability
															}
															className="h-2"
														/>
													</div>
												</div>
											</div>
										</div>
										<div className="flex gap-2 pt-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handlePauseTest(test.name)
												}
											>
												<Pause className="h-4 w-4 mr-2" />
												Pause Test
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleAbortTest(test.name)
												}
											>
												<X className="h-4 w-4 mr-2" />
												Abort
											</Button>
										</div>
									</div>
								))}
							</div>
						</Card>

						{/* Live logs / sandbox console */}
						<Card className="mt-6">
							<div className="p-6 border-b border-border bg-muted/30">
								<h2 className="text-xl font-semibold text-foreground">
									Live Sandbox Logs
								</h2>
								<p className="text-sm text-muted-foreground mt-1">
									Real-time output from the sandbox agent
								</p>
							</div>
							<div className="p-4">
								<div className="mb-3 flex items-center justify-between">
									<div className="text-sm text-muted-foreground">
										WS:{" "}
										{isConnected ? (
											<span className="text-success">
												Connected
											</span>
										) : (
											<span className="text-warning">
												Disconnected
											</span>
										)}
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												triggerRun(patchId ?? "")
											}
										>
											Run Sandbox
										</Button>
										<Button
											size="sm"
											variant="default"
											onClick={() => {
												// send a lightweight ping/run via WS if connected
												if (isConnected)
													send({
														type: "run_test",
														patchId,
													});
											}}
										>
											Trigger via WS
										</Button>
									</div>
								</div>
								<div
									ref={logContainerRef as any}
									className="h-64 overflow-auto bg-black/5 p-3 font-mono text-sm rounded"
								>
									{logs.length === 0 ? (
										<div className="text-muted-foreground">
											No logs yet. Run the sandbox to
											start streaming output.
										</div>
									) : (
										logs.map((l, i) => (
											<div
												key={i}
												className={
													l.type === "result"
														? "text-success"
														: ""
												}
											>
												<span className="text-xs text-muted-foreground mr-2">
													{new Date(
														l.timestamp ??
															Date.now()
													).toLocaleTimeString()}
												</span>
												{l.line ??
													l.message ??
													JSON.stringify(l)}
											</div>
										))
									)}
								</div>
								{sandboxResult && (
									<div className="mt-3">
										<strong>Result:</strong>{" "}
										{sandboxResult.status}{" "}
										{sandboxResult.confidence
											? ` — ${sandboxResult.confidence}%`
											: ""}
									</div>
								)}
								{lastError && (
									<div className="mt-2 text-destructive">
										{String(lastError)}
									</div>
								)}
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
								{aiRecommendations.map(
									(recommendation, index) => (
										<div
											key={index}
											className="p-6 space-y-4"
										>
											<div className="flex items-center gap-2 mb-3">
												{recommendation.action ===
												"DEPLOY" ? (
													<Play className="h-5 w-5 text-success" />
												) : (
													<Clock className="h-5 w-5 text-warning" />
												)}
												<Badge
													className={
														recommendation.action ===
														"DEPLOY"
															? "bg-success text-success-foreground"
															: "bg-warning text-warning-foreground"
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
												variant={
													recommendation.action ===
													"DEPLOY"
														? "default"
														: "outline"
												}
												onClick={() =>
													handleRecommendationAction(
														recommendation.action,
														recommendation.patchId
													)
												}
											>
												{recommendation.action ===
												"DEPLOY"
													? "Deploy Now"
													: "Schedule Later"}
											</Button>
										</div>
									)
								)}
							</div>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SandboxView;
