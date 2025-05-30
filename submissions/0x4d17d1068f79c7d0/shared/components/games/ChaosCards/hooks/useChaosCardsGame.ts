// Custom hook for Chaos Cards game logic
// Encapsulates all game state and business logic

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../../providers/AuthProvider";
import { useGame } from "../../../../providers/GameProvider";
import { useGameState } from "../../../../hooks/useGameState";
import { getCulturalEmoji, getCulturalContext } from "../../../../utils/culturalMapping";
import { getThemeItems, getThemeByCategory } from "../../../../config/culturalThemes";
import { ScoringRules } from "../../../../config/gameRules";
import { createGameError } from "../../../../utils/errorHandling";

interface Card {
  id: string;
  symbol: string;
  name: string;
  color: string;
  culturalContext?: string;
}

interface ChaosCardsGameData {
  cards: Card[];
  shuffledCards: Card[]; // Cards in randomized order for recall phase
  userSequence: string[];
  currentGuess: number;
  difficulty: number; // Current active difficulty (can be higher than baseline)
  baselineDifficulty: number; // User's chosen starting difficulty
  perfectRounds: number;
  totalRounds: number;
  memoryTechnique: "observation" | "loci" | "linking" | "story" | "cultural";
  culturalStory: string;
  scoreBreakdown?: string[]; // Detailed score breakdown for results display
}

