# Plattenteller — Übergabe an einen neuen Chat

Stand: 2026-10-13 · Version: **v2026-10-13.3** (Format `JJJJ-MM-TT.N`) · Browser-Musik-Quiz, eine Datei `index.html`, GitHub Pages.
Repo: `github.com/Ostpower/plattenteller` · Live: `ostpower.github.io/plattenteller`.

## NÄCHSTE AUFGABE

Keine feste Aufgabe offen — Marcel nennt die nächste (Wunschliste unten). **Erst prüfen, ob v2026-10-13.3 hochgeladen und die neuen Firebase-Regeln veröffentlicht sind** (siehe unten).

## Zuletzt erledigt: Gemeinsamer Jahre-Speicher in Firebase (v2026-10-13.3)

- Pfad `years/<ISRC>` → `{ y, s, t }` (Jahr, Quelle `mb`/`mb-orig`/`spotify`, Serverzeit). Nur **sichere** Jahre mit ISRC; unsichere (⚠) und Ergebnisse nach gescheiterter Originalsuche bleiben lokal.
- Ablauf in `resolveOne()`: lokaler Cache → Firebase (gebündelt, 20 Songs pro Schub) → MusicBrainz; nach sicherem MusicBrainz-Ergebnis Schreiben ohne Warten.
  Brücke zwischen den zwei Skripten: `window.PT_YEARS_STORE = { getMany, put }`. Fehler/Offline/hängend (Zeitlimit 4 s)/Regeln fehlen → stiller Rückfall auf MusicBrainz.
- Regeln: einmal schreiben, nie überschreiben/löschen; ISRC `^[A-Z0-9]{12}$`; Jahr 1900 bis aktuelles Jahr + 1; Zeit = Serverzeit; die ganze Liste ist nicht lesbar. Korrekturen nur in der Console.
- Tests: `tests/smoke13.js` (28 Prüfungen), `rules_test.js` um 30 Fälle erweitert. Details: `ARCHITECTURE.md` (Jahre ermitteln), `firebase-multiplayer-plan.md` (Datenmodell).
- **Marcel muss:** `index.html`, geänderte `docs/` und `tests/` ins Repo hochladen **und die Regeln aus `docs/firebase-rules.json` in der Firebase Console veröffentlichen** (Realtime Database → Regeln).
  Ohne veröffentlichte Regeln funktioniert alles wie bisher, nur ohne gemeinsamen Speicher. Echt getestet ist das noch nicht (nur Attrappe/Simulator) — Marcel testet es: Playlist laden, „Jahre ermitteln“ am PC,
  dann am Handy mit leerem Cache dieselben Songs — die Statuszeile sollte „· N aus dem gemeinsamen Speicher“ zeigen; in der Console unter `years` erscheinen die Einträge.

## Ordnerstruktur und Neustart
Repo: `index.html`, `docs/` (CHANGELOG, README, ARCHITECTURE, ROADMAP, diese Übergabe, `anleitung-neue-chats.md`, `playlists-anleitung.md`,
`firebase-multiplayer-plan.md`, `firebase-rules.json`), `tests/` (Testwerkzeuge). Lokal zusätzlich `releases/` (nur lokal), `CLAUDE.md`, `AGENTS.md` (nur lokal, für Cowork/Code).
Neuer Chat: laut `docs/anleitung-neue-chats.md` und den Projekt-Anweisungen starten (Repo als ZIP laden, diese Datei lesen, Tests laufen lassen).
**Am Ende jeder Sitzung diese Datei aktualisieren und mitliefern.**

## Arbeitsweise im Chat (ohne Ordnerzugriff)
- Kein Zugriff auf Repo oder Festplatte (keine GitHub-Anbindung vorhanden). Änderungen als fertige Dateien liefern; Marcel lädt per Browser hoch.
  Zu jeder Datei sagen, wohin sie gehört; `plattenteller-tests.zip` immer **komplett** neu packen.
- Vor jeder Änderung die Datei frisch holen; `APP_VERSION` hochzählen, **nie eine vergebene Nummer wiederverwenden** (höchste Nummer im CHANGELOG nachsehen);
  JS mit `node --check` prüfen; `npm test` muss grün sein; Changelog-Text mitliefern.
