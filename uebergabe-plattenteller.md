# Plattenteller — Übergabe an einen neuen Chat

Stand: 2026-10-13 · Version: **v2026-10-13.2** (Format `JJJJ-MM-TT.N`) · Browser-Musik-Quiz, eine Datei `index.html`, GitHub Pages.
Repo: `github.com/Ostpower/plattenteller` · Live: `ostpower.github.io/plattenteller`.

## NÄCHSTE AUFGABE: Gemeinsamer Jahre-Speicher in Firebase

**Warum:** Die ermittelten Erscheinungsjahre (für den Hitster-Modus) liegen heute nur im Browser des jeweiligen Geräts
(`plattenteller_year_cache`). Marcel hostet vom Handy und vom PC, dort muss jedes Jahr einmal neu ermittelt werden
(ca. 1–2 s pro Song, MusicBrainz erlaubt ca. 1 Anfrage/s). Ein gemeinsamer Speicher in Firebase macht ein einmal ermitteltes Jahr auf
**allen Geräten** sofort verfügbar. Marcel hat die Umsetzung freigegeben.

**Vorgeschlagener Entwurf (zur Prüfung, nicht in Stein gemeißelt):**
- Datenpfad `years/<ISRC>` → `{ y, s, t }`: `y` Jahr (1900 bis aktuelles Jahr + 1), `s` Quelle (`mb` | `mb-orig` | `spotify`), `t` Zeitstempel (Serverzeit).
  Nur **ISRC** als Schlüssel (12 Zeichen A–Z/0–9, in Firebase-Schlüsseln erlaubt); Titel+Interpret bleiben nur im lokalen Cache.
- Nur **sichere** Ergebnisse teilen (`unsure === false`); unsichere (⚠) bleiben lokal.
- Regeln: `.read` für angemeldete Geräte (`auth != null`); `.write` nur wenn der Eintrag **noch nicht existiert** (einmal schreiben, nie überschreiben —
  begrenzt Schaden durch falsche Einträge; Korrekturen macht Marcel in der Console); `.validate` für Form, Wertebereich und `$isrc.matches(/^[A-Z0-9]{12}$/)`.
- Ablauf in `resolveOne()`: lokaler Cache → Firebase `years/<ISRC>` (einzelne `once('value')`, gebündelt, z. B. 20 parallel) → MusicBrainz;
  nach einem sicheren MusicBrainz-Ergebnis in Firebase schreiben (ohne zu warten). Firebase-Anmeldung (`initFb()`/`ensureAuth()`) auch **ohne Raum** nötig;
  Fehler/Offline dürfen die Ermittlung nie blockieren (stiller Rückfall auf den bisherigen Weg).
- Funktioniert auch, wenn Marcel die neuen Regeln noch nicht veröffentlicht hat (Lesen/Schreiben schlägt dann still fehl).
- Hitster-Vorwärmen und `runYearResolver(target)` zählen Treffer aus Firebase wie lokale.
- Tests: neue Reihe `tests/smoke13.js` (Treffer aus Firebase → keine MusicBrainz-Anfrage; Schreiben nach Ermittlung; Rückfall ohne Firebase; unsichere werden nicht geteilt),
  `tests/rules_test.js` um `years/` erweitern (einmal schreiben, kein Überschreiben, ungültige ISRC/Jahre abgelehnt, nicht angemeldet kein Zugriff).
- Doku: `docs/firebase-rules.json`, `docs/firebase-multiplayer-plan.md` (Datenmodell), `docs/ARCHITECTURE.md` (Abschnitt „Jahre ermitteln“), `docs/CHANGELOG.md`, diese Übergabe.
- Marcel muss danach die Regeln in der Firebase Console veröffentlichen (Realtime Database → Regeln) — ausdrücklich sagen.

## Ordnerstruktur und Neustart
Repo: `index.html`, `docs/` (CHANGELOG, README, ARCHITECTURE, ROADMAP, diese Übergabe, `anleitung-neue-chats.md`, `playlists-anleitung.md`,
`firebase-multiplayer-plan.md`, `firebase-rules.json`), `tests/` (Testwerkzeuge). Lokal zusätzlich `releases/` (nur lokal), `CLAUDE.md`, `AGENTS.md` (nur lokal, für Cowork/Code).
Neuer Chat: laut `docs/anleitung-neue-chats.md` und den Projekt-Anweisungen starten (Repo als ZIP laden, diese Datei lesen, Tests laufen lassen).
**Am Ende jeder Sitzung diese Datei aktualisieren und mitliefern.**

## Arbeitsweise im Chat
- Kein Zugriff auf Repo oder Festplatte (keine GitHub-Anbindung vorhanden). Änderungen als fertige Dateien liefern; Marcel lädt per Browser hoch.
  Zu jeder Datei sagen, wohin sie gehört; `plattenteller-tests.zip` immer **komplett** neu packen.
- Vor jeder Änderung die Datei frisch holen; `APP_VERSION` hochzählen, **nie eine vergebene Nummer wiederverwenden** (höchste Nummer im CHANGELOG nachsehen);
  JS mit `node --check` prüfen; `npm test` muss grün sein; Changelog-Text mitliefern.
