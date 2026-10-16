# Steampunks Plane Two

Playable flight-game prototype, preserved from the supplied latest deployment archive. Includes the complete static runtime: editable JavaScript, HTML, CSS, model data, artwork, sound effects, icons and font. The original development project/build configuration and original test suite were not supplied.

## Run locally

With Python 3 installed:

```sh
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. Serve through HTTP rather than opening the HTML as a file. No dependency installation, backend, API key or build step is required. Edit the static runtime files in `dist/` directly. Deploy the contents of `dist/` to a static host when authorized.

## Prototype status

This is a FUN-credit demonstration, not a production real-money game. Existing mechanics, outcomes, presentation and assets are preserved; no certification or production financial suitability is claimed. Local session state uses the browser's local storage.

## Verification

All 30 supplied runtime files are included byte-for-byte unchanged. Only private deployment-host metadata was omitted. JavaScript syntax checks passed for `engine.js`, `game.js` and `renderer.js`; JSON files parsed successfully. Fresh interactive browser verification was blocked by this environment's browser/socket permissions. No original source-build or test-suite result is claimed.
