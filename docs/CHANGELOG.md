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

## Hinweis zur Versionsnummer 2026-09-26.2

Diese Nummer wurde **doppelt vergeben**: oben die Cowork-Änderung „Playlist-Import übernimmt die komplette Playlist“, unten die
Chat-Version mit dem Zusammen-Modus. Die Chat-Versionen (ab hier) bauen auf der GitHub-Fassung v2026-09-26.1 auf und
enthalten die Cowork-Änderung **nicht** — der Playlist-Import wählt dort wieder zufällig aus (max. 2 je Interpret).
Behoben mit **v2026-10-13.1** (siehe unten).

## v2026-09-26.2 (Chat)

- **Spielmodus-Auswahl** „Reihenfolge“ (wie bisher) und „Zusammen“: alle hören denselben Song und tippen parallel (eigenes Handy
  oder mündlich/Zettel), jede*r wird einzeln bewertet, kein Streak/Klau.

## v2026-10-10.1

- **Multiplayer-Lobby über Firebase** (Phase 2): Host erstellt einen Raum (4-stelliger Code, QR, Link), Mitspieler treten mit dem
  eigenen Handy bei (ohne Zugangscode), erscheinen live in der Spielerliste; Spieler entfernen, Raum schließen.

## v2026-10-10.2

- **Raten über die Handys im Zusammen-Modus** (Phase 3): Tipps, Aufdecken, Einzelbewertung, Punkte und Endstand auf allen Handys.
- Verschärfte Firebase-Regeln: Tipps nur für Host und Besitzer lesbar, Punkte nur vom Host schreibbar.

## v2026-10-10.3

- Tipp wird **nicht mehr automatisch** gesendet: Spieler schicken ihn selbst ab (einmalig, endgültig), erst nach Songstart.
- **Zeit seit Songstart** (Firebase-Serverzeit) wird auf Handy, in der Live-Liste und bei der Bewertung angezeigt.

## v2026-10-10.4

- **Stabilität**: Das laufende Handy-Spiel wird im Browser des Hosts gesichert und nach einem Neuladen wiederhergestellt
  (Tippphase, Bewertung, Endstand); Runde, Startzeit und Tipps in Firebase bleiben unangetastet.

## v2026-10-10.5

- Fix: Nach dem Neuladen blieb der Host dauerhaft auf „offline“ (verspäteter Verbindungsabbruch der alten Seite). Host und
  Spieler bekräftigen ihren Online-Status alle 15 s. Scheitert die Wiederherstellung, nennt die Meldung den Grund.

## v2026-10-10.6

- **Aufräumen alter Räume**: „Raum schließen“ löscht den Raum komplett; vergessene Räume des Hosts werden entfernt
  (geschlossen, Host seit >6 h weg, älter als 48 h). Aktive und fremde Räume bleiben unberührt.

## v2026-10-10.7

- Handy: Leiste „Keine Verbindung“. „Spiel verlassen“ auch im laufenden Spiel (Punkte bleiben, Wiedereinstieg über den Link).
- Host: offline/ausgestiegen sichtbar, Spieler im Spiel entfernbar; Spieler ohne Tipp bekommen automatisch 0 Punkte;
  Späteinsteiger können mitten im Spiel beitreten.

## v2026-10-11.1

- **Neues Design** (dunkel, minimal, Mint-Grün, Schrift Inter): Equalizer und großer Play/Pause-Knopf **ersetzen die Kassette**;
  Rangliste als Liste; Eingabefelder untereinander; Emojis entfernt.
- Fortschritt: ein Strich pro Song bis 24 Songs, darüber ein durchgehender Balken; Songnummer mit führenden Nullen.
- Songanzahl bis **100** einstellbar (vorher 50).

## v2026-10-11.2

- **Playlists**: Berechtigung `playlist-read-private` / `playlist-read-collaborative` beim Login; „Meine Playlists aus Spotify holen“
  mit Filter; „Merken“ (pro Browser gespeichert); Liste kopieren/einfügen; Platz für fest eingebaute Playlists (`DEFAULT_PLAYLISTS`).
- **Songauswahl wird gesichert** (bleibt nach Neuladen), „Alle entfernen“. Songs bekommen ein Jahr (Album-Datum), im Stapel sichtbar.
- Entwickler-Ansicht „Song-Daten prüfen“ (Spotify und MusicBrainz).

## v2026-10-11.3

- MusicBrainz-Prüfung über die **ISRC** statt Textsuche; Live-Aufnahmen werden übersprungen; Vergleich Spotify-Jahr ↔ MusicBrainz.

## v2026-10-11.4

- **Jahre ermitteln**: Jahr der Erstveröffentlichung aus MusicBrainz (über die ISRC), Rückfall auf das Spotify-Albumjahr;
  Live/Remix/Compilation werden erkannt und die Originalaufnahme gesucht, sonst „unsicher ⚠“. Ergebnisse werden gemerkt.
  Im Stapel: Jahr grün, unsichere mit ⚠, „Unsichere entfernen“.

## v2026-10-11.5

- **Neuer Spielmodus „Hitster“** (nur mit Handys im Raum): jede*r baut eine eigene Zeitleiste und sortiert Songs nach
  Erscheinungsjahr ein; automatische Auswertung, Startkarte pro Spieler, Ende nach fester Songanzahl, die meisten Karten gewinnen.
