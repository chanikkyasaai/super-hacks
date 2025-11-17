import useSandboxWS from "@/hooks/useSandboxWS";
import React, { createContext, useContext } from "react";

type SandboxWSValue = ReturnType<typeof useSandboxWS> | null;

const SandboxWSContext = createContext<SandboxWSValue>(null);

export const SandboxWSProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	// Read Vite env var here so the provider attempts to connect on app start
	const WS_URL = (import.meta as any).env?.VITE_SANDBOX_WS as
		| string
		| undefined;
	const value = useSandboxWS(WS_URL, undefined);
	return (
		<SandboxWSContext.Provider value={value}>
			{children}
		</SandboxWSContext.Provider>
	);
};

export function useSandboxWSContext() {
	const ctx = useContext(SandboxWSContext);
	return ctx;
}

export default SandboxWSContext;