export function useChaosCardsGame(culturalCategory: string, theme: any) {
  const { user } = useAuth();
  const {
    gameMode,
    gameService,
    currentGame,
    lastVerification,
    isLoading,
    error,
    startGame: startGameSession,
    endGame: endGameSession,
    resetGame,
  } = useGame();

  // Enhanced game state with progressive difficulty and memory techniques
  const [gameState, gameActions] = useGameState<ChaosCardsGameData>({
    initialGameData: {
      cards: [],
      shuffledCards: [], // Cards in randomized order for recall
      userSequence: [],
      currentGuess: 0,
      difficulty: 5, // Current active difficulty
      baselineDifficulty: 5, // User's chosen starting difficulty (5 = easy)
      perfectRounds: 0, // Track consecutive perfect rounds
      totalRounds: 0, // Track total rounds played
      memoryTechnique: "observation", // Current suggested technique
      culturalStory: "", // Cultural narrative for current sequence
    },
    initialPhase: "setup",
    initialTimeLeft: 15,
    onPhaseChange: (newPhase, prevPhase) => {
      if (newPhase === "recall" && prevPhase === "memorize") {
        // Shuffle cards for recall phase so user can't just click in same order
        const shuffledCards = [...gameState.gameData.cards].sort(() => Math.random() - 0.5);
        gameActions.setGameData(prev => ({
          ...prev,
          shuffledCards
        }));
        console.log("Starting recall phase with shuffled cards");
      }
    },
    onGameEnd: (finalState) => {
      // Handle game completion with enhanced scoring
      saveGameResult(finalState.score);
    }
  });

  // Simple timer that works with hot reload
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimer = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let currentTime = 15;
    gameActions.setTimeLeft(currentTime);

    timerRef.current = setInterval(() => {
      currentTime -= 1;
      gameActions.setTimeLeft(currentTime);

      if (currentTime <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        gameActions.setPhase("recall");
      }
    }, 1000);
  }, [gameActions]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Progressive difficulty calculation from user's chosen baseline
  const calculateProgressiveDifficulty = useCallback((
    baselineDifficulty: number,
    perfectRounds: number
  ) => {
    // Increase difficulty by 1 card every 2 perfect rounds, max 10 cards
    const difficultyIncrease = Math.floor(perfectRounds / 2);
    return Math.min(baselineDifficulty + difficultyIncrease, 10);
  }, []);

  // Calculate memorization time based on difficulty
  const calculateMemorizationTime = useCallback((difficulty: number) => {
    // Start at 20s for 5 cards, reduce by 2.5s per difficulty level above 5, min 10s
    return Math.max(20 - (difficulty - 5) * 2.5, 10);
  }, []);

  // Determine memory technique based on difficulty and cultural context
  const selectMemoryTechnique = useCallback((difficulty: number, culturalCategory: string) => {
    if (difficulty <= 5) return "observation";
    if (difficulty <= 6) return culturalCategory === "randomness-revolution" ? "loci" : "cultural";
    if (difficulty <= 7) return "linking";
    return "story";
  }, []);

  // Generate cultural story for memory aid
  const generateCulturalStory = useCallback((cards: Card[], culturalCategory: string) => {
    const theme = getThemeByCategory(culturalCategory);
    const storyTemplates = {
      "randomness-revolution": "In the ancient agora, a philosopher encounters",
      "actually-fun-games": "The griot tells of a journey where",
      "ai-and-llms": "In the temple garden, a sage contemplates",
      "generative-art-worlds": "Along the songline, the ancestors placed"
    };

    const template = storyTemplates[culturalCategory as keyof typeof storyTemplates] || storyTemplates["randomness-revolution"];
    const cardNames = cards.map(card => card.name).join(", then ");
    return `${template} ${cardNames}. Each symbol holds ancient wisdom.`;
  }, []);

  // Generate culturally appropriate cards with enhanced randomization
  const generateCards = useCallback((count: number): Card[] => {
    const culturalObjects = getThemeItems(culturalCategory, "objects");
    const culturalConcepts = getThemeItems(culturalCategory, "concepts");
    const culturalPlaces = getThemeItems(culturalCategory, "places");

    // Combine all items for more variety
    const allItems = [...culturalObjects, ...culturalConcepts, ...culturalPlaces];

    // Shuffle the array for true randomization
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    const selectedItems = shuffled.slice(0, Math.min(count, allItems.length));

    const cards = selectedItems.map((item, index) => ({
      id: `card-${index}`,
      symbol: getCulturalEmoji(item),
      name: item,
      color: index % 2 === 0 ? theme.colors.primary : theme.colors.secondary,
      culturalContext: getCulturalContext(culturalCategory, item),
    }));

    return cards;
  }, [culturalCategory, theme.colors.primary, theme.colors.secondary]);

  // Start new game
  const startGame = useCallback(async () => {
    try {
      gameActions.setLoading(true);
      gameActions.setError(null);

      // Calculate progressive difficulty from user's baseline
      const currentDifficulty = calculateProgressiveDifficulty(
        gameState.gameData.baselineDifficulty,
        gameState.gameData.perfectRounds
      );

      // Calculate memorization time based on current difficulty
      const memorizationTime = calculateMemorizationTime(currentDifficulty);

      // Select appropriate memory technique
      const memoryTechnique = selectMemoryTechnique(currentDifficulty, culturalCategory);

      // Generate cards for current difficulty with true randomization
      const cards = generateCards(currentDifficulty);

      // Generate cultural story for memory aid
      const culturalStory = generateCulturalStory(cards, culturalCategory);

      // Update game state with enhanced data
      gameActions.setGameData({
        cards,
        shuffledCards: [], // Will be populated when entering recall phase
        userSequence: [],
        currentGuess: 0,
        difficulty: currentDifficulty, // Use calculated progressive difficulty
        baselineDifficulty: gameState.gameData.baselineDifficulty, // Keep user's baseline
        perfectRounds: gameState.gameData.perfectRounds,
        totalRounds: gameState.gameData.totalRounds + 1,
        memoryTechnique,
        culturalStory,
      });

      // Set dynamic memorization time and start game
      gameActions.setTimeLeft(memorizationTime);
      gameActions.setPhase("memorize");
      gameActions.setScore(0);
      startTimer();

      // Only try game service if user is authenticated
      if (user?.id) {
        // Create game configuration with dynamic values
        const gameConfig = {
          gameType: "chaos_cards" as const,
          difficulty:
            currentDifficulty <= 5
              ? ("easy" as const)
              : currentDifficulty <= 6
              ? ("medium" as const)
              : currentDifficulty <= 7
              ? ("hard" as const)
              : ("expert" as const),
          culture: culturalCategory,
          itemCount: currentDifficulty,
          studyTime: memorizationTime,
          chaosTime: 2,
        };

        // Start game session using the game service
        await startGameSession(gameConfig);
      }

      // Update cards if we got a sequence from the game service
      if (currentGame?.sequence) {
        const vrfCards = currentGame.sequence.items.map((item: any, index: number) => ({
          id: `card-${index}`,
          symbol: getCulturalEmoji(item.name),
          name: item.name,
          color:
            index % 2 === 0 ? theme.colors.primary : theme.colors.secondary,
          culturalContext: item.culturalContext,
        }));

        gameActions.setGameData(prev => ({
          ...prev,
          cards: vrfCards,
          shuffledCards: [], // Will be populated when entering recall phase
          userSequence: [],
          currentGuess: 0,
        }));
      }

    } catch (error) {
      console.error("Failed to start game:", error);
      gameActions.setError("Failed to start game. Please try again.");
    } finally {
      gameActions.setLoading(false);
    }
  }, [
    user?.id,
    gameState.gameData.baselineDifficulty,
    gameState.gameData.perfectRounds,
    culturalCategory,
    theme.colors,
    startGameSession,
    currentGame,
    generateCards,
    calculateProgressiveDifficulty,
    calculateMemorizationTime,
    selectMemoryTechnique,
    generateCulturalStory,
    gameActions,
    startTimer
  ]);

  // Optimized scoring calculation (memoized)
  const calculateFinalScore = useCallback((
    correctAnswers: number,
    totalCards: number,
    difficulty: number,
    memoryTechnique: string,
    isProgression: boolean
  ) => {
    const memorizationTime = calculateMemorizationTime(difficulty);
    const timeUsed = memorizationTime; // For now, assume full time used

    return ScoringRules.calculateChaosCardsScore(
      correctAnswers,
      totalCards,
      difficulty,
      memorizationTime,
      timeUsed,
      memoryTechnique,
      isProgression,
      culturalCategory
    );
  }, [calculateMemorizationTime, culturalCategory]);

  // Handle card selection during recall with optimized scoring
  const handleCardSelect = useCallback((cardId: string) => {
    const { cards, userSequence, currentGuess, perfectRounds, baselineDifficulty, difficulty, memoryTechnique } = gameState.gameData;
    const newSequence = [...userSequence, cardId];

    if (currentGuess >= cards.length - 1) {
      // Game finished - calculate score only once at the end
      const correctAnswers = newSequence.filter((answer, index) => answer === cards[index]?.id).length;
      const isProgression = difficulty > baselineDifficulty;

      const scoreResult = calculateFinalScore(
        correctAnswers,
        cards.length,
        difficulty,
        memoryTechnique,
        isProgression
      );

      const isPerfectRound = correctAnswers === cards.length;
      const newPerfectRounds = isPerfectRound ? perfectRounds + 1 : 0;
      const newDifficulty = calculateProgressiveDifficulty(baselineDifficulty, newPerfectRounds);

      gameActions.setGameData(prev => ({
        ...prev,
        userSequence: newSequence,
        perfectRounds: newPerfectRounds,
        difficulty: newDifficulty,
        scoreBreakdown: scoreResult.breakdown,
      }));
      gameActions.setScore(scoreResult.totalScore);
      gameActions.setPhase("results");
    } else {
      // Just update sequence and guess - no heavy calculations
      gameActions.setGameData(prev => ({
        ...prev,
        userSequence: newSequence,
        currentGuess: prev.currentGuess + 1,
      }));
    }
  }, [gameState.gameData, gameActions, calculateProgressiveDifficulty, calculateFinalScore]);

  // Save game result
  const saveGameResult = useCallback(async (finalScore: number) => {
    if (!user?.id || !currentGame) return;

    try {
      const { cards, userSequence } = gameState.gameData;
      const maxPossibleScore = cards.length * 10;
      const accuracy = (finalScore / maxPossibleScore) * 100; // Convert to percentage (0-100)
      const duration = 15; // Study time + recall time
      const perfect = finalScore === maxPossibleScore;

      const gameResult = {
        score: finalScore,
        accuracy,
        duration,
        perfect,
        items: cards.map((card, index) => ({
          id: card.id,
          name: card.name,
          userAnswer: userSequence[index] || null,
          correctAnswer: card.id,
          isCorrect: userSequence[index] === card.id,
        })),
      };

      // Submit result using the game service
      await endGameSession(gameResult);

    } catch (error) {
      console.error("Error saving game result:", error);
      gameActions.setError("Failed to save game result");
    }
  }, [user?.id, currentGame, gameState.gameData, endGameSession, gameActions]);

  // Handle difficulty change (updates baseline difficulty)
  const handleDifficultyChange = useCallback((newBaselineDifficulty: number) => {
    // Calculate what the current difficulty should be with the new baseline
    const newCurrentDifficulty = calculateProgressiveDifficulty(
      newBaselineDifficulty,
      gameState.gameData.perfectRounds
    );

    gameActions.setGameData(prev => ({
      ...prev,
      baselineDifficulty: newBaselineDifficulty,
      difficulty: newCurrentDifficulty
    }));
  }, [gameActions, gameState.gameData.perfectRounds, calculateProgressiveDifficulty]);

  // Reset game
  const handleReset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    gameActions.resetGame();
    resetGame();
  }, [gameActions, resetGame]);

  return {
    // Game state
    gameState,
    isLoading,
    error,
    lastVerification,
    gameMode,

    // Game actions
    startGame,
    handleCardSelect,
    handleDifficultyChange,
    handleReset,

    // Timer
    timeLeft: gameState.timeLeft,

    // Enhanced game info
    memoryTechnique: gameState.gameData.memoryTechnique,
    culturalStory: gameState.gameData.culturalStory,
    perfectRounds: gameState.gameData.perfectRounds,
    totalRounds: gameState.gameData.totalRounds,

    // Card arrays for different phases
    cards: gameState.gameData.cards, // Original sequence for memorization
    shuffledCards: gameState.gameData.shuffledCards, // Shuffled for recall
  };
}
