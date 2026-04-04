# HangOutHub - Mobile Frontend

Mobile app for HangOutHub, built with Expo, React Native, TypeScript, and NativeWind.

## Prerequisites

- Node.js LTS
- Expo Go for quick iOS/Android testing
- Optional: Expo account for EAS Build and EAS Update

## Install

```bash
cd frontend
npm install
```

## Environment

Create `frontend/.env` and set:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.XX:3000
```

Use your local backend IP for same-network testing.
If you are on a different network, use an ngrok URL instead.

## Run locally

```bash
npm run start
```

Useful variants:

```bash
npm run start:lan
npm run start:tunnel
```

## Android workflow

We now use EAS for Android test builds and over-the-air updates.

### One-time setup

The project is already linked to Expo/EAS.

If you ever need to re-link it:

```bash
npx eas login
npx eas update:configure
```

### First Android test build

```bash
cd frontend
npx eas build -p android --profile preview
```

Android package:

```text
com.taiwo.hangouthub
```

Expo/EAS will create the Android keystore and give you a build link.
Install that build once on the Android phone.

### Future updates

For JS/UI changes, publish an EAS update:

```bash
cd frontend
npx eas update --channel preview --message "Small fix"
```

This is for:
- screen changes
- styles
- text
- navigation
- other JavaScript-only changes

### When you must rebuild

Create a new Android build if you change:
- native dependencies
- Expo plugins
- `app.json` native settings
- anything that changes the native runtime

### Quick rule

- JS/UI changes -> EAS Update
- Native changes -> new Android build

### iPhone note

For now, iOS can stay on Expo Go.
We are focusing the installed test-build flow on Android.

## Commands to remember

```bash
# local dev
npm run start

# Android test build
npx eas build -p android --profile preview

# publish a JS/UI update
npx eas update --channel preview --message "Small fix"
```

## Project structure

```text
frontend/
|-- app/            # Expo Router screens
|-- components/     # reusable UI
|-- services/       # API and app services
|-- hooks/          # shared hooks
|-- assets/         # images and fonts
`-- ...
```
