export function Tabs({ tabs, current, onTabChange }: { tabs: string[]; current: string; onTabChange: (tab: string) => void }) {
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