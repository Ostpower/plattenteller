# Firebase-Multiplayer: Planung (eigenes Handy pro Spieler)

## Stand (2026-10-10)

- **Phase 1** (Firebase-Projekt `plattenteller-80cd8`, Realtime Database in europe-west1, Anonymous Auth): erledigt.
- **Phase 2** (Lobby: Raumcode, QR, Beitritt, Live-Spielerliste): erledigt, `index.html` v2026-10-10.1.
- **Phase 3** (Raten übers Handy, Zusammen-Modus): umgesetzt in `index.html` v2026-10-10.2, überarbeitet in v2026-10-10.3: Spieler schicken ihren Tipp selbst ab (einmalig, endgültig, erst nach Songstart); die Zeit seit Songstart wird mit Firebase-Serverzeit gemessen und auf Host und Handy angezeigt. Nur der Host liest alle Tipps, die Lösung steht erst nach dem Aufdecken in der Datenbank.
- **Security Rules**: aktuelle Fassung in `firebase-rules.json` (Spieler können sich keine Punkte schreiben, Tipps sind nur für Host und Besitzer lesbar, ein Tipp pro Runde, Zeit nur von Firebase, nach dem Aufdecken keine Tipps mehr).
- **Phase 5 (Stabilität)**: `index.html` v2026-10-10.4. Das laufende Handy-Spiel wird nach jedem Schritt im Browser des Hosts gesichert (Songstapel, Punkte, Runde, Tipps, schon vergebene Bewertungen). Lädt die Host-Seite neu, geht es dort weiter (Tippphase, Bewertung oder Endstand); Runde, Startzeit und Tipps in Firebase bleiben dabei unangetastet. Der Song startet nach dem Neuladen pausiert und muss neu gestartet werden; die Zeitmessung läuft vom ursprünglichen Start weiter. Gibt es keinen gesicherten Stand (z. B. Browserdaten gelöscht), fällt der Raum sauber zurück in die Lobby. Präsenz (v2026-10-10.5): Host und Spieler bekräftigen ihren Online-Status alle 15 s (Herzschlag), damit ein verspätetes „offline“ der alten Verbindung nach einem Neuladen nicht stehen bleibt. Scheitert die Wiederherstellung, nennt die Meldung den Grund. Grenze: Der Host ist an sein Gerät und seinen Browser gebunden (anonyme Anmeldung) — ein anderes Gerät kann ein laufendes Spiel nicht übernehmen.
- **Aufräumen** (v2026-10-10.6): „Raum schließen“ löscht den Raum jetzt ganz (die Handys sehen zuerst „Raum geschlossen“, nach ca. 2 s wird gelöscht). Zusätzlich führt jeder Host unter `hostRooms/<seine ID>` eine private Liste seiner Räume; beim Anlegen und beim Wiederaufnehmen eines Raums werden daraus vergessene Räume entfernt: geschlossene, solche deren Host seit mehr als 6 h nicht verbunden war, und solche älter als 48 h. Der aktuelle Raum und Räume mit verbundenem Host (z. B. anderer Tab) bleiben unberührt. Räume von vor dieser Version stehen nicht in der Liste und müssen einmalig in der Firebase Console unter „Daten“ gelöscht werden.
- **Aussteigen, Offline, Späteinsteiger** (v2026-10-10.7): Das Handy zeigt eine Leiste „Keine Verbindung“, wenn die Verbindung länger als ca. 2,5 s weg ist. „Spiel verlassen“ gibt es auch im laufenden Spiel: Der Spieler wird nur als `left` markiert, sein Punktestand bleibt in der Wertung, der Host überspringt ihn ab der nächsten Runde, über den Link ist ein Wiedereinstieg möglich; in der Lobby wird der Eintrag gelöscht. Der Host sieht in der Tippliste und der Punkteleiste, wer offline oder ausgestiegen ist, und kann Spieler auch im Spiel entfernen. Spieler ohne Tipp (z. B. offline) bekommen automatisch 0 Punkte, sodass „Nächster Song“ nie an ihnen hängt. Neue Spieler dürfen auch mitten im Spiel beitreten (Start bei 0, in einer schon aufgedeckten Runde zählen sie ab der nächsten). Beim „Neuen Spiel“ werden Ausgestiegene aus dem Raum entfernt, alle anderen starten wieder bei 0. Ein entfernter Spieler kann über den Link als neuer Spieler (0 Punkte) wieder beitreten.
- **Hitster-Modus** (v2026-10-11.5): Jede*r baut mit dem eigenen Handy eine Zeitleiste und sortiert den laufenden Song nach Erscheinungsjahr ein; der Host wertet nicht manuell, sondern automatisch aus (Karte passt, wenn das Jahr zwischen den Nachbarkarten liegt, gleiches Jahr zählt). Jede*r bekommt zuerst eine Startkarte; Ende nach der festen Songanzahl, die meisten Karten gewinnen. Nur Songs mit sicherem Jahr kommen vor (Jahr aus MusicBrainz über die ISRC, Live-Versionen/Compilations werden erkannt, siehe `yr` im Song). Datenmodell: `timelines/<uid>` (nur bereits aufgedeckte Songs, vom Host geschrieben), `guesses/<uid>` enthält statt Titel/Interpret die Stelle (`slot`), Punktestand = Kartenanzahl. Späteinsteiger sind im Hitster-Modus nicht möglich.
- **Quiz-Modus** (v2026-10-11.6): Vier Antworten auf dem Handy, Frage „Welche Band?“, „Welcher Titel?“ oder gemischt. Falsche Antworten kommen aus demselben Stapel (bevorzugt aus ähnlicher Zeit). Antworten bleiben änderbar; haben alle verbundenen Spieler geantwortet, schreibt der Host `round/deadlineStart` (Firebase-Serverzeit) und `countdownMs` steht in der Runde — die Regeln lassen nach Ablauf keine Antwort mehr zu, der Host deckt automatisch auf (oder manuell jederzeit). Punkte: richtig = 1, schnellste richtige Antwort +1 (nur ab zwei Richtigen; es zählt die Zeit der letzten Antwort). Datenmodell: `round.options/kind/countdownMs`, `guesses/<uid> = { round, choice, at }` (überschreibbar nur im Quiz-Modus), `round.reveal.correct` erst nach dem Aufdecken. Späteinsteiger sind im Quiz erlaubt.
- **Offen**: Reihenfolge-Modus über Handys (Phase 4), Schnelligkeitsbonus, Sichern der Songauswahl, Fallback bei fehlendem Netz am Host (Phase 6).

