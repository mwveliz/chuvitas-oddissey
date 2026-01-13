import { useState, useEffect } from 'react';
import { useGameSounds } from '../hooks/useGameSounds';
import { View, Text, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMNS = 4;
const PADDING = 20;
// Calculate tile size to fit screen width with padding
const TABLE_WIDTH = SCREEN_WIDTH - (PADDING * 2);
const TILE_WIDTH = Math.floor(TABLE_WIDTH / COLUMNS) - 4; // -4 for gaps
const TILE_HEIGHT = Math.floor(TILE_WIDTH * 1.3); // 4:3 aspect ratio roughly
const START_X = PADDING;
const START_Y = 50;

// Simple emoji set for tiles
// Hard Mode: Similar looking dogs and cats to increase difficulty
const TILE_TYPES = [
    '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', // Canines
    '🐱', '🐈', '🐈‍⬛', '🐯', '🦁', '🐆',       // Felines
    '🐾', '🦴', '🥩', '🍖', '🌭'               // Related items
];

type Tile = {
    id: string;
    type: string;
    x: number;
    y: number;
    z: number; // Layer index (0 or 1)
    isVisible: boolean;
};

export default function MahjongGame() {
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const { playSound } = useGameSounds();

    useEffect(() => {
        startNewGame();
    }, []);

    const startNewGame = (customLevel?: number) => {
        const currentLevel = customLevel ?? level;
        const newTiles: Tile[] = [];
        let pairsNeeded = 0;

        // Level 1: 2 Layers (Simple) vs Level 2: Pyramid vs Level 3: Dense
        if (currentLevel === 1) {
            pairsNeeded = (24 + 8) / 2; // 16 pairs
        } else if (currentLevel === 2) {
            pairsNeeded = (36 + 12 + 4) / 2; // Pyramid 3 layers? Let's approximate
            // Layer 0: 6x6 (36)
            // Layer 1: 4x4 (16)
            // Layer 2: 2x2 (4) 
            // Total: 56 tiles -> 28 pairs
            pairsNeeded = 28;
        } else {
            // Level 3+: Dense Grid (8x5?) with smaller tiles?
            // Let's stick to same tile size but pack more layers or wider if space permits
            // Let's do a "Complex" 3 layer structure
            pairsNeeded = 36; // 72 tiles
        }

        // Choose random types for pairs
        let availableTypes = [];
        for (let i = 0; i < pairsNeeded; i++) {
            const type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
            availableTypes.push(type, type);
        }

        // Shuffle types
        availableTypes.sort(() => Math.random() - 0.5);
        let typeIndex = 0;

        if (currentLevel === 1) {
            // ... Existing Level 1 Logic ...
            // Layer 0 (6x4)
            for (let row = 0; row < 6; row++) {
                for (let col = 0; col < 4; col++) {
                    newTiles.push({
                        id: `l0-${row}-${col}`,
                        type: availableTypes[typeIndex++],
                        x: START_X + col * (TILE_WIDTH + 4),
                        y: START_Y + row * (TILE_HEIGHT / 2) + row * 10,
                        z: 0,
                        isVisible: true
                    });
                }
            }
            // Layer 1 (4x2)
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 2; col++) {
                    newTiles.push({
                        id: `l1-${row}-${col}`,
                        type: availableTypes[typeIndex++],
                        x: START_X + (col + 1) * (TILE_WIDTH + 4),
                        y: START_Y + (row + 1) * (TILE_HEIGHT / 2) + (row + 1) * 10 - 10,
                        z: 1,
                        isVisible: true
                    });
                }
            }
        } else if (currentLevel === 2) {
            // Level 2: Simple Pyramid Structure
            // Base 6x6 might be too wide, let's keep width constrains (4 cols max fits comfortably?)
            // Let's use 5 cols but shift X start
            const L2_START_X = START_X - 20;

            // Layer 0: 5x6 (30)
            for (let row = 0; row < 6; row++) {
                for (let col = 0; col < 5; col++) {
                    if (typeIndex >= availableTypes.length) break;
                    newTiles.push({ id: `l0-${row}-${col}`, type: availableTypes[typeIndex++], x: L2_START_X + col * (TILE_WIDTH + 2), y: START_Y + row * (TILE_HEIGHT / 1.5), z: 0, isVisible: true });
                }
            }
            // Layer 1: 3x4 (12)
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 3; col++) {
                    if (typeIndex >= availableTypes.length) break;
                    newTiles.push({ id: `l1-${row}-${col}`, type: availableTypes[typeIndex++], x: L2_START_X + (col + 1) * (TILE_WIDTH + 2), y: START_Y + (row + 1) * (TILE_HEIGHT / 1.5), z: 1, isVisible: true });
                }
            }
            // Layer 2: 1x2 (2) or similar... filler
            while (typeIndex < availableTypes.length) {
                // Push remaining on top center
                newTiles.push({ id: `l2-${typeIndex}`, type: availableTypes[typeIndex++], x: L2_START_X + 2 * (TILE_WIDTH + 2), y: START_Y + 2.5 * (TILE_HEIGHT / 1.5), z: 2, isVisible: true });
            }

        } else {
            // Level 3: "Smaller Cards" -> We need to override TILE_WIDTH logic potentially or just scale transform?
            // For simplicity, let's just make a very tall tower or dense single layer with overlaps
            // Let's try 3 dense layers of 4x5
            for (let z = 0; z < 3; z++) {
                for (let row = 0; row < 6; row++) {
                    for (let col = 0; col < 4; col++) {
                        if (typeIndex >= availableTypes.length) break;
                        newTiles.push({
                            id: `l${z}-${row}-${col}`,
                            type: availableTypes[typeIndex++],
                            x: START_X + col * (TILE_WIDTH + 4) + (z * 10), // slight offset per layer
                            y: START_Y + row * (TILE_HEIGHT / 2) + (z * 10),
                            z: z,
                            isVisible: true
                        });
                    }
                }
            }
        }

        setTiles(newTiles);
        if (customLevel === 1) setScore(0); // Reset score only on full restart
        setSelectedTileId(null);
    };

    const isTileFree = (tile: Tile) => {
        // A tile is free if:
        // 1. No tile is directly above it (z+1) covering it
        // 2. Either Left or Right side is free (on same z level)

        // Check for covering tiles
        const coveringTile = tiles.find(t =>
            t.isVisible &&
            t.z === tile.z + 1 &&
            Math.abs(t.x - tile.x) < TILE_WIDTH / 2 && // More lenient overlap check
            Math.abs(t.y - tile.y) < TILE_HEIGHT / 2
        );
        if (coveringTile) return false;

        // Check LEFT neighbor
        const leftNeighbor = tiles.find(t =>
            t.isVisible &&
            t.z === tile.z &&
            t.id !== tile.id &&
            Math.abs(t.y - tile.y) < TILE_HEIGHT / 2 &&
            t.x < tile.x &&
            tile.x - t.x < TILE_WIDTH + 10 // Must be very close to block
        );

        // Check RIGHT neighbor
        const rightNeighbor = tiles.find(t =>
            t.isVisible &&
            t.z === tile.z &&
            t.id !== tile.id &&
            Math.abs(t.y - tile.y) < TILE_HEIGHT / 2 &&
            t.x > tile.x &&
            t.x - tile.x < TILE_WIDTH + 10
        );

        // Must have at least one side open
        return !leftNeighbor || !rightNeighbor;
    };

    const handleTilePress = (tile: Tile) => {
        if (!isTileFree(tile)) return; // Cannot select blocked tiles

        if (selectedTileId === tile.id) {
            setSelectedTileId(null); // Deselect
            return;
        }

        if (!selectedTileId) {
            setSelectedTileId(tile.id); // Select first
        } else {
            // Try match
            const selectedTile = tiles.find(t => t.id === selectedTileId);
            if (selectedTile && selectedTile.type === tile.type) {
                // Match found!
                const newTiles = tiles.map(t => {
                    if (t.id === tile.id || t.id === selectedTileId) {
                        return { ...t, isVisible: false };
                    }
                    return t;
                });
                setTiles(newTiles);
                setScore(prev => prev + 100);
                setSelectedTileId(null);

                playSound('MATCH');

                // Check win
                if (newTiles.every(t => !t.isVisible)) {
                    const nextLevel = level + 1;
                    Alert.alert("Victory!", `Level ${level} Cleared!`, [
                        {
                            text: "Next Level", onPress: () => {
                                setLevel(nextLevel);
                                setTimeout(() => startNewGame(nextLevel), 100);
                            }
                        }
                    ]);
                }
            } else {
                // Mismatch, select new one
                setSelectedTileId(tile.id);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.scoreText}>Score: {score}</Text>
                    <Text style={[styles.scoreText, { fontSize: 14 }]}>Level: {level}</Text>
                </View>
                <Pressable onPress={() => { setLevel(1); startNewGame(1); }} style={styles.resetButton}>
                    <Text style={styles.resetText}>Restart</Text>
                </Pressable>
            </View>

            <View style={styles.boardContainer}>
                {tiles.filter(t => t.isVisible).sort((a, b) => a.z - b.z).map(tile => (
                    <TileComponent
                        key={tile.id}
                        tile={tile}
                        isSelected={selectedTileId === tile.id}
                        onPress={() => handleTilePress(tile)}
                        isFree={isTileFree(tile)}
                    />
                ))}
            </View>
        </View>
    );
}

