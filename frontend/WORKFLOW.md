# HangOutHub Frontend Workflow

## Local development

Start the backend:

```bash
cd backend
npm run start:dev
```

Start the frontend on your LAN:

```bash
cd frontend
npm run start:lan:auto
```

Use this when you are developing locally.

## Send an update to Android testers

If you changed:
- pages
- text
- styles
- buttons
- navigation
- JavaScript or TypeScript logic

publish an OTA update:

```bash
cd frontend
npm run eas:update:preview
```

## Rebuild Android

If you changed:
- a native dependency
- an Expo plugin
- `app.json`
- anything native

rebuild the Android app:

```bash
cd frontend
npm run eas:build:preview
```

## Simple rule to remember

- `start:lan:auto` = develop locally
- `eas:update:preview` = send app changes to testers
- `eas:build:preview` = only for native changes

## Important

- Local development can use your LAN backend IP.
- Android preview builds should use the public backend URL.
- Do not mix the two when publishing updates.
- MapLibre is native, so the map screen now relies on a dev or preview build rather than Expo Go.
