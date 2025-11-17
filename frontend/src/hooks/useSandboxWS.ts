import { MutableRefObject, useEffect, useRef, useState } from "react";

type LogEntry = {
	type: string;
	patchId?: string;
	line?: string;
	message?: string;
	timestamp?: string;
	status?: string;
	confidence?: number;
	[key: string]: any;
};

type SandboxResult = {
	status: string;
	patchId?: string;
	confidence?: number;
	[key: string]: any;
} | null;

type UseSandboxWSReturn = {
	logs: LogEntry[];
	result: SandboxResult;
	send: (obj: any) => void;
	isConnected: boolean;
	lastError?: string | null;
	logContainerRef: MutableRefObject<HTMLElement | null>;
};

/**
 * useSandboxWS
 * - Connects to a websocket URL and listens for sandbox messages.
 * - Filters incoming messages by patchId when provided.
 * - Handles reconnection with exponential backoff, keepalive pings, and exposes send().
 * - Returns a ref `logContainerRef` which, when attached to a scrolling container element,
 *   will automatically scroll to bottom on new log entries.
 */
export default function useSandboxWS(
	wsUrl?: string,
	patchId?: string
): UseSandboxWSReturn {
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [result, setResult] = useState<SandboxResult>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const shouldReconnect = useRef(true);
	const reconnectAttempts = useRef(0);
	const pingTimer = useRef<number | null>(null);
	const backoffBase = 1000; // 1s base
	const maxBackoff = 30000; // 30s

	const logContainerRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!wsUrl) return;

		shouldReconnect.current = true;

		let closedByUs = false;

		const connect = () => {
			try {
				const ws = new WebSocket(wsUrl);
				wsRef.current = ws;

				ws.onopen = () => {
					reconnectAttempts.current = 0;
					setIsConnected(true);
					setLastError(null);
					// Send a lightweight register/hello if needed
					if (patchId) {
						ws.send(JSON.stringify({ type: "subscribe", patchId }));
					}
					// start keepalive ping every 25s
					if (pingTimer.current)
						window.clearInterval(pingTimer.current);
					pingTimer.current = window.setInterval(() => {
						try {
							ws.send(
								JSON.stringify({ type: "ping", ts: Date.now() })
							);
						} catch (e) {
							// ignore
						}
					}, 25000);
				};

				ws.onmessage = (ev) => {
					try {
						const data =
							typeof ev.data === "string"
								? JSON.parse(ev.data)
								: ev.data;
						// If patchId provided, filter messages that have patchId or are global
						const incomingPatchId =
							data?.patchId ?? data?.meta?.patchId;
						if (
							patchId &&
							incomingPatchId &&
							incomingPatchId !== patchId
						) {
							return; // ignore
						}

						if (data?.type === "log") {
							const entry: LogEntry = {
								type: "log",
								patchId: incomingPatchId,
								line: data.line ?? data.message ?? "",
								timestamp: data.ts ?? new Date().toISOString(),
								...(data || {}),
							};
							setLogs((l) => [...l, entry]);
						} else if (
							data?.type === "test_result" ||
							data?.type === "result" ||
							data?.type === "sandbox_result"
						) {
							const r: SandboxResult = {
								status:
									data.status ??
									data.result ??
									data.testResult ??
									"UNKNOWN",
								patchId: incomingPatchId,
								confidence: data.confidence,
								...(data || {}),
							};
							setResult(r);
							setLogs((l) => [
								...l,
								{
									type: "result",
									...r,
									timestamp: new Date().toISOString(),
								},
							]);
						} else {
							// Generic message -> append
							setLogs((l) => [
								...l,
								{
									type: data?.type ?? "message",
									message: JSON.stringify(data),
									timestamp: new Date().toISOString(),
									...(data || {}),
								},
							]);
						}
					} catch (err: any) {
						// failed to parse message, append raw
						setLogs((l) => [
							...l,
							{
								type: "message",
								message: String(ev.data),
								timestamp: new Date().toISOString(),
							},
						]);
					}
				};

				ws.onerror = (ev) => {
					setLastError("WebSocket error");
				};

				ws.onclose = (ev) => {
					setIsConnected(false);
					if (pingTimer.current) {
						window.clearInterval(pingTimer.current);
						pingTimer.current = null;
					}
					if (!closedByUs && shouldReconnect.current) {
						// schedule reconnect
						reconnectAttempts.current += 1;
						const backoff = Math.min(
							maxBackoff,
							backoffBase * Math.pow(2, reconnectAttempts.current)
						);
						setLastError(
							`Disconnected - reconnecting in ${Math.round(
								backoff / 1000
							)}s`
						);
						setTimeout(() => connect(), backoff);
					}
				};
			} catch (err: any) {
				setLastError(String(err?.message ?? err));
				reconnectAttempts.current += 1;
				const backoff = Math.min(
					maxBackoff,
					backoffBase * Math.pow(2, reconnectAttempts.current)
				);
				setTimeout(() => connect(), backoff);
			}
		};

		connect();

		// cleanup
		return () => {
			shouldReconnect.current = false;
			closedByUs = true;
			if (pingTimer.current) {
				window.clearInterval(pingTimer.current);
				pingTimer.current = null;
			}
			try {
				wsRef.current?.close();
			} catch (e) {
				// ignore
			}
			wsRef.current = null;
		};
	}, [wsUrl, patchId]);

	// Auto-scroll when logs update
	useEffect(() => {
		if (!logContainerRef.current) return;
		try {
			const el = logContainerRef.current;
			el.scrollTop = el.scrollHeight;
		} catch (e) {
			// ignore
		}
	}, [logs]);

	const send = (obj: any) => {
		try {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				throw new Error("WebSocket not open");
			}
			wsRef.current.send(JSON.stringify(obj));
		} catch (err: any) {
			setLastError(err?.message ?? String(err));
		}
	};

	return {
		logs,
		result,
		send,
		isConnected,
		lastError,
		logContainerRef,
	};
}
