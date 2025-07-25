import Fastify from "fastify";
import Redis from "ioredis";
import { callCadenceScript, getLeaderboardScript, getLeaderboardScriptArgs } from "./flow";
import { getPlayerSummary } from "hyperion-sdk";
import { relaySetMapping, recoverSigner, waitForTxMined } from "./hyperion";
import dotenv from "dotenv";
dotenv.config();

const fastify = Fastify();
const redis = new Redis(process.env.REDIS_URL);

const VITE_NETWORK = process.env.VITE_NETWORK || "testnet";
const FLOW_REST = process.env.FLOW_REST || "https://rest-testnet.onflow.org";
const HYPERION_RPC_URL = process.env.HYPERION_RPC_URL || "https://hyperion-testnet.metisdevops.link";

function getPeriodAlias(tab: string): string | undefined {
    if (tab === "current") return "week1"; // TODO: dynamic period support
    return undefined; // overall
}

fastify.get("/leaderboard", async (request, reply) => {
    const tab = (request.query as any).tab === "current" ? "current" : "overall";
    const cacheKey = `leaderboard:${tab}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
        reply.header("content-type", "application/json").send(cached);
        return;
    }

    // Fetch Flow leaderboard
    let res: { type: "Array"; value: any[] };
    try {
        res = await callCadenceScript(getLeaderboardScript, getLeaderboardScriptArgs(getPeriodAlias(tab)));
    } catch (e) {
        reply.status(500).send({ error: "Flow query failed" });
        return;
    }

    const returnData: Array<any> = [];
    for (const r of res.value) {
        returnData.push({
            name: r.value.fields[0].value.value,
            score: Number.parseFloat(r.value.fields[1].value.value),
        });
    }
    const sorted = returnData
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((r, i) => ({
            rank: i + 1,
            name: r.name ?? "",
            score: r.score ?? 0,
        }));

    // Query Hyperion for each participant (periodId: 0 for overall, 1 for current)
    const periodId = tab === "overall" ? 0 : 1;
    const rows = await Promise.all(sorted.map(async row => {
        let cheatFlag: number | null = null;
        try {
            const summary = await getPlayerSummary(row.name, periodId);
            cheatFlag = summary ? summary.cheatFlag : null;
        } catch {}
        return { ...row, cheatFlag };
    }));

    // Cache for 30s
    await redis.set(cacheKey, JSON.stringify(rows), "EX", 30);
    reply.header("content-type", "application/json").send(rows);
});

// Link address: POST /link-address { flowAddress, signature }
fastify.post("/link-address", async (request, reply) => {
    const { flowAddress, signature } = request.body as { flowAddress?: string, signature?: string };
    // Validate Flow address (lowercase hex, no 0x, 16-64 chars)
    if (!flowAddress || typeof flowAddress !== "string" || !/^[0-9a-f]{16,64}$/.test(flowAddress)) {
        reply.status(400).send({ error: "Invalid flowAddress" });
        return;
    }
    if (!signature || typeof signature !== "string") {
        reply.status(400).send({ error: "Missing signature" });
        return;
    }
    // Recover signer
    let signer;
    try {
        signer = await recoverSigner(flowAddress, signature);
    } catch (e) {
        reply.status(400).send({ error: "Invalid signature" });
        return;
    }
    // Relay tx
    let txHash;
    try {
        txHash = await relaySetMapping(flowAddress, signer);
    } catch (e) {
        reply.status(500).send({ error: "Relay failed", details: (e as Error).message });
        return;
    }
    // Optionally wait for mining here, or let client poll
    reply.send({ txHash });
});

// Optionally: add GET /tx-status?hash=... for mining poll
fastify.get("/tx-status", async (request, reply) => {
    const hash = (request.query as any).hash;
    if (!hash || typeof hash !== "string" || !hash.startsWith("0x")) {
        reply.status(400).send({ mined: false, error: "Invalid hash" });
        return;
    }
    try {
        const mined = await waitForTxMined(hash);
        reply.send({ mined });
    } catch {
        reply.send({ mined: false });
    }
});

// Fastify startup
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`api-gateway listening at ${address}`);
});