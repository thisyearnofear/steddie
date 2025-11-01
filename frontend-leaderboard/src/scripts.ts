// Deployed contract addresses on Flow Testnet
const CONTRACT_ADDRESSES = {
    testnet: "0xb8404e09b36b6623",
    mainnet: "0xMAINNET_ADDRESS_PLACEHOLDER" // Update when deployed to mainnet
};

const network = import.meta.env.VITE_NETWORK || "testnet";
const contractAddress = CONTRACT_ADDRESSES[network as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES.testnet;

export const getLeaderboardScript = `
import Leaderboard from ${contractAddress}

access(all)
fun main(
  admin: Address,
  periodAlias: String?,
): [Leaderboard.ScoreRecord] {
  if let adminRef = Leaderboard.borrowLeaderboardAdmin(admin) {
return adminRef.getLeaderboardByPeriodAlias(periodAlias)
}
return []
}
`;

export const getLeaderboardScriptArgs = (periodAlias: string | undefined) => [
    { type: "Address", value: network === "mainnet" ? "0xb56e8d0d805eebf8" : "0xe647591c05619dba" },
    {
        type: "Optional",
        value: typeof periodAlias === "string" ? { type: "String", value: periodAlias } : null,
    },
];

// Forte Status Script - Updated for deployed contracts
export const getForteStatusScript = `
import Leaderboard from ${contractAddress}

access(all)
fun main(userAddress: Address): {String: AnyStruct} {
let status: {String: AnyStruct} = {}

    // Check if Forte features are available (will be false for base deployment)
if let leaderboardAdminRef = Leaderboard.borrowLeaderboardAdmin(userAddress) {
// Try to access Forte-specific fields (will fail if not enhanced)
status["leaderboard_admin_found"] = true

// For now, Forte features are planned for Phase 2
status["forte_integration_status"] = "planned_for_phase2"
    } else {
status["leaderboard_admin_found"] = false
    status["forte_integration_status"] = "base_contracts_only"
    }

status["leaderboard_scheduler_initialized"] = false
status["achievements_scheduler_initialized"] = false
status["vrf_scheduler_initialized"] = false
status["current_timestamp"] = getCurrentBlock().timestamp
status["contract_address"] = "${contractAddress}"

    return status
}
`;

export const getForteStatusScriptArgs = (userAddress: string) => [
    { type: "Address", value: userAddress },
];