- Alles in einer `index.html`, kein Framework. UI und Doku auf Deutsch. Max. 2 Songs je Interpret **nur** bei Suche/Zufallsauswahl und manuell hinzugefügten Songs.
  `hasNonLatinScript()` ist Absicht — nicht ohne Rückfrage ändern. Spotify Client ID und Redirect-URI nicht anfassen.
- Design (dunkel, minimal, Mint, Inter, Equalizer) nicht ohne Absprache ändern.

## Was es gibt
- **Modi:** Reihenfolge (ein Gerät, Streak/Klau), Zusammen (alle raten parallel, Host wertet), **Hitster** (eigene Zeitleiste, Jahr einsortieren, automatisch, meiste Karten gewinnen),
  **Quiz** (4 Antworten Band/Titel/gemischt, änderbar bis alle geantwortet haben, dann Countdown 5/10/15 s, richtig +1, schnellste richtige +1 ab zwei Richtigen).
  Hitster und Quiz nur mit Handys im Raum. **Runden pro Spiel:** 10/20/30/50/Alle (alle Modi, im Browser gemerkt).
- **Mehrere Handys (Firebase):** Raumcode/QR, Lobby, Tipp mit Serverzeit, Neuladen des Hosts stellt das Spiel wieder her, Offline-Leiste, Aussteigen, Späteinsteiger (nicht bei Hitster),
  automatisches Aufräumen alter Räume, Quiz-Countdown serverseitig erzwungen.
- **Playlists:** Import = **ganze Playlist** (v2026-10-13.1), „Meine Playlists“ aus dem Spotify-Konto, „Merken“ (pro Browser; `DEFAULT_PLAYLISTS` im Code für fest eingebaute),
  Songauswahl bleibt nach Neuladen, Suche bis 100 Songs.
- **Jahre:** MusicBrainz über die ISRC, Live/Compilation werden erkannt, Cache dauerhaft pro Browser, Hitster prüft nur die nötigen Songs; Entwickler-Ansicht „Song-Daten prüfen“.

## Firebase
Projekt `plattenteller-80cd8` (Spark), Realtime Database europe-west1, Anonymous Auth. Config steht im Code (nicht geheim). Regeln: `docs/firebase-rules.json`.
**Nach jeder Regeländerung muss Marcel sie in der Console veröffentlichen.** Beim Schreiben einzelne Pfade statt `update()` auf Teilpfade (Regeln dann eindeutig).

## Spotify bei Marcel (Debug-Ansicht, Oktober 2026)
Da: Titel, Interpret, Album, Albumtyp, Album-Datum, Länge, Explicit, ISRC, Track-Nr. Fehlt: Popularität, Märkte, Vorschau-URL, Label, Genres, Follower.
Playlist-Inhalte nur für **eigene** Playlists. MusicBrainz funktioniert direkt im Browser (CORS ok). Das Album-Datum kann bei Live/Bonus/Compilation falsch sein.

## Tests (`tests/`)
14 Testreihen, rund 540 Prüfungen, `cd tests && npm install && npm test` (ca. 2,5 Minuten). **Im Chat nie im Hintergrund starten und mit `timeout 280` aufrufen**
(ein Befehl darf höchstens 300 s laufen, Hintergrundprozesse werden beendet); beim Entwickeln einzelne Reihen mit `node smokeN.js`. jsdom ist auf 30.1.2 festgeschrieben.
Neue Funktion → neue Reihe (Vorlage `smoke12.js`) und Eintrag in `run-all.js` und `tests/README.md`. Echtes Spotify/MusicBrainz/Firebase-Live/Handys testet Marcel selbst — das immer klar sagen.

## Gelernte Stolpersteine
- Eine Cowork-Änderung (Playlist komplett übernehmen, Version 2026-09-26.2) war nie auf GitHub, der Chat baute auf dem alten Stand und vergab dieselbe Nummer erneut.
  → Am Sitzungsanfang prüfen, ob `APP_VERSION` zum letzten CHANGELOG-Eintrag passt; bei Abweichung Marcel fragen, ob ein Upload fehlt.
- Veraltete Doku führt neue Chats in die Irre (ROADMAP sagte „Multiplayer nicht gebaut“). → Doku bei jeder Funktion mitziehen.
- Gültige Werte der Auswahlfelder beachten (Runden: 10/20/30/50/Alle) — Tests nicht mit Werten bauen, die es in der Oberfläche nicht gibt.
- Start-Aufrufe am **Ende** des Hauptskripts ausführen (sonst TDZ-Fehler durch spätere `let`/`const`).

## Offen (Wunschliste von Marcel)
1. **Gemeinsamer Jahre-Speicher in Firebase** (siehe oben — nächste Aufgabe).
2. Fest eingebaute Playlists: Marcel schickt seine Liste („Liste kopieren“), dann in `DEFAULT_PLAYLISTS` eintragen.
3. Host soll auch mitspielen können; die Songliste darf dann beim Erstellen nicht offen sein, nur auf Wunsch über „öffnen“.
4. TV als Host (Song starten usw. ist dort umständlich) — Konzept klären.
5. Reihenfolge-Modus über Handys (nur das aktive Handy tippt, mit Streak und Klau).
6. Schnelligkeitsbonus für „Zusammen“ und „Hitster“ (im Quiz schon drin).
