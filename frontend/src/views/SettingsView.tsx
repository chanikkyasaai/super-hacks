// Cleaned single copy of SettingsView to remove duplicated/garbled content
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "super_hacks_config";

type Config = {
	SANDBOX_WS?: string;
	API_URL?: string;
	USE_DDB?: string;
	EVENTS_TABLE_NAME?: string;
	PATCHES_TABLE_NAME?: string;
	DYNAMODB_ENDPOINT_URL?: string;
	AWS_REGION?: string;
	AWS_ACCESS_KEY_ID?: string;
	AWS_SECRET_ACCESS_KEY?: string;
	SANDBOX_WAIT_SECONDS?: string;
};

export default function SettingsView() {
	const [config, setConfig] = useState<Config>({});
	import { useEffect, useState } from "react";
	import { useNavigate } from "react-router-dom";

	const STORAGE_KEY = "super_hacks_config";

	type Config = {
	    SANDBOX_WS?: string;
	    API_URL?: string;
	    USE_DDB?: string;
	    EVENTS_TABLE_NAME?: string;
	    PATCHES_TABLE_NAME?: string;
	    DYNAMODB_ENDPOINT_URL?: string;
	    AWS_REGION?: string;
	    AWS_ACCESS_KEY_ID?: string;
	    AWS_SECRET_ACCESS_KEY?: string;
	    SANDBOX_WAIT_SECONDS?: string;
	};

	export default function SettingsView() {
	    const [config, setConfig] = useState<Config>({});
	    const [includeCreds, setIncludeCreds] = useState<boolean>(false);
	    const [message, setMessage] = useState<string | null>(null);
	    const navigate = useNavigate();

	    useEffect(() => {
	        try {
	            const raw = localStorage.getItem(STORAGE_KEY);
	            if (raw) setConfig(JSON.parse(raw));
	        } catch (e) {
	            // ignore
	        }
	    }, []);

	    function setField<K extends keyof Config>(k: K, v: string) {
	        setConfig((c) => ({ ...(c || {}), [k]: v }));
	    }

	    async function saveLocal() {
	        localStorage.setItem(STORAGE_KEY, JSON.stringify(config || {}));
	        setMessage("Saved locally to browser storage.");
	        // also POST to backend so server can persist and apply
	        try {
	            const backend = config.API_URL && config.API_URL.length > 0 ? config.API_URL : "http://localhost:8080";
	            const cfgToSend = { ...(config || {}) } as any;
	            if (!includeCreds) {
	                delete cfgToSend.AWS_ACCESS_KEY_ID;
	                delete cfgToSend.AWS_SECRET_ACCESS_KEY;
	                delete cfgToSend.AWS_SESSION_TOKEN;
	            }
	            const url = backend.replace(/\/+$/, "") + "/"; // POST to root so lambda action handling receives it
	            const payload = { action: "update_config", config: cfgToSend };
	            const res = await fetch(url, {
	                method: "POST",
	                headers: { "Content-Type": "application/json" },
	                body: JSON.stringify(payload),
	            });
	            if (res.ok) {
	                const data = await res.json();
	                if (data && data.stored_secure) {
	                    setMessage("Saved locally and persisted to backend (credentials stored securely).");
	                } else {
	                    setMessage("Saved locally and persisted to backend.");
	                }
	                setTimeout(() => navigate("/"), 600);
	            } else {
	                const text = await res.text();
	                setMessage("Saved locally; backend persisted failed: " + text);
	            }
	        } catch (e: any) {
	            setMessage("Saved locally; backend persist error: " + e?.message);
	        }
	    }

	    function clearLocal() {
	        localStorage.removeItem(STORAGE_KEY);
	        setConfig({});
	        setMessage("Cleared local config.");
	    }

	    return (
	        <div className="p-6">
	            <h1 className="text-2xl font-semibold mb-4">Settings</h1>
	            <p className="mb-4">Enter integration and environment settings for your deployment.</p>

	            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
	                <label className="block">
	                    <div className="text-sm font-medium">WebSocket URL</div>
	                    <input
	                        value={config.SANDBOX_WS || ""}
	                        onChange={(e) => setField("SANDBOX_WS", e.target.value)}
	                        className="w-full px-3 py-2 border rounded"
	                        placeholder="ws://localhost:8080/ws"
	                    />
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">Backend API URL</div>
	                    <input
	                        value={config.API_URL || ""}
	                        onChange={(e) => setField("API_URL", e.target.value)}
	                        className="w-full px-3 py-2 border rounded"
	                        placeholder="http://localhost:8080"
	                    />
	                    <div className="text-xs text-muted mt-1">
	                        URL used for HTTP API calls (e.g. config). Defaults to <code>http://localhost:8080</code> for local backend.
	                    </div>
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">Use DynamoDB</div>
	                    <select value={config.USE_DDB || "false"} onChange={(e) => setField("USE_DDB", e.target.value)} className="w-full px-3 py-2 border rounded">
	                        <option value="true">true (use real DynamoDB)</option>
	                        <option value="false">false (use local fallback / dev)</option>
	                    </select>
	                    <div className="text-xs text-muted mt-1">
	                        If set to <code>true</code> the backend will attempt to write/read events using DynamoDB. If <code>false</code> the system will use local fallbacks (good for development).
	                    </div>
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">Events Table Name</div>
	                    <input value={config.EVENTS_TABLE_NAME || ""} onChange={(e) => setField("EVENTS_TABLE_NAME", e.target.value)} className="w-full px-3 py-2 border rounded" />
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">Patches Table Name</div>
	                    <input value={config.PATCHES_TABLE_NAME || ""} onChange={(e) => setField("PATCHES_TABLE_NAME", e.target.value)} className="w-full px-3 py-2 border rounded" />
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">DynamoDB Endpoint (optional)</div>
	                    <input value={config.DYNAMODB_ENDPOINT_URL || ""} onChange={(e) => setField("DYNAMODB_ENDPOINT_URL", e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="http://localhost:4566" />
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">AWS Region</div>
	                    <input value={config.AWS_REGION || ""} onChange={(e) => setField("AWS_REGION", e.target.value)} className="w-full px-3 py-2 border rounded" />
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">AWS Access Key</div>
	                    <input value={config.AWS_ACCESS_KEY_ID || ""} onChange={(e) => setField("AWS_ACCESS_KEY_ID", e.target.value)} className="w-full px-3 py-2 border rounded" />
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">AWS Secret Key</div>
	                    <input value={config.AWS_SECRET_ACCESS_KEY || ""} onChange={(e) => setField("AWS_SECRET_ACCESS_KEY", e.target.value)} className="w-full px-3 py-2 border rounded" type="password" />
	                </label>
	                <label className="block md:col-span-2">
	                    <div className="flex items-center gap-2">
	                        <input type="checkbox" checked={includeCreds} onChange={(e) => setIncludeCreds(e.target.checked)} />
	                        <div className="text-sm font-medium">Include AWS credentials in backend config</div>
	                    </div>
	                    <div className="text-xs text-muted mt-1">Only check this if you explicitly want the browser to send AWS keys to the backend. The backend will store them in SSM as SecureString.</div>
	                </label>
	                <label className="block">
	                    <div className="text-sm font-medium">Sandbox Wait Seconds</div>
	                    <input value={config.SANDBOX_WAIT_SECONDS || "120"} onChange={(e) => setField("SANDBOX_WAIT_SECONDS", e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="120" />
	                    <div className="text-xs text-muted mt-1">How long (seconds) to wait for a sandbox result before timing out. Default: 120 seconds.</div>
	                </label>
	            </div>

	            <div className="mt-6 flex gap-2">
	                <button onClick={saveLocal} className="px-4 py-2 bg-primary text-white rounded">Save</button>
	                <button onClick={clearLocal} className="px-4 py-2 border rounded">Clear</button>
	            </div>

				{message && <div className="mt-4 text-sm text-muted">{message}</div>}
			</div>
		);
	}
};