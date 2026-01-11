import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Alert, TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_COLS = 8;
const GRID_ROWS = 16;
const BLOCK_SIZE = Math.floor((SCREEN_WIDTH - 40) / GRID_COLS);

// Colors for the pills/viruses
const COLORS = {
    EMPTY: 'transparent',
    RED: '#FF4136',
    BLUE: '#0074D9',
    YELLOW: '#FFDC00',
    GREEN: '#2ECC40',
};

type BlockType = 'EMPTY' | 'RED' | 'BLUE' | 'YELLOW' | 'GREEN';

type Block = {
    type: BlockType;
    isVirus: boolean;
    id?: string; // To group pill halves
};

type Position = {
    row: number;
    col: number;
};

type Pill = {
    pos1: Position;
    pos2: Position;
    color1: BlockType;
    color2: BlockType;
    orientation: 'horizontal' | 'vertical';
};

const INITIAL_SPEED = 800;

export default function PillsGame() {
    const [grid, setGrid] = useState<Block[][]>([]);
    const [activePill, setActivePill] = useState<Pill | null>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [speed, setSpeed] = useState(INITIAL_SPEED);

    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        startNewGame();
        return () => stopGameLoop();
    }, []);

    useEffect(() => {
        if (activePill && !gameOver) {
            stopGameLoop();
            gameLoopRef.current = setInterval(gameStep, speed);
        }
    }, [activePill, speed, gameOver]);

    const createEmptyGrid = () => {
        const newGrid: Block[][] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            const row: Block[] = [];
            for (let c = 0; c < GRID_COLS; c++) {
                row.push({ type: 'EMPTY', isVirus: false });
            }
            newGrid.push(row);
        }
        return newGrid;
    };

    const startNewGame = () => {
        const newGrid = createEmptyGrid();

        // Spawn Viruses based on level
        const virusCount = (level * 4) + 4;
        let placed = 0;
        while (placed < virusCount) {
            const r = Math.floor(Math.random() * (GRID_ROWS - 6)) + 6; // Bottom 10 rows
            const c = Math.floor(Math.random() * GRID_COLS);
            if (newGrid[r][c].type === 'EMPTY') {
                const types: BlockType[] = ['RED', 'BLUE', 'YELLOW'];
                newGrid[r][c] = {
                    type: types[Math.floor(Math.random() * types.length)],
                    isVirus: true
                };
                placed++;
            }
        }

        setGrid(newGrid);
        setScore(0);
        setGameOver(false);
        spawnPill();
    };

    const stopGameLoop = () => {
        if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }
    };

    const spawnPill = () => {
        const types: BlockType[] = ['RED', 'BLUE', 'YELLOW'];
        const color1 = types[Math.floor(Math.random() * types.length)];
        const color2 = types[Math.floor(Math.random() * types.length)];

        const newPill: Pill = {
            pos1: { row: 0, col: 3 },
            pos2: { row: 0, col: 4 },
            color1,
            color2,
            orientation: 'horizontal'
        };

        // Check collision on spawn
        if (grid[0][3].type !== 'EMPTY' || grid[0][4].type !== 'EMPTY') {
            setGameOver(true);
            Alert.alert("Game Over", `Score: ${score}`, [{ text: "Retry", onPress: startNewGame }]);
            return;
        }

        setActivePill(newPill);
    };

    const gameStep = () => {
        if (!activePill) return;

        if (canMove(activePill, 1, 0)) {
            setActivePill({
                ...activePill,
                pos1: { ...activePill.pos1, row: activePill.pos1.row + 1 },
                pos2: { ...activePill.pos2, row: activePill.pos2.row + 1 },
            });
        } else {
            lockPill();
        }
    };

    const canMove = (pill: Pill, dRow: number, dCol: number): boolean => {
        const next1 = { row: pill.pos1.row + dRow, col: pill.pos1.col + dCol };
        const next2 = { row: pill.pos2.row + dRow, col: pill.pos2.col + dCol };

        if (!isValidPos(next1) || !isValidPos(next2)) return false;

        // Check grid collision (ignore self)
        if (grid[next1.row][next1.col].type !== 'EMPTY') return false;
        if (grid[next2.row][next2.col].type !== 'EMPTY') return false;

        return true;
    };

    const isValidPos = (pos: Position) => {
        return pos.row >= 0 && pos.row < GRID_ROWS && pos.col >= 0 && pos.col < GRID_COLS;
    };

    const lockPill = () => {
        if (!activePill) return;

        const newGrid = [...grid.map(row => [...row])];
        newGrid[activePill.pos1.row][activePill.pos1.col] = { type: activePill.color1, isVirus: false };
        newGrid[activePill.pos2.row][activePill.pos2.col] = { type: activePill.color2, isVirus: false };

        setGrid(newGrid);
        setActivePill(null);

        checkMatches(newGrid);
    };

    const checkMatches = (currentGrid: Block[][]) => {
        // Find matches (4 in a row, Dr. Mario style, horizontal or vertical)
        // For simplicity, we'll start with 3+ like user asked "three inline"

        const toClear: Position[] = [];

        // Horizontal
        for (let r = 0; r < GRID_ROWS; r++) {
            let count = 0;
            let currentType: BlockType = 'EMPTY';
            for (let c = 0; c < GRID_COLS; c++) {
                if (currentGrid[r][c].type !== 'EMPTY' && currentGrid[r][c].type === currentType) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let k = 1; k <= count; k++) toClear.push({ row: r, col: c - k });
                    }
                    count = 1;
                    currentType = currentGrid[r][c].type;
                }
            }
            if (count >= 3 && currentType !== 'EMPTY') {
                for (let k = 1; k <= count; k++) toClear.push({ row: r, col: GRID_COLS - k });
            }
        }

        // Vertical
        for (let c = 0; c < GRID_COLS; c++) {
            let count = 0;
            let currentType: BlockType = 'EMPTY';
            for (let r = 0; r < GRID_ROWS; r++) {
                if (currentGrid[r][c].type !== 'EMPTY' && currentGrid[r][c].type === currentType) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let k = 1; k <= count; k++) toClear.push({ row: r - k, col: c });
                    }
                    count = 1;
                    currentType = currentGrid[r][c].type;
                }
            }
            if (count >= 3 && currentType !== 'EMPTY') {
                for (let k = 1; k <= count; k++) toClear.push({ row: GRID_ROWS - k, col: c });
            }
        }

        if (toClear.length > 0) {
            const newGrid = [...currentGrid.map(row => [...row])];
            toClear.forEach(p => {
                newGrid[p.row][p.col] = { type: 'EMPTY', isVirus: false };
            });
            setGrid(newGrid);
            setScore(prev => prev + toClear.length * 100);

            // Apply gravity after clear
            setTimeout(() => applyGravity(newGrid), 300);
        } else {
            spawnPill();
        }
    };

    const applyGravity = (currentGrid: Block[][]) => {
        // Simple isolated block gravity
        const newGrid = [...currentGrid.map(row => [...row])];
        let moved = false;

        for (let c = 0; c < GRID_COLS; c++) {
            for (let r = GRID_ROWS - 2; r >= 0; r--) {
                if (newGrid[r][c].type !== 'EMPTY' && !newGrid[r][c].isVirus && newGrid[r + 1][c].type === 'EMPTY') {
                    // Move down
                    newGrid[r + 1][c] = newGrid[r][c];
                    newGrid[r][c] = { type: 'EMPTY', isVirus: false };
                    moved = true;
                }
            }
        }

        if (moved) {
            setGrid(newGrid);
            setTimeout(() => applyGravity(newGrid), 100); // Cascading gravity
        } else {
            // Re-check matches after gravity settles
            checkMatches(newGrid);
        }
    };

    const controls = {
        left: () => {
            if (activePill && canMove(activePill, 0, -1)) {
                setActivePill({
                    ...activePill,
                    pos1: { ...activePill.pos1, col: activePill.pos1.col - 1 },
                    pos2: { ...activePill.pos2, col: activePill.pos2.col - 1 }
                });
            }
        },
        right: () => {
            if (activePill && canMove(activePill, 0, 1)) {
                setActivePill({
                    ...activePill,
                    pos1: { ...activePill.pos1, col: activePill.pos1.col + 1 },
                    pos2: { ...activePill.pos2, col: activePill.pos2.col + 1 }
                });
            }
        },
        down: () => {
            setSpeed(50); // Fast drop
        },
        rotate: () => {
            if (!activePill) return;
            // Rotate around pos1
            // Horizontal (1 left, 2 right) -> Vertical (1 bottom, 2 top) ??
            // For simplicity, toggle horizontal/vertical around pos1

            const newPos2 = activePill.orientation === 'horizontal'
                ? { row: activePill.pos1.row - 1, col: activePill.pos1.col } // Go vertical (up)
                : { row: activePill.pos1.row, col: activePill.pos1.col + 1 }; // Go horizontal (right)

            if (isValidPos(newPos2) && grid[newPos2.row][newPos2.col].type === 'EMPTY') {
                setActivePill({
                    ...activePill,
                    pos2: newPos2,
                    orientation: activePill.orientation === 'horizontal' ? 'vertical' : 'horizontal'
                });
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.stats}>
                <Text style={styles.text}>Score: {score}</Text>
                <Text style={styles.text}>Lvl: {level}</Text>
            </View>

            <View style={styles.grid}>
                {grid.map((row, rIndex) => (
                    <View key={rIndex} style={styles.row}>
                        {row.map((block, cIndex) => {
                            // Check if part of active pill
                            let displayBlock = block;
                            if (activePill) {
                                if (activePill.pos1.row === rIndex && activePill.pos1.col === cIndex)
                                    displayBlock = { type: activePill.color1, isVirus: false };
                                if (activePill.pos2.row === rIndex && activePill.pos2.col === cIndex)
                                    displayBlock = { type: activePill.color2, isVirus: false };
                            }

                            return (
                                <View
                                    key={cIndex}
                                    style={[
                                        styles.cell,
                                        displayBlock.type !== 'EMPTY' && {
                                            backgroundColor: COLORS[displayBlock.type],
                                            borderWidth: 1,
                                            borderColor: 'rgba(0,0,0,0.2)'
                                        },
                                        displayBlock.isVirus && styles.virus
                                    ]}
                                >
                                    {displayBlock.isVirus && <Text style={{ fontSize: BLOCK_SIZE * 0.6 }}>🦠</Text>}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>

            <View style={styles.controls}>
                <TouchableOpacity style={styles.btn} onPress={controls.left}><Text style={styles.btnText}>⬅️</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnBig]} onPress={controls.rotate}><Text style={styles.btnText}>🔄</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnBig]} onPress={controls.down} onPressOut={() => setSpeed(INITIAL_SPEED)}><Text style={styles.btnText}>⬇️</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={controls.right}><Text style={styles.btnText}>➡️</Text></TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginBottom: 10,
    },
    text: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    grid: {
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    virus: {
        borderRadius: BLOCK_SIZE / 2, // Circle
        transform: [{ scale: 0.8 }],
    },
    controls: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 10,
    },
    btn: {
        backgroundColor: '#fff',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    btnBig: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFD700',
    },
    btnText: {
        fontSize: 24,
    }
});
