# biz499

A React Native app (Expo + TypeScript) for creating and managing ads, built with NativeWind, Zustand, and React Hook Form.

## features

- **Onboarding**: Swipeable intro screens.
- **Authentication**: Sign Up, Login by mobile number and otp.
- **Dashboard**: View ad stats and recent ads.
- **Create Ad Wizard**: Multi-step form to create ads with image picker.
- **Profile**: Edit profile, logout, settings.
- **Persistence**: User session and ads are saved locally.

## Requirements

Please see the [requirements.txt](./requirements.txt) file in the root of the project for a complete list of necessary software and environment prerequisites to run and build this app.

## How to Use the App

First, install the project dependencies:
```bash
npm install
```

There are two primary ways to run and test the app:

### 1. Using Expo Go (For Local Development)

This is the fastest way to run the app during development.

1.  **Start the Expo Development Server**:
    ```bash
    npx expo start
    ```
2.  **Run on a Physical Device**:
    -   **Important**: Ensure that both your development machine (PC/Mac) and your mobile device are connected to the **SAME Wi-Fi/Internet network**. If they are on different networks, the Expo Go app will not be able to connect to the local server.
    -   Download the **Expo Go** app on your iOS or Android device.
    -   Scan the QR code shown in the terminal (use the Camera app on iOS, or the Expo Go app's scanner on Android).
3.  **Run on a Simulator/Emulator**:
    -   Press `i` for iOS Simulator.
    -   Press `a` for Android Emulator.

### 2. By Building the App (For Production/Standalone Testing)

This method creates a standalone native binary (`.apk`, `.aab`, or `.ipa`) that you can install directly on a device without needing the Expo Go app.

1.  **Install EAS CLI**:
    ```bash
    npm install -g eas-cli
    ```
2.  **Login and Configure**:
    ```bash
    eas login
    eas build:configure
    ```
3.  **Create a Build**:
    -   For **Android** (creates a build for direct installation or Play Store):
        ```bash
        eas build --platform android --profile preview
        ```
    -   For **iOS** (requires an Apple Developer account):
        ```bash
        eas build --platform ios --profile preview
        ```
4.  **Install the Build**:
    -   Once the build completes, EAS will provide a link to download and install the standalone app directly on your device.

### 3. Running Locally via USB (Native Build)

If you want to build and install the native app directly to a connected physical device (via USB) or an emulator without using EAS Cloud:

1.  **For Android**:
    -   Ensure your Android device is connected via USB and **USB Debugging** is enabled in Developer Options.
    -   Run the following command:
        ```bash
        npx expo run:android
        ```
2.  **For iOS** (Mac only):
    -   Ensure your iPhone is connected via USB.
    -   Run the following command:
        ```bash
        npx expo run:ios
        ```
    *(Note: This requires Android Studio/SDK for Android, and Xcode for iOS).*

## API Keys & Configuration

If you are setting up the backend services for this app, you will need to configure your API keys, primarily for Meta (Facebook) integration.

### 1. Node.js Backend (`/backend`)
If using the standard Node.js server:
1. Navigate to the `backend/` directory.
2. Create a `.env` file by copying the example file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env.example` and fill in your credentials:
   - `META_APP_ID`: Your Meta App ID (from Facebook Developer Dashboard).
   - `META_APP_SECRET`: Your Meta App Secret.



Note : add your gemini api key in semgrep.txt in the [REDACTED_KEY] placeholder
## Tech Stack

-   **Framework**: Expo (React Native)
-   **Language**: TypeScript
-   **Styling**: NativeWind (Tailwind CSS)
-   **State Management**: Zustand (Persisted with AsyncStorage)
-   **Navigation**: React Navigation (Native Stack + Bottom Tabs)
-   **Forms**: React Hook Form + Zod
