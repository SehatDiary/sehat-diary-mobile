# Dev Setup — Sehat Diary Mobile

## Prerequisites

- Node.js, Ruby 3.3+, Rails 8+
- Xcode (for iOS simulator)
- Expo Go app on physical iPhone
- Both Mac and phone on the same WiFi network

## 1. Start the Rails API

```bash
cd ~/workplace-2026/sehat_diary
rails server -b 0.0.0.0
```

`-b 0.0.0.0` is required so physical devices can reach the API. Without it, Rails only listens on localhost (simulator-only).

Verify: `curl http://localhost:3000/api/v1/health` should return `{"status":"ok"}`.

## 2. Point the app at your machine

Check your Mac's IP:

```bash
ipconfig getifaddr en0
```

Pass it to Expo — the app reads `EXPO_PUBLIC_API_BASE` (via `app.config.js`),
so the address is never committed to source:

```bash
EXPO_PUBLIC_API_BASE=http://192.168.1.5:3000/api/v1 npx expo start
```

On an emulator or simulator you can omit it: the app falls back to
`http://10.0.2.2:3000/api/v1` on Android and `http://localhost:3000/api/v1`
elsewhere.


## 3. Start Metro (Expo)

```bash
cd ~/workplace-2026/sehat-diary-mobile
npx expo start
```

This shows a QR code and interactive menu:
- Press `i` — open iOS simulator
- Scan QR code — open on physical iPhone via Expo Go

Both devices connect to the same Metro server simultaneously.

## 4. Test on simulator

Press `i` in the Metro terminal. Expo Go opens on the simulator.

- Simulator reaches Rails via `localhost:3000` internally (but our config uses the LAN IP which also works)
- No special setup needed

## 5. Test on physical iPhone

1. Install **Expo Go** from the App Store
2. Open camera and scan the QR code from the Metro terminal
3. The app opens in Expo Go

If the phone shows "Something went wrong":
- Verify phone and Mac are on the same WiFi
- Test from phone Safari: `http://<YOUR_MAC_IP>:3000/api/v1/health`
- If that fails, Rails isn't bound to `0.0.0.0` — restart with `-b 0.0.0.0`

## 6. Test accounts

Login with phone number + OTP on the auth screen. The app routes based on role:
- **Caregiver** → Dashboard (family members, pending actions)
- **Patient** → Daily Medicines screen

## Troubleshooting

| Problem | Fix |
|---|---|
| Phone shows "Network Error" | Rails not bound to `0.0.0.0`, or wrong IP in `API_BASE` |
| Simulator works, phone doesn't | `API_BASE` still set to `localhost` |
| "Something went wrong" on first screen | API call failing — check Metro terminal for errors |
| App stuck on loading | Metro not running, or Expo Go can't reach it |
| Metro port 8081 in use | `lsof -i :8081 -t \| xargs kill` then restart |
| Clear auth/session on phone | Delete and reinstall Expo Go (iOS Keychain persists across reinstalls) |
| Clear auth on simulator | `xcrun simctl erase <DEVICE_ID>` |
