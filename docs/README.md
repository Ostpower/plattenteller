# Plattenteller

Browser-basiertes Musik-Ratespiel im Stil von Hitster, gebaut von Marcel.

## Kurzfassung

- **Repo:** https://github.com/Ostpower/plattenteller (öffentlich)
- **Live:** https://ostpower.github.io/plattenteller/ (GitHub Pages)
- **Einzige Quelldatei:** `index.html` (komplettes Single-File-Deployment, HTML + inline JS + CSS)
- **Zielszenario:** Party-Runden mit Freunden, ursprünglicher Auslöser war ein Festival-Zeltlager-Spiel für 3–6 Leute
- **Status:** Alpha — Kernfunktionen laufen, aktiv in Entwicklung

## Grundprinzip

Ein Song läuft über Spotify (iFrame-Embed, direkt im Browser abgespielt — kein Smart Speaker, keine Home-Assistant-Anbindung nötig).
Das Cover bleibt verdeckt. Der Host steuert die Musik, die Mitspieler spielen auf dem eigenen Handy (Raumcode/QR, Firebase).

**Spielmodi:** *Reihenfolge* (ein Gerät, Streak/Klau), *Zusammen* (alle raten parallel, Host wertet), *Hitster* (eigene Zeitleiste,
Jahr einsortieren), *Quiz* (vier Antworten, Countdown, Schnellster-Bonus). Hitster und Quiz nur mit Handys im Raum.

## Zugang

- Passwort-Gate für den Host (nicht sicherheitsrelevant, nur um Zufallsbesucher fernzuhalten). Aktueller Code: `plattenteller2026`.
  Mitspieler kommen über Beitritts-Link/QR bzw. Raumcode ohne Zugangscode herein.
- Versions-Tag (`APP_VERSION`, Format `JJJJ-MM-TT.N`) wird auf dem Zugangs-Screen und im Untertitel angezeigt — Cache-Kontrolle nach jedem Update.

## Dokumente in diesem Ordner

- `uebergabe-plattenteller.md` — **Projektstand für neue Chats** (immer aktuell halten)
- `anleitung-neue-chats.md` — Prompt, Projekt-Anweisungen und Ablauf für neue Chats
- `ARCHITECTURE.md` — Technik-Stack, Spotify-API, Playlists, Jahre, Firebase, Stolpersteine
- `firebase-multiplayer-plan.md` — Datenmodell und Funktionsweise der Handy-Modi
- `firebase-rules.json` — aktuelle Firebase-Sicherheitsregeln (wirksam erst nach Veröffentlichen in der Firebase Console)
- `playlists-anleitung.md` — Playlists in Spotify einrichten und in der App merken
- `CHANGELOG.md` — chronologische Liste der Änderungen
- `ROADMAP.md` — offene Punkte und Wünsche

## Ordnerstruktur

```
Hitster-Alternative/
├── index.html     ← aktuelles Spiel
├── docs/          ← diese Dokumente
├── tests/         ← Testwerkzeuge (npm install, npm test)
└── releases/      ← (nur lokal) versionierte Kopien von index.html, benannt nach APP_VERSION
```

Bei jedem neuen Release: aktuelle `index.html` als `index_v<APP_VERSION>.html` in `releases/` ablegen (siehe `releases/README.md`).