- Alles in einer `index.html`, kein Framework. UI und Doku auf Deutsch. Max. 2 Songs je Interpret **nur** bei Suche/Zufallsauswahl und manuell hinzugefügten Songs.
  `hasNonLatinScript()` ist Absicht — nicht ohne Rückfrage ändern. Spotify Client ID und Redirect-URI nicht anfassen.
- Design (dunkel, minimal, Mint, Inter, Equalizer) nicht ohne Absprache ändern.

## Arbeitsweise in Cowork mit lokalem Ordner und GitHub Desktop (seit 13.10.)
Der lokale Ordner `Hitster-Alternative` ist ein **Git-Klon** von `Ostpower/plattenteller` (Branch `main`); Marcel nutzt GitHub Desktop.
- **Claude** ändert, testet und pflegt Doku **nur im Ordner** (kein Git-Zugriff auf GitHub, nie selbst pushen). Danach sagt Claude „fertig“ und nennt, welche Dateien sich inhaltlich geändert haben.
- **Marcel** prüft in GitHub Desktop (Reiter „Changes“), schreibt eine kurze Summary, „Commit to main“, dann „Push origin“. Erst nach dem Push ist `ostpower.github.io/plattenteller` aktuell — danach am Versions-Tag prüfen.
- **Nur lokal, nicht im Repo** (über `.git/info/exclude` ausgeschlossen): `CLAUDE.md`, `AGENTS.md`, `releases/`. Nicht aus dem Ausschluss nehmen und nicht committen.
- **Zeilenenden:** Zeigt GitHub Desktop viele Dateien mit „No content changes found“, ist das nur Zeilenenden-/Dateirechte-Rauschen (Claude schreibt LF, der Ordner liegt unter Windows). Beim Commit werden sie nicht mitgenommen; im Reiter „History“ muss der neue Commit nur die tatsächlich geänderten Dateien zählen.
  Zeigt ein Commit auffällig viele Dateien, **nicht pushen**, sondern Claude fragen.
- **Tests nie im Ordner `tests/` installieren:** `npm install` dort legt `tests/node_modules` an (tausende Dateien, GitHub-Browser-Upload bricht ab). Claude testet in einer **Kopie außerhalb** des Ordners (z. B. `$HOME/scratch/repo/tests`) und löscht Reste im Ordner.
- **Vor Arbeitsbeginn prüfen:** Hat Marcel den letzten Stand gepusht? (`git status`/`git log` im Ordner; Abgleich `APP_VERSION` ↔ letzter CHANGELOG-Eintrag.) Sonst nachfragen, bevor eine Versionsnummer vergeben wird.
- Die älteren Anweisungen unter „Arbeitsweise im Chat“ gelten für **Chat-Sitzungen ohne Ordnerzugriff** (Dateien zum Download liefern, Marcel lädt per Browser hoch).

## Was es gibt
- **Modi:** Reihenfolge (ein Gerät, Streak/Klau), Zusammen (alle raten parallel, Host wertet), **Hitster** (eigene Zeitleiste, Jahr einsortieren, automatisch, meiste Karten gewinnen),
  **Quiz** (4 Antworten Band/Titel/gemischt, änderbar bis alle geantwortet haben, dann Countdown 5/10/15 s, richtig +1, schnellste richtige +1 ab zwei Richtigen).
  Hitster und Quiz nur mit Handys im Raum. **Runden pro Spiel:** 10/20/30/50/Alle (alle Modi, im Browser gemerkt).
- **Mehrere Handys (Firebase):** Raumcode/QR, Lobby, Tipp mit Serverzeit, Neuladen des Hosts stellt das Spiel wieder her, Offline-Leiste, Aussteigen, Späteinsteiger (nicht bei Hitster),
  automatisches Aufräumen alter Räume, Quiz-Countdown serverseitig erzwungen.
- **Playlists:** Import = **ganze Playlist** (v2026-10-13.1), „Meine Playlists“ aus dem Spotify-Konto, „Merken“ (pro Browser; `DEFAULT_PLAYLISTS` im Code für fest eingebaute),
  Songauswahl bleibt nach Neuladen, Suche bis 100 Songs.
