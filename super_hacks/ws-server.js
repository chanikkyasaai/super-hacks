// Lightweight WebSocket server for prototype sandbox orchestration
// Usage: node ws-server.js
// Requires: npm install ws aws-sdk

const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const AWS = (() => {
	try {
		return require("aws-sdk");
	} catch (e) {
		return null;
	}
})();

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "ws-events.log");
const USE_DDB = (process.env.USE_DDB || "false").toLowerCase() === "true";
const EVENTS_TABLE =
	process.env.IPO_EVENTS_TABLE || process.env.EVENTS_TABLE || "IPO-Events";

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const wss = new WebSocket.Server({ port: PORT }, () => {
	console.log(`[ws-server] Listening on ws://localhost:${PORT}`);
});

// clients: map agentId -> { conn, connectionId }
const clients = new Map();
// subscribers: map connectionId -> { conn, patchId }
const subscribers = new Map();

function writeLog(obj) {
	const line = JSON.stringify({ ts: new Date().toISOString(), ...obj });
	fs.appendFile(LOG_FILE, line + "\n", (err) => {
		if (err) console.error("[ws-server] Failed to write log", err);
	});
}

async function writeDDB(item) {
	if (!USE_DDB) return false;
	if (!AWS) {
		console.error("[ws-server] aws-sdk not available, cannot write to DDB");
		return false;
	}
	try {
		const ddb = new AWS.DynamoDB.DocumentClient({
			region: process.env.AWS_REGION || "us-east-1",
		});
		const put = await ddb
			.put({ TableName: EVENTS_TABLE, Item: item })
			.promise();
		return true;
	} catch (e) {
		console.error("[ws-server] DynamoDB write failed", e);
		return false;
	}
}

function safeSend(ws, obj) {
	try {
		ws.send(JSON.stringify(obj));
	} catch (e) {
		console.error("[ws-server] send failed", e);
	}
}

function generateConnectionId() {
	return Math.random().toString(36).slice(2, 10);
}

wss.on("connection", (ws, req) => {
	const connectionId = generateConnectionId();
	ws._connectionId = connectionId;
	ws._agentId = null;
	console.log(
		`[ws-server] connection ${connectionId} established from ${req.socket.remoteAddress}`
	);

	ws.on("message", async (data) => {
		let msg = null;
		try {
			msg = JSON.parse(data.toString());
		} catch (e) {
			console.warn(
				"[ws-server] invalid json from client",
				data.toString()
			);
			return;
		}
		console.log(`[ws-server] recv from ${connectionId}:`, msg);
		writeLog({ direction: "in", connectionId, msg });

		// registration (agent)
		if (msg && msg.type === "register" && msg.agentId) {
			ws._agentId = msg.agentId;
			clients.set(msg.agentId, { conn: ws, connectionId });
			console.log(
				`[ws-server] agent registered: ${msg.agentId} (conn=${connectionId})`
			);
			writeLog({ event: "register", agentId: msg.agentId, connectionId });
			return;
		}

		// subscription (browser/client asks to subscribe to a patchId)
		if (msg && msg.type === "subscribe" && msg.patchId) {
			subscribers.set(connectionId, { conn: ws, patchId: msg.patchId });
			console.log(
				`[ws-server] subscriber ${connectionId} subscribed to patch ${msg.patchId}`
			);
			writeLog({
				event: "subscribe",
				connectionId,
				patchId: msg.patchId,
			});
			return;
		}

		// run request from UI -> forward to all agents (or could implement agent selection)
		if (msg && msg.type === "run_test") {
			console.log(
				`[ws-server] run_test request from ${connectionId} for patch ${msg.patchId}`
			);
			writeLog({
				event: "run_test_request",
				connectionId,
				patchId: msg.patchId,
				payload: msg,
			});
			for (const [agentId, entry] of clients.entries()) {
				try {
					safeSend(entry.conn, msg);
					writeLog({ direction: "out", toAgent: agentId, msg });
				} catch (e) {
					console.error(
						"[ws-server] failed to forward run_test to agent",
						agentId,
						e
					);
				}
			}
			return;
		}

		// persist certain messages to DDB or log and forward to subscribers
		if (msg && (msg.type === "test_result" || msg.type === "log")) {
			const item = {
				eventId: msg.eventId || Math.random().toString(36).slice(2),
				type: msg.type,
				patchId: msg.patchId || null,
				agentId: ws._agentId || null,
				payload: msg,
				timestamp: new Date().toISOString(),
			};
			writeLog({ event: "ddb_write_attempt", item });
			if (USE_DDB) {
				await writeDDB(item);
			}

			// Forward message to subscribers whose patchId matches (or to all subscribers if msg.patchId is falsy)
			try {
				const targetPatch = msg.patchId || null;
				for (const [cid, sub] of subscribers.entries()) {
					try {
						if (!sub || !sub.conn) continue;
						if (!targetPatch || sub.patchId === targetPatch) {
							safeSend(sub.conn, msg);
							writeLog({ direction: "out", to: cid, msg });
						}
					} catch (e) {
						console.error(
							"[ws-server] failed to forward to subscriber",
							cid,
							e
						);
					}
				}
			} catch (e) {
				console.error("[ws-server] forwarding error", e);
			}
		}
	});

	ws.on("close", () => {
		console.log(
			`[ws-server] connection ${connectionId} closed (agent=${ws._agentId})`
		);
		writeLog({ event: "disconnect", connectionId, agentId: ws._agentId });
		if (ws._agentId) clients.delete(ws._agentId);
		// remove subscriber if present
		if (subscribers.has(connectionId)) {
			subscribers.delete(connectionId);
			console.log(`[ws-server] removed subscriber ${connectionId}`);
		}
	});

	ws.on("error", (err) => {
		console.error("[ws-server] socket error", err);
	});
});

// Simple CLI loop for sending messages to agents
const readline = require("readline");
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "ws> ",
});
rl.prompt();
rl.on("line", (line) => {
	const raw = line.trim();
	if (!raw) {
		rl.prompt();
		return;
	}
	const parts = raw.split(" ");
	if (parts[0] === "send" && parts.length >= 3) {
		const agentId = parts[1];
		const rest = raw.slice(raw.indexOf(agentId) + agentId.length).trim();
		try {
			const obj = JSON.parse(rest);
			const entry = clients.get(agentId);
			if (!entry) {
				console.log("[ws-server] agent not connected:", agentId);
				rl.prompt();
				return;
			}
			safeSend(entry.conn, obj);
			writeLog({ direction: "out", agentId, obj });
			console.log("[ws-server] sent");
		} catch (e) {
			console.error("[ws-server] invalid json payload", e);
		}
	} else if (parts[0] === "list") {
		console.log("connected agents:", Array.from(clients.keys()));
	} else if (parts[0] === "help") {
		console.log("Commands: send <agentId> <json>   | list | help | exit");
	} else if (parts[0] === "exit" || parts[0] === "quit") {
		console.log("Shutting down...");
		rl.close();
		process.exit(0);
	} else {
		console.log("Unknown command. Type help");
	}
	rl.prompt();
});

process.on("SIGINT", () => {
	console.log("SIGINT received. Closing server...");
	wss.close(() => {
		console.log("Server closed");
		process.exit(0);
	});
});

// Exported for tests
module.exports = { wss, clients };
