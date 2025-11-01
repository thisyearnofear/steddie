import { useEffect, useState } from 'preact/hooks';
import { callCadenceScript, callCadenceTransaction } from './utils';
import { getForteStatusScript, getForteStatusScriptArgs } from './scripts';

type ForteStatus = {
    leaderboard_scheduler_initialized?: boolean;
    achievements_scheduler_initialized?: boolean;
    vrf_scheduler_initialized?: boolean;
    leaderboard_admin_found?: boolean;
    leaderboard_scheduled?: { [key: string]: number };
    achievements_scheduled?: { [key: string]: number };
    vrf_scheduled?: { [key: string]: number };
    forte_integration_status: 'fully_initialized' | 'partial' | 'planned_for_phase2' | 'base_contracts_only';
    current_timestamp: number;
    contract_address?: string;
};

type ScheduledOperation = {
    id: string;
    type: 'leaderboard' | 'achievements' | 'vrf';
    operation: string;
    transactionId: number;
    nextExecution?: number;
    status: 'active' | 'pending' | 'completed';
};

// Forte Automation Dashboard Component
export function ForteDashboard({ userAddress }: { userAddress: string }) {
    const [forteStatus, setForteStatus] = useState<ForteStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showDemo, setShowDemo] = useState(false);

    useEffect(() => {
        if (userAddress) {
            fetchForteStatus();
        }
    }, [userAddress]);

    const fetchForteStatus = async () => {
        setLoading(true);
        try {
            const result = await callCadenceScript(getForteStatusScript, getForteStatusScriptArgs(userAddress));
            const status: ForteStatus = {};

            // Parse the returned object structure
            for (const [key, value] of Object.entries(result.value)) {
                if (value.type === 'Bool') {
                    status[key as keyof ForteStatus] = value.value;
                } else if (value.type === 'Optional' && value.value) {
                    if (value.value.type === 'Dictionary') {
                        const dict: { [key: string]: number } = {};
                        for (const item of value.value.value) {
                            dict[item.key.value] = parseInt(item.value.value);
                        }
                        status[key as keyof ForteStatus] = dict;
                    }
                } else if (value.type === 'String') {
                    status[key as keyof ForteStatus] = value.value;
                } else if (value.type === 'UFix64') {
                    status[key as keyof ForteStatus] = parseFloat(value.value);
                }
            }

            setForteStatus(status);
        } catch (error) {
            console.error('Failed to fetch Forte status:', error);
        } finally {
            setLoading(false);
        }
    };

    const initializeForte = async () => {
        setActionLoading('initialize');
        try {
            await callCadenceTransaction('init-forte-integration.cdc', []);
            await fetchForteStatus(); // Refresh status
        } catch (error) {
            console.error('Failed to initialize Forte:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const manageOperation = async (action: 'cancel' | 'reschedule', operationType: string, specificOp?: string) => {
        setActionLoading(`${action}_${operationType}`);
        try {
            await callCadenceTransaction('manage-forte-operations.cdc', [
                { type: 'String', value: action },
                { type: 'String', value: operationType },
                { type: 'Optional', value: specificOp ? { type: 'String', value: specificOp } : null }
            ]);
            await fetchForteStatus(); // Refresh status
        } catch (error) {
            console.error(`Failed to ${action} ${operationType}:`, error);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusIndicatorClass = (status?: string) => {
        switch (status) {
            case 'fully_initialized': return 'active';
            case 'planned_for_phase2': return 'planned';
            case 'base_contracts_only': return 'base';
            default: return 'inactive';
        }
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'fully_initialized': return '✅';
            case 'planned_for_phase2': return '🚀';
            case 'base_contracts_only': return '📦';
            default: return '⚠️';
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case 'fully_initialized': return 'Fully Automated';
            case 'planned_for_phase2': return 'Phase 2: Forte Integration';
            case 'base_contracts_only': return 'Base Contracts Deployed';
            default: return 'Setup Required';
        }
    };

    const getScheduledOperations = (): ScheduledOperation[] => {
        const operations: ScheduledOperation[] = [];
        const currentTime = Date.now() / 1000; // Convert to seconds

        if (forteStatus?.leaderboard_scheduled) {
            Object.entries(forteStatus.leaderboard_scheduled).forEach(([op, txId]) => {
                operations.push({
                    id: `leaderboard_${op}`,
                    type: 'leaderboard',
                    operation: op,
                    transactionId: txId,
                    nextExecution: currentTime + (op === 'daily_update' ? 86400 : 604800),
                    status: 'active'
                });
            });
        }

        if (forteStatus?.achievements_scheduled) {
            Object.entries(forteStatus.achievements_scheduled).forEach(([op, txId]) => {
                operations.push({
                    id: `achievements_${op}`,
                    type: 'achievements',
                    operation: op,
                    transactionId: txId,
                    nextExecution: currentTime + 86400,
                    status: 'active'
                });
            });
        }

        if (forteStatus?.vrf_scheduled) {
            Object.entries(forteStatus.vrf_scheduled).forEach(([op, txId]) => {
                operations.push({
                    id: `vrf_${op}`,
                    type: 'vrf',
                    operation: op,
                    transactionId: txId,
                    nextExecution: currentTime + (op === 'daily_challenge' ? 86400 : 604800),
                    status: 'active'
                });
            });
        }

        return operations;
    };

    const formatTimeRemaining = (nextExecution: number) => {
        const remaining = nextExecution - (Date.now() / 1000);
        if (remaining <= 0) return 'Due now';

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (!userAddress) {
        return (
            <div className="forte-dashboard">
                <div className="forte-header">
                    <h2>🤖 Forte Automation</h2>
                    <p>Connect your wallet to access automated leaderboard features</p>
                </div>
            </div>
        );
    }

    return (
        <div className="forte-dashboard">
            <div className="forte-header">
                <h2>🤖 Forte Automation Dashboard</h2>
                <p>Flow's automated blockchain workflows - Base contracts deployed, Forte automation coming in Phase 2</p>

                <div className="forte-status">
                    <div className={`status-indicator ${getStatusIndicatorClass(forteStatus?.forte_integration_status)}`}>
                        {getStatusIcon(forteStatus?.forte_integration_status)}
                        {getStatusText(forteStatus?.forte_integration_status)}
                    </div>
                    {forteStatus?.contract_address && (
                        <div className="contract-info">
                            <small>Contract Address: {forteStatus.contract_address}</small>
                        </div>
                    )}
                </div>

                <button
                    className="demo-toggle"
                    onClick={() => setShowDemo(!showDemo)}
                >
                    {showDemo ? '🔽 Hide Demo' : '🔼 Show Demo for Judges'}
                </button>
            </div>

            {showDemo && (
                <div className="demo-section">
                    <h3>🎯 Judge Demo: Automated Blockchain Workflows</h3>
                    <div className="demo-features">
                        <div className="feature-card">
                            <h4>📦 Base Contracts Deployed</h4>
                            <p>MemoryVRF, MemoryAchievements, and MemoryLeaderboard contracts live on testnet</p>
                        </div>
                        <div className="feature-card planned">
                            <h4>🔄 Scheduled Transactions (Phase 2)</h4>
                            <p>Contracts will execute automatically at future times without manual triggers</p>
                        </div>
                        <div className="feature-card planned">
                            <h4>⚡ Cross-Contract Automation (Phase 2)</h4>
                            <p>Atomic operations across multiple contracts in single transactions</p>
                        </div>
                        <div className="feature-card">
                            <h4>🎮 Manual Game Features</h4>
                            <p>Currently manual: leaderboard updates, achievement minting, VRF requests</p>
                        </div>
                    </div>
                </div>
            )}

            {forteStatus?.forte_integration_status === 'base_contracts_only' ? (
                <div className="forte-setup">
                    <h3>📦 Base Contracts Successfully Deployed</h3>
                    <p>Your contracts are live on Flow Testnet at address {forteStatus.contract_address}:</p>
                    <ul>
                        <li>🏆 MemoryLeaderboard: Competition management system</li>
                        <li>🎲 MemoryVRF: Verifiable randomness for games</li>
                        <li>🎨 MemoryAchievements: Cultural NFT achievements</li>
                        <li>🫁 ImperfectBreath: Additional utility contract</li>
                    </ul>

                    <div className="phase-info">
                        <h4>🚀 Phase 2: Forte Automation (Coming Soon)</h4>
                        <p>Next phase will add automated workflows:</p>
                        <ul>
                            <li>📅 Scheduled daily leaderboard updates</li>
                            <li>🏆 Automatic achievement minting</li>
                            <li>🎲 Periodic VRF requests for challenges</li>
                            <li>🧹 Automated cleanup operations</li>
                        </ul>
                    </div>

                    <div className="contract-links">
                        <a href={`https://flowscan.org/contract/${forteStatus.contract_address}`} target="_blank" rel="noopener noreferrer">
                            🔍 View Contracts on Flowscan
                        </a>
                    </div>
                </div>
            ) : !forteStatus?.leaderboard_scheduler_initialized ||
                !forteStatus?.achievements_scheduler_initialized ||
                !forteStatus?.vrf_scheduler_initialized ? (
                <div className="forte-setup">
                    <h3>🚀 Enable Automation</h3>
                    <p>Transform your leaderboard experience with automated workflows:</p>
                    <ul>
                        <li>📅 Daily ranking updates (no manual refreshing needed)</li>
                        <li>🏆 Automatic achievement NFT minting for top performers</li>
                        <li>🎲 Periodic randomness generation for challenges</li>
                        <li>🧹 Weekly cleanup of inactive participants</li>
                    </ul>

                    <button
                        className="forte-init-btn"
                        onClick={initializeForte}
                        disabled={actionLoading === 'initialize'}
                    >
                        {actionLoading === 'initialize' ? '🔄 Initializing...' : '⚡ Enable Forte Automation'}
                    </button>
                </div>
            ) : (
                <div className="forte-operations">
                    <h3>⚙️ Active Automations</h3>

                    {getScheduledOperations().map((op) => (
                        <div key={op.id} className="operation-card">
                            <div className="operation-header">
                                <div className="operation-info">
                                    <span className={`operation-type ${op.type}`}>
                                        {op.type === 'leaderboard' && '📊'}
                                        {op.type === 'achievements' && '🏆'}
                                        {op.type === 'vrf' && '🎲'}
                                        {op.operation.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span className="operation-timer">
                                        Next: {op.nextExecution ? formatTimeRemaining(op.nextExecution) : 'Unknown'}
                                    </span>
                                </div>
                                <div className="operation-controls">
                                    <button
                                        className="btn-cancel"
                                        onClick={() => manageOperation('cancel', op.type, op.operation)}
                                        disabled={actionLoading === `cancel_${op.type}`}
                                    >
                                        {actionLoading === `cancel_${op.type}` ? '⏳' : '❌'}
                                    </button>
                                    <button
                                        className="btn-reschedule"
                                        onClick={() => manageOperation('reschedule', op.type)}
                                        disabled={actionLoading === `reschedule_${op.type}`}
                                    >
                                        {actionLoading === `reschedule_${op.type}` ? '⏳' : '🔄'}
                                    </button>
                                </div>
                            </div>
                            <div className="operation-details">
                                <small>Transaction ID: {op.transactionId}</small>
                            </div>
                        </div>
                    ))}

                    <div className="automation-benefits">
                        <h4>🎉 Automation Benefits</h4>
                        <div className="benefits-grid">
                            <div className="benefit">
                                <span className="benefit-icon">⚡</span>
                                <span>Zero manual maintenance</span>
                            </div>
                            <div className="benefit">
                                <span className="benefit-icon">🎯</span>
                                <span>Reliable execution timing</span>
                            </div>
                            <div className="benefit">
                                <span className="benefit-icon">🔒</span>
                                <span>Atomic cross-contract operations</span>
                            </div>
                            <div className="benefit">
                                <span className="benefit-icon">📈</span>
                                <span>Scalable without manual intervention</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .forte-dashboard {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 2rem;
                    border-radius: 12px;
                    margin: 2rem 0;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                }

                .forte-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .forte-header h2 {
                    margin: 0 0 0.5rem 0;
                    font-size: 2.5rem;
                    background: linear-gradient(45deg, #ffd700, #ff6b6b);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .forte-status {
                    margin: 1rem 0;
                }

                .status-indicator {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 25px;
                    font-weight: bold;
                    font-size: 1.1rem;
                }

                .status-indicator.active {
                    background: rgba(34, 197, 94, 0.2);
                    border: 2px solid #22c55e;
                }

                .status-indicator.inactive {
                    background: rgba(251, 191, 36, 0.2);
                    border: 2px solid #fbbf24;
                }

                .demo-toggle {
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }

                .demo-toggle:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.5);
                }

                .demo-section {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin: 1.5rem 0;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .demo-features {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .feature-card {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .feature-card h4 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.2rem;
                }

                .feature-card p {
                    margin: 0;
                    font-size: 0.9rem;
                    opacity: 0.9;
                }

                .forte-setup {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    text-align: center;
                }

                .forte-setup ul {
                    text-align: left;
                    display: inline-block;
                    margin: 1rem 0;
                }

                .forte-setup li {
                    margin: 0.5rem 0;
                    font-size: 1.1rem;
                }

                .forte-init-btn {
                    background: linear-gradient(45deg, #22c55e, #16a34a);
                    border: none;
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 8px;
                    font-size: 1.2rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
                }

                .forte-init-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
                }

                .forte-init-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .forte-operations {
                    margin-top: 2rem;
                }

                .operation-card {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    margin: 0.5rem 0;
                }

                .operation-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .operation-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .operation-type {
                    font-weight: bold;
                    font-size: 1.1rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    display: inline-block;
                    width: fit-content;
                }

                .operation-type.leaderboard {
                    background: rgba(59, 130, 246, 0.3);
                    border: 1px solid rgba(59, 130, 246, 0.5);
                }

                .operation-type.achievements {
                    background: rgba(245, 158, 11, 0.3);
                    border: 1px solid rgba(245, 158, 11, 0.5);
                }

                .operation-type.vrf {
                    background: rgba(139, 69, 19, 0.3);
                    border: 1px solid rgba(139, 69, 19, 0.5);
                }

                .operation-timer {
                    font-size: 0.9rem;
                    opacity: 0.8;
                }

                .operation-controls {
                    display: flex;
                    gap: 0.5rem;
                }

                .btn-cancel, .btn-reschedule {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 0.5rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-cancel:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.5);
                }

                .btn-reschedule:hover {
                    background: rgba(59, 130, 246, 0.2);
                    border-color: rgba(59, 130, 246, 0.5);
                }

                .btn-cancel:disabled, .btn-reschedule:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .operation-details {
                    margin-top: 0.5rem;
                    font-size: 0.8rem;
                    opacity: 0.7;
                }

                .automation-benefits {
                    margin-top: 2rem;
                    text-align: center;
                }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .benefit {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    font-size: 0.9rem;
                }

                .benefit-icon {
                    font-size: 1.2rem;
                }

                @media (max-width: 768px) {
                    .forte-dashboard {
                        padding: 1rem;
                        margin: 1rem 0;
                    }

                    .forte-header h2 {
                        font-size: 2rem;
                    }

                    .demo-features {
                        grid-template-columns: 1fr;
                    }

                    .operation-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }

                    .benefits-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
