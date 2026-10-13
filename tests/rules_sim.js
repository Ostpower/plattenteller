// Mini-Simulator der Firebase-Regeln (nur das, was unsere Regeln nutzen) — fängt Tippfehler/Logikfehler ab.
const PT_FS = require('fs'), PT_PATH = require('path');
// Regeln: docs/firebase-rules.json (Standard) oder firebase-rules.json im Repo-Hauptordner; per PT_RULES überschreibbar
const PT_RULES = process.env.PT_RULES || [PT_PATH.join(__dirname,'..','docs','firebase-rules.json'), PT_PATH.join(__dirname,'..','firebase-rules.json')].find(p => PT_FS.existsSync(p));
if(!PT_RULES){ console.error('firebase-rules.json nicht gefunden (docs/ oder Hauptordner, oder PT_RULES setzen)'); process.exit(2); }
const rules = JSON.parse(PT_FS.readFileSync(PT_RULES,'utf8')).rules;
const clone = x => x===undefined?undefined:JSON.parse(JSON.stringify(x));
const keys = p => p.split('/').filter(Boolean);
const getAt = (tree, ks) => ks.reduce((n,k)=> (n!==null && typeof n==='object') ? n[k] : undefined, tree);
function setAt(tree, ks, val){
  const t = clone(tree) || {}; let n = t;
  for(let i=0;i<ks.length-1;i++){ if(n[ks[i]]===null||typeof n[ks[i]]!=='object') n[ks[i]]={}; n=n[ks[i]]; }
  if(val===null||val===undefined) delete n[ks[ks.length-1]]; else n[ks[ks.length-1]]=clone(val);
  return t;
}
function snap(v){
  const exists = v!==undefined && v!==null;
  return {
    val:()=> exists? v : null, exists:()=>exists,
    child:k=> snap(exists && typeof v==='object' ? v[k] : undefined),
    isString:()=> typeof v==='string', isNumber:()=> typeof v==='number', isBoolean:()=> typeof v==='boolean',
    hasChild:(k)=> exists && typeof v==='object' && v[k]!==undefined && v[k]!==null,
    hasChildren:(arr)=> exists && typeof v==='object' && (arr? arr.every(k=>v[k]!==undefined&&v[k]!==null) : Object.keys(v).length>0),
  };
}
// Ausdruck auswerten: val().length → String-Länge; val() === null etc.
function ev(expr, env){
  const names = Object.keys(env);
  // newData.val().length  → funktioniert, weil val() den echten String liefert
  return !!new Function(...names, 'return ('+expr+');')(...names.map(n=>env[n]));
}
// Regelpfad entlang ks auflösen: liefert [{node, vars}] von der Wurzel bis zum Ziel
function walk(ks){
  let node = rules, vars = {}; const chain=[{node,vars:{...vars},ks:[]}];
  for(let i=0;i<ks.length;i++){
    let next = node[ks[i]];
    if(next===undefined || typeof next!=='object' || ks[i].startsWith('.')){
      const w = Object.keys(node).find(k=>k.startsWith('$'));
      if(!w){ chain.push(null); return chain; }
      vars={...vars,[w]:ks[i]}; next=node[w];
    }
    node=next; chain.push({node,vars:{...vars},ks:ks.slice(0,i+1)});
  }
  return chain;
}
function envFor(tree, newTree, ks, vars, auth){
  return { auth, root: snap(tree), data: snap(getAt(tree,ks)), newData: snap(getAt(newTree,ks)), now: (global.__NOW__ ?? Date.now()), ...vars };
}
function canRead(tree, path, auth){
  const ks = keys(path); const chain = walk(ks);
  for(const c of chain){ if(!c) break; const r=c.node['.read']; if(r!==undefined && ev(r, envFor(tree,tree,c.ks,c.vars,auth))) return true; }
  return false;
}
// Validierung aller betroffenen Regelorte (Vorfahren, Ziel, Nachkommen die im neuen Baum existieren)
function validateDown(newTree, tree, ks, node, vars, auth){
  const nv = getAt(newTree, ks);
  if(nv===undefined||nv===null) return true;
  if(node['.validate']!==undefined && !ev(node['.validate'], envFor(tree,newTree,ks,vars,auth))) return false;
  if(typeof nv==='object'){
    for(const k of Object.keys(nv)){
      let child = node[k], v2=vars;
      if(child===undefined||typeof child!=='object'){ const w=Object.keys(node).find(x=>x.startsWith('$')); if(!w) continue; child=node[w]; v2={...vars,[w]:k}; }
      if(!validateDown(newTree,tree,[...ks,k],child,v2,auth)) return false;
    }
  }
  return true;
}
function canWrite(tree, path, value, auth){
  const ks = keys(path); const newTree = setAt(tree, ks, value);
  const chain = walk(ks); let granted=false;
  for(const c of chain){ if(!c) break; const w=c.node['.write']; if(w!==undefined && ev(w, envFor(tree,newTree,c.ks,c.vars,auth))){ granted=true; break; } }
  if(!granted) return false;
  // .validate: an Vorfahren-Orten (mit neuen Daten) und abwärts ab dem Ziel
  for(const c of chain){ if(!c) break; if(c.ks.length<ks.length){ const v=c.node['.validate']; if(v!==undefined && getAt(newTree,c.ks)!==undefined && !ev(v, envFor(tree,newTree,c.ks,c.vars,auth))) return false; } }
  const last = chain[chain.length-1]; if(!last) return true;
  return validateDown(newTree, tree, ks, last.node, last.vars, auth);
}
module.exports = { canRead, canWrite, setAt };
