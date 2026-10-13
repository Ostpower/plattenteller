# Projekt-Anweisungen (Inhalt in die Projekt-Einstellungen einfügen, alten Text ersetzen)

Kontext: Plattenteller ist ein browserbasiertes Musik-Quiz im Hitster-Stil (Modi: Reihenfolge, Zusammen, Hitster, Quiz; mehrere Handys über
Firebase). Repo: github.com/Ostpower/plattenteller · Live: ostpower.github.io/plattenteller. Einzige Quelldatei: index.html (GitHub Pages).

In diesem Chat gibt es KEINEN direkten Zugriff auf Marcels Festplatte oder GitHub (auch keine GitHub-Anbindung) — jede Änderung wird als fertige
Datei zum Download geliefert, Marcel lädt sie selbst per Browser ins Repo. Für direkten Ordner-/Git-Zugriff nutzt er stattdessen Cowork/Code mit der
CLAUDE.md im lokalen Ordner — diese Anweisungen gelten nur für Chat-Sessions wie diese.

SESSION-START (immer zuerst):
1. Repo als ZIP laden und entpacken (Ordner plattenteller-main/):
   curl -sL https://codeload.github.com/Ostpower/plattenteller/zip/refs/heads/main -o /home/claude/repo.zip
   Nie vom Stand einer früheren Session ausgehen — der Container-Zustand geht verloren.
2. docs/uebergabe-plattenteller.md lesen (Projektstand, Konventionen, nächste Aufgabe, gelernte Stolpersteine); bei Bedarf docs/ARCHITECTURE.md
   und docs/firebase-multiplayer-plan.md.
3. Konsistenz prüfen: Passt APP_VERSION in index.html zum letzten Eintrag in docs/CHANGELOG.md? Bei Abweichung Marcel fragen, ob ein Upload fehlt
   (so ist einmal eine Änderung verloren gegangen und eine Versionsnummer doppelt vergeben worden).
4. Tests einrichten und laufen lassen: cd tests && npm install && timeout 280 npm test — nie im Hintergrund starten (ein Befehl darf höchstens
   300 Sekunden laufen, Hintergrundprozesse werden beendet). Ausgangszustand muss grün sein. Beim Entwickeln einzelne Reihen mit node smokeN.js.
5. Kurz berichten: aktuelle APP_VERSION, Teststand, Konsistenz, nächste Schritte — und mit Marcels Aufgabe weitermachen.

PFLICHT bei jeder Code-Änderung an index.html:
1. Datei frisch aus dem Repo nehmen; APP_VERSION hochzählen (Format JJJJ-MM-TT.N), nie eine vergebene Nummer wiederverwenden
   (höchste Nummer im CHANGELOG nachsehen).
2. JS-Syntax aller <script>-Blöcke mit node --check prüfen.
3. Tests: Jede neue Funktion bekommt eine Testreihe in tests/ (Vorlage smoke12.js) und einen Eintrag in tests/run-all.js und tests/README.md.
   Änderungen an Firebase-Regeln: docs/firebase-rules.json ändern und tests/rules_test.js erweitern. Vor der Auslieferung muss npm test komplett grün sein.
   Bei Änderungen an der Oberfläche Screenshots prüfen (tests/screenshots).
4. Doku mitziehen und KOMPLETT liefern (keine Teilstücke): docs/CHANGELOG.md (neuer Eintrag), docs/ARCHITECTURE.md, docs/ROADMAP.md,
   docs/firebase-multiplayer-plan.md, docs/uebergabe-plattenteller.md — soweit betroffen.
5. Ausliefern: alles Geänderte nach /mnt/user-data/outputs/ kopieren und mit present_files liefern: index.html, plattenteller-tests.zip (immer der
   komplette tests/-Ordner ohne node_modules), geänderte Doku, docs/firebase-rules.json bei Regeländerung. Zu jeder Datei sagen, wohin sie im Repo
   gehört. Bei geänderten Firebase-Regeln ausdrücklich darauf hinweisen, sie in der Firebase Console zu veröffentlichen (Realtime Database → Regeln).
6. Am Ende kurz zusammenfassen: was ist neu, was muss Marcel hochladen, was muss er selbst testen.

SESSION-ENDE (Marcel macht Feierabend oder wechselt den Chat): docs/uebergabe-plattenteller.md aktualisieren (Version, neue Funktionen, nächste
Aufgabe, offene Punkte) und mit allen geänderten Dateien liefern.

Ehrlichkeit: Die Tests simulieren Firebase und Handys. Echtes Spotify, MusicBrainz, Firebase-Regeln im Live-Betrieb und echte Handys testet Marcel
selbst — das immer klar sagen. Fehler offen benennen, nichts beschönigen.

Konventionen: Alles bleibt in einer einzigen index.html (kein Framework, kein Build-Schritt). UI und Doku auf Deutsch. Max. 2 Songs pro Interpret gilt
nur für Suche/Zufallsauswahl und manuell hinzugefügte Songs (Playlist-Import übernimmt die ganze Playlist). Nicht-lateinische Schriftzeichen werden
aus der Song-Suche gefiltert (hasNonLatinScript()) — bewusst so, nicht ohne Rückfrage ändern. Spotify Client ID und Redirect-URI nicht anfassen
(bricht den Login). Design (dunkel, minimal, Mint-Grün, Schrift Inter, Equalizer) nicht ohne Absprache ändern.
