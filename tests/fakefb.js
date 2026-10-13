// Minimale In-Memory-Attrappe der Firebase-compat-API (nur was index.html nutzt)
module.exports = function makeFirebase(shared, uid, owner){
  const tree = shared.tree, listeners = shared.listeners;
  const get = path => path.split('/').filter(Boolean).reduce((n,k)=> (n && typeof n==='object') ? n[k] : undefined, tree);
  const setAt = (path, val) => {
    const keys = path.split('/').filter(Boolean); let n = tree;
    for(let i=0;i<keys.length-1;i++){ if(typeof n[keys[i]]!=='object'||n[keys[i]]===null) n[keys[i]]={}; n=n[keys[i]]; }
    const last = keys[keys.length-1];
    if(val===null||val===undefined) delete n[last]; else n[last]=JSON.parse(JSON.stringify(val));
    // Eltern aufräumen wie Firebase (leere Objekte verschwinden)
    for(let i=keys.length-1;i>0;i--){ const parent = get(keys.slice(0,i).join('/')); if(parent && Object.keys(parent).length===0) setAt(keys.slice(0,i).join('/'), null); }
  };
  const snapOf = (path) => { const v = get(path); const key = path.split('/').filter(Boolean).pop();
    return { key, val:()=> v===undefined?null:JSON.parse(JSON.stringify(v)), exists:()=>v!==undefined&&v!==null,
      forEach:(cb)=>{ if(v&&typeof v==='object') for(const k of Object.keys(v)){ if(cb({key:k,val:()=>v[k]})===true) return true; } return false; } }; };
  const fire = () => { for(const l of [...listeners]) if(l.path!=='.info/connected') l.cb(snapOf(l.path)); };
  const ts = { '.sv':'timestamp' };
  const resolve = v => JSON.parse(JSON.stringify(v), (k,x)=> (x&&x['.sv']==='timestamp')?Date.now():x);
  const denied = (op, path) => (shared.denyIndex && path0(path).startsWith('hostRooms')) || (op==='remove' && shared.denyRoomRemove && /^rooms\/[^/]+$/.test(path0(path)));
  const path0 = p => p.split('/').filter(Boolean).join('/');
  const reject = () => Promise.reject(Object.assign(new Error('PERMISSION_DENIED: Permission denied'), {code:'PERMISSION_DENIED'}));
  const ref = (path) => ({
    child: p => ref(path+'/'+p),
    once: async()=> { if(denied('once', path)) throw Object.assign(new Error('PERMISSION_DENIED: Permission denied'), {code:'PERMISSION_DENIED'}); return snapOf(path); },
    set: async v => { if(denied('set', path)) return reject(); setAt(path, resolve(v)); fire(); },
    update: async v => { for(const k of Object.keys(v)) setAt(path+'/'+k, resolve(v[k])); fire(); },
    remove: async()=>{ if(denied('remove', path)) return reject(); setAt(path,null); fire(); },
    on: (ev, cb) => { listeners.push({path, cb, owner}); if(path==='.info/connected') cb({val:()=>true}); else cb(snapOf(path)); return cb; },
    off: (ev, cb) => { const i = listeners.findIndex(l=>l.path===path&&l.cb===cb); if(i>=0) listeners.splice(i,1); },
    onDisconnect: () => ({
      set: (v)=>{ (shared.disconnects = shared.disconnects || []).push({owner, path, v}); return Promise.resolve(); },
      cancel: ()=>{ shared.disconnects = (shared.disconnects||[]).filter(d => !(d.owner===owner && d.path===path)); return Promise.resolve(); } }),
  });
  let user = null; const authCbs = [];
  shared.setConnected = shared.setConnected || function(own, v){ listeners.filter(l=>l.path==='.info/connected' && l.owner===own).forEach(l=>l.cb({val:()=>v})); };
  shared.fireDisconnect = shared.fireDisconnect || function(own){ (shared.disconnects||[]).filter(d=>d.owner===own).forEach(d=>{ setAt(d.path, d.v); }); shared.disconnects = (shared.disconnects||[]).filter(d=>d.owner!==own); fire(); };
  return {
    apps: [], initializeApp(){ this.apps.push({}); },
    auth: () => ({ onAuthStateChanged: cb => { authCbs.push(cb); setTimeout(()=>cb(user),0); }, signInAnonymously: async()=>{ user={uid}; authCbs.forEach(c=>c(user)); } }),
    database: Object.assign(() => ({ ref }), { ServerValue: { TIMESTAMP: ts } }),
  };
};
