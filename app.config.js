// Expo reads this in preference to app.json. Everything static still lives in
// app.json; this wrapper injects values that differ per developer or per build.
const appJson = require("./app.json");

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    // Point the app at your machine's LAN IP while developing:
    //   EXPO_PUBLIC_API_BASE=http://192.168.1.5:3000/api/v1 npx expo start
    // See DEV_SETUP.md. Falls back to the emulator-friendly localhost alias.
    apiBase: process.env.EXPO_PUBLIC_API_BASE || null,
  },
});
