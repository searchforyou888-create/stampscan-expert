const { expo } = require("./app.json");

module.exports = () => ({
  ...expo,
  plugins: [
    ...(expo.plugins || []),
  ],
  extra: {
    ...(expo.extra || {}),
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "",
    revenueCatAppleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || "",
    revenueCatGoogleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || "",
    revenueCatWebApiKey: process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY || "",
  },
});