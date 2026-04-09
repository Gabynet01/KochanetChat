# Kochanet Chat - AI-Powered Collaborative Workspace

Kochanet Chat is a premium, real-time collaborative mobile application built with React Native and Expo. It features seamless human-to-human communication integrated with an on-demand AI assistant that provides ultra-smooth streaming responses and intelligent context awareness.

---

> [!IMPORTANT]
> **Firebase plan: two ways to run the backend**
>
> - **Blaze plan:** If your Firebase project is on **Blaze** and you deploy Cloud Functions (v2) and related services to production, you can **skip the local-emulator parts of this README** (emulator install, `npm run emulate`, and notes that say emulators are mandatory). Use production credentials in `.env`, deploy functions (`firebase deploy --only functions` or your CI), and run the app against your live project. You still need the usual mobile config (`google-services.json`, `GoogleService-Info.plist`, env vars)—only the **mandatory emulator** workflow does not apply.
>
> - **Spark (free) / no Blaze:** Cloud Functions (v2) and some triggers are not available for production deployment on the free tier alone. **Local emulation of the Firebase suite is mandatory** for full functionality (AI responders, push notifications, presence sync, etc.).

---

## 🚀 Key Features

- **Real-Time Messaging**: Sub-second synchronization across devices using Firestore incremental listeners. Optimized with **Firestore Batching** for read/delivered receipts to minimize network overhead.
- **On-Demand AI Assistant**: Summon `@ai` for context-aware assistance. Features **Progressive Streaming** (token-by-token) and **Smart Rate Limiting** (15s cooldown per user) to protect API quotas.
- **Native Google One Tap**: Modern, frictionless authentication using Android Credential Manager and iOS One Tap.
- **High-Performance Presence & Typing**: Real-time status tracking and "typing..." indicators powered by Firebase Realtime Database (RTDB) for zero-latency UI updates.
- **Native App Badging**: Synchronized unread counts reflected directly on the app icon using `expo-notifications`.
- **Global Error Handling**: A centralized, professional toast-based notification system with support for both error alerts and success confirmations.
- **Voice Intelligence**: Send voice notes with server-side transcription via OpenAI Whisper and listen to AI responses via Native TTS.
- **Image UX**: High-fidelity media sharing with **Full-Screen Preview** and native modal interactions.
- **Modern UX**: Haptic feedback, smooth animations, safe-area compliance, and precision keyboard tracking.

---

## 🛠 Technology Stack

### Core

- **React Native + Expo (SDK 54)**: Managed workflow with `expo-dev-client` for native performance and rapid iteration.
- **TypeScript**: Full type safety across the mobile client and backend functions.
- **Zustand + MMKV**: Ultra-fast state management combined with a high-performance synchronous storage layer.

### Backend & AI

- **Firebase Suite**: Auth, Firestore, RTDB, Storage, and Cloud Functions (v2).
- **OpenAI GPT-4o-mini**: Powers the conversational engine with smart summarization for long-term memory.
- **Whisper API**: High-fidelity audio transcription for voice communication.

---

## 🏗 Architecture Overview

The application follows a modular architecture designed for zero-latency interactions:

### Real-Time Strategy

1. **Firestore onSnapshot**: Handles message persistence and real-time thread updates.
2. **Atomic Batch Updates**: Mark-as-read and Mark-as-delivered operations use `writeBatch` to group multiple document updates into a single atomic transaction, significantly reducing Firestore write costs and latency.
3. **RTDB for High-Frequency State**: Both **User Presence** and **Typing Indicators** are handled via RTDB to provide sub-100ms feedback while bypassing Firestore document write limits.
4. **Smooth Streaming v2**: AI responses are updated in Firestore on a per-token basis. The client uses `onSnapshot` to render these updates progressively, providing a ChatGPT-like experience.

### Cloud Functions (v2)

- **`onChatMessageCreated`**: Triggers the AI assistant with context summarization, handles push notifications, increments unread counts, and enforces **AI Rate Limiting** (15s cooldown).
- **`onUserStatusChanged`**: Automatically syncs RTDB presence state (Online/Offline) to Firestore user profiles for global discovery.
- **`transcribeAudio`**: On-call function for handling server-side Whisper transcription from Cloud Storage.

---

## ⚙️ Setup & Installation

