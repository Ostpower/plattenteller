const { canRead, canWrite, setAt } = require('./rules_sim');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const H={uid:'HOST'}, P1={uid:'P1'}, P2={uid:'P2'}, NO=null;
let T={};
const R='rooms/ABCD';
const w=(a,p,v)=>canWrite(T,p,v,a);
const apply=(p,v)=>{ T=setAt(T,p.split('/').filter(Boolean),v); };

// Raum anlegen
ok(w(H,R+'/meta',{hostUid:'HOST',phase:'lobby',createdAt:1}), 'Host darf Raum anlegen');
ok(!w(NO,R+'/meta',{hostUid:'X'}), 'Ohne Login: kein Raum');
ok(!w(P1,R+'/meta',{hostUid:'HOST',phase:'lobby'}), 'Spieler darf keinen Raum im Namen des Hosts anlegen');
apply(R+'/meta',{hostUid:'HOST',phase:'lobby',createdAt:1});
ok(w(H,R+'/meta/phase','playing'), 'Host darf Phase ändern');
ok(w(H,R+'/meta/hostConnected',true), 'Host darf hostConnected setzen');
ok(!w(P1,R+'/meta/phase','playing'), 'Spieler darf Phase NICHT ändern');
ok(!w(P1,R+'/meta/hostUid','P1'), 'Spieler darf Host NICHT übernehmen');
ok(canRead(T,R+'/meta',P1), 'Spieler darf meta lesen');
ok(!canRead(T,R+'/meta',NO), 'Ohne Login kein Lesen');
ok(!canRead(T,'rooms',P1), 'Raumliste (rooms) nicht lesbar');

// Beitritt P1 (jeder Wert einzeln)
ok(w(P1,R+'/players/P1/name','Anna'), 'P1: Name setzen'); apply(R+'/players/P1/name','Anna');
ok(w(P1,R+'/players/P1/connected',true), 'P1: connected'); apply(R+'/players/P1/connected',true);
ok(w(P1,R+'/players/P1/score',0), 'P1: Start-Score 0'); apply(R+'/players/P1/score',0);
ok(w(P1,R+'/players/P1/joinedAt',123), 'P1: joinedAt'); apply(R+'/players/P1/joinedAt',123);
ok(!w(P2,R+'/players/P1/name','Hacker'), 'P2 darf P1-Namen NICHT ändern');
ok(!w(P1,R+'/players/P1/score',99), 'P1 darf sich KEINE Punkte schreiben');
ok(!w(P1,R+'/players/P1/score',0), 'P1 darf Score nicht erneut setzen');
ok(w(P1,R+'/players/P1/name','Anni'), 'P1 darf eigenen Namen ändern');
ok(!w(P1,R+'/players/P1/name',''), 'Leerer Name abgelehnt');
ok(!w(P1,R+'/players/P1/name','x'.repeat(19)), 'Zu langer Name abgelehnt');
ok(!w(P1,R+'/players/P2/name','Fake'), 'P1 darf keinen anderen Spieler anlegen');
ok(w(H,R+'/players/P1/score',5), 'Host darf Score setzen');
ok(w(H,R+'/players/P1',null), 'Host darf Spieler entfernen (Kick)');
ok(w(P1,R+'/players/P1',null), 'Spieler darf sich selbst entfernen');
ok(!w(P2,R+'/players/P1',null), 'P2 darf P1 NICHT entfernen');
ok(canRead(T,R+'/players',P2), 'Spielerliste lesbar');

