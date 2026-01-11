# Chuvita's Odyssey (Android)

A mobile game built with React Native and Expo, optimized for Android.

## Requirements

- **Node.js**: Version 24 or newer.
- **npm** or **yarn**.
- **Expo Go** app on your Android device (or Android Emulator).

## Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start the Server**
    ```bash
    npx expo start --clear
    ```
    *Note: The `--clear` flag helps avoid caching issues after branch switches.*

3.  **Run on Android**
    -   **Physical Device**: Scan the QR code appearing in the terminal using the Expo Go app.
    -   **Emulator**: Press `a` in the terminal to launch on a connected Android Emulator.

## Troubleshooting

-   If you see `react-native-reanimated` errors, ensure `babel.config.js` exists and contains `plugins: ['react-native-reanimated/plugin']`.
-   Run `npx expo start --clear` to reset the Metro bundler cache.
