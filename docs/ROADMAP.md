# Roadmap

Geplant, aber noch nicht gebaut — Status vor Umsetzung jeweils neu verifizieren.

## 1. Multi-Smartphone-Multiplayer (Hauptvorhaben)

Ziel: Jeder Spieler tippt seinen Guess auf dem eigenen Handy statt an einem gemeinsamen Gerät — inspiriert vom "Title & Artist"-Modus bei Beatify (QR-Code-Beitritt, zentrale Auswertung).

**Geräte-Setup (festgelegt):**

- **Host-Ansicht** (mit Songauflösung, Judge-Grid, Steuerung) läuft auf einem separaten Gerät mit großem Bildschirm — Ziel-Setup ist ein **Android TV**.
- **Am Festival** (ohne festen Fernseher) ersatzweise ein **Android-Tablet oder iPad** als Host-Display.
- **Spieler-Handys**: öffnen Link/QR-Code, geben Namen ein, tippen Guess — kein Musik-Handling.

**Grobe Architektur (skizziert, nicht implementiert):**

- **Sync-Layer:** Firebase Realtime Database (oder vergleichbarer Cloud-Realtime-Dienst wie Supabase/PartyKit) — kein eigener Server nötig, bleibt bei GitHub Pages als Hosting, funktioniert auch am Festival über Mobilfunk statt gemeinsamem WLAN.

**Angedachtes Datenmodell:**
```
games/{gameId}/
  state: "lobby" | "playing" | "reveal" | "end"
  currentRound: 3
  players/{playerId}: { name, score, streak, stealAvailable, stealUsed }
  rounds/{roundIndex}/guesses/{playerId}: { title, artist, submittedAt }
```

**Was sich grundlegend ändert:**
- Zentraler Spielzustand statt lokaler JS-Variablen
- Spieler-Beitritt per Link/QR statt lokaler Namensliste
- Scoring-Logik: manuelles Judge-Grid funktioniert bei mehreren gleichzeitigen Guesses nicht mehr → automatischer Text-Abgleich (tippfehlertolerant, à la Beatify) oder Host bekommt eine Liste aller Guesses zum schnellen Abhaken
- Neue, schlankere UI-Ansicht für Spieler-Handys
- Host-UI muss für TV-/Tablet-Bildschirmgrößen taugen (andere Auflösung/Bedienung als reines Handy-Layout bisher)

**Was gleich bleibt:** Kassetten-UI, Spotify-Wiedergabe, Genre-/Playlist-Import bleiben beim Host unverändert.

**Aufwandseinschätzung:** kein kleiner Patch — eher Wochenendprojekt-Größenordnung als Ein-Stunden-Änderung.

## 2. Selbst-gehostete Backend-Option

- Node.js/Express-Server mit `/token`-Endpoint, um das Spotify Client Secret serverseitig zu halten.
- Würde auch die Deezer-CORS-Blockade lösen (Deezer läuft im Server-Ansatz problemlos, da serverseitig statt im Browser).
- Zielumgebung: Marcels Proxmox-Home-NAS (`hbs19.uk`, hinter Cloudflare, gleiche Infrastruktur wie Vaultwarden/Nextcloud).
- **Aktuell shelved** wegen Proxmox-LXC-Setup-Reibung — GitHub Pages bleibt bis auf Weiteres der aktive Deployment-Weg.

## Verworfen (bewusst nicht weiterverfolgt)

- Speed-Rating-Chip (Normal/Flott/Blitzschnell) — nach Test wieder komplett entfernt.
- Timeline/Fortschrittsbalken — verursachte Song-Neustart bei Position 0 nach Pause (Spotify-Session-Verhalten), entfernt.
