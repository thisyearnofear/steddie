import './style.css';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { callCadenceScript } from './utils';
import { getLeaderboardScript, getLeaderboardScriptArgs } from './scripts';
import { fetchCheatFlag } from './hyperion';
import { ForteDashboard } from './forte-dashboard';

type LeaderboardData = {
    rank: number;
    name: string;
    score: number;
    cheatFlag?: number; // 0 = clean, 1 = suspect, 2 = banned, undefined = unknown
}

type LeaderboardDataRawStruct = {
    type: "Struct";
    value: {
        fields: [
            { name: "participant", value: { type: "String", value: string } },
            { name: "score", value: { type: "UFix64", value: string } },
        ],
        id: string;
    }
}

// Simulate async fetch for leaderboard data
async function fetchLeaderboardData(type: 'overall' | 'current'): Promise<Array<LeaderboardData>> {
    let res: { type: "Array"; value: Array<LeaderboardDataRawStruct> } = { type: "Array", value: [] };
    if (type === 'overall') {
        res = await callCadenceScript(getLeaderboardScript, getLeaderboardScriptArgs(undefined));
    } else {
        const now = Date.now()
        const periods = [
            { key: "week1", start: 1746316800.0, end: 1746921600.0 },
            { key: "week2", start: 1746921600.0, end: 1747526400.0 },
            { key: "week3", start: 1747526400.0, end: 1748131200.0 },
            { key: "week4", start: 1748131200.0, end: 1748736000.0 },
        ]
        const currentPeriod = periods.find((p) => now >= p.start && now <= p.end)
        if (currentPeriod) {
            res = await callCadenceScript(getLeaderboardScript, getLeaderboardScriptArgs(currentPeriod.key));
        }
    }
    const returnData: Array<Partial<LeaderboardData>> = [];
    for (const r of res.value) {
        returnData.push({
            name: r.value.fields[0].value.value,
            score: Number.parseFloat(r.value.fields[1].value.value),
        })
    }
    return returnData
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((r, i) => ({
            rank: i + 1,
            name: r.name ?? "",
            score: r.score ?? 0,
        }));
}

// Tab component
function Tabs({ tabs, current, onTabChange }: { tabs: string[]; current: string; onTabChange: (tab: string) => void }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {tabs.map((tab) => (
                <button
                    key={tab}
                    type="button"
                    style={{
                        margin: '0 1rem',
                        borderBottom: current === tab ? '2px solid #646cff' : '2px solid transparent',
                        background: 'none',
                        color: 'inherit',
                        fontWeight: current === tab ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '1.1em',
                    }}
                    onClick={() => onTabChange(tab)}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}

// Leaderboard component
function Leaderboard({ data, loading, error }: { data: Array<LeaderboardData> | null, loading: boolean, error: string | null }) {
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

function App() {
    const [tab, setTab] = useState<'Overall' | 'Current' | 'Forte'>('Forte');
    const [data, setData] = useState<Array<LeaderboardData> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userAddress, setUserAddress] = useState<string>('0xe647591c05619dba'); // Demo address

    useEffect(() => {
        if (tab === 'Forte') return; // Skip data fetching for Forte tab

        setLoading(true);
        setError(null);
        fetchLeaderboardData(tab.toLowerCase() as 'overall' | 'current').then(async (d) => {
            // For each entry, fetch cheatFlag concurrently
            const periodId = tab === 'Overall' ? 0 : 1; // you may want to enhance this logic
            const results = await Promise.all(
                d.map(async entry => {
                    let cheatFlag: number | null = null;
                    try {
                        cheatFlag = await fetchCheatFlag(entry.name, periodId);
                    } catch { /* silent fail */ }
                    return { ...entry, cheatFlag };
                })
            );
            setData(results);
            setLoading(false);
        }).catch((e) => {
            setError(e.message);
            setLoading(false);
        });
    }, [tab]);

    return (
        <div>
            <h1>🏆 Memory Leaderboard & Automation</h1>
            <Tabs tabs={['Forte', 'Overall', 'Current']} current={tab} onTabChange={(t) => setTab(t as 'Overall' | 'Current' | 'Forte')} />

            {tab === 'Forte' ? (
                <ForteDashboard userAddress={userAddress} />
            ) : (
                <Leaderboard data={data} loading={loading} error={error} />
            )}
        </div>
    );
}

const app = document.getElementById('app');
if (app) {
    render(<App />, app);
}
