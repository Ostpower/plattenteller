# Neue Chats starten — Anleitung

Ziel: Jeder neue Chat (oder Cowork/Code) findet im Repo alles, was er braucht — **Projektstand, Tests, Regeln, Doku** — und
liefert am Ende alles Geänderte zurück. Das Repo ist die Quelle der Wahrheit, nicht der einzelne Chat.

## 1. Ordnerstruktur (Repo und lokaler Ordner `Hitster-Alternative`)

```
Hitster-Alternative/
├─ index.html                      das Spiel (immer die aktuelle Version!)
├─ docs/
│  ├─ CHANGELOG.md                 Marcel hängt die Einträge an
│  ├─ uebergabe-plattenteller.md   Projektstand für neue Chats (wird bei jeder Sitzung aktualisiert)
│  ├─ projekt-anweisungen.md       Text für die Projekt-Anweisungen im Claude-Projekt
│  ├─ firebase-multiplayer-plan.md Technik und Datenmodell (wird ersetzt)
│  ├─ playlists-anleitung.md       Playlists in Spotify einrichten
│  └─ firebase-rules.json          aktuelle Firebase-Regeln (Kopie; wirksam erst nach Veröffentlichen in der Console)
├─ tests/                          Testwerkzeuge: cd tests → npm install → npm test
├─ releases/                       wie bisher
├─ CLAUDE.md, AGENTS.md            Anweisungen für Cowork/Code (Ergänzung siehe Abschnitt 4)
```

**Einmalig jetzt tun**
1. Den Inhalt von `plattenteller-tests.zip` in den Ordner `tests/` entpacken (es entsteht `tests/smoke.js`, `tests/package.json` …).
2. `uebergabe-plattenteller.md`, `anleitung-neue-chats.md` und `firebase-rules.json` nach `docs/` legen.
3. Dein **lokales `index.html` ersetzen** — es ist vom 26.09. (82 KB) und veraltet. Aktuell: Datei aus GitHub herunterladen oder die zuletzt gelieferte nehmen.
4. Alles auf GitHub hochladen (Ordner `tests/` ohne `node_modules`).

## 2. Erste Nachricht für einen neuen Chat

Öffne den Chat im **Projekt** „Hitster – Alternative Spiel“ und schreibe (Thema am Ende anpassen):

```
Wir arbeiten an Plattenteller (die Projekt-Anweisungen gelten).
1. Lade das Repo als ZIP, lies docs/uebergabe-plattenteller.md, richte die Tests ein und lass sie laufen.
   Berichte kurz: Version, Teststand, ob APP_VERSION und CHANGELOG zusammenpassen.
2. Danach: <DEIN THEMA — oder: die Aufgabe „Gemeinsamer Jahre-Speicher in Firebase“ aus der Übergabe umsetzen
   (Code, Firebase-Regeln, Tests, Doku) und alles komplett liefern>.
```

## 3. Projekt-Anweisungen

Der Text steht fertig zum Einfügen in **`projekt-anweisungen.md`** (diesen Ordner `docs/`). Im Claude-Projekt die bisherigen Anweisungen damit ersetzen.

## 4. Ergänzung für CLAUDE.md und AGENTS.md (Cowork/Code mit Ordnerzugriff)

Ans Ende der beiden Dateien anhängen (bestehenden Inhalt bitte behalten; lade sie mir hoch, wenn ich sie sauber einarbeiten soll):

```
## Tests, Regeln und Übergabe (ab 2026-10-13)
- Tests: `cd tests && npm install && npm test` — alle Testreihen müssen grün sein. Neue Funktion → neue Testreihe
  `tests/smokeN.js` (Vorlage smoke9.js/smoke10.js) und Eintrag in `tests/run-all.js`.
- Firebase-Regeln: Quelle ist `docs/firebase-rules.json`. Änderungen daran → `tests/rules_test.js` erweitern und Marcel
  erinnern, die Regeln in der Firebase Console zu veröffentlichen.
- Nach jeder Änderung: APP_VERSION erhöhen (JJJJ-MM-TT.N), `docs/CHANGELOG.md` ergänzen, bei neuen Funktionen
  `docs/firebase-multiplayer-plan.md` und `docs/uebergabe-plattenteller.md` aktualisieren.
- Neue Chats starten mit `docs/uebergabe-plattenteller.md` — sie muss immer den aktuellen Stand zeigen.
```

## 5. Abschluss einer Sitzung — Checkliste für Marcel

- [ ] `index.html` ersetzt (Hauptordner)
- [ ] Neue/geänderte Dateien in `tests/` und `docs/` ersetzt
- [ ] Bei geänderten Regeln: in Firebase veröffentlicht
- [ ] Changelog-Eintrag an `docs/CHANGELOG.md` angehängt
- [ ] Auf GitHub hochgeladen, Version oben auf der Live-Seite geprüft
