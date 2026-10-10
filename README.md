# Not Following Back

A small Instagram-style web app that shows who you follow but who doesn't follow you back. It can be installed on a phone like an app (PWA) and works offline.

Everything runs on your device. Your files are never uploaded, and the app makes no requests to Instagram except when you tap an account to open it.

## Why it needs your Instagram export

Instagram does not let any app read follower lists from a username, even for public accounts, and the official API does not offer them. Tools that claim to do this ask for your password or scrape the site, which breaks Instagram's rules and can get your account restricted. This app uses the official **Download your information** export instead.

## How to use

1. In Instagram, open **Settings -> Accounts Center -> Your information and permissions -> Download your information**.
2. Choose **Followers and following**, pick **JSON** (HTML also works) and request the download.
3. When Instagram emails you, download and unzip the file.
4. Open `connections/followers_and_following/`.
5. In the app, type your username, choose `followers_1.json` (select more than one if you have `followers_2.json`, etc.) and `following.json`, then tap **Find non-followers**.
6. Tap any account to open it in Instagram.

## Features

- **Not following back**: accounts you follow that don't follow you.
- **Unfollowed you**: people who followed you at your previous check but don't now.
- **New followers**: people who started following you since your previous check.
- **Fans**: people who follow you that you don't follow back.
- **Hide / Restore**: remove accounts you don't mind (friends, brands) from the main list.
- **Search, sort, copy list**.
- **Saved history**: the last 12 checks per username are kept in your browser (localStorage). Upload a newer export later to see changes.
- **Delete saved data** for a username at any time.
- Light and dark mode, installable, works offline.

## Run it

You need a static web server because the service worker and install prompt only work over `http://localhost` or `https://`.

```bash
cd not-following-back
python3 -m http.server 8080
```

Then open http://localhost:8080. You can also open `index.html` directly, but offline mode and installing will not be available.

## Install on your phone

- **Android (Chrome):** menu -> Install app.
- **iPhone (Safari):** Share -> Add to Home Screen.

## Files

| File | Purpose |
|---|---|
| `index.html` | App structure |
| `style.css` | Instagram-style design, light and dark themes |
| `app.js` | Parsing, comparison, history, UI logic |
| `manifest.webmanifest` | Install details (name, colors, icons) |
| `sw.js` | Offline cache |
| `icons/` | App icons (SVG, PNG 32/180/192/512, maskable 512) |

## Turn it into a native app

The logic in `app.js` is plain JavaScript. To make an Android or iOS app, wrap this folder with [Capacitor](https://capacitorjs.com): `npm i @capacitor/core @capacitor/cli`, `npx cap init`, set `webDir` to this folder, then `npx cap add android` / `ios`.

## Notes

- Not affiliated with or endorsed by Instagram or Meta.
- Usernames are matched in lowercase. Accounts that changed their username since the export will show up under their old name.
- Export format can change. The app reads both the JSON and HTML formats Instagram currently provides.
