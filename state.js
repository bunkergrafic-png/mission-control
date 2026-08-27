/* ── state.js ─────────────────────────────────────────────
   Modelos de datos + persistencia.
   localStorage: todo lo estructurado (UserState, CurrentContext, etc).
   IndexedDB: solo blobs de fotos (localStorage se llena rápido con base64).
   Nada de esto llama a ningún backend ni IA — son datos y funciones puras.
──────────────────────────────────────────────────────────── */

const MC_STORE_KEY = 'mc_state_v1';

const ESTADOS = ['encendido','normal','atravesado','interrumpido','saturado','cansado','sin_gasolina','cerrando_dia'];

function mcDefaultState(){
  return {
    userState: { estadoActual:'normal', historialEstados:[] },
    currentContext: {
      locationType:'other', mobility:'free',
      interaction:{canSpeak:true,canType:true,canTakePhotos:true,headphones:false},
      availableTime:'unknown', privacy:'private'
    },
    // el resto de modelos (WorldMap, Mission, Boss, OpenCase, Blocker, Interaction...)
    // se agregan a medida que las pantallas correspondientes se construyan —
    // no se precargan vacíos "por si acaso" para no sobre-ingenierizar el prototipo visual.
    worldMap:{lugares:[],personas:[],categorias:[]},
    interactions:[]
  };
}

let mcState = null;

function mcLoad(){
  try{
    const raw = localStorage.getItem(MC_STORE_KEY);
    mcState = raw ? JSON.parse(raw) : mcDefaultState();
  }catch(e){
    mcState = mcDefaultState();
  }
  return mcState;
}
function mcSave(){
  try{ localStorage.setItem(MC_STORE_KEY, JSON.stringify(mcState)); }catch(e){}
}

function mcSetEstado(estado, señal){
  mcState.userState.historialEstados.push({estado, fecha:new Date().toISOString(), señal:señal||'manual'});
  mcState.userState.estadoActual = estado;
  mcSave();
}
function mcSetContexto(parcial){
  Object.assign(mcState.currentContext, parcial);
  mcSave();
}
function mcLogInteraction(tipo, detalle){
  mcState.interactions.push({fecha:new Date().toISOString(), tipo, ...detalle});
  mcSave();
}

/* ── IndexedDB: solo para blobs de fotos ─────────────────
   API mínima: mcPhotoSave(blob) -> id ; mcPhotoGet(id) -> blob|null.
   Todavía no hay pantalla que capture fotos en este prototipo —
   se deja lista para cuando Boss/Waiting Games la necesiten. */
const MC_DB_NAME='mc_photos', MC_DB_STORE='photos';
function mcOpenPhotoDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(MC_DB_NAME,1);
    req.onupgradeneeded=()=>{req.result.createObjectStore(MC_DB_STORE);};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function mcPhotoSave(blob){
  const db=await mcOpenPhotoDB();
  const id='p_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(MC_DB_STORE,'readwrite');
    tx.objectStore(MC_DB_STORE).put(blob,id);
    tx.oncomplete=()=>resolve(id);
    tx.onerror=()=>reject(tx.error);
  });
}
async function mcPhotoGet(id){
  const db=await mcOpenPhotoDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(MC_DB_STORE,'readonly');
    const req=tx.objectStore(MC_DB_STORE).get(id);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
}
