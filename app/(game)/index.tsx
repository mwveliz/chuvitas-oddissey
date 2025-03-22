import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal, TextInput } from 'react-native';
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
const GAME_PIECES = ['🍎', '🍇', '💎', '🍊', '🫐', '💍'];
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

export default function GameScreen() {
  const [board, setBoard] = useState<Board>([]);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
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
    const newDifficulty = Math.floor(score / 10000) + 1;
    if (newDifficulty !== difficulty) {
      setDifficulty(newDifficulty);
    }
  }, [score]);

  const initializeBoard = () => {
    const newBoard: Board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      newBoard[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        newBoard[i][j] = {
          type: GAME_PIECES[Math.floor(Math.random() * GAME_PIECES.length)]
        };
      }
    }
    setBoard(newBoard);
    setScore(0);
    setDifficulty(1);
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
    return { type: GAME_PIECES[Math.floor(Math.random() * GAME_PIECES.length)] };
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
          setScore(prev => prev + (matchCount * 100));
          
          const specialPiece = createSpecialPiece(matchCount);
          newBoard[row][col] = specialPiece;
          
          for (let i = 1; i < matchCount; i++) {
            newBoard[row][col + i] = {
              type: GAME_PIECES[Math.floor(Math.random() * GAME_PIECES.length)]
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
          setScore(prev => prev + (matchCount * 100));
          
          const specialPiece = createSpecialPiece(matchCount);
          newBoard[row][col] = specialPiece;
          
          for (let i = 1; i < matchCount; i++) {
            newBoard[row + i][col] = {
              type: GAME_PIECES[Math.floor(Math.random() * GAME_PIECES.length)]
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

  const handlePiecePress = (row: number, col: number) => {
    if (!selectedPiece) {
      setSelectedPiece({ row, col });
      return;
    }

    const isAdjacent = 
      (Math.abs(selectedPiece.row - row) === 1 && selectedPiece.col === col) ||
      (Math.abs(selectedPiece.col - col) === 1 && selectedPiece.row === row);

    if (isAdjacent) {
      const newBoard = [...board];
      const temp = newBoard[selectedPiece.row][selectedPiece.col];
      newBoard[selectedPiece.row][selectedPiece.col] = newBoard[row][col];
      newBoard[row][col] = temp;
      
      setBoard(newBoard);
      setSelectedPiece(null);
      
      setTimeout(() => checkMatches(), 300);
    } else {
      setSelectedPiece({ row, col });
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
        { scale: withSequence(
          withTiming(1.5, { duration: 200 }),
          withTiming(0, { duration: 300 })
        )}
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
        {
          rotate: withSequence(
            withTiming('0deg'),
            withDelay(
              Math.random() * 1000,
              withSequence(
                withTiming('10deg', { duration: 200 }),
                withTiming('-10deg', { duration: 200 }),
                withTiming('0deg', { duration: 200 })
              )
            )
          )
        }
      ]
    }));

    return (
      <Pressable onPress={() => handlePiecePress(row, col)}>
        <Animated.Text 
          style={[
            styles.piece, 
            animatedStyle,
            piece.isSpecial && styles.specialPiece
          ]}
        >
          {piece.type}
        </Animated.Text>
      </Pressable>
    );
  };

  const BottomMenu = () => (
    <View style={styles.bottomMenu}>
      <Pressable onPress={initializeBoard} style={styles.menuItem}>
        <Text style={styles.menuIcon}>🎮</Text>
        <Text style={styles.menuText}>New Game</Text>
      </Pressable>
      <Pressable onPress={() => {}} style={styles.menuItem}>
        <Text style={styles.menuIcon}>🀄</Text>
        <Text style={styles.menuText}>Mahjong</Text>
      </Pressable>
      <Pressable onPress={loadLeaderboard} style={styles.menuItem}>
        <Text style={styles.menuIcon}>🏆</Text>
        <Text style={styles.menuText}>Leaderboard</Text>
      </Pressable>
    </View>
  );

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chuvita's Odyssey</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.score}>Score: {score}</Text>
        <Text style={styles.difficulty}>Level: {difficulty}</Text>
      </View>
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
  },
  menuIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  menuText: {
    color: '#fff',
    fontSize: 12,
  },
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