// Unified Game Service
// Provides a single interface for both off-chain and on-chain game modes

import { GameAdapter } from "../adapters/GameAdapter";
import { OffChainAdapter } from "../adapters/OffChainAdapter";
import { OnChainAdapter } from "../adapters/OnChainAdapter";
import { RandomnessProvider, createSeededRandomFromProvider } from "../providers/RandomnessProvider";
import { GameSession, GameType, DifficultyLevel } from "../types/game";
import { GameResult } from "../components/games/shared/types"; // Use the correct GameResult interface
import { getThemeByCategory, getThemeItems } from "../config/culturalThemes";
import { getCulturalEmoji, getCulturalContext } from "../utils/culturalMapping";
import { createGameError, withErrorHandling } from "../utils/errorHandling";

export interface GameConfig {
  gameType: GameType;
  difficulty: DifficultyLevel;
  culture: string;
  itemCount: number;
  studyTime?: number;
  chaosTime?: number;
  timeLimit?: number;
  customSeed?: number;
}

export interface GameSequence {
  items: GameItem[];
  seed: number;
  config: GameConfig;
  verificationData?: any;
}

export interface GameItem {
  id: string;
  symbol: string;
  name: string;
  category: string;
  culturalContext?: string;
  position: number;
}

export interface EnhancedGameResult extends GameResult {
  achievements: any[];
  newRecord: boolean;
  verificationData?: any;
  culturalMastery?: Record<string, number>;
}

export class GameService {
  private adapter: GameAdapter;
  private randomnessProvider: RandomnessProvider;

  constructor(adapter: GameAdapter) {
    this.adapter = adapter;
    this.randomnessProvider = adapter.getRandomnessProvider();
  }

  /**
   * Get the current game mode
   */
  getMode(): 'offchain' | 'onchain' {
    return this.adapter.getMode();
  }

  /**
   * Get available features for current mode
   */
  getAvailableFeatures() {
    return this.adapter.getAvailableFeatures();
  }

  /**
   * Check if a feature is supported
   */
  supportsFeature(featureId: string): boolean {
    return this.adapter.supportsFeature(featureId);
  }

  /**
   * Generate a new game sequence
   */
  async generateGameSequence(config: GameConfig): Promise<GameSequence> {
    try {
      // Get randomness seed - VRF if available, fallback to local
      const seed = config.customSeed || await this.randomnessProvider.generateSeed();

      // Log randomness source for transparency
      const isVRFEnabled = this.randomnessProvider.constructor.name === 'FlowVRFRandomnessProvider';
      console.log(`🎲 Generating sequence with ${isVRFEnabled ? 'Flow VRF' : 'local'} randomness`);

      // Get cultural theme and items
      const theme = getThemeByCategory(config.culture);
      const culturalObjects = getThemeItems(config.culture, "objects");
      const culturalPlaces = getThemeItems(config.culture, "places");
      const culturalConcepts = getThemeItems(config.culture, "concepts");

      // Combine all cultural items
      const allItems = [
        ...culturalObjects.map(item => ({ name: item, category: 'objects' })),
        ...culturalPlaces.map(item => ({ name: item, category: 'places' })),
        ...culturalConcepts.map(item => ({ name: item, category: 'concepts' }))
      ];

      // Create seeded random generator
      const seededRandom = createSeededRandomFromProvider(this.randomnessProvider, seed);

      // Shuffle and select items
      const shuffledItems = await seededRandom.shuffle(allItems);
      const selectedItems = shuffledItems.slice(0, config.itemCount);

      // Create game items with positions
      const gameItems: GameItem[] = selectedItems.map((item, index) => ({
        id: `${config.culture}_${item.category}_${index}`,
        symbol: getCulturalEmoji(item.name),
        name: item.name,
        category: item.category,
        culturalContext: getCulturalContext(config.culture, item.name),
        position: index
      }));

      // Get verification data if available
      const verificationData = await this.randomnessProvider.getVerificationData();

      return {
        items: gameItems,
        seed,
        config,
        verificationData
      };
    } catch (error) {
      throw createGameError('Game sequence generation failed', error);
    }
  }