**Using a Blaze plan?** You may **skip step 3** (Firebase emulators) below and skip emulator-only notes elsewhere in this document, as long as your backend is deployed and your `.env` points at **production** Firebase. The expandable **Detailed Firebase Setup Guide** still applies for creating the app, keys, and native files—unless you already have an equivalent configured project.

### Prerequisites

- Node.js (v18+)
- pnpm (recommended)
- Firebase CLI (`npm install -g firebase-tools`) — optional if you never run emulators (Blaze + deployed backend only)
- OpenAI API Key (configured in `functions/.env`)

<details>
<summary><b>Detailed Firebase Setup Guide (Click to expand)</b></summary>

### 1. Project Creation & Authentication

- Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
- From the sidebar, go to **Security**, select **Authentication** and enable **Email/Password** and **Google** sign-in providers in the Authentication (might need to click "Get Started" first).

### 2. Web App Configuration

- From the sidebar, go to **Settings** then **General**, click the **Web** icon (`</>`) to create a new Web App (should be at the bottom part of the page).
- Follow the instructions to create a new Web App. Copy the `firebaseConfig` object and paste the values into the respective `EXPO_PUBLIC_FIREBASE_CONFIG_...` fields in your `.env` (use `.envtemplate` as a guide).

### 3. Android Platform Setup

- Create an **Android App** in the from the same **General** page (there should be an "Add app" button).
- Follow the instructions to create a new Android App. Download `google-services.json` and move it to the **root** of the project.
- **Important**: Open `google-services.json`, find the `client_id` with `client_type: 3`. Copy this value. If you don't find it, delete the app and make sure Authentication is enabled from Step 1 above.
- Paste this `client_id` into both `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in your `.env`.
- In the Firebase Console (General Settings > Android App), add a **SHA-1 certificate fingerprint**. To get this:
  - Run `eas credentials` in your terminal.
  - Choose `Android` -> `development build`.
  - Copy the **SHA1** from the output and paste it into Firebase.

### 4. iOS Platform Setup

- Create an **iOS App** in the Firebase settings.
- Download `GoogleService-Info.plist` and move it to the **root** of the project.
- Open `GoogleService-Info.plist`, find the `CLIENT_ID` key. Copy the string value.
- Paste this value into `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in your `.env`.

### 5. Push Notifications & Service Account

- In the Firebase Console, go to **Project Settings** > **Service accounts**.
- Click **Generate new private key**, download the file, and rename it to `fcm.json`.
- Copy `fcm.json` to the **root** of the project.
- Run `eas credentials` in your terminal.
- Choose **Google Services** > **Manage for [your bundle ID]** > **Push notifications**.
- Choose **Setup new key**.
  - If EAS discovers `fcm.json`, press `y` to confirm.
  - Otherwise, manually type `fcm.json` when asked for the file path.
- **Critical**: After the upload is complete, **delete fcm.json** from your local machine immediately for security.

### 6. Final Sync

- Ensure all three files (`google-services.json`, `GoogleService-Info.plist`, and `fcm.json` - before deletion) are present in the project root if you are building locally.
- Start the development server: `pnpm start`.
</details>

### Steps

1. **Clone & Install**:

   ```bash
   git clone <repo-url>
   cd kochanet-chat
   pnpm install
   cd functions && npm install
   ```

2. **Environment Configuration**:
   Create a `.env` in the root and `functions/.env` with your Firebase and OpenAI credentials.

3. **Start Firebase Emulators (skip on Blaze if you use production)**:
   **Not on Blaze, or not using deployed functions?** This step is **required**. In a separate terminal, from the `functions` directory:

   ```bash
   # From /functions
   npm run emulate
   ```

   _This starts Auth, Firestore, RTDB, Storage, and Functions locally._

   **On Blaze** with functions and rules already deployed: skip this step and ensure the app is configured for your **live** Firebase project (see `services/firebase.ts` / env: the default dev client may still target emulators—adjust or use a release build if you need production-only).

4. **Start Expo**:
   ```bash
   pnpm start
   ```
   _If testing on a physical device, ensure the `EXPO_PUBLIC_FIREBASE_CONFIG` host matches your local machine's IP (e.g., `192.168.1.X`)._

---

## 📱 Navigation & State Management

