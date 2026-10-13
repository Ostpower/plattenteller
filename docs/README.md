# Plattenteller

Browser-basiertes Musik-Ratespiel im Stil von Hitster, gebaut von Marcel.

## Kurzfassung

- **Repo:** https://github.com/Ostpower/plattenteller (öffentlich)
- **Live:** https://ostpower.github.io/plattenteller/ (GitHub Pages)
- **Einzige Quelldatei:** `index.html` (komplettes Single-File-Deployment, HTML + inline JS + CSS)
- **Zielszenario:** Party-Runden mit Freunden, ursprünglicher Auslöser war ein Festival-Zeltlager-Spiel für 3–6 Leute
- **Status:** Alpha — Kernfunktionen laufen, aktiv in Entwicklung, Features werden experimentell ein- und wieder ausgebaut

## Grundprinzip

Ein Song läuft über Spotify (iFrame-Embed, direkt im Browser abgespielt — kein Smart Speaker, keine Home-Assistant-Anbindung nötig, das unterscheidet Plattenteller vom Vergleichsprojekt Beatify). Das Cover bleibt verdeckt, Spieler raten reihum Titel & Interpret, ein Judge-Grid wertet manuell.

## Zugang

- Passwort-Gate (nicht sicherheitsrelevant, nur um Zufallsbesucher fernzuhalten). Aktueller Code: `plattenteller2026`
- Versions-Tag (`APP_VERSION`-Konstante) wird auf dem Zugangs-Screen und im App-Untertitel angezeigt — Cache-Kontrolle nach jedem Update.

## Verwandte Dokumente in diesem Ordner

- `ARCHITECTURE.md` — Technik-Stack, Spotify-API-Details, Song-Suche/Balancing-Algorithmus, bekannte Stolpersteine
- `CHANGELOG.md` — chronologische Liste der bisher umgesetzten (und wieder verworfenen) Features
- `ROADMAP.md` — geplante, noch nicht gebaute Erweiterungen (v. a. Multi-Smartphone-Support)

## Lokale Ordnerstruktur (Claude Cowork)

```
Hitster-Alternative/
├── docs/          ← dieser Ordner: README/ARCHITECTURE/CHANGELOG/ROADMAP
├── releases/      ← versionierte Kopien von index.html, benannt nach APP_VERSION
└── index.html     ← aktueller Arbeitsstand (Stand: siehe APP_VERSION in der Datei selbst)
```

Bei jedem neuen Release: aktuelle `index.html` als `index_v<APP_VERSION>.html` in `releases/` ablegen (siehe `releases/README.md` für die Konvention).
