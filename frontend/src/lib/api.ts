export const API_BASE =
	"https://n72hgwfh6b.execute-api.us-east-1.amazonaws.com/prod";

async function unwrapResponseJson(res: Response) {
	const data = await res.json();
	// API Gateway non-proxy may return {"statusCode", "headers", "body": "<json string>"}
	if (data && typeof data.body === "string") {
		try {
			const inner = JSON.parse(data.body);
			return inner;
		} catch {
			// body wasn't JSON — return outer
		}
	}
	return data;
}

export async function fetchPatches() {
	console.log("fetching patches");
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "list_patches" }),
	});
	// console.log(await res.json());
	if (!res.ok) throw new Error("Failed to fetch patches");
	return unwrapResponseJson(res);
}

export async function runSandbox(patchId: string) {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "run_sandbox", patch_id: patchId }),
	});
	if (!res.ok) throw new Error("Sandbox run failed");
	return unwrapResponseJson(res);
}

export async function prioritize(cve_info: string) {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "prioritize", cve_info }),
	});
	if (!res.ok) throw new Error("Prioritize failed");
	return unwrapResponseJson(res);
}

export async function fetchEvents() {
	console.log("fetching events");
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "list_events" }),
	});
	console.log(await res.json());
	if (!res.ok) throw new Error("Failed to fetch events");
	return unwrapResponseJson(res);
}

export async function fetchCompliance() {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "list_compliance" }),
	});
	if (!res.ok) throw new Error("Failed to fetch compliance");
	return unwrapResponseJson(res);
}

export async function fetchAssets() {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "list_assets" }),
	});
	if (!res.ok) throw new Error("Failed to fetch assets");
	return unwrapResponseJson(res);
}

export async function deployPatch(patchId: string, scheduled_time?: string) {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: "deploy_patch",
			patch_id: patchId,
			scheduled_time,
		}),
	});
	if (!res.ok) throw new Error("Deploy failed");
	return unwrapResponseJson(res);
}

export async function rollbackPatch(patchId: string, reason?: string) {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: "rollback_patch",
			patch_id: patchId,
			reason,
		}),
	});
	if (!res.ok) throw new Error("Rollback failed");
	return unwrapResponseJson(res);
}

export async function generateCompliance(report_name?: string) {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "generate_compliance", report_name }),
	});
	if (!res.ok) throw new Error("Generate compliance failed");
	return unwrapResponseJson(res);
}

export async function fetchDeployments() {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "list_deployments" }),
	});
	if (!res.ok) throw new Error("Failed to fetch deployments");
	return unwrapResponseJson(res);
}

export async function bulkDeploy(patchIds: string[]) {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "bulk_deploy", patch_ids: patchIds }),
	});
	if (!res.ok) throw new Error("Bulk deploy failed");
	return unwrapResponseJson(res);
}

export async function bulkRollback(patchIds: string[], reason?: string) {
	const res = await fetch(`${API_BASE}/invoke`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: "bulk_rollback",
			patch_ids: patchIds,
			reason,
		}),
	});
	if (!res.ok) throw new Error("Bulk rollback failed");
	return unwrapResponseJson(res);
}
