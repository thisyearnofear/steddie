import { Base64 } from "js-base64";

const endpoint = () => {
    return process.env.FLOW_REST || "https://rest-testnet.onflow.org";
};

type CadenceJSONValue = {
    type: string;
    value: unknown;
};

export async function callCadenceScript(script: string, args: CadenceJSONValue[]) {
    const queryCodeBase64 = Base64.encode(script);
    const argsBase64 = args.map((a) => Base64.encode(JSON.stringify(a)));
    const response = await fetch(`${endpoint()}/v1/scripts?block_height=final`, {
        method: "POST",
        body: JSON.stringify({ script: queryCodeBase64, arguments: argsBase64 }),
        headers: { "content-type": "application/json" },
    });
    const resEncoded = await response.text();
    const resString = Base64.decode(resEncoded);
    return JSON.parse(resString);
}

// You may want to copy getLeaderboardScript and getLeaderboardScriptArgs from the front-end/scripts
export const getLeaderboardScript = `
import Leaderboard from 0x4fae0a028f1057ae

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
    { type: "Address", value: "0xe647591c05619dba" },
    {
        type: "Optional",
        value: typeof periodAlias === "string" ? { type: "String", value: periodAlias } : null,
    },
];