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

Öffne den Chat im **Projekt** „Hitster – Alternative Spiel“ und schreibe:

```
Wir arbeiten an Plattenteller (die Projekt-Anweisungen gelten). Bitte zuerst:
1. Das Repo als ZIP laden und docs/uebergabe-plattenteller.md lesen.
2. Die Tests einrichten (cd tests && npm install && npm test) und kurz berichten:
   aktuelle Version, ob alle Tests grün sind, welche Punkte noch offen sind.
Danach unser Thema: <HIER BESCHREIBEN, WAS DU GEFUNDEN HAST>
```

## 3. Projekt-Anweisungen (im Claude-Projekt ersetzen)

```
Kontext: Plattenteller ist ein browserbasiertes Musik-Quiz im Hitster-Stil (Modi: Reihenfolge, Zusammen, Hitster, Quiz;
mehrere Handys über Firebase). Repo: github.com/Ostpower/plattenteller · Live: ostpower.github.io/plattenteller.
Einzige Quelldatei: index.html, deployt über GitHub Pages. Status: Alpha.

In diesem Chat gibt es KEINEN direkten Zugriff auf Marcels lokale Festplatte oder GitHub — jede Änderung wird als fertige
Datei zum Download geliefert, Marcel lädt sie selbst ins Repo. Für direkten Ordner-/Git-Zugriff nutzt er stattdessen
Cowork/Code mit der CLAUDE.md im lokalen Projektordner — diese Anweisungen gelten nur für Chat-Sessions wie diese.

SESSION-START (immer zuerst):
1. Repo als ZIP laden:
   curl -sL https://codeload.github.com/Ostpower/plattenteller/zip/refs/heads/main -o /home/claude/repo.zip
   und entpacken (Ordner plattenteller-main/). Nie vom Stand einer früheren Session ausgehen — der Container-Zustand geht verloren.
2. docs/uebergabe-plattenteller.md lesen (Projektstand, Konventionen, offene Punkte); bei Bedarf docs/firebase-multiplayer-plan.md.
3. Tests einrichten und laufen lassen: cd tests && npm install && npm test (Ausgangszustand muss grün sein).
4. Kurz bestätigen: aktuelle APP_VERSION, Teststand, offene Punkte, und was Marcel jetzt will.

PFLICHT bei jeder Code-Änderung an index.html:
1. Aktuelle Datei frisch laden (Raw-URL https://raw.githubusercontent.com/Ostpower/plattenteller/main/index.html).
2. APP_VERSION hochzählen (Format JJJJ-MM-TT.N).
3. JS-Syntax aller <script>-Blöcke mit node --check prüfen.
4. Tests: Jede neue Funktion bekommt eine Testreihe in tests/ (und einen Eintrag in tests/run-all.js). Änderungen an den
   Firebase-Regeln → docs/firebase-rules.json ändern und tests/rules_test.js erweitern. Vor der Auslieferung muss npm test
   komplett grün sein. Bei Änderungen an der Oberfläche Screenshots prüfen (tests/screenshots).
5. Ausliefern: alles Geänderte nach /mnt/user-data/outputs/ kopieren und mit present_files liefern — index.html plus geänderte
   Test-/Doku-Dateien. Zu jeder Datei sagen, wohin sie im Repo gehört. Bei geänderten Firebase-Regeln ausdrücklich darauf
   hinweisen, sie in der Firebase Console zu veröffentlichen (Realtime Database → Regeln).
6. Changelog-Eintrag als fertigen Text mitliefern (Marcel hängt ihn an docs/CHANGELOG.md an). Bei neuen Funktionen
   docs/firebase-multiplayer-plan.md und docs/uebergabe-plattenteller.md aktualisiert mitliefern.

SESSION-ENDE (wenn Marcel Feierabend macht oder den Chat wechseln will): docs/uebergabe-plattenteller.md aktualisieren
(Version, neue Funktionen, offene Punkte) und mit allen geänderten Dateien liefern.

Ehrlichkeit: Die Tests simulieren Firebase und Handys. Echtes Spotify, MusicBrainz, Firebase-Regeln im Live-Betrieb und echte
Handys testet Marcel selbst — das immer klar sagen.

Konventionen: Alles bleibt in einer einzigen index.html (kein Framework, kein Build-Schritt). UI/Doku auf Deutsch.
Max. 2 Songs pro Interpret im Deck. Nicht-lateinische Schriftzeichen werden aus der Song-Suche gefiltert
(hasNonLatinScript()) — bewusst so, nicht ohne Rückfrage ändern. Spotify Client ID und Redirect-URI nicht anfassen
(bricht den Login). Design: dunkel, minimal, Mint-Grün, Schrift Inter (Equalizer statt Kassette) — nicht ohne Absprache ändern.
```

## 4. Ergänzung für CLAUDE.md und AGENTS.md (Cowork/Code mit Ordnerzugriff)

Ans Ende der beiden Dateien anhängen (bestehenden Inhalt bitte behalten; lade sie mir hoch, wenn ich sie sauber einarbeiten soll):

```
## Tests, Regeln und Übergabe (ab 2026-10-13)
- Tests: `cd tests && npm install && npm test` — alle 12 Testreihen müssen grün sein. Neue Funktion → neue Testreihe
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
