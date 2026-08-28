/* ── state.js ─────────────────────────────────────────────
   Modelos de datos + persistencia.
   localStorage: todo lo estructurado. IndexedDB: solo blobs de fotos
   (todavía sin pantalla que capture fotos — queda lista para después).
   Nada de esto llama a ningún backend ni IA — son datos y funciones puras.
──────────────────────────────────────────────────────────── */

const MC_STORE_KEY = 'mc_state_v2';

const ESTADOS = ['encendido','normal','atravesado','interrumpido','saturado','fundido','sin_gasolina','cerrando_dia'];
const TIPOS_BLOQUEO = ['dinero','tiempo','persona','material','energia','movilidad','no_se_como'];
const LABEL_BLOQUEO = {dinero:'💸 Dinero',tiempo:'⏱️ Tiempo',persona:'👤 Otra persona',material:'📦 Material',energia:'🧠 Energía',movilidad:'🚗 Movilidad','no_se_como':'❓ No sé cómo empezar'};

function mcDefaultState(){
  return {
    userState: { estadoActual:'normal', historialEstados:[] },
    currentContext: {
      locationType:'other', mobility:'free',
      interaction:{canSpeak:true,canType:true,canTakePhotos:true,headphones:false},
      availableTime:'unknown', privacy:'private'
    },
    worldMap:{lugares:[],personas:[],categorias:[]},
    missions:[],           // volcado de Cuéntame + manuales
    bosses:[],
    expedientes:[],
    interactions:[],       // Bitácora
    eventCooldowns:{},     // { eventId: timestampMs }
    eventStats:{},         // { eventId: {mostrado,aceptado,rechazado,incompatible} }
    racha:null             // { positivas, negativas, estadoAlIniciar, activa }
  };
}

let mcState = null;

function mcLoad(){
  try{
    const raw = localStorage.getItem(MC_STORE_KEY);
    mcState = raw ? JSON.parse(raw) : mcDefaultState();
    // migración suave: completa campos que falten sin pisar datos existentes
    const def = mcDefaultState();
    Object.keys(def).forEach(k=>{ if(mcState[k]===undefined) mcState[k]=def[k]; });
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
  // merge superficial + merge de 'interaction' si viene
  const {interaction, ...resto} = parcial;
  Object.assign(mcState.currentContext, resto);
  if(interaction) Object.assign(mcState.currentContext.interaction, interaction);
  mcSave();
}
function mcLogInteraction(tipo, detalle){
  mcState.interactions.push({fecha:new Date().toISOString(), tipo, ...detalle});
  mcSave();
}

/* ── Misiones (volcado mental + manuales) ────────────── */
function mcAddMission(titulo, origen){
  const m = {id:mcCid(), titulo, origen:origen||'manual', estado:'pendiente', bloqueo:null, fechaCreacion:new Date().toISOString(), vecesRecordada:0};
  mcState.missions.push(m);
  mcSave();
  return m;
}
function mcResolverMission(id){
  const m = mcState.missions.find(x=>x.id===id);
  if(!m) return;
  m.estado='hecha'; m.fechaResuelta=new Date().toISOString();
  mcLogInteraction('mission_resuelta',{missionId:id, titulo:m.titulo});
}
function mcBloquearMission(id, tipoBloqueo, notas){
  const m = mcState.missions.find(x=>x.id===id);
  if(!m) return;
  m.estado='bloqueada'; m.bloqueo={tipo:tipoBloqueo, desde:new Date().toISOString(), notas:notas||''};
  mcLogInteraction('mission_bloqueada',{missionId:id, titulo:m.titulo, tipo:tipoBloqueo});
  mcSave();
}
function mcRecordarMission(id){
  const m = mcState.missions.find(x=>x.id===id);
  if(m){ m.vecesRecordada=(m.vecesRecordada||0)+1; mcSave(); }
}

/* ── Cooldown / stats de eventos del Surprise Engine ─── */
function mcRecordEventShown(eventId){
  mcState.eventCooldowns[eventId] = Date.now();
  if(!mcState.eventStats[eventId]) mcState.eventStats[eventId]={mostrado:0,aceptado:0,rechazado:0,incompatible:0};
  mcState.eventStats[eventId].mostrado++;
  mcSave();
}
function mcRecordEventOutcome(eventId, outcome){
  // outcome: 'aceptado' | 'rechazado' | 'incompatible'
  if(!mcState.eventStats[eventId]) mcState.eventStats[eventId]={mostrado:0,aceptado:0,rechazado:0,incompatible:0};
  mcState.eventStats[eventId][outcome] = (mcState.eventStats[eventId][outcome]||0)+1;
  mcSave();
}

/* ── Racha dinámica ───────────────────────────────────── */
function mcRachaIniciar(){ mcState.racha = {positivas:0, negativas:0, activa:true, estadoAlIniciar:mcState.userState.estadoActual}; mcSave(); }
function mcRachaSeñalGlobal(tipo){
  if(!mcState.racha || !mcState.racha.activa) return;
  const positivas=['acepta_rapido','completa','pide_otra','reporta_fuego'];
  if(positivas.includes(tipo)) mcState.racha.positivas++; else mcState.racha.negativas++;
  mcSave();
}
function mcRachaTerminar(){ if(mcState.racha) mcState.racha.activa=false; mcSave(); }

/* ── Bosses ───────────────────────────────────────────── */
function mcAddBoss(nombre, condicion, tipo){
  const b={id:mcCid(), nombre, condicion, tipo:tipo||'temporizador', activo:true, observaciones:[], creado:new Date().toISOString()};
  mcState.bosses.push(b); mcSave(); return b;
}
function mcCerrarBoss(id){
  const b=mcState.bosses.find(x=>x.id===id); if(!b) return;
  b.activo=false; mcLogInteraction('boss_vencido',{bossId:id, nombre:b.nombre}); mcSave();
}

/* ── Expedientes ──────────────────────────────────────── */
function mcAddExpediente(exp){
  const e={id:mcCid(), estado:'activo', ultimaVez:new Date().toISOString(), ...exp};
  mcState.expedientes.push(e); mcSave(); return e;
}
function mcReabrirExpediente(id){
  const e=mcState.expedientes.find(x=>x.id===id); if(!e) return;
  e.ultimaVez=new Date().toISOString();
  mcLogInteraction('expediente_reabierto',{expedienteId:id, titulo:e.titulo});
  mcSave();
}

function mcCid(){return 'x_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

/* ── IndexedDB: solo para blobs de fotos (sin pantalla que la use aún) ── */
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

/* ── Adaptador de IA — stub a propósito, sin API keys, sin llamadas reales ── */
async function mcInterpretarVoz(textoOAudio){ return textoOAudio; }
async function mcAnalizarFoto(photoId){ return null; }
