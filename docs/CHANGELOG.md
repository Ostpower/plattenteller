# Changelog

Chronologisch, neueste Änderung unten. Nur inhaltliche Änderungen — nicht jede kleine Formulierungs-Korrektur.

## Vor Beginn dieser Doku (Ausgangszustand)

- Spotify-PKCE-Login, Kassetten-UI mit Spin-Animation, Genre-Suche (Single-Select), Scoreboard, Passwort-Gate.
- HITSTER-Playlist-Quick-Select-Buttons für offizielle Spotify-Playlisten.
- Statisches Punktesystem: Beides richtig +2 / Nur Titel +1 / Nur Interpret +1 / Nichts 0.

## v2026-08-15.1 (kein offizielles Tag vorher — erste dokumentierte Session)

- **Streak-Bonus** eingeführt: 🔥-Badge, Meilenstein-Boni bei 3/5/10 (und danach alle 5) aufeinanderfolgenden "Beides richtig"-Antworten.
- **Speed-Bonus** eingeführt (automatisch per Zeitmessung ab erstem Play-Tap) → **später komplett wieder entfernt**, siehe unten.
- **Fun Facts**: optionales Feld beim manuellen Song-Hinzufügen, wird beim Aufdecken angezeigt. Gilt nur für manuell hinzugefügte Songs — Spotify-Suchergebnisse liefern keine Fun Facts.
- **Steal-Power-up**: schaltet bei Streak 3 frei, einmalig pro Spiel per Checkbox aktivierbar, klaut bei Treffer bis zu 2 Punkte vom aktuellen Erstplatzierten.
- Speed-Bonus umgestellt von automatischer Zeitmessung auf **explizite Auswahl** (Chips: Normal/Flott/Blitzschnell) — Nutzer wollte keine automatische Erkennung.
- Speed-Bonus **komplett entfernt** (Chips, Variable, Logik) — "Speed-raten" (Tippfehler für Speed) sollte ganz raus.
- **Multi-Select bei Genre-Chips**: mehrere Genres gleichzeitig wählbar, `pickBalanced()`-Helfer verteilt Deck-Ziel fair über alle gewählten Genres.
- **Gestufter Popularity-Filter**: 70% "bekannte" Songs (Popularity ≥30) / 30% "Geheimtipps" (10–29) statt hartem Cutoff mit Komplett-Fallback.
- **Non-Latin-Script-Filter** (`hasNonLatinScript()`): filtert Titel/Interpret mit kyrillischen o.ä. Zeichen raus — Auslöser war zu viele unerratbare russische Metal-Songs bei "Metal 2000er".

## v2026-08-15.2

- **Versions-Tag** (`APP_VERSION`) eingeführt, sichtbar auf Zugangs-Screen und im App-Untertitel — zur Kontrolle, ob wirklich die aktuelle `index.html` geladen wurde.
- **bfcache-Fix**: `pageshow`-Listener mit `event.persisted`-Check erzwingt echten Reload, damit man nach mobilem "Neuladen" nicht mitten in der Song-Ebene landet.

## v2026-09-25.1 (Runde 1 aus AGENTS.md, ohne Deezer-Entfernung)

- **Bewertung nur einmal pro Runde**: Nach dem ersten Klick im Judge-Grid werden alle Bewertungs-Buttons gesperrt (gewählter bleibt gold markiert), "Nächster Song" ist erst danach aktiv. Reset in `loadNextTrack()`. Vorher gab es per Doppelklick mehrfach Punkte.
- **Wake Lock**: Bildschirm bleibt während des Spiels an (`navigator.wakeLock`), wird nach Tab-Wechsel/Entsperren neu angefordert und bei Spielende/Abbruch freigegeben. Browser ohne Unterstützung laufen normal weiter.
- **Playlist-Import filtert nicht-lateinische Schrift** (`hasNonLatinScript()` auf Titel und Interpret), wie schon die Genre-Suche.
- **Rate-Limit-Handling**: Neuer Helfer `spotifyApiJson()` für Suche und Playlist-Import — bei HTTP 429 wird `Retry-After` abgewartet (Fallback: Backoff 1/2/4/8 s, max. 4 Versuche, bei > 60 s Abbruch mit Hinweis), bei 401 wird das Token einmal erzwungen erneuert. Die Suche läuft jetzt in Batches von 3 parallelen Calls statt bis zu 30 nacheinander.
- **Verbinden-Button nach Login-Fehler**: Bei abgebrochenem Login, fehlgeschlagenem Code-Austausch oder verlorener Verbindung (Refresh scheitert) wird der Button wieder angezeigt. Der einmalige Login-Code wird auch im Fehlerfall aus der URL entfernt.
- **Manuelle Songs**: `artistKey` ist jetzt der normalisierte Interpretenname; beim Hinzufügen greift die Max-2-Regel (Abgleich auch gegen Such-/Playlist-Songs über den ersten Interpretennamen). Ohne Interpret-Angabe kein Limit.
- **Spotify-Controller-Timeout**: Wird der Player nach 12 s nicht bereit, erscheint ein Hinweis statt endlos "Bereit". Antippen der Kassette ohne Controller zeigt ebenfalls einen Hinweis. Mehrfache Warteschleifen (→ mehrere Controller) werden verhindert.

## v2026-09-26.1

- **Playlist-Import repariert**: Spotify liefert den Song im Playlist-Eintrag jetzt im Feld `item` statt `track` (veraltet). Der Import liest beide Felder — vorher kam bei eigenen Playlists "Keine Songs gefunden". Podcast-Episoden werden übersprungen.
- **Verständliche 403-Meldung**: Statt "ist die Playlist öffentlich?" eine Anleitung, wie man eine fremde Playlist in Spotify als eigene Kopie anlegt (Spotify gibt nur eigene Playlists frei). Hinweistext im Import-Bereich entsprechend angepasst.

## v2026-09-26.2

- **Playlist-Import übernimmt die komplette Playlist** (Entscheidung Marcel): keine Zufallsauswahl nach "Anzahl Songs" mehr, **keine Max-2-Interpret-Regel** — eine Playlist gilt als bereits kuratiertes Deck (z.B. HITSTER-Kartenset, ~300 Songs). Doppelte Einträge werden entfernt, gemischt wird wie immer beim Spielstart. "Anzahl Songs" und die Max-2-Regel gelten weiterhin für die Genre-Suche.
- Button "Andere Auswahl aus dieser Playlist" entfernt (ohne Zufallsauswahl überflüssig), Hinweistext im Import-Bereich angepasst.

## Offen / als Nächstes geplant

Siehe `ROADMAP.md`.