- **Jahre:** MusicBrainz über die ISRC, Live/Compilation werden erkannt, Cache dauerhaft pro Browser **plus gemeinsamer Speicher in Firebase (`years/<ISRC>`)**, Hitster prüft nur die nötigen Songs; Entwickler-Ansicht „Song-Daten prüfen“.

## Firebase
Projekt `plattenteller-80cd8` (Spark), Realtime Database europe-west1, Anonymous Auth. Config steht im Code (nicht geheim). Regeln: `docs/firebase-rules.json`.
**Nach jeder Regeländerung muss Marcel sie in der Console veröffentlichen.** Beim Schreiben einzelne Pfade statt `update()` auf Teilpfade (Regeln dann eindeutig).

## Spotify bei Marcel (Debug-Ansicht, Oktober 2026)
Da: Titel, Interpret, Album, Albumtyp, Album-Datum, Länge, Explicit, ISRC, Track-Nr. Fehlt: Popularität, Märkte, Vorschau-URL, Label, Genres, Follower.
Playlist-Inhalte nur für **eigene** Playlists. MusicBrainz funktioniert direkt im Browser (CORS ok). Das Album-Datum kann bei Live/Bonus/Compilation falsch sein.

## Tests (`tests/`)
15 Testreihen, 602 Prüfungen, `cd tests && npm install && npm test` (ca. 2,5 Minuten). **Im Chat nie im Hintergrund starten und mit `timeout 280` aufrufen**
(ein Befehl darf höchstens 300 s laufen, Hintergrundprozesse werden beendet); beim Entwickeln einzelne Reihen mit `node smokeN.js`. jsdom ist auf 30.1.2 festgeschrieben.
Neue Funktion → neue Reihe (Vorlage `smoke12.js`) und Eintrag in `run-all.js` und `tests/README.md`. Echtes Spotify/MusicBrainz/Firebase-Live/Handys testet Marcel selbst — das immer klar sagen.

## Gelernte Stolpersteine
- Eine Cowork-Änderung (Playlist komplett übernehmen, Version 2026-09-26.2) war nie auf GitHub, der Chat baute auf dem alten Stand und vergab dieselbe Nummer erneut.
  → Am Sitzungsanfang prüfen, ob `APP_VERSION` zum letzten CHANGELOG-Eintrag passt; bei Abweichung Marcel fragen, ob ein Upload fehlt.
- Veraltete Doku führt neue Chats in die Irre (ROADMAP sagte „Multiplayer nicht gebaut“). → Doku bei jeder Funktion mitziehen.
- Gültige Werte der Auswahlfelder beachten (Runden: 10/20/30/50/Alle) — Tests nicht mit Werten bauen, die es in der Oberfläche nicht gibt.
- Start-Aufrufe am **Ende** des Hauptskripts ausführen (sonst TDZ-Fehler durch spätere `let`/`const`).

## Offen (Wunschliste von Marcel)
1. Fest eingebaute Playlists: Marcel schickt seine Liste („Liste kopieren“), dann in `DEFAULT_PLAYLISTS` eintragen.
2. Host soll auch mitspielen können; die Songliste darf dann beim Erstellen nicht offen sein, nur auf Wunsch über „öffnen“.
3. TV als Host (Song starten usw. ist dort umständlich) — Konzept klären.
4. Reihenfolge-Modus über Handys (nur das aktive Handy tippt, mit Streak und Klau).
5. Schnelligkeitsbonus für „Zusammen“ und „Hitster“ (im Quiz schon drin).

## Hinweise aus der Sitzung vom 13.10.
- v2026-10-13.2 stand im Code, aber nicht im CHANGELOG (Runden pro Spiel); in .3 nachgetragen (aus dem Code rekonstruiert). `tests/smoke12.js` (Vorlage) lag im lokalen Ordner nicht vor — als Vorlage `smoke13.js` nehmen.
- In der Cowork-Sitzung vom 13.10. war der GitHub-ZIP-Download blockiert; gearbeitet wurde mit dem lokalen Ordner. Danach wurde der Ordner zum Git-Klon gemacht (siehe oben), Stand 13.10.: `v2026-10-13.3` ist gepusht, Ordner und GitHub sind inhaltlich gleich.
- Die Testläufe auf dem PC-Linux sind langsamer: Reihen in Gruppen zu je 4 parallel starten (alle 14 gleichzeitig laufen in die Zeitüberschreitung).
