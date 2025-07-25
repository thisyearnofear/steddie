import { LeaderboardData } from "../api";

export function LeaderboardTable({ data, loading, error }: { data: Array<LeaderboardData> | null, loading: boolean, error: string | null }) {
    return (
        <table className="leaderboard-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Participant Address</th>
                    <th>Score</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {error ? (
                    <tr>
                        <td colSpan={4} style={{ color: 'red' }}>{error}</td>
                    </tr>
                ) : loading ? (
                    <tr>
                        <td colSpan={4}>Loading...</td>
                    </tr>
                ) : data && data.length > 0 ? (
                    data.map((entry) => (
                        <tr key={entry.name}>
                            <td>{entry.rank}</td>
                            <td>{entry.name}</td>
                            <td>{entry.score}</td>
                            <td>
                                {entry.cheatFlag === 0 && <span className="badge badge-clean" title="Clean">✅</span>}
                                {entry.cheatFlag === 1 && <span className="badge badge-suspect" title="Suspect">⚠</span>}
                                {entry.cheatFlag === 2 && <span className="badge badge-banned" title="Banned">❌</span>}
                                {(entry.cheatFlag === undefined || entry.cheatFlag === null) && <span className="badge badge-unknown" title="Unknown">–</span>}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={4}>No data</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}