---

Ursprüngliche Planung. Ziel: Spieler nutzen jeweils ihr eigenes Handy statt eines geteilten Geräts, während der Host (z.B. Android TV/Tablet) den Spotify-Player und den Spielablauf steuert.

## Rollenmodell

- **Host-Gerät** (Android TV/Tablet): steuert den Spotify-Player, zeigt die Kassette, startet Songs, deckt auf, ist die alleinige Quelle der Wahrheit für den Spielzustand. Rät selbst nicht mit.
- **Spieler-Geräte** (Handys): öffnen dieselbe URL, treten per Raumcode/QR bei, sehen nur Name-Eingabe + Guess-Formular (Titel/Interpret) + eigenen Punktestand. Kein Spotify-Login auf dem Handy nötig.

Deckt beide bestehenden Modi ab:
- **Reihenfolge**: nur das Handy des aktiven Spielers zeigt das Guess-Formular.
- **Zusammen**: alle Handys zeigen das Guess-Formular gleichzeitig und submitten unabhängig voneinander, bis der Host aufdeckt.

## Datenmodell (Firebase Realtime Database)

Realtime Database statt Firestore, weil Online-Status/Presence ("wer ist gerade verbunden") damit einfacher ist.

```
/rooms/{roomCode}/
  meta/
    hostUid, createdAt, mode ("sequential" | "together"), phase ("lobby" | "playing" | "reveal" | "ended")
  players/{playerUid}/
    name, score, streak, stealAvailable, stealUsed, connected (bool), lastSeen
  round/
    currentTrackIdx, revealedTitle, revealedArtist, revealedCover, funFact   // erst bei phase="reveal" befüllt
    activePlayerUid   // nur relevant im Reihenfolge-Modus
  guesses/{playerUid}/
    title, artist, submittedAt   // wird bei jeder neuen Runde geleert
  judged/{playerUid}/
    score   // vom Host vergeben, triggert Punktegutschrift
```

