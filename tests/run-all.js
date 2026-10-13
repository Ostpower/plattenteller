// Führt alle Testreihen nacheinander aus und fasst das Ergebnis zusammen.
// Aufruf:  npm test      (im Ordner tests/, nach "npm install")
const { spawnSync } = require('child_process');
const path = require('path');
const suites = [
  ['smoke.js',        'Lobby, Beitritt, Kick, Raum schließen'],
  ['smoke2.js',       'Zusammen-Modus über Handys'],
  ['smoke3.js',       'Neuladen des Hosts mitten im Spiel'],
  ['smoke4.js',       'Aufräumen alter Räume'],
  ['smoke5.js',       'Offline, Aussteigen, Späteinsteiger'],
  ['smoke6.js',       'Rangliste, Fortschritt, Play-Anzeige'],
  ['smoke7.js',       'Playlists, Songauswahl sichern, Debug-Ansicht'],
  ['smoke8.js',       'Jahre ermitteln (MusicBrainz)'],
  ['smoke9.js',       'Hitster-Modus'],
  ['smoke10.js',      'Quiz-Modus'],
  ['rules_test.js',   'Firebase-Regeln'],
  ['repro_offline.js','Online-Status nach Neuladen']
];
let failed = 0;
const started = Date.now();
for(const [file, label] of suites){
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { env: Object.assign({}, process.env, { HB: '150' }), encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const okRun = /ALLE (REGEL-)?TESTS OK/.test(out) && r.status === 0;
  const pass = (out.match(/^PASS/gm) || []).length;
  const fail = (out.match(/^FAIL/gm) || []);
  console.log((okRun ? '  OK   ' : ' FEHLER ') + file.padEnd(18) + label + (pass ? '  (' + pass + ' Prüfungen)' : '') + '  ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  if(!okRun){
    failed++;
    out.split('\n').filter(l => /^FAIL|Error|UNERWARTET|TypeError|ReferenceError/.test(l) && !/Raum nicht gefunden|Kein Song gefunden/.test(l)).slice(0, 8).forEach(l => console.log('        ' + l));
  }
}
console.log('\n' + (failed ? failed + ' Testreihe(n) mit Fehlern' : 'ALLE TESTREIHEN OK') + '  (' + ((Date.now() - started) / 1000).toFixed(0) + ' s)');
process.exit(failed ? 1 : 0);
