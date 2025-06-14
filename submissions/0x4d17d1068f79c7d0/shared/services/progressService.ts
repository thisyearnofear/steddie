import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface GameSession {
  id?: string;
  user_id: string;
  game_type: string;
  score: number;
  max_possible_score: number;
  accuracy: number;
  items_count: number;
  duration_seconds: number;
  difficulty_level: number;
  session_data: any;
  created_at?: string;
}

export interface UserStats {
  total_sessions: number;
  average_score: number;
  average_accuracy: number;
  total_practice_time: number;
  best_score: number;
  favorite_game: string;
  recent_sessions: GameSession[];
  achievements_count: number;
  current_streak: number;
}

export interface Achievement {
  id?: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  icon: string;
  points: number;
  nft_token_id?: string;
  metadata: any;
  unlocked_at?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  score: number;
  rank: number;
  total_sessions: number;
  average_accuracy: number;
}

class ProgressService {
  private supabase = createClientComponentClient();

  // Save a game session
  async saveGameSession(session: Omit<GameSession, 'id' | 'created_at'>): Promise<GameSession | null> {
    try {
      // Use game_sessions table instead of practice_sessions
      const sessionData = {
        ...session,
        session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        difficulty_level: session.difficulty_level || 1,
        perfect_game: session.accuracy >= 100,
        completed_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('game_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      // Check for new achievements after saving session
      await this.checkAndUnlockAchievements(session.user_id, session);

      return data;
    } catch (error) {
      console.error('Error saving game session:', error);
      return null;
    }
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      // Check if Supabase client is available
      if (!this.supabase) {
        console.warn('Supabase client not available for user stats');
        return this.getDefaultUserStats();
      }

      // Get basic session stats from game_sessions table
      const { data: sessions, error: sessionsError } = await this.supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.warn('Error fetching user sessions:', sessionsError.message);
        return this.getDefaultUserStats();
      }

      // Get achievements count with error handling
      let achievementsCount = 0;
      try {
        const { count, error: achievementsError } = await this.supabase
          .from('achievements')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (achievementsError) {
          console.warn('Error fetching achievements count:', achievementsError.message);
        } else {
          achievementsCount = count || 0;
        }
      } catch (achievementError) {
        console.warn('Error in achievements query:', achievementError);
      }

      if (!sessions || sessions.length === 0) {
        return {
          total_sessions: 0,
          average_score: 0,
          average_accuracy: 0,
          total_practice_time: 0,
          best_score: 0,
          favorite_game: '',
          recent_sessions: [],
          achievements_count: achievementsCount,
          current_streak: 0,
        };
      }

      // Calculate statistics
      const totalSessions = sessions.length;
      const averageScore = sessions.reduce((sum, s) => sum + s.score, 0) / totalSessions;
      const averageAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions;
      const totalPracticeTime = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
      const bestScore = Math.max(...sessions.map(s => s.score));

      // Find favorite game (most played)
      const gameTypeCounts = sessions.reduce((acc, s) => {
        acc[s.game_type] = (acc[s.game_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const favoriteGame = Object.entries(gameTypeCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '';

      // Calculate current streak (consecutive days with sessions)
      const currentStreak = this.calculateStreak(sessions);

      return {
        total_sessions: totalSessions,
        average_score: Math.round(averageScore * 100) / 100,
        average_accuracy: Math.round(averageAccuracy * 100) / 100,
        total_practice_time: totalPracticeTime,
        best_score: bestScore,
        favorite_game: favoriteGame,
        recent_sessions: sessions.slice(0, 10),
        achievements_count: achievementsCount,
        current_streak: currentStreak,
      };
    } catch (error) {
      console.warn('Error getting user stats:', error);
      return this.getDefaultUserStats();
    }
  }

  // Get default user stats when data is not available
  private getDefaultUserStats(): UserStats {
    return {
      total_sessions: 0,
      average_score: 0,
      average_accuracy: 0,
      total_practice_time: 0,
      best_score: 0,
      favorite_game: '',
      recent_sessions: [],
      achievements_count: 0,
      current_streak: 0,
    };
  }

  // Get leaderboard for a specific game type - SIMPLIFIED (unified with LeaderboardService)
  async getLeaderboard(gameType: string, period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time', limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      // Use only the existing leaderboards table (no more dual table complexity)
      const { data, error } = await this.supabase
        .from('leaderboards')
        .select(`
          user_id,
          score,
          rank,
          total_sessions,
          average_accuracy
        `)
        .eq('game_type', gameType)
        .eq('period', period)
        .order('score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map((entry: any, index: number) => ({
        user_id: entry.user_id,
        username: entry.user_id.substring(0, 8) + '...', // Simple username
        display_name: `Player ${index + 1}`, // Simple display name
        avatar_url: undefined,
        score: entry.score,
        rank: entry.rank || index + 1, // Use stored rank or calculate
        total_sessions: entry.total_sessions || 0,
        average_accuracy: entry.average_accuracy || 0,
      })) || [];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Get user achievements
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const { data, error } = await this.supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  // Get recent game sessions for a user
  async getRecentSessions(userId: string, limit: number = 10): Promise<GameSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      return [];
    }
  }

  // Check and unlock achievements based on session data
  private async checkAndUnlockAchievements(userId: string, session: GameSession): Promise<void> {
    try {
      const stats = await this.getUserStats(userId);
      if (!stats) return;

      const newAchievements: Omit<Achievement, 'id' | 'unlocked_at'>[] = [];

      // First game achievement
      if (stats.total_sessions === 1) {
        newAchievements.push({
          user_id: userId,
          achievement_type: 'first_game',
          achievement_name: 'Memory Apprentice',
          description: 'Completed your first memory challenge',
          icon: '🎓',
          points: 10,
          metadata: { session_id: session.id },
        });
      }

      // Perfect score achievement
      if (session.accuracy === 100) {
        newAchievements.push({
          user_id: userId,
          achievement_type: 'perfect_score',
          achievement_name: 'Perfect Memory',
          description: 'Achieved 100% accuracy in a memory challenge',
          icon: '🎯',
          points: 25,
          metadata: { session_id: session.id, game_type: session.game_type },
        });
      }

      // High score achievements
      if (session.score >= 50) {
        newAchievements.push({
          user_id: userId,
          achievement_type: 'high_score',
          achievement_name: 'Memory Master',
          description: 'Scored 50+ points in a single game',
          icon: '🏆',
          points: 20,
          metadata: { session_id: session.id, score: session.score },
        });
      }

      // Session count milestones
      if ([5, 10, 25, 50, 100].includes(stats.total_sessions)) {
        newAchievements.push({
          user_id: userId,
          achievement_type: 'session_milestone',
          achievement_name: `${stats.total_sessions} Games Played`,
          description: `Completed ${stats.total_sessions} memory challenges`,
          icon: stats.total_sessions >= 50 ? '🌟' : stats.total_sessions >= 25 ? '⭐' : '✨',
          points: stats.total_sessions * 2,
          metadata: { total_sessions: stats.total_sessions },
        });
      }

      // Streak achievements
      if ([3, 7, 14, 30].includes(stats.current_streak)) {
        newAchievements.push({
          user_id: userId,
          achievement_type: 'streak',
          achievement_name: `${stats.current_streak} Day Streak`,
          description: `Practiced memory techniques for ${stats.current_streak} consecutive days`,
          icon: '🔥',
          points: stats.current_streak * 3,
          metadata: { streak_days: stats.current_streak },
        });
      }

      // Save new achievements
      if (newAchievements.length > 0) {
        const { data: savedAchievements, error } = await this.supabase
          .from('achievements')
          .insert(newAchievements)
          .select();

        if (error) throw error;

        // Trigger achievement notifications
        if (savedAchievements && typeof window !== 'undefined') {
          savedAchievements.forEach((achievement: Achievement) => {
            // Trigger achievement notification with a slight delay for better UX
            setTimeout(() => {
              if ((window as any).showAchievement) {
                (window as any).showAchievement(achievement);
              }
            }, 1000);
          });
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  // Calculate consecutive day streak
  private calculateStreak(sessions: GameSession[]): number {
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group sessions by date
    const sessionDates = new Set(
      sessions.map(s => {
        const date = new Date(s.created_at!);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    let streak = 0;
    let currentDate = today.getTime();

    // Check if there's a session today or yesterday (to account for timezone differences)
    if (!sessionDates.has(currentDate)) {
      currentDate -= 24 * 60 * 60 * 1000; // Go back one day
      if (!sessionDates.has(currentDate)) {
        return 0; // No recent activity
      }
    }

    // Count consecutive days
    while (sessionDates.has(currentDate)) {
      streak++;
      currentDate -= 24 * 60 * 60 * 1000; // Go back one day
    }

    return streak;
  }

  // REMOVED: updateLeaderboards() method - now handled by unified LeaderboardService
  // This eliminates ~90 lines of duplicate ranking logic
}

export const progressService = new ProgressService();