Außerhalb der Räume (seit v2026-10-13.3), gemeinsam für alle Geräte:

```
/years/{ISRC}/        // ISRC: 12 Zeichen A–Z/0–9
  y   // Erscheinungsjahr (ganzzahlig, 1900 bis aktuelles Jahr + 1)
  s   // Quelle: "mb" | "mb-orig" | "spotify"
  t   // Serverzeit des Eintrags
```

Nur sichere Jahre; angemeldete Geräte lesen einzelne Einträge und schreiben **einmal** (nie überschreiben, nie löschen). Keine Titel/Interpreten — nur ISRC als Schlüssel.

**Wichtig:** Songtitel/Interpret des aktuellen Songs stehen nie in `/round`, solange `phase="playing"` — sonst könnte jemand mit offenen DevTools mitlesen. Erst beim Aufdecken schreibt der Host sie rein.

## Auth & Security Rules

- **Anonymous Auth** (kostenlos, kein Login-Formular): jedes Gerät bekommt eine stabile UID beim ersten Öffnen.
- Rules-Grundidee:
  - `players/{uid}`: nur der eigene UID-Knoten beschreibbar (Name setzen); `score`/`streak` nur vom Host änderbar (Rule prüft `auth.uid === meta/hostUid`).
  - `guesses/{uid}`: nur der eigene Knoten beschreibbar, nur vom Host lesbar (verhindert Abschreiben zwischen Spielern).
  - `round`, `meta`, `judged`: nur der Host schreibt.
- Raumcode: kurzer zufälliger String (4-stellig reicht bei der üblichen Gruppengröße), Host generiert ihn; Spieler geben ihn ein oder scannen einen QR-Code (`?join=CODE`).

## Ablauf am Festival

1. Host öffnet Plattenteller → "Raum erstellen" → Code + QR erscheinen.
2. Jeder öffnet den Link auf dem eigenen Handy (QR scannen oder Code eintippen) → Name eingeben → erscheint live in der Host-Spielerliste.
3. Host wählt Songs/Playlist wie bisher (bleibt reine Host-Aktion), startet das Spiel.
4. Reihenfolge-Modus: nur das Handy des aktiven Spielers zeigt das Guess-Formular, andere sehen "X ist dran".
5. Zusammen-Modus: alle Handys zeigen sofort das Guess-Formular, submitten unabhängig; Host sieht live, wer schon abgeschickt hat, deckt auf, bewertet.
6. Punktestände synchronisieren automatisch auf alle Geräte.

## Umsetzungsphasen

1. **Firebase-Projekt anlegen** (durch Marcel: Firebase Console → neues Projekt, Realtime Database + Anonymous Auth aktivieren) — die Config-Werte (apiKey, databaseURL etc.) sind wie die Spotify Client ID nicht geheim und dürfen in den Code.
2. **Lobby & Raum-Beitritt**: Host erstellt Raum, Spieler treten bei, Spielerliste synct live. Noch kein Musik-/Guess-Sync.
3. **Round-Sync für den Zusammen-Modus**: Guess-Formulare auf den Handys, Host sammelt & bewertet zentral.
4. **Round-Sync für den Reihenfolge-Modus**: "wer ist dran" + Turn-Wechsel über alle Geräte synchron.
5. **Reconnect-Handling**: Handy-Bildschirm sperrt/App im Hintergrund → sauberes Wiederverbinden ohne Datenverlust.
6. **Fallback**: Firebase nicht erreichbar (Festival-WLAN) → Hinweis, lokaler Single-Device-Modus bleibt als Rückfalloption bestehen.

## Offen / Voraussetzung für Phase 1–2

Firebase-Projekt mit aktivierter Realtime Database + Anonymous Auth, plus die `firebaseConfig` aus "Projekteinstellungen → Web-App hinzufügen".
