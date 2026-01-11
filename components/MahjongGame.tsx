import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const BOARD_WIDTH = Dimensions.get('window').width;
const TILE_WIDTH = 40;
const TILE_HEIGHT = 50;

// Simple emoji set for tiles
const TILE_TYPES = ['🀄', '🃏', '🎴', '🎭', '🎨', '🎪', '🎫', '🎬', '🎧', '🎤', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🎳', '🎮', '👾', '🎰'];

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

    useEffect(() => {
        startNewGame();
    }, []);

    const startNewGame = () => {
        // Level Design: 2 Layers
        // Layer 0: 6x4 Grid
        // Layer 1: 4x2 Grid on top (centered)

        const newTiles: Tile[] = [];
        const pairsNeeded = (24 + 8) / 2; // (6*4 + 4*2) / 2 = 16 pairs

        // Choose random types for pairs
        let availableTypes = [];
        for (let i = 0; i < pairsNeeded; i++) {
            const type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
            availableTypes.push(type, type);
        }

        // Shuffle types
        availableTypes.sort(() => Math.random() - 0.5);

        let typeIndex = 0;

        // Generate Layer 0 (6x4)
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 4; col++) {
                newTiles.push({
                    id: `l0-${row}-${col}`,
                    type: availableTypes[typeIndex++],
                    x: col * (TILE_WIDTH + 2) + 50, // Center offset approx
                    y: row * (TILE_HEIGHT + 2) + 50,
                    z: 0,
                    isVisible: true
                });
            }
        }

        // Generate Layer 1 (4x2) - Centered on top
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 2; col++) {
                newTiles.push({
                    id: `l1-${row}-${col}`,
                    type: availableTypes[typeIndex++],
                    x: (col + 1) * (TILE_WIDTH + 2) + 50, // Offset to sit between layer 0 cols
                    y: (row + 1) * (TILE_HEIGHT + 2) + 40, // Offset to sit between layer 0 rows
                    z: 1,
                    isVisible: true
                });
            }
        }

        setTiles(newTiles);
        setScore(0);
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
            Math.abs(t.x - tile.x) < TILE_WIDTH &&
            Math.abs(t.y - tile.y) < TILE_HEIGHT
        );
        if (coveringTile) return false;

        // Check LEFT neighbor
        const leftNeighbor = tiles.find(t =>
            t.isVisible &&
            t.z === tile.z &&
            t.id !== tile.id &&
            Math.abs(t.y - tile.y) < TILE_HEIGHT / 2 && // Roughly same row
            t.x < tile.x && // Is to the left
            tile.x - t.x < TILE_WIDTH + 5 // Is touching or overlapping left
        );

        // Check RIGHT neighbor
        const rightNeighbor = tiles.find(t =>
            t.isVisible &&
            t.z === tile.z &&
            t.id !== tile.id &&
            Math.abs(t.y - tile.y) < TILE_HEIGHT / 2 &&
            t.x > tile.x && // Is to the right
            t.x - tile.x < TILE_WIDTH + 5
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

                // Check win
                if (newTiles.every(t => !t.isVisible)) {
                    Alert.alert("Victory!", "You cleared the board!", [{ text: "New Game", onPress: startNewGame }]);
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
                <Text style={styles.scoreText}>Score: {score}</Text>
                <Pressable onPress={startNewGame} style={styles.resetButton}>
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
        height: 400, // Fixed height for board
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
        fontSize: 24,
    }
});
