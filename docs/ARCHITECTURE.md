# Architektur & technische Details

## Stack

- Eine einzige `index.html`-Datei — HTML, CSS und JavaScript inline, kein Build-Schritt, kein Framework
- Deployment: GitHub Pages, Branch `main`, direkt aus dem Repo-Root
- Audio-Wiedergabe: Spotify iFrame-Embed-API — läuft komplett im Browser, keine externe Hardware nötig
- **Handy-Modi:** Firebase Realtime Database (Projekt `plattenteller-80cd8`, europe-west1) mit anonymer Anmeldung; SDK per CDN
  (`firebase-*-compat`), QR-Code per `qrcode-generator` (cdnjs). Datenmodell und Regeln: `firebase-multiplayer-plan.md`, `firebase-rules.json`.
- **Jahre/Herkunft:** MusicBrainz-Web-Service direkt aus dem Browser (CORS funktioniert), ca. 1 Anfrage pro Sekunde.
- Schrift: Inter (Google Fonts). Design: dunkel, minimal, Mint-Grün (Variante C „Equalizer“).
- Alternative Quelle: Deezer-Suche über einen eigenen Proxy (`PROXY_URL` + `PROXY_APP_KEY`) — funktioniert nur in der (shelved) Server-Version, im reinen Browser durch CORS blockiert

## Spotify-Auth

- PKCE-Flow (Proof Key for Code Exchange) — kein Client Secret im Frontend nötig
- Client ID: `96426600438a4e27a76fd24f62f345a2`
- Redirect URI: `https://ostpower.github.io/plattenteller/` — muss exakt im Spotify-Dashboard hinterlegt sein, sonst schlägt der Login fehl (auch lokal per `file://` nicht nutzbar). **Client ID und Redirect-URI nicht anfassen.**
- **Scopes:** `playlist-read-private playlist-read-collaborative` (seit v2026-10-11.2; nötig, um die eigenen, auch privaten Playlists aufzulisten und zu lesen).
  Die gewährten Scopes stehen in `localStorage` (`plattenteller_spotify_scope`); fehlt der Playlist-Scope, erscheint der Hinweis „Berechtigung erweitern“.
- Refresh Token wird in `localStorage` abgelegt, damit der Browser dauerhaft angemeldet bleibt

## Song-Suche & Balancing

Kernstück ist die Auswahl-Logik in `runSearch()`:

1. **Mehrfachauswahl bei Genres.** Werden mehrere Genre-Chips gewählt, verteilt sich das Ziel-Deck fair über alle gewählten Genres (`perGenreTarget = Math.ceil(desired / genreBuckets.length)`).
2. **Gestufter Popularity-Filter.** Statt einem harten Cutoff wird pro Genre getrennt in "bekannt" (Spotify-Popularity ≥30) und "Geheimtipp" (10–29) gesammelt, im Zielverhältnis 70/30 gemischt.
3. **`pickBalanced()`** ist der generische Verteil-Helfer: zieht aus mehreren "Buckets" (Genre × Popularity-Stufe) fair, füllt bei Materialmangel aus übrig gebliebenen Kandidaten anderer Buckets auf, dedupliziert automatisch über alle Buckets per Track-ID.
4. **`hasNonLatinScript()`** filtert Titel/Interpret mit kyrillischen, griechischen, hebräischen, arabischen oder CJK-Zeichen direkt beim Sammeln raus — für ein Ratespiel in Mitteleuropa praktisch nicht erratbare Songs werden so vermieden. Das ist ein Schrift-, kein Sprachfilter (lateinisch transkribierte Songs rutschen theoretisch noch durch).
5. **Max. 2 Songs pro Interpret** (`maxPerArtist`), um Dopplungen im Deck zu vermeiden. Gilt für Genre-/Freitextsuche und manuell hinzugefügte Songs — **nicht** für den Playlist-Import (siehe unten).
6. Zufalls-Offsets (Spotify: 0–300, Deezer: 0–900) sorgen für Streuung über die jeweilige Such-Ergebnisliste.
7. **Popularität fehlt seit 2026**: Spotify liefert das Feld `popularity` für Apps im Entwicklungsmodus nicht mehr (Debug-Ansicht bestätigt). Der Popularity-Filter greift dann nicht; die Suche nutzt den rohen Fallback-Pool. Für Qualität sind Playlists der bessere Weg.

## Playlists

- `fetchPlaylistTracks()` holt über `GET /v1/playlists/{id}/items` seitenweise (100 pro Seite, max. 20 Seiten) alle Songs. Der Song steckt seit 2026 im Feld
  **`item`** des Eintrags (`track` ist veraltet); der Code nimmt `entry.item || entry.track`. Podcast-Episoden werden übersprungen, `hasNonLatinScript()` filtert wie bei der Suche.
  Pro Song werden Titel, Interpret, Cover, Album-Jahr, **ISRC** und Albumtyp übernommen.
- **Nur eigene Playlists** sind lesbar (Spotify liefert Inhalte nur an Besitzer/Mitwirkende, sonst HTTP 403 — auch bei öffentlichen Playlists).
  Workaround: HITSTER-/Hitify-Playlists in Spotify als eigene Kopie anlegen (Songs markieren → Zur Playlist hinzufügen → Neue Playlist).
  Ordner in Spotify (z. B. „Plattenteller“) sieht die Schnittstelle nicht; darum gibt es in der App einen Namensfilter.
- **Meine Playlists:** `GET /v1/me/playlists` listet alle Playlists des Kontos; „Merken“ speichert sie pro Browser (`plattenteller_playlists`).
  Fest eingebaute Playlists: Konstante `DEFAULT_PLAYLISTS` im Code. „Liste kopieren/einfügen“ überträgt Listen zwischen Geräten.
