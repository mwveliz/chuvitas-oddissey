import { Platform } from 'react-native';

// Simple storage implementation that works on both web and native
const storage = {
  async init() {
    // No initialization needed
  },

  async saveScore(name: string, score: number) {
    try {
      const leaderboard = this.getStoredLeaderboard();
      leaderboard.push({
        id: Date.now(),
        name,
        score,
        date: new Date().toISOString()
      });
      leaderboard.sort((a, b) => b.score - a.score);
      const topScores = leaderboard.slice(0, 10);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('leaderboard', JSON.stringify(topScores));
      } else {
        // For native, we'll use memory storage since it's a simple game
        this.memoryLeaderboard = topScores;
      }
      
      return { insertId: Date.now() };
    } catch (error) {
      console.error('Error saving score:', error);
      throw error;
    }
  },

  async getLeaderboard() {
    return this.getStoredLeaderboard();
  },

  // In-memory storage for native platforms
  memoryLeaderboard: [],

  getStoredLeaderboard() {
    try {
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('leaderboard');
        return stored ? JSON.parse(stored) : [];
      } else {
        return this.memoryLeaderboard;
      }
    } catch (error) {
      console.error('Error reading leaderboard:', error);
      return [];
    }
  }
};

export const initDatabase = () => storage.init();
export const saveScore = (name: string, score: number) => storage.saveScore(name, score);
export const getLeaderboard = () => storage.getLeaderboard();