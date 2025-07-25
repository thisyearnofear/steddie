import './style.css';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { getLeaderboard, LeaderboardData } from './api';
import { Tabs } from './components/Tabs';
import { LeaderboardTable } from './components/LeaderboardTable';
import { OnboardingModal } from './components/OnboardingModal';





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
            <LeaderboardTable data={data} loading={loading} error={error} />
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