- Die HITSTER-Preset-Chips (fremde Original-Playlists) liegen eingeklappt unter „Alte HITSTER-Links“ — sie scheitern normalerweise mit 403.
- **Die ganze Playlist wird 1:1 übernommen** (Entscheidung Marcel, 26.09.; umgesetzt in v2026-10-13.1): keine Zufallsauswahl, keine Max-2-Regel,
  „Anzahl Songs“ begrenzt den Import nicht. Nur doppelte Song-IDs werden entfernt; die Nicht-lateinisch-Regel (`hasNonLatinScript()`) gilt weiter. Gemischt wird beim Spielstart.
  Zufallsauswahl und Max-2-Regel gelten nur für die Suche (Genre/Freitext) und beim manuellen Hinzufügen.
- **Songauswahl** wird im Browser gesichert (`plattenteller_tracks`) und beim Start wiederhergestellt.

## Jahre ermitteln (für Hitster)

- Jahr = Erstveröffentlichung laut MusicBrainz (über die **ISRC**), ersatzweise das Spotify-Album-Datum. Das Album-Datum ist bei Live-Versionen, Bonus-Tracks und
  Compilations oft falsch (Beispiel: „Live in Nottingham 2003“ auf der Jubiläumsausgabe von 2023).
- Erkennung: Titelzusätze (live, remix, acoustic …), MusicBrainz-Hinweis „live“, Albumtyp `compilation`. Dann wird die Originalaufnahme per Textsuche gesucht
  (frühestes Studio-Erscheinungsjahr desselben Titels vom selben Interpreten); sonst gilt das Jahr als **unsicher** (⚠) und der Song wird im Hitster-Modus nicht verwendet.
- Ergebnis steht im Song als `yr = { y, src, unsure }`; Cache im Browser (`plattenteller_year_cache`), Schlüssel ISRC bzw. Titel+Interpret.
- Die Entwickler-Ansicht „Song-Daten prüfen“ zeigt, welche Felder Spotify/MusicBrainz liefern.

## Mehrere Handys (Firebase)

- Host steuert Musik und Spielablauf, Mitspieler öffnen Link/QR oder geben den Raumcode ein (ohne Zugangscode). Jedes Gerät hat eine anonyme Firebase-ID.
- Spielzustand des Hosts liegt im Browser (`plattenteller_host_game`) und wird nach jedem Schritt gesichert; nach Neuladen wird das Spiel wiederhergestellt.
- Zeiten (Tipp, Countdown) laufen über die Firebase-Serverzeit; die Regeln erzwingen u. a. „ein Tipp pro Runde“ (außer im Quiz), Sperre nach dem Aufdecken
  und Ablauf des Quiz-Countdowns.
- Modi: `together` (Titel/Interpret tippen, Host bewertet), `hitster` (Stelle in der Zeitleiste, automatisch), `quiz` (Antwort A–D, automatisch).

## Bekannte Stolpersteine (hart erarbeitet)

- Spotifys Such-API liefert **maximal 10 Ergebnisse pro Call** — Suchlogik ist auf viele kleine Calls ausgelegt.
- Der `ready`-Event des Spotify-iFrames kann **mehrfach feuern** — abgesichert mit einem Boolean-Flag (`controllerReady`), sonst drohen Endlos-Reload-Loops.
- Eine Timeline/Fortschrittsbalken-Funktion **für die Wiedergabe** wurde wieder entfernt: Spotifys Session-Prüfungen starteten den Song nach Pause wieder bei 0.
- Ein roher Fallback-Pool ist nötig, wenn der popularity-gefilterte Pool zu wenig liefert (und seit 2026 fehlt die Popularität ganz).
- **Spotify-Einschränkungen seit 2026 (Entwicklungsmodus):** Popularität, Märkte, Label, Vorschau-URL, Genres, Follower werden nicht mehr geliefert; ISRC und Album-Datum sind bei Marcel vorhanden.
  Playlist-Inhalte nur für eigene Playlists; Einzelabfragen (`/tracks/{id}`) funktionieren, Mehrfach-Abfragen nicht mehr.
- Spotifys **Token-Endpoint ist in Sandbox-Umgebungen CORS-blockiert**, funktioniert aber in echten Browsern — Auth-Flows nicht in Sandboxes testen.
- Beim Beschreiben von Firebase mit `update()` auf Teilpfade sind die Regeln uneindeutig — Werte wo nötig einzeln an ihrem Pfad schreiben.

## bfcache-Fix

Mobile Browser stellen die Seite beim "Neuladen" oder Tab-Wechsel oft aus dem Back-Forward-Cache wieder her, statt sie wirklich neu zu laden — dabei blieb man mitten im letzten Spielstand hängen. Ein `pageshow`-Listener mit `event.persisted`-Check erzwingt in diesem Fall einen echten `location.reload()`.

## Arbeitsweise mit Claude

- **Chat (kein Zugriff auf Repo/Festplatte):** Ablauf, Pflichtschritte und Prompt stehen in `anleitung-neue-chats.md`; Projektstand in `uebergabe-plattenteller.md`.
  Kurz: Repo als ZIP laden → Übergabe lesen → Tests laufen lassen → ändern (APP_VERSION erhöhen, `node --check`) → `npm test` grün → fertige Dateien liefern → Marcel lädt hoch.
- **Cowork/Code (mit Ordnerzugriff):** `CLAUDE.md` im lokalen Ordner.
- **Tests:** Ordner `tests/` (`npm install`, `npm test`): Spielabläufe mit Firebase-Attrappe, Firebase-Regeln im Simulator. Echtes Spotify/Firebase/Handys bleiben ein manueller Test.
