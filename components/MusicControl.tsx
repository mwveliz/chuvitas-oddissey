
import React, { useEffect, useState, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { generate8BitTheme } from '../utils/audioGenerator';

export const MusicControl = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Generate and load sound on mount
        const loadSound = async () => {
            try {
                const base64Wav = generate8BitTheme();
                const uri = `data:audio/wav;base64,${base64Wav}`;

                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });

                const { sound } = await Audio.Sound.createAsync(
                    { uri },
                    { isLooping: true, volume: 0.4 } // Low volume "very soft"
                );

                soundRef.current = sound;

                // Auto-play on start? Usually bad UX, but user asked for "music". 
                // Let's default to OFF to be polite, or ON if they really want it. 
                // Given "is there a way to put a music symbol... [to toggle?]", let's default to playing if it's "background music".
                // Actually, user said "put a music simol... [and] put a very soft music".
                // I'll start playing by default.
                await sound.playAsync();
                setIsPlaying(true);
            } catch (error) {
                console.warn("Failed to load music", error);
            }
        };

        loadSound();

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const toggleMusic = async () => {
        if (!soundRef.current) return;

        // Animation feedback
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start();

        if (isPlaying) {
            await soundRef.current.pauseAsync();
        } else {
            await soundRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity onPress={toggleMusic} style={styles.button}>
                <Text style={styles.icon}>{isPlaying ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50, // Safe area ish
        right: 20,
        zIndex: 9999,
    },
    button: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    icon: {
        fontSize: 20,
    }
});
