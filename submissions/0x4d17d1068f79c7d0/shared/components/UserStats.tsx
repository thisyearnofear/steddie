"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";
import {
  progressService,
  UserStats,
  Achievement,
  LeaderboardEntry,
} from "../services/progressService";
import { Trophy, Target, Clock, Zap, Star, Medal } from "lucide-react";

interface UserStatsProps {
  gameType?: string;
  showLeaderboard?: boolean;
}

export function UserStatsComponent({
  gameType = "random_palace",
  showLeaderboard = true,
}: UserStatsProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "stats" | "achievements" | "leaderboard"
  >("stats");

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [userStats, userAchievements, gameLeaderboard] = await Promise.all([
        progressService.getUserStats(user.id),
        progressService.getUserAchievements(user.id),
        showLeaderboard
          ? progressService.getLeaderboard(gameType, "all_time", 10)
          : Promise.resolve([]),
      ]);

      setStats(userStats);
      setAchievements(userAchievements);
      setLeaderboard(gameLeaderboard);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getGameTypeDisplay = (type: string): string => {
    const gameNames: Record<string, string> = {
      random_palace: "Random Palace",
      chaos_cards: "Chaos Cards",
      entropy_storytelling: "Entropy Stories",
      memory_race: "Memory Race",
      digit_duel: "Digit Duel",
      story_chain: "Story Chain",
    };
    return gameNames[type] || type;
  };

  if (loading) {
    return (
      <div className="w-full p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Anonymous user placeholder
  if (!user) {
    return (
      <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: "stats", label: "Stats", icon: Target },
            { id: "achievements", label: "Achievements", icon: Medal },
            ...(showLeaderboard
              ? [{ id: "leaderboard", label: "Leaderboard", icon: Trophy }]
              : []),
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === id
                  ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Anonymous Content */}
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">🎮</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Sign in to track your progress
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Create an account to save your stats, earn achievements, and compete
            on leaderboards.
          </p>
          <div className="space-y-2 text-xs text-gray-500">
            <div>✅ Track your memory training progress</div>
            <div>✅ Earn cultural achievement badges</div>
            <div>✅ Compete with other memory athletes</div>
            <div>✅ Access advanced memory techniques</div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <p className="text-gray-600 text-center">
          No stats available yet. Play some games to see your progress!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "stats", label: "Stats", icon: Target },
          { id: "achievements", label: "Achievements", icon: Medal },
          ...(showLeaderboard
            ? [{ id: "leaderboard", label: "Leaderboard", icon: Trophy }]
            : []),
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === id
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                📊 Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {stats.total_sessions}
                  </div>
                  <div className="text-xs text-blue-800">Games</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-600">
                    {stats.average_accuracy.toFixed(0)}%
                  </div>
                  <div className="text-xs text-green-800">Accuracy</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {stats.best_score}
                  </div>
                  <div className="text-xs text-purple-800">Best</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-orange-600">
                    {stats.current_streak}
                  </div>
                  <div className="text-xs text-orange-800">Streak</div>
                </div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 p-2 rounded text-center">
                  <div className="font-medium">
                    {formatTime(stats.total_practice_time)}
                  </div>
                  <div className="text-gray-600">Time</div>
                </div>
                <div className="bg-gray-50 p-2 rounded text-center">
                  <div className="font-medium">{stats.achievements_count}</div>
                  <div className="text-gray-600">Badges</div>
                </div>
              </div>
            </div>

            {stats.recent_sessions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  📈 Recent
                </h4>
                <div className="space-y-1">
                  {stats.recent_sessions.slice(0, 3).map((session, index) => (
                    <div
                      key={session.id || index}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs"
                    >
                      <div className="truncate">
                        <div className="font-medium">{session.score}pts</div>
                        <div className="text-gray-600">
                          {session.accuracy.toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-gray-500">
                        {new Date(session.created_at!).toLocaleDateString(
                          "en",
                          { month: "short", day: "numeric" }
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">🏆 Badges</h3>
            {achievements.length === 0 ? (
              <p className="text-gray-600 text-center py-6 text-sm">
                No achievements yet. Keep playing to unlock them!
              </p>
            ) : (
              <div className="space-y-3">
                {/* Earned Achievements - Just Emojis */}
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">
                    Earned
                  </h4>
                  <div className="flex flex-wrap gap-1 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    {achievements.slice(0, 10).map((achievement, index) => (
                      <div
                        key={achievement.id || index}
                        className="text-lg hover:scale-110 transition-transform cursor-pointer"
                        title={`${achievement.achievement_name} (+${
                          achievement.points
                        } pts) - ${new Date(
                          achievement.unlocked_at!
                        ).toLocaleDateString()}`}
                      >
                        {achievement.icon}
                      </div>
                    ))}
                    {achievements.length > 10 && (
                      <div className="text-xs text-gray-500 self-center ml-1">
                        +{achievements.length - 10} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Available by Game Type */}
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">
                    Available
                  </h4>
                  <div className="space-y-2">
                    {/* Chaos Cards Achievements */}
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-xs font-medium text-blue-800">
                        Chaos Cards:
                      </span>
                      <div className="flex gap-1">
                        <span title="Memory Champion - Reach 7+ cards">🧠</span>
                        <span title="Progression Master - Advance 3+ levels">
                          📈
                        </span>
                        <span title="Sequence Master - 5 perfect rounds">
                          🔗
                        </span>
                      </div>
                    </div>

                    {/* Speed Challenge Achievements */}
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-xs font-medium text-green-800">
                        Speed Challenge:
                      </span>
                      <div className="flex gap-1">
                        <span title="Speed Demon - Score 50+ points">🚀</span>
                        <span title="Lightning Reflexes - 20 correct answers">
                          ⚡
                        </span>
                      </div>
                    </div>

                    {/* Universal Achievements */}
                    <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
                      <span className="text-xs font-medium text-purple-800">
                        All Games:
                      </span>
                      <div className="flex gap-1">
                        <span title="Perfect Memory - 100% accuracy">🌟</span>
                        <span title="Memory Athlete - 90%+ accuracy 10 times">
                          🏆
                        </span>
                        <span title="The Challenger - Try different difficulties">
                          🎯
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Achievement Summary */}
                <div className="text-xs text-gray-600 text-center">
                  {achievements.length} achievement
                  {achievements.length !== 1 ? "s" : ""} earned •{" "}
                  {achievements.reduce((sum, a) => sum + (a.points || 0), 0)}{" "}
                  total points
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && showLeaderboard && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {getGameTypeDisplay(gameType)} Leaderboard
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No leaderboard data available yet.
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      entry.user_id === user?.id
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-400 text-yellow-900"
                            : index === 1
                            ? "bg-gray-300 text-gray-700"
                            : index === 2
                            ? "bg-orange-400 text-orange-900"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {entry.display_name || entry.username}
                          {entry.user_id === user?.id && (
                            <span className="text-blue-600 ml-1">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {entry.total_sessions} games •{" "}
                          {entry.average_accuracy.toFixed(1)}% avg
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.score}</div>
                      <div className="text-xs text-gray-600">best score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