  /**
   * Start a new game session
   */
  async startGameSession(userId: string, config: GameConfig): Promise<GameSession> {
    try {
      const session = await this.adapter.startGameSession(userId, config.gameType, {
        ...config,
        maxScore: this.calculateMaxScore(config),
        mode: this.getMode()
      });

      return session;
    } catch (error) {
      console.error('Failed to start game session:', error);
      throw error;
    }
  }

  /**
   * Submit game result and handle all side effects
   */
  async submitGameResult(
    userId: string,
    sessionId: string,
    result: GameResult,
    config: GameConfig,
    userTier?: 'anonymous' | 'supabase' | 'flow'
  ): Promise<EnhancedGameResult> {


    try {
      // Load current progress
      const currentProgress = await this.adapter.loadProgress(userId);

      // Calculate achievements
      const newAchievements = this.checkAchievements(currentProgress, result, config);

      // Update progress
      const updatedProgress = this.updateProgress(currentProgress, result, config);
      await this.adapter.saveProgress(userId, updatedProgress);

      // UNIFIED: Submit score directly through LeaderboardService (cleaner architecture)
      const { leaderboardService } = await import('./LeaderboardService');

      // Determine user tier - use passed tier or fallback to anonymous
      const effectiveUserTier = userTier || 'anonymous';
      console.log('🔍 GameService.submitGameResult using userTier:', effectiveUserTier);

      const submissionResult = await leaderboardService.submitScore(
        userId,
        userId.substring(0, 8) + '...', // Simple username
        result.score,
        config.gameType,
        result.culturalCategory || 'general',
        effectiveUserTier, // Use actual user tier instead of hardcoded
        result.vrfSeed
      );

      // Also save to game_sessions for detailed tracking
      await this.adapter.submitScore(userId, config.gameType, result.score, {
        accuracy: result.accuracy,
        duration: result.timeSpent,
        difficultyLevel: result.difficulty,
        culture: result.culturalCategory,
        maxPossibleScore: this.calculateMaxScore(config),
        itemsCount: this.getItemsCount(config.gameType, result.difficulty) || config.itemCount,
        technique: result.technique,
        vrfSeed: result.vrfSeed,
        gameType: config.gameType
      });

      // Provide clear user feedback based on result
      if (submissionResult.offChain || submissionResult.onChain) {
        if (submissionResult.onChain && submissionResult.transactionId) {
          console.log('🔗 Score verified on blockchain!', submissionResult.transactionId);
        } else if (submissionResult.offChain) {
          console.log('✅ Score saved to off-chain leaderboard');
        }
      } else {
        console.warn('⚠️ Score submission failed - neither off-chain nor on-chain submission succeeded');
        // Continue with the rest of the process even if score submission fails
      }

      // Unlock new achievements
      for (const achievement of newAchievements) {
        await this.adapter.unlockAchievement(userId, achievement);
      }

      // Update statistics
      await this.adapter.updateStatistics(userId, result);

      // End game session
      await this.adapter.endGameSession(sessionId, result);

      // Check for new records
      const isNewRecord = await this.checkForNewRecord(userId, config.gameType, result.score);

      // Get verification data
      const verificationData = await this.randomnessProvider.getVerificationData();

      return {
        ...result,
        achievements: newAchievements,
        newRecord: isNewRecord,
        verificationData,
        culturalMastery: updatedProgress.culturalMastery
      };
    } catch (error) {
      console.error('Failed to submit game result:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard for a specific game type
   */
  async getLeaderboard(gameType: GameType, culture?: string, limit: number = 10) {
    return this.adapter.getLeaderboard(gameType, culture, limit);
  }

  /**
   * Get user progress
   */
  async getUserProgress(userId: string) {
    return this.adapter.loadProgress(userId);
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string) {
    return this.adapter.getAchievements(userId);
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string) {
    return this.adapter.getStatistics(userId);
  }

  // Private helper methods

  private calculateMaxScore(config: GameConfig): number {
    const baseScore = config.itemCount * 100;
    const difficultyMultiplier = this.getDifficultyMultiplier(config.difficulty);
    return Math.floor(baseScore * difficultyMultiplier);
  }

  private getDifficultyLevel(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 2;
    }
  }

  private getDifficultyMultiplier(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case 'easy': return 1.0;
      case 'medium': return 1.5;
      case 'hard': return 2.0;
      default: return 1.5;
    }
  }

  private getItemsCount(gameType: string, difficulty: number): number {
    // Calculate items count based on game type and difficulty
    switch (gameType) {
      case 'chaos_cards':
        return difficulty; // Chaos Cards: difficulty = number of cards
      case 'memory_palace':
        return difficulty; // Memory Palace: difficulty = number of items
      case 'speed_challenge':
        return Math.min(difficulty, 10); // Speed Challenge: max 10 items
      default:
        return Math.max(4, Math.min(difficulty, 12)); // Default: 4-12 items
    }
  }

  private checkAchievements(currentProgress: any, result: GameResult, config: GameConfig): any[] {
    const achievements: any[] = [];

    // Perfect game achievement (accuracy is now 0-100 percentage)
    if (result.accuracy >= 100) {
      achievements.push({
        id: `perfect_${config.culture}_${config.gameType}`,
        name: `Perfect ${config.culture} Memory`,
        description: `Achieved perfect accuracy in ${config.gameType}`,
        icon: '🎯',
        category: 'performance',
        culture: config.culture,
        unlockedAt: Date.now()
      });
    }

    // High score achievement
    if (result.score > 1000) {
      achievements.push({
        id: `high_score_${config.culture}`,
        name: `${config.culture} Master`,
        description: `Scored over 1000 points in ${config.culture} games`,
        icon: '🏆',
        category: 'mastery',
        culture: config.culture,
        unlockedAt: Date.now()
      });
    }

    // Speed achievement (timeSpent is in seconds, accuracy is 0-100)
    if (result.timeSpent < 30 && result.accuracy > 80) {
      achievements.push({
        id: `speed_demon_${config.culture}`,
        name: `${config.culture} Speed Demon`,
        description: `Completed game in under 30 seconds with 80%+ accuracy`,
        icon: '⚡',
        category: 'speed',
        culture: config.culture,
        unlockedAt: Date.now()
      });
    }

    return achievements;
  }

  private updateProgress(currentProgress: any, result: GameResult, config: GameConfig): any {
    if (!currentProgress) {
      currentProgress = {
        userId: '',
        level: 1,
        totalScore: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        culturalMastery: {},
        lastPlayed: Date.now(),
        achievements: [],
        statistics: {
          totalGamesPlayed: 0,
          totalTimeSpent: 0,
          averageAccuracy: 0,
          favoriteGame: '',
          favoriteCulture: '',
          perfectGames: 0,
          longestStreak: 0
        }
      };
    }

    // Update basic progress
    currentProgress.totalScore += result.score;
    currentProgress.gamesPlayed += 1;
    currentProgress.lastPlayed = Date.now();

    // Update cultural mastery
    if (!currentProgress.culturalMastery[config.culture]) {
      currentProgress.culturalMastery[config.culture] = 0;
    }
    currentProgress.culturalMastery[config.culture] += Math.floor(result.score / 100);

    // Update level based on total score
    currentProgress.level = Math.floor(currentProgress.totalScore / 1000) + 1;

    return currentProgress;
  }

  private async checkForNewRecord(userId: string, gameType: GameType, score: number): Promise<boolean> {
    try {
      const leaderboard = await this.adapter.getLeaderboard(gameType, undefined, 1);
      if (leaderboard.length === 0) return true;

      const topScore = leaderboard[0];
      return topScore.userId === userId && score > topScore.score;
    } catch (error) {
      console.error('Failed to check for new record:', error);
      return false;
    }
  }
}

// Factory function to create GameService with appropriate adapter
export function createGameService(mode: 'offchain' | 'onchain', contractAddress?: string): GameService {
  const adapter = mode === 'onchain'
    ? new OnChainAdapter(contractAddress)
    : new OffChainAdapter();

  return new GameService(adapter);
}