// Spiel
apply(R+'/players/P2',{name:'Ben',connected:true,score:0,joinedAt:2});
global.__NOW__ = 1000000;
ok(w(H,R+'/round',{n:1,total:5,state:'guessing'}), 'Host: Runde setzen'); apply(R+'/round',{n:1,total:5,state:'guessing'});
ok(!w(P1,R+'/round/state','reveal'), 'Spieler darf Runde NICHT steuern');
ok(!w(P1,R+'/round/reveal',{title:'x'}), 'Spieler darf Lösung NICHT schreiben');
ok(!w(P1,R+'/round/startedAt',1), 'Spieler darf Startzeit NICHT setzen');
const G=(o={})=>({round:1,title:'Hello',artist:'Adele',at:1000000,...o});
ok(!w(P1,R+'/guesses/P1',G()), 'Tippen vor Songstart nicht möglich');
ok(w(H,R+'/round/startedAt',999000), 'Host: Songstart (Startzeit) setzen'); apply(R+'/round/startedAt',999000);
ok(w(P1,R+'/guesses/P1',G()), 'P1 darf nach Songstart eigenen Tipp senden');
ok(w(P1,R+'/guesses/P1',G({title:''})), 'Nur Interpret getippt ist erlaubt');
ok(!w(P1,R+'/guesses/P1',G({title:'',artist:''})), 'Komplett leerer Tipp abgelehnt');
ok(!w(P1,R+'/guesses/P1',G({at:123})), 'Gefälschte Zeit (at != Serverzeit) abgelehnt');
ok(!w(P1,R+'/guesses/P1',G({round:2})), 'Tipp für falsche Runde abgelehnt');
ok(!w(P1,R+'/guesses/P1',{round:1,title:'a',artist:'b'}), 'Tipp ohne Zeit abgelehnt');
ok(!w(P1,R+'/guesses/P1',G({title:'x'.repeat(81)})), 'Zu langer Tipp abgelehnt');
ok(!w(P1,R+'/guesses/P2',G()), 'P1 darf NICHT für P2 tippen');
apply(R+'/guesses/P1',G());
ok(!w(P1,R+'/guesses/P1',G({title:'Geändert'})), 'Tipp ist endgültig: kein zweites Senden/Ändern');
ok(!w(P1,R+'/guesses/P1',null), 'Tipp kann nicht zurückgezogen werden');
ok(canRead(T,R+'/guesses/P1',P1), 'P1 darf eigenen Tipp lesen');
ok(!canRead(T,R+'/guesses/P1',P2), 'P2 darf P1-Tipp NICHT lesen (kein Abschreiben)');
ok(!canRead(T,R+'/guesses',P1), 'Spieler darf NICHT alle Tipps lesen');
ok(canRead(T,R+'/guesses',H), 'Host darf alle Tipps lesen');
ok(w(H,R+'/guesses',null), 'Host darf Tipps löschen');
ok(w(H,R+'/results/P1',{pts:2,round:1}), 'Host darf Ergebnis schreiben');
ok(!w(P1,R+'/results/P1',{pts:2,round:1}), 'Spieler darf Ergebnis NICHT schreiben');
ok(canRead(T,R+'/results/P1',P1), 'Ergebnis lesbar');
// Aufdecken sperrt
apply(R+'/round/state','reveal');
ok(!w(P2,R+'/guesses/P2',G()), 'Nach dem Aufdecken: kein Tipp mehr möglich');
ok(w(H,R+'/round/state','guessing'), 'Host darf Runde wieder öffnen');

