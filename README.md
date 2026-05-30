# biz499

A React Native app (Expo + TypeScript) for creating and managing ads, built with NativeWind, Zustand, and React Hook Form.

## features

- **Onboarding**: Swipeable intro screens.
- **Authentication**: Sign Up, Login, Forgot Password (simulated).
- **Dashboard**: View ad stats and recent ads.
- **Create Ad Wizard**: Multi-step form to create ads with image picker.
- **Profile**: Edit profile, logout, settings.
- **Persistence**: User session and ads are saved locally.

## Setup & Run

1.  **Install Dependencies**:
    ```bash
    cd biz499
    npm install
    ```

2.  **Start the Server**:
    ```bash
    npx expo start
    ```

3.  **Run on Device/Simulator**:
    -   Press `i` for iOS Simulator.
    -   Press `a` for Android Emulator.
    -   Scan QR code with Expo Go app on physical device.

## Tech Stack

-   **Framework**: Expo (React Native)
-   **Language**: TypeScript
-   **Styling**: NativeWind (Tailwind CSS)
-   **State Management**: Zustand (Persisted with AsyncStorage)
-   **Navigation**: React Navigation (Native Stack + Bottom Tabs)
-   **Forms**: React Hook Form + Zod
