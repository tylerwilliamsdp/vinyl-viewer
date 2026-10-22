# Vinyl Collection Viewer

A beautiful, mobile-first vinyl record collection page that pulls from your Discogs collection. Tap an NFC tag → Safari opens → see your records sorted by genre with album art.

## Setup (5 minutes)

### 1. Create a Discogs account & add your records

1. Go to [discogs.com](https://www.discogs.com) and create a free account
2. Download the **Discogs** app on your iPhone
3. Go to any record → tap **Collection** → **Add to Collection**
4. Or use the barcode scanner in the app to add records quickly
5. Make sure your collection is **public**: Profile → Settings → Privacy → Collection visibility: Public

### 2. Set your username

Open `app.js` in any text editor. Change line 3:

```js
const DISCOGS_USERNAME = 'YOUR_USERNAME_HERE';
```

Replace `YOUR_USERNAME_HERE` with your actual Discogs username (visible in your profile URL: `discogs.com/user/YOUR_USERNAME`).

### 3. Host on GitHub Pages (free)

1. Create a free [GitHub](https://github.com) account if you don't have one
2. Create a new repository — name it anything (e.g. `vinyl`)
3. Upload these three files: `index.html`, `style.css`, `app.js`
4. Go to **Settings → Pages → Source** → select `main` branch → Save
5. Your site will be live at `https://YOUR_GITHUB_USERNAME.github.io/vinyl/`

### 4. Write the NFC tag

1. Buy NTAG215 or NTAG213 stickers — search "NFC stickers" on Amazon, ~$10 for 20 pack
2. Install **NFC Tools** (free) from the App Store on your iPhone
3. Open NFC Tools → **Write** → **Add a record** → **URL/URI**
4. Enter your GitHub Pages URL
5. Tap **Write** → tap your iPhone to the NFC sticker
6. Stick it on your record player

Done. Tap your phone to the tag → Safari opens your collection.

## Features

- **Genre filter tabs** — dynamically built from your actual collection
- **Real-time search** — filters by artist, title, or genre as you type
- **Album art grid** — pulls cover images from Discogs
- **Detail modal** — tap any record to see year, label, genre tags
- **Dark mode** — looks great, album art pops
- **Mobile-first** — built for iPhone Safari

## Updating your collection

Just add records to Discogs via the app. The page pulls live from the API every time it loads — no rebuild needed.

## Troubleshooting

**"User not found"** — double-check your username in `app.js` matches your Discogs profile URL exactly (case-sensitive).

**"Collection is private"** — go to Discogs → Profile → Settings → Privacy → set Collection to Public.

**Images not loading** — Discogs occasionally returns placeholder images. This is normal for releases without uploaded artwork.

**Slow to load** — the first load fetches all pages of your collection. With 100+ records it may take a few seconds. Subsequent taps are the same since there's no caching (it always shows fresh data).