// ===== Aufräumen / Löschen =====
{
  global.__NOW__ = 5000000;
  T = {};
  const R2='rooms/WXYZ';
  T = setAt(T,R2.split('/'),{meta:{hostUid:'HOST',phase:'ended',createdAt:1},players:{P1:{name:'Anna',connected:true,score:0,joinedAt:1}},round:{n:1,state:'reveal'}});
  ok(w(H,R2,null), 'Host darf seinen ganzen Raum löschen');
  ok(!w(P1,R2,null), 'Spieler darf den Raum NICHT löschen');
  ok(!w(NO,R2,null), 'Ohne Login kein Löschen');
  const H2={uid:'HOST2'};
  ok(!w(H2,R2,null), 'Anderer Host darf fremden Raum NICHT löschen');
  ok(!w(H,R2,{meta:{hostUid:'HOST'}}), 'Ganzer Raum darf nicht überschrieben werden (nur Löschen)');
  ok(w(H,R2+'/meta/phase','lobby'), 'Normale Host-Schreibzugriffe weiterhin möglich');
  ok(!w(P1,R2+'/meta/phase','lobby'), 'Spieler schreibt weiterhin nichts in meta');
  // Reste nach dem Löschen verhindern
  const T0=T; T={};
  ok(!w(P1,R2+'/players/P1/connected',false), 'Nach dem Löschen: kein Spieler-Rest (connected) mehr möglich');
  ok(!w(H,R2+'/meta/hostConnected',false), 'Nach dem Löschen: kein Host-Rest (hostConnected) mehr möglich');
  T=T0;
  ok(w(P1,R2+'/players/P1/connected',false), 'Solange der Raum existiert: Spieler-Präsenz schreibbar');
  // Private Raumliste
  ok(w(H,'hostRooms/HOST/WXYZ',123456), 'Host schreibt eigene Raumliste');
  ok(w(H,'hostRooms/HOST/WXYZ',null), 'Host löscht Eintrag in eigener Raumliste');
  ok(!w(P1,'hostRooms/HOST/WXYZ',123456), 'Fremde dürfen NICHT in fremde Raumliste schreiben');
  ok(!w(H,'hostRooms/HOST/WXYZ','text'), 'Raumliste: nur Zahlen (Zeitstempel)');
  T = setAt(T,['hostRooms','HOST','WXYZ'],123456);
  ok(canRead(T,'hostRooms/HOST',H), 'Host darf eigene Raumliste lesen');
  ok(!canRead(T,'hostRooms/HOST',P1), 'Fremde dürfen die Raumliste NICHT lesen (Raumcodes bleiben privat)');
  ok(!canRead(T,'hostRooms',H), 'Niemand darf alle Raumlisten lesen');
}

// ===== Aussteigen / Späteinsteiger =====
{
  global.__NOW__ = 7000000;
  T = {};
  const R3='rooms/LEAV';
  T = setAt(T,R3.split('/'),{meta:{hostUid:'HOST',phase:'playing',createdAt:1},players:{P1:{name:'Anna',connected:true,score:3,joinedAt:1}}});
  ok(w(P1,R3+'/players/P1/left',true), 'Spieler darf sich selbst als „ausgestiegen“ markieren');
  ok(w(P1,R3+'/players/P1/left',null), 'Spieler darf die Markierung wieder entfernen (Wiedereinstieg)');
  ok(!w(P2,R3+'/players/P1/left',true), 'Fremder darf Spieler NICHT als ausgestiegen markieren');
  ok(!w(P1,R3+'/players/P1/left','ja'), 'Markierung nur als true/false');
  ok(!w(P1,R3+'/players/P1/score',99), 'Aussteigen gibt keine Punkte-Rechte');
  ok(w(H,R3+'/players/P1/left',true), 'Host darf ebenfalls markieren');
  // Späteinsteiger mitten im Spiel (Phase "playing"): gleiche Regeln wie in der Lobby
  ok(w(P2,R3+'/players/P2/name','Ben'), 'Späteinsteiger: Name');
  ok(w(P2,R3+'/players/P2/score',0), 'Späteinsteiger: Start-Score 0');
  ok(!w(P2,R3+'/players/P2/score',50), 'Späteinsteiger: kein Start-Vorsprung');
  // Nach dem Löschen des Raums: keine Reste
  const T1=T; T={};
  ok(!w(P1,R3+'/players/P1/left',true), 'Ohne Raum: kein Rest durch „left“');
  T=T1;
}

