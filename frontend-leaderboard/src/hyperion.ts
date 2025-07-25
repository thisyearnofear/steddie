import { getPlayerSummary } from "hyperion-sdk";

const HYPERION_RPC_URL = import.meta.env.VITE_HYPERION_RPC_URL || "https://hyperion-testnet.metisdevops.link";

// periodId: 0 for overall, or a number for current period
export async function fetchCheatFlag(address: string, periodId: number = 0): Promise<number | null> {
  try {
    const result = await getPlayerSummary(address, periodId);
    // cheatFlag: 0=clean, 1=suspect, 2=banned
    return result ? result.cheatFlag : null;
  } catch {
    return null;
  }
}