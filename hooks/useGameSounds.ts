
import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { generateSoundEffect, SoundEffectType } from '../utils/audioGenerator';

export const useGameSounds = () => {
    const sounds = useRef<Record<SoundEffectType, Audio.Sound | null>>({
        POP: null,
        MATCH: null,
        VICTORY: null
    });

    useEffect(() => {
        const loadSounds = async () => {
            const types: SoundEffectType[] = ['POP', 'MATCH', 'VICTORY'];

            for (const type of types) {
                try {
                    const base64 = generateSoundEffect(type);
                    const uri = `data:audio/wav;base64,${base64}`;
                    const { sound } = await Audio.Sound.createAsync({ uri });
                    sounds.current[type] = sound;
                } catch (e) {
                    console.warn(`Failed to load sound ${type}`, e);
                }
            }
        };

        loadSounds();

        return () => {
            Object.values(sounds.current).forEach(sound => sound?.unloadAsync());
        };
    }, []);

    const playSound = async (type: SoundEffectType) => {
        try {
            const sound = sounds.current[type];
            if (sound) {
                await sound.replayAsync();
            }
        } catch (e) {
            // Ignore errors during playback to avoid game impact
        }
    };

    return { playSound };
};