// ===== Hitster: Stelle einsortieren, Zeitleisten =====
{
  global.__NOW__ = 9000000;
  T = {};
  const R4='rooms/HITS';
  T = setAt(T,R4.split('/'),{meta:{hostUid:'HOST',phase:'playing',mode:'hitster',createdAt:1},
    players:{P1:{name:'Anna',connected:true,score:1,joinedAt:1},P2:{name:'Ben',connected:true,score:1,joinedAt:2}},
    round:{n:2,total:5,state:'guessing',startedAt:8999000}});
  const S=(o={})=>({round:2,slot:1,at:9000000,...o});
  ok(w(P1,R4+'/guesses/P1',S()), 'Hitster: Spieler darf seine Stelle (slot) abschicken');
  ok(w(P1,R4+'/guesses/P1',S({slot:0})), 'Hitster: Stelle 0 (ganz vorne) erlaubt');
  ok(!w(P1,R4+'/guesses/P1',S({slot:-1})), 'Hitster: negative Stelle abgelehnt');
  ok(!w(P1,R4+'/guesses/P1',S({slot:501})), 'Hitster: absurd hohe Stelle abgelehnt');
  ok(!w(P1,R4+'/guesses/P1',S({slot:'eins'})), 'Hitster: Stelle muss eine Zahl sein');
  ok(!w(P1,R4+'/guesses/P1',S({at:5})), 'Hitster: gefälschte Zeit abgelehnt');
  ok(!w(P1,R4+'/guesses/P1',S({round:1})), 'Hitster: falsche Runde abgelehnt');
  ok(!w(P1,R4+'/guesses/P1',S({title:'x',artist:'y'})), 'Hitster: Stelle UND Titel zusammen abgelehnt');
  ok(!w(P1,R4+'/guesses/P2',S()), 'Hitster: nicht für einen anderen Spieler');
  ok(w(P1,R4+'/guesses/P1',{round:2,title:'Hello',artist:'Adele',at:9000000}), 'Titel/Interpret-Tipps weiterhin erlaubt (Zusammen-Modus)');
  ok(!w(P1,R4+'/guesses/P1',{round:2,at:9000000}), 'Weder Stelle noch Titel: abgelehnt');
  apply(R4+'/guesses/P1',S());
  ok(!w(P1,R4+'/guesses/P1',S({slot:2})), 'Hitster: einsortiert ist endgültig (kein zweites Mal)');
  ok(!canRead(T,R4+'/guesses/P1',P2), 'Hitster: Stelle der anderen nicht lesbar');
  // Zeitleisten
  ok(w(H,R4+'/timelines/P1',[{y:1985,t:'A',a:'B',r:0}]), 'Host darf Zeitleisten schreiben');
  ok(!w(P1,R4+'/timelines/P1',[{y:1900,t:'x',a:'y',r:0}]), 'Spieler darf seine Zeitleiste NICHT selbst schreiben');
  ok(!w(P2,R4+'/timelines/P1',[]), 'Fremde dürfen keine Zeitleisten ändern');
  ok(canRead(T,R4+'/timelines/P1',P2), 'Zeitleisten (nur aufgedeckte Songs) sind lesbar');
  ok(w(H,R4+'/results/P1',{pts:1,ok:true,slot:1,round:2}), 'Host schreibt Hitster-Ergebnis');
  ok(!w(P1,R4+'/players/P1/score',99), 'Spieler kann sich keine Karten/Punkte schreiben');
  ok(w(H,R4+'/timelines',null), 'Host darf alle Zeitleisten löschen (Neustart)');
}

