# Tests für Plattenteller

Die Tests laufen **ohne Browser, echtes Firebase oder Spotify**: Eine Firebase-Attrappe (`fakefb.js`) und jsdom spielen Host
und Handys nach. Geprüft werden Spielabläufe, Playlists, Jahre-Ermittlung, Hitster, Quiz und die Firebase-Regeln.

## Ausführen

```
cd tests
npm install        # einmalig (jsdom, qrcode-generator)
npm test           # alle Testreihen, endet mit „ALLE TESTREIHEN OK“
node smoke10.js    # einzelne Reihe
```

Der Ordner `tests/` liegt **im Repo neben** `index.html` und `docs/`. Die Tests nehmen automatisch `../index.html` und
`../docs/firebase-rules.json`. Zum Überschreiben: Umgebungsvariablen `PT_INDEX` und `PT_RULES` (Pfade zu den Dateien).

## Testreihen

| Datei | Prüft |
| --- | --- |
| `smoke.js` | Lobby, Beitritt, Kick, Raum schließen |
| `smoke2.js` | Zusammen-Modus über Handys |
| `smoke3.js` | Neuladen des Hosts mitten im Spiel |
| `smoke4.js` | Aufräumen alter Räume |
| `smoke5.js` | Offline, Aussteigen, Späteinsteiger |
| `smoke6.js` | Rangliste, Fortschritt, Play-Anzeige |
| `smoke7.js` | Playlists merken, Songauswahl sichern, Debug-Ansicht |
| `smoke8.js` | Jahre ermitteln (MusicBrainz) |
| `smoke11.js` | Playlist-Import: ganze Playlist, Paging, Duplikate, Filter |
| `smoke12.js` | Runden pro Spiel, sparsames Jahre-Prüfen im Hitster-Modus |
| `smoke14.js` | „PT“-Kürzel als Ordner-Ersatz für „Meine Playlists“, eingeklappte Songliste |
| `smoke13.js` | Gemeinsamer Jahre-Speicher (Firebase `years/`): Treffer, Schreiben, Rückfälle ohne/mit gesperrtem Firebase |
| `smoke9.js` | Hitster-Modus |
| `smoke10.js` | Quiz-Modus |
| `rules_test.js` | Firebase-Regeln (Simulator `rules_sim.js`) |
| `repro_offline.js` | Online-Status nach Neuladen |

## Beim Weiterentwickeln

- Neue Funktion → **neue Testreihe** `smokeN.js` (Vorlage: `smoke9.js` / `smoke10.js`) und in `run-all.js` eintragen.
- Geänderte Firebase-Regeln → `rules_test.js` um die neuen Fälle erweitern.
- Zeitgeber lassen sich verkürzen: `window.PT_HEARTBEAT_MS`, `PT_MB_GAP_MS`, `PT_QUIZ_COUNTDOWN_MS`, `PT_OFFLINE_DELAY_MS`.
- Die Attrappe wertet Sicherheitsregeln **nicht** aus — dafür `rules_test.js`. Nur für `years/` bildet sie „einmal schreiben, nie überschreiben“ nach und kann Zugriff sperren (`shared.denyYears`) oder hängen lassen (`shared.hangYears`).
- Echtes Spotify, MusicBrainz und echte Handys bleiben ein manueller Test.

## Screenshots (optional)

`screenshots/*.js` erzeugen Bilder der Oberfläche (`npm i puppeteer-core @sparticuz/chromium` im Ordner `screenshots`).
Ohne installierte Schrift „Inter“ sehen die Bilder leicht anders aus.
