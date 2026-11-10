# Tender Desk

Tender and contract tracker: tender register, deadline calendar, payment tracker with Navy payment steps, competitors and remarks.

The site is a static page hosted on GitHub Pages. Data is stored in a Firebase Firestore database behind Google sign-in. No tender data is kept in this repository.

## One-time setup

### 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and choose **Add project**. Any name works. Google Analytics is not needed.
2. **Build > Firestore Database > Create database**. Choose **Production mode** and a nearby location (for example `asia-south1`).
3. **Build > Authentication > Get started > Sign-in method > Google > Enable**, then save.
4. **Authentication > Settings > Authorized domains > Add domain** and add the site's domain, for example `YOUR-USERNAME.github.io`.

### 2. Set who can open the register

1. Open **Firestore Database > Rules**.
2. Replace everything there with the contents of [`firestore.rules`](firestore.rules).
3. Replace the example addresses with the Google accounts that should have access, one per line, then **Publish**.

Anyone not on this list is refused, even after signing in.

### 3. Connect the site to the project

1. **Project settings (gear icon) > General > Your apps > Web (`</>`)**. Register an app. Hosting is not needed.
2. Copy the `firebaseConfig` values shown.
3. Paste them into [`firebase-config.js`](firebase-config.js) as `window.FIREBASE_CONFIG = { ... };` and commit.

This config is not a password. Access is controlled by the sign-in and the rules in step 2.

### 4. Turn on GitHub Pages

**Repository Settings > Pages > Build and deployment > Deploy from a branch**, branch `main`, folder `/ (root)`.

The site appears at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/` after a minute or two.

### 5. Load the existing tenders

Sign in on the site, open **Account > Import backup…** and choose the backup JSON file.

## Backups

**Account > Download backup (JSON)** saves every tender, with its remarks and payment steps, to one file. The same file can be imported again.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The site. Generated, do not edit by hand. |
| `src/tender-desk.html` | The app's source. |
| `build.py` | Rebuilds `index.html` from the source: `python3 build.py`. |
| `firebase-adapter.js` | Sign-in, database connection, backup and import. |
| `firebase-config.js` | Your Firebase project's config. |
| `firestore.rules` | Access rules to paste into the Firebase console. |
