import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prioritize, runSandbox } from "@/lib/api";
import { PatchItem } from "@/types/dashboard";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const PatchQueueItem = ({ patch }: { patch: PatchItem }) => {
	const getSeverityColor = (severity: PatchItem["severity"]) => {
		const colors = {
			CRITICAL: "bg-severity-critical text-white",
			HIGH: "bg-severity-high text-white",
			MEDIUM: "bg-severity-medium text-white",
			LOW: "bg-severity-low text-white",
		};
		return colors[severity];
	};

	return (
		<Link
			to={`/sandbox/${patch.id}`}
			className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors group"
		>
			<div className="flex-1 space-y-1">
				<div className="flex items-center gap-3">
					<span className="font-mono text-sm text-muted-foreground font-medium">
						{patch.id}
					</span>
					<Badge className={getSeverityColor(patch.severity)}>
						{patch.severity}
					</Badge>
				</div>
				<p className="text-sm text-foreground">{patch.description}</p>
			</div>
			<div className="ml-4 flex items-center gap-3">
				<span className="text-lg font-semibold text-primary">
					{patch.impactScore}
				</span>
				<Button
					size="sm"
					variant="outline"
					onClick={(e) => {
						// Prevent link navigation
						e.preventDefault();
						e.stopPropagation();
						const cve = (patch as any).cve || patch.id;
						prioritize(cve)
							.then((res) => {
								try {
									alert(
										`Prioritize result:\n${JSON.stringify(
											res
										)}`
									);
								} catch {
									alert("Prioritize completed");
								}
							})
							.catch((err) => {
								console.error("Prioritize error", err);
								alert("Prioritize failed: " + err.message);
							});
					}}
				>
					Prioritize
				</Button>
				<Button
					size="sm"
					variant="default"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						runSandbox(patch.id as string)
							.then((res) =>
								alert("Sandbox run: " + JSON.stringify(res))
							)
							.catch((err) =>
								alert("Sandbox error: " + err.message)
							);
					}}
				>
					Run
				</Button>
				<ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
			</div>
		</Link>
	);
};

export default PatchQueueItem;
