# Taxi Invoice (Expo)

Offline-first taxi invoice generator for Android (Expo / React Native, JavaScript).

## Prerequisites (fix `npm: command not found`)

`npm` ships with **Node.js**. If your terminal says `command not found`, install Node and open a **new** terminal window.

### macOS (pick one)

1. **Official installer (simplest)**  
   - Download the **LTS** build from [https://nodejs.org](https://nodejs.org)  
   - Run the installer, then quit and reopen Terminal (or Cursor’s integrated terminal).

2. **Homebrew**  
   ```bash
   brew install node
   ```

3. **nvm** (good if you use several Node versions)  
   - Follow [https://github.com/nvm-sh/nvm#installing-and-updating](https://github.com/nvm-sh/nvm#installing-and-updating)  
   - Then: `nvm install --lts` and `nvm use --lts`

### Check that it works

```bash
node -v
npm -v
```

Both should print a version number. If not, Node is still not on your `PATH` (restart the terminal app, or on Mac ensure `/usr/local/bin` is in PATH for Intel, or use the path Homebrew prints after `brew install node`).

## Run

From the project folder:

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