### Navigation Structure (`expo-router`)

- **(auth)**: Frictionless entry point with Email/Password and Google One Tap.
- **(main) / (tabs)**: Primary tab-based navigation for Inbox and Profile.
- **(main) / chat/[id]**: Deep-linked, high-performance chat room with contextual headers.
- **Modals**: Used for ephemeral interactions like `NewChat` and `EditProfile` to maintain user context.

### State management (`Zustand` + `MMKV`)

We utilize a multi-store approach for clean separation of concerns:

- **`useAuthStore`**: Manages user session, profile synchronization, and persistent login state.
- **`useChatStore`**: Reactive store for global unread counts and message synchronization logic.
- **`usePreferencesStore`**: Handles user-facing settings (Dark/Light mode, Notifications) with synchronous persistence via MMKV.
- **`useErrorStore`**: Globalized error reporting system for non-intrusive toast notifications.

---

## 🧠 AI Integration: @ai Assistant

### Invocation Mechanism

The AI is invoked server-side via a Cloud Function trigger (`onChatMessageCreated`). It scans all incoming messages for the `@ai` mention. This ensures the mobile client remains lightweight and the AI logic is centralized and secure.

### Context & Memory Management

- **Short-term Memory**: The last 20 messages in the thread are provided to OpenAI for immediate context awareness.
- **Context Summarization**: When history exceeds 20 messages, the system automatically summarizes the oldest 10 messages into a "Context Memory" block, which is then injected into the system prompt. This provides a balance between cost-efficiency and conversational continuity.
- **Streaming Experience**: Responses are streamed from OpenAI and written to Firestore in small word-batches. The React Native client uses `onSnapshot` to render these updates progressively, providing a premium "live" feel.

---

## 🛠 Mobile-Specific Optimizations

- **Keyboard Avoidance**: Precision keyboard tracking using `react-native-keyboard-controller`, ensuring the chat input remains pinned above the keyboard across all devices.
- **Lifecycle Resilience**: An `AppState` listener automatically re-syncs presence status when the app returns from the background and flushes the optimistic offline message queue.
- **Safe-Area Compliance**: Full layout awareness using `react-native-safe-area-context` for modern edge-to-edge displays.
- **Haptic Intelligence**: Tactical haptic feedback (Success notifications, Light taps for UI, Medium impacts for gestures) for a premium tactile feel.

---

## 🧪 Demo Instructions & Test Accounts

For the best experience, we recommend using two devices (or one device and the web/emulated environment) to test real-time features.

### Test Credentials

| Account    | Email               | Password       |
| ---------- | ------------------- | -------------- |
| **User A** | `test@example.com`  | `Password123!` |
| **User B** | `test2@example.com` | `Password123!` |

### Recommended Demo Flow

1. **Login**: Sign in as User A and User B on separate instances.
2. **Real-Time Synergy**: Send messages between accounts and observe sub-second delivery and unread count updates.
3. **Invoke AI**: Type `@ai, tell me a joke about coding` and watch the progressive streaming response.
4. **Voice Features**: Send a voice note; observe the server-side transcription and the AI's ability to play back text-to-speech.
5. **Presence**: Toggle one device offline/online and watch the status indicator update live on the other.

---

## 💡 Assumptions & Trade-offs

- **Assumption**: Real-time status updates (typing/online) are high-frequency and low-durability, so they were placed in the Realtime Database (RTDB) to avoid excessive Firestore costs and latency.
- **Trade-off (Presence)**: Using RTDB adds a secondary SDK dependency, but is necessary for the "premium" feel required by the brief.
- **Trade-off (AI Context)**: We summarize history rather than keeping the full long-chain memory to stay within the token limits of `gpt-4o-mini` while maintaining intelligent relevance.

---

## 🚧 Known Limitations & Future Work

- **Offline Sync**: While we provide an optimistic message queue, full Firestore offline persistence and multi-device merge conflicts require a more robust sync engine (e.g., WatermelonDB) for production-grade scale.
- **Media Uploads**: Currently supports images and audio; video support and file attachments are logical next steps.
- **What I would do differently**: Given more time, I would implement a more robust "Participant Hydration" system to avoid denormalizing user data (names/avatars) inside the chat object.

---

**Built with ❤️ for the Kochanet Developer Test.**