// ===== Quiz: Antwort ändern, Countdown =====
{
  T = {};
  const R5='rooms/QUIZ';
  const base = {meta:{hostUid:'HOST',phase:'playing',mode:'quiz',createdAt:1},
    players:{P1:{name:'Anna',connected:true,score:0,joinedAt:1}},
    round:{n:3,total:6,state:'guessing',startedAt:7000000,kind:'artist',options:['A','B','C','D'],countdownMs:10000}};
  T = setAt(T,R5.split('/'),base);
  global.__NOW__ = 7100000;
  const C=(o={})=>({round:3,choice:1,at:7100000,...o});
  ok(w(P1,R5+'/guesses/P1',C()), 'Quiz: Antwort (choice) abschicken');
  apply(R5+'/guesses/P1',C());
  global.__NOW__ = 7200000;
  ok(w(P1,R5+'/guesses/P1',C({choice:2,at:7200000})), 'Quiz: Antwort darf geändert werden (überschreiben)');
  ok(!w(P1,R5+'/guesses/P1',C({choice:4,at:7200000})), 'Quiz: Antwort 4 (nur 0–3) abgelehnt');
  ok(!w(P1,R5+'/guesses/P1',C({choice:-1,at:7200000})), 'Quiz: negative Antwort abgelehnt');
  ok(!w(P1,R5+'/guesses/P1',C({choice:'B',at:7200000})), 'Quiz: Antwort muss eine Zahl sein');
  ok(!w(P1,R5+'/guesses/P1',C({at:1})), 'Quiz: gefälschte Zeit abgelehnt');
  ok(!w(P1,R5+'/guesses/P1',C({title:'x',at:7200000})), 'Quiz: Antwort + Titel zusammen abgelehnt');
  ok(!w(P2,R5+'/guesses/P1',C({at:7200000})), 'Quiz: nicht für andere Spieler');
  ok(!canRead(T,R5+'/guesses/P1',P2), 'Quiz: Antworten der anderen nicht lesbar');
  ok(w(H,R5+'/round/deadlineStart',7200000), 'Quiz: Host startet den Countdown'); apply(R5+'/round/deadlineStart',7200000);
  ok(!w(P1,R5+'/round/deadlineStart',9), 'Quiz: Spieler kann den Countdown nicht verändern');
  global.__NOW__ = 7205000;
  ok(w(P1,R5+'/guesses/P1',C({choice:3,at:7205000})), 'Quiz: während des Countdowns (5 s von 10 s) noch änderbar');
  global.__NOW__ = 7210000;
  ok(w(P1,R5+'/guesses/P1',C({choice:0,at:7210000})), 'Quiz: genau am Ende des Countdowns noch erlaubt');
  global.__NOW__ = 7210500;
  ok(!w(P1,R5+'/guesses/P1',C({choice:1,at:7210500})), 'Quiz: nach Ablauf des Countdowns keine Änderung mehr (vom Server erzwungen)');
  apply(R5+'/round/state','reveal');
  global.__NOW__ = 7100000; 
  ok(!w(P1,R5+'/guesses/P1',C()), 'Quiz: nach dem Aufdecken keine Antwort mehr');
  // Im Zusammen-Modus bleibt der Tipp endgültig
  T = setAt({},R5.split('/'),{...base, meta:{...base.meta,mode:'together'}, guesses:{P1:{round:3,title:'a',artist:'b',at:7100000}}});
  global.__NOW__ = 7200000;
  ok(!w(P1,R5+'/guesses/P1',{round:3,title:'neu',artist:'x',at:7200000}), 'Zusammen-Modus: Tipp bleibt endgültig (kein Überschreiben)');
  // Host schreibt Optionen, aber Spieler nicht
  T = setAt({},R5.split('/'),base);
  ok(w(H,R5+'/round',{...base.round,n:4,options:['W','X','Y','Z']}), 'Host darf die Quiz-Runde (Optionen) schreiben');
  ok(!w(P1,R5+'/round/options',['A','A','A','A']), 'Spieler darf Optionen NICHT ändern');
}

