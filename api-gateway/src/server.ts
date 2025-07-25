import Fastify from "fastify";
import Redis from "ioredis";
import { callCadenceScript, getLeaderboardScript, getLeaderboardScriptArgs } from "./flow";
import { getPlayerSummary } from "hyperion-sdk";
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

// Fastify startup
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`api-gateway listening at ${address}`);
});