# Architektur & technische Details

## Stack

- Eine einzige `index.html`-Datei — HTML, CSS und JavaScript inline, kein Build-Schritt, kein Framework
- Deployment: GitHub Pages, Branch `main`, direkt aus dem Repo-Root
- Audio-Wiedergabe: Spotify iFrame-Embed-API — läuft komplett im Browser, keine externe Hardware nötig
- Alternative Quelle: Deezer-Suche über einen eigenen Proxy (`PROXY_URL` + `PROXY_APP_KEY`) — funktioniert aktuell nur in der (shelved) Server-Version, im reinen Browser-Deployment durch CORS blockiert

## Spotify-Auth

- PKCE-Flow (Proof Key for Code Exchange) — kein Client Secret im Frontend nötig
- Client ID: `96426600438a4e27a76fd24f62f345a2`
- Redirect URI: `https://ostpower.github.io/plattenteller/` — muss exakt im Spotify-Dashboard hinterlegt sein, sonst schlägt der Login fehl (auch lokal per `file://` nicht nutzbar)
- Refresh Token wird in `localStorage` abgelegt, damit der Browser dauerhaft angemeldet bleibt

## Song-Suche & Balancing

Kernstück ist die Auswahl-Logik in `runSearch()`:

1. **Mehrfachauswahl bei Genres.** Werden mehrere Genre-Chips gewählt, verteilt sich das Ziel-Deck fair über alle gewählten Genres (`perGenreTarget = Math.ceil(desired / genreBuckets.length)`).
2. **Gestufter Popularity-Filter.** Statt einem harten Cutoff wird pro Genre getrennt in "bekannt" (Spotify-Popularity ≥30) und "Geheimtipp" (10–29) gesammelt, im Zielverhältnis 70/30 gemischt.
3. **`pickBalanced()`** ist der generische Verteil-Helfer: zieht aus mehreren "Buckets" (Genre × Popularity-Stufe) fair, füllt bei Materialmangel aus übrig gebliebenen Kandidaten anderer Buckets auf, dedupliziert automatisch über alle Buckets per Track-ID.
4. **`hasNonLatinScript()`** filtert Titel/Interpret mit kyrillischen, griechischen, hebräischen, arabischen oder CJK-Zeichen direkt beim Sammeln raus — für ein Ratespiel in Mitteleuropa praktisch nicht erratbare Songs werden so vermieden. Das ist ein Schrift-, kein Sprachfilter (lateinisch transkribierte Songs rutschen theoretisch noch durch).
5. **Max. 2 Songs pro Interpret** (`maxPerArtist`), um Dopplungen im Deck zu vermeiden. Gilt für Genre-/Freitextsuche und manuell hinzugefügte Songs — **nicht** für den Playlist-Import (siehe unten).
6. Zufalls-Offsets (Spotify: 0–300, Deezer: 0–900) sorgen für Streuung über die jeweilige Such-Ergebnisliste.

## Playlist-Import

- `fetchPlaylistTracks()` holt über `GET /v1/playlists/{id}/items` seitenweise (100 pro Seite, max. 20 Seiten) alle Songs.
- Der Song steckt seit 2026 im Feld **`item`** des Playlist-Eintrags, `track` ist veraltet und kam bei Tests nicht mehr mit. Der Code fragt beide Felder im `fields`-Parameter an und nimmt `entry.item || entry.track`. Nicht-Tracks (Podcast-Episoden) werden übersprungen, `hasNonLatinScript()` filtert wie bei der Suche.
- **Die komplette Playlist wird 1:1 übernommen** (seit v2026-09-26.2, Entscheidung Marcel): keine Zufallsauswahl nach "Anzahl Songs", keine Max-2-Interpret-Regel — eine Playlist ist bereits ein kuratiertes Deck. Nur doppelte Song-IDs werden entfernt. Gemischt wird beim Spielstart (`startGameBtn` → `shuffle`).
- **Nur eigene Playlists** sind lesbar (siehe Stolpersteine). Marcels Arbeitsweise: HITSTER-/Hitify-Playlists in Spotify als eigene Kopie anlegen (Songs markieren → Zur Playlist hinzufügen → Neue Playlist) und im Spotify-Ordner "Plattenteller" sammeln. Kopien öffentlich lassen, solange der Login keinen `playlist-read-private`-Scope hat.
- Die HITSTER-Preset-Chips zeigen noch auf die fremden Original-Playlists und scheitern deshalb mit 403 (Anleitung wird angezeigt). Offen: auf Marcels Kopien umstellen.

## Bekannte Stolpersteine (hart erarbeitet)

- Spotifys Such-API liefert **maximal 10 Ergebnisse pro Call** — Suchlogik ist entsprechend auf viele kleine Calls statt weniger großer ausgelegt.
- Der `ready`-Event des Spotify-iFrames kann **mehrfach feuern** — abgesichert mit einem Boolean-Flag (`controllerReady`), sonst drohen Endlos-Reload-Loops.
- Eine Timeline/Fortschrittsbalken-Funktion wurde **wieder entfernt**: Spotifys interne Session-Prüfungen sorgten dafür, dass der Song nach Pause wieder bei Position 0 startete.
- `minPopularity` von 15 war ein brauchbarer Startwert; 35 filterte zu aggressiv zu viele valide Tracks raus (bevor die gestufte 70/30-Logik das ersetzt hat).
- Ein roher Fallback-Pool ist nötig für Fälle, in denen der popularity-gefilterte Pool zu wenig Ergebnisse liefert.
- **Playlist-Import nur für eigene Playlists:** Spotify liefert Playlist-Songs (`/playlists/{id}/items`, auch `items` in `/playlists/{id}`) nur noch, wenn der eingeloggte Nutzer Besitzer oder Mitwirkender ist — sonst HTTP 403, auch bei öffentlichen Playlists. Betrifft alle HITSTER-/Hitify-Playlists. Workaround: Playlist in Spotify kopieren (⋯ → Zu anderer Playlist hinzufügen → Neue Playlist) und die Kopie importieren. Stand 2026-09-26: Marcel nutzt feste Kopien im Spotify-Ordner "Plattenteller" — funktioniert (getestet mit "Hitster Rock – Germany", 303 Songs). Für private Kopien bräuchte der Login `playlist-read-private` (Scope ist aktuell leer). Die Suche (`/search`) ist davon nicht betroffen.
- Spotifys **Token-Endpoint ist in Sandbox-Umgebungen CORS-blockiert**, funktioniert aber in echten Browsern normal — Auth-Flows nicht in Sandboxes testen.

## bfcache-Fix

Mobile Browser stellen die Seite beim "Neuladen" oder Tab-Wechsel oft aus dem Back-Forward-Cache wieder her, statt sie wirklich neu zu laden — dabei blieb man mitten im letzten Spielstand hängen. Ein `pageshow`-Listener mit `event.persisted`-Check erzwingt in diesem Fall einen echten `location.reload()`.

## Claude-Arbeits-Workflow für diesen Code

- Datei laden: `curl -s https://raw.githubusercontent.com/Ostpower/plattenteller/main/index.html`
- JS-Syntax validieren: `<script>`-Blöcke per Python-Regex extrahieren, dann `node --check` drüberlaufen lassen
- Kleine, gezielte Änderungen: `str_replace`
- Größere Blockersetzungen: Python `f.readlines()` mit Slicing
- Ausliefern: Datei nach `/mnt/user-data/outputs/index.html` kopieren, dann `present_files`