// ===== Gemeinsamer Jahre-Speicher (years/<ISRC>) =====
{
  T = {};
  global.__NOW__ = Date.UTC(2026, 9, 13);   // 13.10.2026
  const NOW = global.__NOW__;
  const Y = (o={}) => ({ y: 1985, s: 'mb', t: NOW, ...o });
  const ISRC = 'GBAYE0601498';
  ok(w(P1,'years/'+ISRC,Y()), 'Jahre: angemeldetes Gerät darf neuen Eintrag schreiben');
  ok(w(P2,'years/USRC17607839',Y({s:'mb-orig'})) && w(P2,'years/DEA620000001',Y({s:'spotify'})), 'Jahre: Quellen mb-orig und spotify erlaubt');
  ok(!w(NO,'years/'+ISRC,Y()), 'Jahre: ohne Anmeldung kein Schreiben');
  ok(!canRead(T,'years/'+ISRC,NO), 'Jahre: ohne Anmeldung kein Lesen');
  apply('years/'+ISRC,Y());
  ok(canRead(T,'years/'+ISRC,P2), 'Jahre: angemeldete Geräte dürfen einen Eintrag lesen');
  ok(!canRead(T,'years',P2), 'Jahre: die ganze Liste ist nicht auf einmal lesbar');
  ok(!w(P2,'years/'+ISRC,Y({y:1990})), 'Jahre: bestehenden Eintrag NICHT überschreiben (auch nicht von anderem Gerät)');
  ok(!w(P1,'years/'+ISRC,Y({y:1990})), 'Jahre: auch der Schreiber selbst kann nicht überschreiben');
  ok(!w(P1,'years/'+ISRC+'/y',1999), 'Jahre: einzelnes Feld ändern abgelehnt');
  ok(!w(P1,'years/'+ISRC,null), 'Jahre: Eintrag löschen abgelehnt');
  // Form der ISRC
  ok(!w(P1,'years/gbaye0601499',Y()), 'Jahre: ISRC in Kleinbuchstaben abgelehnt');
  ok(!w(P1,'years/GBAYE060149',Y()), 'Jahre: ISRC mit 11 Zeichen abgelehnt');
  ok(!w(P1,'years/GBAYE06014999',Y()), 'Jahre: ISRC mit 13 Zeichen abgelehnt');
  ok(!w(P1,'years/GB-AYE060149',Y()), 'Jahre: ISRC mit Sonderzeichen abgelehnt');
  // Wertebereich
  ok(w(P1,'years/AAAAA0000001',Y({y:1900})), 'Jahre: 1900 ist die Untergrenze (erlaubt)');
  ok(!w(P1,'years/AAAAA0000002',Y({y:1899})), 'Jahre: 1899 abgelehnt');
  ok(w(P1,'years/AAAAA0000003',Y({y:2026})) && w(P1,'years/AAAAA0000004',Y({y:2027})), 'Jahre: aktuelles Jahr und Jahr+1 erlaubt (Vorab-Veröffentlichung)');
  ok(!w(P1,'years/AAAAA0000005',Y({y:2028})), 'Jahre: Jahr+2 abgelehnt');
  ok(!w(P1,'years/AAAAA0000006',Y({y:1985.5})), 'Jahre: Dezimalzahl abgelehnt');
  ok(!w(P1,'years/AAAAA0000007',Y({y:'1985'})), 'Jahre: Jahr als Text abgelehnt');
  // Quelle, Zeitstempel, Form
  ok(!w(P1,'years/AAAAA0000008',Y({s:'manuell'})), 'Jahre: unbekannte Quelle abgelehnt');
  ok(!w(P1,'years/AAAAA0000009',Y({s:5})), 'Jahre: Quelle muss Text sein');
  ok(!w(P1,'years/AAAAA0000010',Y({t:123})), 'Jahre: gefälschter Zeitstempel (≠ Serverzeit) abgelehnt');
  ok(!w(P1,'years/AAAAA0000011',{ y:1985, s:'mb' }), 'Jahre: ohne Zeitstempel abgelehnt');
  ok(!w(P1,'years/AAAAA0000012',{ s:'mb', t:NOW }), 'Jahre: ohne Jahr abgelehnt');
  ok(!w(P1,'years/AAAAA0000013',Y({extra:'x'})), 'Jahre: zusätzliche Felder abgelehnt');
  ok(!w(P1,'years/AAAAA0000014',Y({t:NOW-1})), 'Jahre: Zeitstempel eine ms daneben abgelehnt');
  ok(!w(P1,'years/AAAAA0000015',Y({y:null})), 'Jahre: Jahr null abgelehnt');
  // andere Bereiche bleiben unberührt
  ok(!w(P1,'years',{ [ISRC]: Y() }), 'Jahre: ganze Liste auf einmal ersetzen abgelehnt (Eintrag existiert)');
  ok(!canRead(T,'rooms',P1), 'Jahre: Regeln für Räume unverändert (rooms nicht lesbar)');
}
console.log(fails? '\n'+fails+' FEHLER':'\nALLE REGEL-TESTS OK'); process.exit(fails?1:0);
