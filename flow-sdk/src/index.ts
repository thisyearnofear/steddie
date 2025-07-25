import { Base64 } from "js-base64";

export type CadenceJSONValue = {
  type: string;
  value: unknown;
};

export type ScoreRecordJSON = {
  type: "Struct";
  value: {
    fields: [
      { name: "participant", value: { type: "String", value: string } },
      { name: "score", value: { type: "UFix64", value: string } }
    ];
    id: string;
  }
};

export async function callCadenceScript(
  script: string,
  args: CadenceJSONValue[]
): Promise<any> {
  // expects endpoint() to be passed in, or overriden in consumer
  throw new Error("callCadenceScript must be provided with endpoint logic in consumer");
}

// Default leaderboard script/args for Memoree
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