const TileComponent = ({ tile, isSelected, onPress, isFree }: { tile: Tile, isSelected: boolean, onPress: () => void, isFree: boolean }) => {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: withSpring(isSelected ? 1.1 : 1) }],
            zIndex: tile.z * 10 + (isSelected ? 999 : 1)
        };
    });

    return (
        <Animated.View style={[
            styles.tile,
            {
                left: tile.x,
                top: tile.y,
                backgroundColor: isSelected ? '#FFD700' : (tile.z === 1 ? '#FFF8E7' : '#E0E0E0'),
                elevation: tile.z * 5 + 2,
                opacity: isFree ? 1 : 0.6 // Dim blocked tiles
            },
            animatedStyle
        ]}>
            <Pressable onPress={onPress} style={styles.tilePress} disabled={!isFree}>
                <Text style={styles.tileText}>{tile.type}</Text>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginVertical: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 10,
        borderRadius: 10,
    },
    scoreText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    resetButton: {
        backgroundColor: '#FF4081',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 5,
    },
    resetText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    boardContainer: {
        flex: 1,
        width: '100%',
        position: 'relative',
        height: SCREEN_HEIGHT * 0.7, // Take up 70% of height
    },
    tile: {
        position: 'absolute',
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#8B4513',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 2,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    tilePress: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileText: {
        fontSize: TILE_WIDTH * 0.6, // Scale font with tile width
    }
});
