import { createWalletClient, http, recoverMessageAddress, createPublicClient } from "viem";
import dotenv from "dotenv";
dotenv.config();

const HYPERION_RPC_URL = process.env.HYPERION_RPC_URL || "https://hyperion-testnet.metisdevops.link";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;
const ADDRESS_MAPPER_ADDRESS = process.env.ADDRESS_MAPPER_ADDRESS as `0x${string}` || "0xAddressMapper";

const addressMapperAbi = [
  {
    "inputs": [
      { "internalType": "string", "name": "flowAddrLowerNo0x", "type": "string" }
    ],
    "name": "setMyMapping",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export async function relaySetMapping(flowString: string, signerAddress: string): Promise<string> {
  const walletClient = createWalletClient({
    account: RELAYER_PRIVATE_KEY,
    chain: {
      id: 133717,
      name: "HyperionTestnet",
      nativeCurrency: { name: "Test Metis", symbol: "tMETIS", decimals: 18 },
      rpcUrls: { default: { http: [HYPERION_RPC_URL] } },
    },
    transport: http(HYPERION_RPC_URL)
  });

  // Send tx from relayer, setting mapping for `signerAddress` as msg.sender
  const hash = await walletClient.writeContract({
    address: ADDRESS_MAPPER_ADDRESS,
    abi: addressMapperAbi,
    functionName: "setMyMapping",
    args: [flowString]
  });

  return hash;
}

export async function waitForTxMined(txHash: string) {
  const publicClient = createPublicClient({
    chain: {
      id: 133717,
      name: "HyperionTestnet",
      nativeCurrency: { name: "Test Metis", symbol: "tMETIS", decimals: 18 },
      rpcUrls: { default: { http: [HYPERION_RPC_URL] } },
    },
    transport: http(HYPERION_RPC_URL)
  });
  for (let i = 0; i < 30; ++i) {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null);
    if (receipt && receipt.status === "success") return true;
    await new Promise(res => setTimeout(res, 2000));
  }
  return false;
}

export async function recoverSigner(flowAddr: string, signature: string): Promise<string> {
  // EIP-191: message = "Memoree link:${flowAddr}"
  const message = `Memoree link:${flowAddr}`;
  return await recoverMessageAddress({
    message,
    signature
  });
}