- Firebase-Regeln: Einsortieren (`slot`) statt Titel/Interpret; Zeitleisten nur vom Host schreibbar.

## v2026-10-11.6

- **Neuer Spielmodus „Quiz“** (nur mit Handys): vier Antworten (Band, Titel oder gemischt). Antworten bleiben änderbar, bis alle
  geantwortet haben; dann läuft ein Countdown (5/10/15 s), danach wird automatisch aufgedeckt. Richtig = 1 Punkt, schnellste
  richtige Antwort +1 (ab zwei Richtigen).
- Firebase-Regeln: Antworten im Quiz überschreibbar, nach Ablauf des Countdowns serverseitig gesperrt.
- Modus-Beschreibung zeigt nur den gewählten Modus.

## v2026-10-13.1

- **Playlist-Import übernimmt wieder die ganze Playlist** (Entscheidung Marcel vom 26.09., jetzt auch in der Chat-Fassung): keine
  Zufallsauswahl, keine Max-2-Regel, „Anzahl Songs“ begrenzt den Import nicht. Doppelte Song-IDs werden entfernt, nicht-lateinische
  Titel/Interpreten weiterhin übersprungen (bewusste Regel), Podcast-Episoden übersprungen. Gemischt wird beim Spielstart.
- Knopf „Andere Auswahl aus dieser Playlist“ entfällt (der Such-Knopf „Andere Auswahl laden“ bleibt). „Anzahl Songs“ und die
  Max-2-Regel gelten nur noch für die Suche (Genre/Freitext) und beim manuellen Hinzufügen.
- Meldung nennt Zahl, entfernte Doppelte und übersprungene Songs. Neue Testreihe `tests/smoke11.js`.

## v2026-10-13.2 (nachgetragen)

- Die Version war im Code und in der Übergabe vermerkt, aber ohne CHANGELOG-Eintrag. Inhalt laut Code/Übergabe: **Runden pro Spiel** (10/20/30/50/Alle, alle Modi, im Browser gemerkt)
  und der Hinweis im Startbereich „Quiz mit N Handy-Spielern: X Songs → Y Runden“. (Nachträglich rekonstruiert — bitte prüfen.)

## v2026-10-13.3

- **Gemeinsamer Jahre-Speicher in Firebase** (`years/<ISRC>` → `{ y, s, t }`): ein einmal ermitteltes **sicheres** Erscheinungsjahr gilt jetzt auf allen Geräten sofort.
  Ablauf je Song: lokaler Cache → Firebase (gebündelt, 20 Songs pro Schub, je ISRC nur eine Abfrage pro Sitzung) → MusicBrainz; nach einem sicheren MusicBrainz-Ergebnis
  wird in Firebase geschrieben (ohne zu warten). Unsichere (⚠) Ergebnisse und Ergebnisse nach gescheiterter Originalsuche bleiben lokal.
  Während der Prüfung zeigt die Statuszeile „· N aus dem gemeinsamen Speicher“.
- Fällt Firebase aus (offline, hängt > 4 s, Regeln nicht veröffentlicht), läuft die Ermittlung unverändert über MusicBrainz; danach pausiert der Speicher 1–5 Minuten.
- **Firebase-Regeln** (`docs/firebase-rules.json`): `years/$isrc` nur lesbar/schreibbar für angemeldete Geräte, **einmal schreiben, nie überschreiben oder löschen**,
  ISRC `^[A-Z0-9]{12}$`, Jahr ganzzahlig 1900 bis aktuelles Jahr + 1, Quelle `mb`/`mb-orig`/`spotify`, Zeit = Serverzeit, keine weiteren Felder; die ganze Liste ist nicht auf einmal lesbar.
  **Müssen in der Firebase Console veröffentlicht werden** (Realtime Database → Regeln).
- Tests: neue Reihe `tests/smoke13.js`, `rules_test.js` um `years/` erweitert, Regel-Simulator kennt `matches()`, Firebase-Attrappe bildet `years/` nach.
  `smoke10.js`: veralteten Hinweistext angepasst („→ N Runden“).

## v2026-10-13.4

- **„Meine Playlists“ zeigt nur noch Plattenteller-Playlists:** Spotify verrät der App keine Ordner, deshalb gilt als Ersatz das Kürzel **„PT“**:
  der Playlist-Name beginnt mit „PT“ (z. B. „PT Metal 90er“, auch „pt-pop“) oder die Beschreibung enthält `#pt`. Alle anderen Playlists aus dem Konto erscheinen nicht mehr.
  Das Kürzel steht als Konstante `PLAYLIST_TAG` im Code. Ohne Treffer erklärt ein Hinweis, wie man umbenennt. Statuszeile: „N Playlists mit Kürzel „PT“ gefunden (von M insgesamt)“.
  (Praxistest 14.10.: Beide Wege funktionieren, auch bei privaten Playlists; eine Playlist ohne „PT“ im Namen, aber mit `#pt` in der Beschreibung, wird gefunden.)
- **Songliste standardmäßig eingeklappt:** „Songliste öffnen (N)“ — der Zähler „N Songs im Stapel“ bleibt sichtbar; aufgeklappt bleibt sie beim Entfernen einzelner Songs offen, nach „Alle entfernen“ ist sie wieder zu.
- Tests: neue Reihe `tests/smoke14.js`; `smoke7.js` an die PT-Namen angepasst.

## Offen / als Nächstes geplant

Siehe `ROADMAP.md`.
