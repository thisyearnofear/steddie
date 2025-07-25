import { createPublicClient, createWalletClient, http, parseAbi, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const HYPERION_RPC_URL = process.env.HYPERION_RPC_URL || "https://hyperion-testnet.metisdevops.link";
const HYPERION_PRIVATE_KEY = process.env.HYPERION_PRIVATE_KEY || "";

const AI_ORACLE_ADDRESS = process.env.AI_ORACLE_ADDRESS || "0xYourDeployedAddressHere";

// ABI import - expects you to run `hardhat compile` in hyperion-ai-contract
const ABI_PATH = path.resolve(
  __dirname,
  "../../hyperion-ai-contract/artifacts/contracts/AIOracle.sol/AIOracle.json"
);

const abi = (() => {
  try {
    const raw = fs.readFileSync(ABI_PATH, "utf-8");
    return JSON.parse(raw).abi;
  } catch (e) {
    throw new Error("Could not read AIOracle ABI. Build contract first.");
  }
})();

export async function getPlayerSummary(player: string, periodId: number) {
  // player: hex string address (e.g., "0xabc..."), periodId: number
  // playerId is bytes32 (address left-padded to 32 bytes)
  const playerBytes32 = "0x" + player.replace(/^0x/, "").padStart(64, "0");
  const publicClient = createPublicClient({
    transport: http(HYPERION_RPC_URL),
    chain: {
      id: 133717,
      name: "HyperionTestnet",
      nativeCurrency: { name: "Test Metis", symbol: "tMETIS", decimals: 18 },
      rpcUrls: { default: { http: [HYPERION_RPC_URL] } },
    }
  });

  try {
    const data = await publicClient.readContract({
      address: AI_ORACLE_ADDRESS as `0x${string}`,
      abi,
      functionName: "getSummary",
      args: [playerBytes32, periodId],
    });
    // [int32 deltaRating, uint8 cheatFlag, bytes16 coachId]
    return {
      deltaRating: Number(data[0]),
      cheatFlag: Number(data[1]),
      coachId: data[2]
    };
  } catch (err) {
    // Not found or contract error
    return null;
  }
}

// Stub: will be used by relayer/off-chain personaliser
export async function postPlayerSummary({
  player,
  periodId,
  coachId,
  deltaRating,
  cheatFlag
}: {
  player: string,
  periodId: number,
  coachId: string, // 0x... (32 hex chars for bytes16)
  deltaRating: number,
  cheatFlag: number
}) {
  if (!HYPERION_PRIVATE_KEY) throw new Error("No HYPERION_PRIVATE_KEY set");
  const account = privateKeyToAccount(HYPERION_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: {
      id: 133717,
      name: "HyperionTestnet",
      nativeCurrency: { name: "Test Metis", symbol: "tMETIS", decimals: 18 },
      rpcUrls: { default: { http: [HYPERION_RPC_URL] } },
    },
    transport: http(HYPERION_RPC_URL),
  });

  // playerId as bytes32
  const playerBytes32 = "0x" + player.replace(/^0x/, "").padStart(64, "0");
  // coachId as bytes16 (should be 0x + 32 hex chars)
  const coachBytes16 = coachId.length === 34 ? coachId : "0x" + coachId.replace(/^0x/, "").padStart(32, "0");

  // Prepare tx
  const hash = await walletClient.writeContract({
    address: AI_ORACLE_ADDRESS as `0x${string}`,
    abi,
    functionName: "postSummary",
    args: [playerBytes32, periodId, coachBytes16, deltaRating, cheatFlag],
  });

  return hash;
}