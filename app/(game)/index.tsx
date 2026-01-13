import { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal, TextInput, PanResponder, Alert } from 'react-native';
import { useGameSounds } from '@/hooks/useGameSounds';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { initDatabase, saveScore, getLeaderboard } from '@/utils/db';

const BOARD_SIZE = 8;
const CELL_SIZE = Math.floor(Dimensions.get('window').width / BOARD_SIZE);
// Full list of possible pieces - difficulty determines how many are used
const ALL_PIECES = ['🐶', '🦴', '🐾', '🎾', '🐕', '🍖', '🧸', '🥣', '🧶', '🐈'];
const INITIAL_PIECE_COUNT = 5;
const SPECIAL_PIECES = {
  BOMB: '💣',
  RAINBOW: '🌈'
};

type Position = { row: number; col: number };
type GamePiece = {
  type: string;
  isSpecial?: boolean;
};
type Board = GamePiece[][];
type LeaderboardEntry = {
  id: number;
  name: string;
  score: number;
  date: string;
};

import MahjongGame from '@/components/MahjongGame';
import PillsGame from '@/components/PillsGame';

export default function GameScreen() {
  const [activeTab, setActiveTab] = useState<'match3' | 'mahjong' | 'pills'>('match3');
  const [board, setBoard] = useState<Board>([]);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const { playSound } = useGameSounds();
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [explosions, setExplosions] = useState<Position[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    initDatabase();
    initializeBoard();
  }, []);

  useEffect(() => {
    // Level up every 1000 points
    // Difficulty logic:
    // Level 1: 5 types
    // Level 2: 6 types
    // ...
    // Level 5+: Max types?
    const newDifficulty = Math.floor(score / 1000) + 1;
    if (newDifficulty !== difficulty) {
      setDifficulty(newDifficulty);
      // Optional: Trigger a board reset or "Level Up" animation/modal?
      // For now, let's keep playing but maybe new pieces won't spawn until refresh...
      // Actually, standard Candy Crush style leveling often changes level without board clear, 
      // but increasing piece types mid-game is weird.
      // Let's prompt user to "Next Level" and reset board with new difficulty.
      // Let's prompt user to "Next Level" and reset board with new difficulty.
      playSound('VICTORY');
      Alert.alert("Level Up!", `Welcome to Level ${newDifficulty}! Difficulty Increased.`, [
        { text: "Continue", onPress: () => initializeBoard(newDifficulty) }
      ]);
    }
  }, [score]);

  const getPiecesForLevel = (level: number) => {
    // Start with base, add 1 type per level, up to max
    const count = Math.min(INITIAL_PIECE_COUNT + (level - 1), ALL_PIECES.length);
    return ALL_PIECES.slice(0, count);
  };

  const initializeBoard = (level: number = 1) => {
    const pieces = getPiecesForLevel(level);
    const newBoard: Board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      newBoard[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        newBoard[i][j] = {
          type: pieces[Math.floor(Math.random() * pieces.length)]
        };
      }
    }
    setBoard(newBoard);
    // Don't reset score if leveling up, but if New Game then yes?
    // Using this for both is tricky. Let's assume New Game is explicit.
    // However, if called from Level Up alert, we pass level.
    // If called from "New Game" button, we default to 1.
    // But New Game button calls with no args -> level 1. Perfect.
    if (level === 1) setScore(0);
    setDifficulty(level);
  };

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setLeaderboard(data as LeaderboardEntry[]);
      setShowLeaderboard(true);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const handleGameOver = () => {
    setShowNameInput(true);
  };

  const handleSaveScore = async () => {
    if (playerName.trim()) {
      try {
        await saveScore(playerName, score);
        setShowNameInput(false);
        loadLeaderboard();
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  };

  const createSpecialPiece = (length: number): GamePiece => {
    if (length >= 4) {
      return { type: SPECIAL_PIECES.BOMB, isSpecial: true };
    } else if (length >= 5) {
      return { type: SPECIAL_PIECES.RAINBOW, isSpecial: true };
    }
    const pieces = getPiecesForLevel(difficulty);
    return { type: pieces[Math.floor(Math.random() * pieces.length)] };
  };

  const triggerExplosion = (positions: Position[]) => {
    setExplosions(positions);
    setTimeout(() => setExplosions([]), 500);
  };

  const checkMatches = useCallback(() => {
    const newBoard = [...board];
    let matchFound = false;
    let matchLength = 0;

    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        let currentType = newBoard[row][col].type;
        let matchCount = 1;

        while (col + matchCount < BOARD_SIZE &&
          newBoard[row][col + matchCount].type === currentType) {
          matchCount++;
        }

        if (matchCount >= 3) {
          matchFound = true;
          matchLength = matchCount;
          const positions = [];

          for (let i = 0; i < matchCount; i++) {
            positions.push({ row, col: col + i });
          }

          triggerExplosion(positions);
          setScore(prev => prev + (matchCount * 20));

          const specialPiece = createSpecialPiece(matchCount);
          newBoard[row][col] = specialPiece;

          for (let i = 1; i < matchCount; i++) {
            const pieces = getPiecesForLevel(difficulty);
            newBoard[row][col + i] = {
              type: pieces[Math.floor(Math.random() * pieces.length)]
            };
          }

          col += matchCount - 1;
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 2; row++) {
        let currentType = newBoard[row][col].type;
        let matchCount = 1;

        while (row + matchCount < BOARD_SIZE &&
          newBoard[row + matchCount][col].type === currentType) {
          matchCount++;
        }

        if (matchCount >= 3) {
          matchFound = true;
          matchLength = matchCount;
          const positions = [];

          for (let i = 0; i < matchCount; i++) {
            positions.push({ row: row + i, col });
          }

          triggerExplosion(positions);
          setScore(prev => prev + (matchCount * 20));

          const specialPiece = createSpecialPiece(matchCount);
          newBoard[row][col] = specialPiece;

          for (let i = 1; i < matchCount; i++) {
            const pieces = getPiecesForLevel(difficulty);
            newBoard[row + i][col] = {
              type: pieces[Math.floor(Math.random() * pieces.length)]
            };
          }

          row += matchCount - 1;
        }
      }
    }

    if (matchFound) {
      setBoard(newBoard);
      setTimeout(() => checkMatches(), 300);
    }
  }, [board]);

  const attemptSwap = (pos1: Position, pos2: Position) => {
    // Check if adjacent
    const isAdjacent =
      (Math.abs(pos1.row - pos2.row) === 1 && pos1.col === pos2.col) ||
      (Math.abs(pos1.col - pos2.col) === 1 && pos2.row === pos1.row);

    if (isAdjacent) {
      const newBoard = [...board];
      const temp = newBoard[pos1.row][pos1.col];
      newBoard[pos1.row][pos1.col] = newBoard[pos2.row][pos2.col];
      newBoard[pos2.row][pos2.col] = temp;

      setBoard(newBoard);
      setTimeout(() => checkMatches(), 300);
      return true;
    }
    return false;
  };

  const handlePiecePress = (row: number, col: number) => {
    if (!selectedPiece) {
      setSelectedPiece({ row, col });
      return;
    }

    const swapped = attemptSwap(selectedPiece, { row, col });
    setSelectedPiece(null);
    if (!swapped) {
      // If clicked far away or same piece, select the new one (or deselect if same)
      if (selectedPiece.row !== row || selectedPiece.col !== col) {
        setSelectedPiece({ row, col });
      }
    }
  };

  const handleSwipe = (row: number, col: number, direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    let targetRow = row;
    let targetCol = col;

    if (direction === 'LEFT') targetCol--;
    if (direction === 'RIGHT') targetCol++;
    if (direction === 'UP') targetRow--;
    if (direction === 'DOWN') targetRow++;

    if (targetRow >= 0 && targetRow < BOARD_SIZE && targetCol >= 0 && targetCol < BOARD_SIZE) {
      attemptSwap({ row, col }, { row: targetRow, col: targetCol });
    }
  };

  const Explosion = ({ row, col }: Position) => {
    const animatedStyle = useAnimatedStyle(() => ({
      position: 'absolute',
      left: col * CELL_SIZE,
      top: row * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      opacity: withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 })
      ),
      transform: [
        {
          scale: withSequence(
            withTiming(1.5, { duration: 200 }),
            withTiming(0, { duration: 300 })
          )
        }
      ]
    }));

    return (
      <Animated.Text style={[styles.explosion, animatedStyle]}>
        💥
      </Animated.Text>
    );
  };

  const GamePiece = ({ piece, row, col, isSelected }: {
    piece: GamePiece;
    row: number;
    col: number;
    isSelected: boolean;
  }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        {
          scale: withSequence(
            withSpring(isSelected ? 1.2 : 1, {
              damping: 10,
              stiffness: 100
            }),
            withSpring(1)
          )
        },
        // ... (Rotation logic removed/simplified or kept if desired, keeping simple for now)
      ]
    }));

    // PanResponder for Swipe
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only capture if moved significantly
          return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dx, dy } = gestureState;
          if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > 20) { // Threshold
              handleSwipe(row, col, dx > 0 ? 'RIGHT' : 'LEFT');
            } else {
              handlePiecePress(row, col); // Treat as tap
            }
          } else {
            if (Math.abs(dy) > 20) {
              handleSwipe(row, col, dy > 0 ? 'DOWN' : 'UP');
            } else {
              handlePiecePress(row, col); // Treat as tap
            }
          }
        }
      })
    ).current;

    return (
      <View {...panResponder.panHandlers}>
        <Animated.Text
          style={[
            styles.piece,
            animatedStyle,
            piece.isSpecial && styles.specialPiece,
            isSelected && { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10 }
          ]}
        >
          {piece.type}
        </Animated.Text>
      </View>
    );
  };



  const LeaderboardModal = () => (
    <Modal
      visible={showLeaderboard}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLeaderboard(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🏆 Leaderboard</Text>
          {leaderboard.map((entry, index) => (
            <View key={entry.id} style={styles.leaderboardRow}>
              <Text style={styles.leaderboardText}>
                {index + 1}. {entry.name} - {entry.score}
              </Text>
            </View>
          ))}
          <Pressable
            onPress={() => setShowLeaderboard(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const NameInputModal = () => (
    <Modal
      visible={showNameInput}
      transparent
      animationType="slide"
      onRequestClose={() => setShowNameInput(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New High Score! 🎉</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
          />
          <Pressable
            onPress={handleSaveScore}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>Save Score</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  /* Existing Logic Refactored for Tab View */
  const renderGame = () => {
    if (activeTab === 'mahjong') {
      return <MahjongGame />;
    }
    if (activeTab === 'pills') {
      return <PillsGame />;
    }

    // Default Match-3 Game
    return (
      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((piece, colIndex) => (
              <GamePiece
                key={`${rowIndex}-${colIndex}`}
                piece={piece}
                row={rowIndex}
                col={colIndex}
                isSelected={
                  selectedPiece?.row === rowIndex &&
                  selectedPiece?.col === colIndex
                }
              />
            ))}
          </View>
        ))}
        {explosions.map((pos, index) => (
          <Explosion key={`explosion-${index}`} row={pos.row} col={pos.col} />
        ))}
      </View>
    );
  };

  const BottomMenu = () => (
    <View style={styles.bottomMenu}>
      <Pressable onPress={() => {
        setActiveTab('match3');
        initializeBoard();
      }} style={[styles.menuItem, activeTab === 'match3' && styles.activeMenuItem]}>
        <Text style={styles.menuIcon}>🎮</Text>
        <Text style={styles.menuText}>New Game</Text>
      </Pressable>
      <Pressable onPress={() => setActiveTab('mahjong')} style={[styles.menuItem, activeTab === 'mahjong' && styles.activeMenuItem]}>
        <Text style={styles.menuIcon}>🀄</Text>
        <Text style={styles.menuText}>Mahjong</Text>
      </Pressable>
      <Pressable onPress={() => setActiveTab('pills')} style={[styles.menuItem, activeTab === 'pills' && styles.activeMenuItem]}>
        <Text style={styles.menuIcon}>🦴</Text>
        <Text style={styles.menuText}>Bones</Text>
      </Pressable>
    </View>
  );

  /* ... Helper Modals ... */
  // (LeaderboardModal and NameInputModal remain unchanged)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Uchuva's Odyssey</Text>
      {activeTab === 'match3' && (
        <View style={styles.statsContainer}>
          <Text style={styles.score}>Score: {score}</Text>
          <Text style={styles.difficulty}>Level: {difficulty}</Text>
        </View>
      )}

      {renderGame()}

      <BottomMenu />
      <LeaderboardModal />
      <NameInputModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7B2CBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    marginTop: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 20,
  },
  score: {
    fontSize: 24,
    color: '#fff',
  },
  difficulty: {
    fontSize: 24,
    color: '#fff',
  },
  board: {
    backgroundColor: '#9D4EDD',
    padding: 10,
    borderRadius: 10,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  piece: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    fontSize: CELL_SIZE * 0.6,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  specialPiece: {
    fontSize: CELL_SIZE * 0.8,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  explosion: {
    fontSize: CELL_SIZE,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#5A189A',
    padding: 15,
    borderRadius: 20,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  menuItem: {
    alignItems: 'center',
    padding: 5,
    borderRadius: 10,
    minWidth: 80,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  menuIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  menuText: {
    color: '#fff',
    fontSize: 12,
  },
  /* ... Modal Styles ... */
  // (Modal styles remain unchanged)
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  leaderboardRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leaderboardText: {
    fontSize: 18,
  },
  closeButton: {
    backgroundColor: '#7B2CBF',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#7B2CBF',
    padding: 10,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
});