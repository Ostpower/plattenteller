# Roadmap

Geplant, aber noch nicht gebaut — Status vor Umsetzung jeweils neu verifizieren. Stand: 2026-10-13 (nach v2026-10-13.1).

## Offen

1. **Fest eingebaute Playlists**: Marcels Liste über „Liste kopieren“ holen und in `DEFAULT_PLAYLISTS` eintragen.
2. **Host spielt mit**: Der Host soll auch mitspielen können; dafür darf die Songliste beim Erstellen nicht offen sein,
   nur auf Wunsch über „öffnen“.
3. **TV als Host**: Song starten usw. ist auf einem TV umständlich — Bedienkonzept klären (z. B. Fernbedienung über ein Handy).
4. **Reihenfolge-Modus über Handys**: nur das Handy des aktiven Spielers tippt, mit Streak und Klau-Powerup.
5. **Schnelligkeitsbonus** für „Zusammen“ und „Hitster“ (im Quiz schon drin).
6. Ideen: Herkunftsland des Interpreten (MusicBrainz) als Bonusfrage; Titelzusätze („– Remastered“) überall ausblenden.

## Erledigt (Auszug, Details im `CHANGELOG.md`)

- Multi-Smartphone-Multiplayer über Firebase (Lobby, Tippen, Zeitmessung, Wiederherstellung, Offline, Aufräumen) — Technik in `firebase-multiplayer-plan.md`.
- Playlist-Import übernimmt die ganze Playlist (v2026-10-13.1).
- Spielmodi „Hitster“ und „Quiz“. Neues Design (Equalizer statt Kassette). Playlists merken, Songauswahl sichern, Jahre ermitteln.

## Selbst-gehostete Backend-Option (shelved)

- Node.js/Express-Server mit `/token`-Endpoint, um das Spotify Client Secret serverseitig zu halten; würde auch die Deezer-CORS-Blockade lösen.
- Zielumgebung: Marcels Proxmox-Home-NAS (`hbs19.uk`, hinter Cloudflare, gleiche Infrastruktur wie Vaultwarden/Nextcloud).
- **Aktuell shelved** wegen Proxmox-LXC-Setup-Reibung — GitHub Pages bleibt der aktive Deployment-Weg.

## Verworfen (bewusst nicht weiterverfolgt)

- Speed-Rating-Chip (Normal/Flott/Blitzschnell) — nach Test wieder entfernt.
- Timeline/Fortschrittsbalken **für die Wiedergabe** — verursachte Song-Neustart bei Position 0 nach Pause (Spotify-Session-Verhalten).
- Kassetten-Design — durch das Equalizer-Design ersetzt (v2026-10-11.1).
- Automatisches Senden von Tipps — Spieler schicken selbst ab (v2026-10-10.3).
