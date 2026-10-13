# Plattenteller — Übergabe an einen neuen Chat (Stand 2026-10-13)

Browserbasiertes Musik-Ratespiel, eine einzige `index.html`, GitHub Pages. Repo: `github.com/Ostpower/plattenteller`,
live: `ostpower.github.io/plattenteller`. Aktuelle Version: **v2026-10-13.1** (Format `JJJJ-MM-TT.N`). Doku-Stand: `docs/` komplett aktualisiert am 2026-10-13.

## Ordnerstruktur und Neustart
Repo-Ordner: `index.html`, `docs/` (CHANGELOG, diese Übergabe, Plan, Playlists-Anleitung, `firebase-rules.json`), `tests/`
(Testwerkzeuge, `npm install` und `npm test`), `releases/`. Ein neuer Chat startet laut `docs/anleitung-neue-chats.md`: Repo als ZIP
laden, diese Datei lesen, Tests einrichten und laufen lassen. Am Ende jeder Sitzung wird **diese Datei aktualisiert**.

## Arbeitsweise im Chat
- Der Chat hat **keinen Zugriff** auf Repo oder Festplatte. Änderungen werden als fertige Datei geliefert, Marcel lädt sie hoch.
- Vor jeder Änderung die Datei **frisch** laden: `curl -s https://raw.githubusercontent.com/Ostpower/plattenteller/main/index.html`.
- `APP_VERSION` hochzählen, JS mit `node --check` prüfen, Datei in `/mnt/user-data/outputs/` ablegen und mit `present_files` liefern, dazu ein Changelog-Eintrag.
- Alles in einer Datei, kein Framework, kein Build. UI und Doku auf Deutsch. Max. 2 Songs je Interpret im Deck.
- `hasNonLatinScript()` (Songsuche) ist Absicht — nicht ohne Rückfrage ändern. Spotify Client ID und Redirect-URI nicht anfassen.
- Docs im Repo (`docs/`): `CHANGELOG.md` (Marcel hängt Einträge an), `firebase-multiplayer-plan.md` (wird jedes Mal ersetzt),
  `playlists-anleitung.md`. Testwerkzeuge liegen in `tests/` (README dort): 12 Testreihen, ca. 500 Prüfungen, `npm test` muss vor jeder Auslieferung grün sein.

## Was es gibt
- **Design:** dunkel, minimal, Mint-Grün, Schrift Inter; Equalizer und großer Play-Knopf statt Kassette (Variante C).
- **Modi:** Reihenfolge (ein Gerät, Streak/Klau), Zusammen (alle raten parallel, Host wertet), **Hitster** (eigene Zeitleiste,
  Jahr einsortieren, automatische Auswertung, meiste Karten gewinnen), **Quiz** (4 Antworten Band/Titel, änderbar bis alle
  geantwortet haben, dann Countdown, Schnellster-Bonus). Hitster und Quiz nur mit Raum (Handys).
- **Mehrere Handys (Firebase):** Raumcode/QR, Lobby, Tipp mit Serverzeit, Neuladen des Hosts stellt das Spiel wieder her,
  Offline-Hinweis, Aussteigen, Späteinsteiger (nicht bei Hitster), automatisches Aufräumen alter Räume.
- **Playlists:** eigene Spotify-Playlists holen, „Merken“ (pro Browser, `DEFAULT_PLAYLISTS` im Code für fest eingebaute),
  Import = ganze Playlist, Songauswahl bleibt nach Neuladen; Suche bis 100 Songs. Jahre per MusicBrainz (ISRC), Live/Compilation werden erkannt.
- **Entwickler-Ansicht** „Song-Daten prüfen“ zeigt, was Spotify/MusicBrainz liefern.

## Firebase
Projekt `plattenteller-80cd8` (Spark), Realtime Database europe-west1, Anonymous Auth. Config steht im Code (nicht geheim).
**Nach Änderungen an `firebase-rules.json` immer in der Console veröffentlichen** (Realtime Database → Regeln).

## Was Spotify bei Marcel liefert (Debug-Ansicht, Oktober 2026)
Da: Titel, Interpret, Album, Albumtyp, Album-Datum, Länge, Explicit, ISRC, Track-Nr. Fehlt: Popularität, Märkte,
Vorschau-URL, Label, Genres, Follower. Playlist-Inhalte nur für **eigene** Playlists. MusicBrainz funktioniert direkt im Browser (CORS ok).
Das Album-Datum kann bei Live/Bonus/Compilation falsch sein, deshalb die Jahre-Ermittlung.

## Playlist-Import (geklärt, v2026-10-13.1)
Die **ganze Playlist** wird übernommen (Entscheidung Marcel). Zufallsauswahl und Max-2-Interpret-Regel gelten nur für die Suche
(Genre/Freitext) und das manuelle Hinzufügen. Hintergrund: Die Cowork-Version vom 26.09. hatte das, die Chat-Versionen davor nicht.

## Offen (Wunschliste von Marcel)
1. Fest eingebaute Playlists: Marcel schickt seine Liste („Liste kopieren“), dann in `DEFAULT_PLAYLISTS` eintragen.
2. Host soll auch mitspielen können; Songliste darf dann beim Erstellen nicht offen sein, nur auf Wunsch über „öffnen“.
3. TV als Host (Song starten usw. ist dort umständlich) — Konzept klären.
4. Reihenfolge-Modus über Handys (nur aktives Handy tippt, Streak und Klau-Powerup).
5. Schnelligkeitsbonus für die anderen Modi (im Quiz schon drin).
6. Marcel hat „noch etwas gefunden“ — Thema für den neuen Chat.
