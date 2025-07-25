import './style.css';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { getLeaderboard, LeaderboardData } from './api';
import { OnboardingModal } from './onboarding';



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
    const [tab, setTab] = useState<'Overall' | 'Current'>('Overall');
    const [data, setData] = useState<Array<LeaderboardData> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getLeaderboard(tab).then((d) => {
            setData(d);
            setLoading(false);
        }).catch((e) => {
            setError(e.message);
            setLoading(false);
        });
    }, [tab]);

    return (
        <div>
            <h1>Leaderboard</h1>
            <Tabs tabs={['Overall', 'Current']} current={tab} onTabChange={(t) => setTab(t as 'Overall' | 'Current')} />
            <Leaderboard data={data} loading={loading} error={error} />
        </div>
    );
}

const app = document.getElementById('app');
if (app) {
    render(
      <>
        <OnboardingModal onClose={() => {}} />
        <App />
      </>,
      app
    );
}
