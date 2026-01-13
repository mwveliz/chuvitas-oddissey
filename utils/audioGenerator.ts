
import { Audio } from 'expo-av';

// B-Minor Scale Frequencies (approximate for 8-bit feel)
const FREQS = {
    B2: 123.47,
    Cs3: 138.59,
    D3: 146.83,
    E3: 164.81,
    Fs3: 185.00,
    G3: 196.00,
    A3: 220.00,
    B3: 246.94
};

// Simple "Bytebeat" style melody generator
// Generates a PCM WAV buffer directly in memory
export const generate8BitTheme = (): string => {
    const sampleRate = 8000; // Low sample rate for that "phone/80s" crunch
    const durationSeconds = 8; // 8 second loop
    const totalSamples = sampleRate * durationSeconds;

    // WAV Header (44 bytes) for 8-bit mono
    const headerBuffer = new ArrayBuffer(44);
    const view = new DataView(headerBuffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalSamples, true); // ChunkSize
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 for Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 1, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 1, true); // BlockAlign
    view.setUint16(34, 8, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, totalSamples, true); // Subchunk2Size

    const headerBytes = new Uint8Array(headerBuffer);
    const dataBytes = new Uint8Array(totalSamples);

    // Melody implementation: Arpeggiator in Bm
    // Pattern: B2 - F#3 - B3 - D3 (Classic broken chord)
    // Tempo: ~120 BPM -> 0.5s per note? 
    // Let's do 16th notes at 120bpm = 0.125s per note. 

    const notes = [
        FREQS.B2, FREQS.Fs3, FREQS.B3, FREQS.D3,
        FREQS.B2, FREQS.Fs3, FREQS.B3, FREQS.D3,
        FREQS.G3, FREQS.B3, FREQS.D3, FREQS.B3,
        FREQS.G3, FREQS.B3, FREQS.D3, FREQS.B3,
        FREQS.A3, FREQS.Cs3, FREQS.E3, FREQS.Cs3,
        FREQS.A3, FREQS.Cs3, FREQS.E3, FREQS.Cs3,
        FREQS.Fs3, FREQS.A3, FREQS.Cs3, FREQS.A3,
        FREQS.Fs3, FREQS.A3, FREQS.Cs3, FREQS.A3,
    ]; // 32 steps * 0.25s = 8 seconds

    const samplesPerNote = Math.floor(totalSamples / notes.length);

    for (let i = 0; i < totalSamples; i++) {
        const currentNoteIndex = Math.floor(i / samplesPerNote);
        const freq = notes[currentNoteIndex % notes.length];

        // Basic Square Wave Code
        // t = time in seconds
        const t = i / sampleRate;

        // Oscillator: Square Wave
        // value is 0-255. 128 is silence.
        // sign(sin) -> -1 or 1. 
        // mapped to 32-224 range for volume headroom

        const period = 1 / freq;
        const cycle = t % period;
        const isHigh = cycle < (period / 2);

        // Decay envelope per note
        const timeInNote = (i % samplesPerNote) / samplesPerNote;
        const volume = Math.max(0.1, 1 - timeInNote); // Decay

        const val = isHigh ? (128 + 60 * volume) : (128 - 60 * volume);

        dataBytes[i] = Math.floor(val);
    }

    // Combine Header + Data
    const fullFile = new Uint8Array(headerBytes.length + dataBytes.length);
    fullFile.set(headerBytes);
    fullFile.set(dataBytes, headerBytes.length);

    // Convert to Base64 String
    // Using a browser/RN friendly way without Buffer if possible, or simple looping
    // RN has direct binary base64 support issues sometimes, but let's try standard btoa polyfill or just implement it. 
    // Actually Expo can read data: uri directly. 
    return uint8ArrayToBase64(fullFile);
};

// Simple Uint8Array to Base64 converter required for RN environment if Buffer not polyfilled
function uint8ArrayToBase64(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Sound Effect Types
export type SoundEffectType = 'POP' | 'MATCH' | 'VICTORY';

export const generateSoundEffect = (type: SoundEffectType): string => {
    const sampleRate = 8000;
    let duration = 0.5; // Default short

    // Define parameters based on type
    if (type === 'VICTORY') duration = 2.5;

    const totalSamples = Math.floor(sampleRate * duration);

    // WAV Header
    const headerBuffer = new ArrayBuffer(44);
    const view = new DataView(headerBuffer);
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalSamples, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 1, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    writeString(36, 'data');
    view.setUint32(40, totalSamples, true);

    const headerBytes = new Uint8Array(headerBuffer);
    const dataBytes = new Uint8Array(totalSamples);

    // Generate Audio Data
    for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        let val = 128;

        if (type === 'POP') {
            // Noise burst with rapid decay suitable for "destroying"
            // White noise * envelope
            const random = Math.random() * 2 - 1; // -1 to 1
            const envelope = Math.pow(1 - (t / duration), 4); // Fast decay
            val = 128 + (random * 100 * envelope);
        }
        else if (type === 'MATCH') {
            // High pitch ding (Major) - E6 (1318.51 Hz) + G6 (1567.98 Hz) subtle harmonic
            // Simple Triangle/Sine-ish
            const freq = 1318.51;
            const envelope = Math.exp(-10 * t); // Exp decay
            // Sine wave
            const wave = Math.sin(2 * Math.PI * freq * t);
            val = 128 + (wave * 90 * envelope);
        }
        else if (type === 'VICTORY') {
            // C Major Arpeggio: C5 - E5 - G5 - C6
            // C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.50
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 0]; // 0 for silence/tail
            const noteDuration = 0.15;
            const noteIndex = Math.floor(t / noteDuration);

            if (noteIndex < notes.length) {
                const freq = notes[noteIndex];
                if (freq > 0) {
                    // Square wave for "Victory" feel (8-bit style)
                    const period = 1 / freq;
                    const cycle = t % period;
                    const isHigh = cycle < (period / 2);
                    // Slight decay per note
                    const timeInNote = t % noteDuration;
                    const vol = 1 - (timeInNote / noteDuration);

                    val = isHigh ? (128 + 60 * vol) : (128 - 60 * vol);
                } else {
                    val = 128;
                }
            } else {
                val = 128;
            }
        }

        dataBytes[i] = Math.max(0, Math.min(255, Math.floor(val)));
    }

    const fullFile = new Uint8Array(headerBytes.length + dataBytes.length);
    fullFile.set(headerBytes);
    fullFile.set(dataBytes, headerBytes.length);

    return uint8ArrayToBase64(fullFile);
};
