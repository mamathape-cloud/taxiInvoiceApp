# Taxi Invoice (Expo)

Offline-first taxi invoice generator for Android (Expo / React Native, JavaScript).

## Run

```bash
npm install
npx expo start
```

Then open in Expo Go or run `npm run android`.

## Structure

- `database/db.js` — SQLite (`expo-sqlite`) helpers
- `screens/` — app screens
- `components/` — reusable forms and invoice preview
- `utils/` — HTML for PDFs, amount-to-words, escaping
