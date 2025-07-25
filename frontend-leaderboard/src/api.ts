export type LeaderboardData = {
  rank: number;
  name: string;
  score: number;
  cheatFlag?: number;
};

export async function getLeaderboard(tab: 'overall' | 'current'): Promise<LeaderboardData[]> {
  const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/leaderboard?tab=${tab}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return await res.json();
}