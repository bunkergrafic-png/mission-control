/* ── app.js ───────────────────────────────────────────────
   Render + wiring de todas las pantallas. Usa state.js (datos)
   y engine.js (Surprise Engine / heurísticas). V0.2 funcional.
──────────────────────────────────────────────────────────── */

const $ = id => document.getElementById(id);
function mcEsc(s){ const d=document.createElement('div'); d.textContent=s??''; return d.innerHTML; }

const GREETS = [
  '¿Qué está pasando, Dio?',
  '¿Qué coño tendrá hoy?',
  'Aquí sigo. ¿Cómo vamos?',
  '¿Cómo va el día por ahí?'
];
const FRASES_CIERRE = [
  'Ya quedó.',
  'Eso ya no vuelve a la lista.',
  'Un movimiento menos pendiente.',
  'Anotado.'
];

const MOOD_BUTTONS = [
  {id:'saturado', ico:'🤯', label:'ESTOY SATURADO'},
  {id:'interrumpido', ico:'😡', label:'ME INTERRUMPIERON'},
  {id:'fundido', ico:'😴', label:'ESTOY FUNDIDO'},
  {id:'sorprendeme', ico:'🎲', label:'SORPRÉNDEME'}
];
const MOOD_ENCENDIDO = {id:'encendido', ico:'🔥', label:'ESTOY ENCENDIDO'};

const CTX_CHIPS = [
  {id:'home', ico:'📍', label:'Estoy en casa', set:{locationType:'home', mobility:'free'}},
  {id:'waiting', ico:'⏳', label:'Estoy esperando', set:{locationType:'waiting', mobility:'seated', availableTime:'30m_plus'}},
  {id:'street', ico:'🚗', label:'Estoy en la calle', set:{locationType:'street', mobility:'limited'}},
  {id:'quiet', ico:'🤫', label:'Solo puedo tocar', set:{interaction:{canSpeak:false,canType:true,canTakePhotos:true,headphones:false}}},
  {id:'headphones', ico:'🎧', label:'Tengo audífonos', set:{interaction:{headphones:true}}}
];

function fraseCierre(){ return FRASES_CIERRE[Math.floor(Math.random()*FRASES_CIERRE.length)]; }

let toastTimer=null;
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}

/* ── navegación ───────────────────────────────────────── */
function mcShowScreen(id){
  document.querySelectorAll('.overlay-screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.remove('tab-on'));
  if(!id){ document.querySelector('[data-tab="home"]').classList.add('tab-on'); return; }
  $(id).classList.add('active');
  const tb=document.querySelector(`[data-screen="${id}"]`);
  if(tb) tb.classList.add('tab-on');
}

/* ── Home ─────────────────────────────────────────────── */
function renderGreet(){ $('greetLine').textContent = GREETS[Math.floor(Math.random()*GREETS.length)]; }

function renderMoodGrid(){
  const botones = mcState.userState.estadoActual==='encendido'
    ? [MOOD_ENCENDIDO, ...MOOD_BUTTONS.slice(0,3)]
    : MOOD_BUTTONS;
  $('moodGrid').innerHTML = botones.map(m=>
    `<button class="mood-btn" data-mood="${m.id}"><span class="ico">${m.ico}</span><span>${m.label}</span></button>`
  ).join('');
  $('moodGrid').querySelectorAll('[data-mood]').forEach(b=>{
    b.onclick=()=>{
      mcSetEstado(b.dataset.mood, 'boton_home');
      mcLogInteraction('mood_click', {mood:b.dataset.mood});
      renderHomeMid();
      if(b.dataset.mood==='sorprendeme') ofrecerSorpresa();
    };
  });
}

function renderCtxRow(){
  const ctx=mcState.currentContext;
  $('ctxRow').innerHTML = CTX_CHIPS.map(c=>`<button class="ctx-chip" data-ctx="${c.id}"><span>${c.ico}</span> ${c.label}</button>`).join('');
  $('ctxRow').querySelectorAll('[data-ctx]').forEach(b=>{
    const chip = CTX_CHIPS.find(c=>c.id===b.dataset.ctx);
    b.onclick=()=>{
      b.classList.toggle('on');
      mcSetContexto(b.classList.contains('on') ? chip.set : {});
      renderHomeMid();
    };
  });
}

function renderHomeMid(){
  const partes=[];
  if(mcState.userState.estadoActual!=='normal') partes.push('estado: '+mcState.userState.estadoActual);
  if(mcState.currentContext.locationType!=='other') partes.push('contexto: '+mcState.currentContext.locationType);
  $('homeMid').textContent = partes.join(' · ');
}

/* ── Surprise Engine → pantalla Sorpresa ─────────────────*/
let sorpresaActual = null;

function ofrecerSorpresa(preferProductivo){
  let ev = mcSeleccionarEvento();
  if(preferProductivo){
    const productivo = SURPRISE_EVENTS.find(e=>e.productividadOculta && mcEsCompatible(e, mcState.currentContext));
    if(productivo) ev = productivo;
  }
  if(!ev){
    sorpresaActual=null;
    $('sorpresaKicker').textContent='🎲 SORPRESA';
    $('sorpresaTitulo').textContent='Nada por ahora';
    $('sorpresaCuerpo').textContent='No tengo nada que encaje con tu contexto en este momento. Cambia el contexto o intenta en un rato.';
    $('sorpresaInputWrap').hidden=true;
    $('sorpresaAccionesPre').hidden=true;
    $('sorpresaAccionesPost').hidden=false;
    mcShowScreen('screenSorpresa');
    return;
  }
  sorpresaActual = ev;
  mcRecordEventShown(ev.id);
  mcLogInteraction('sorpresa_ofrecida',{eventId:ev.id, tipo:ev.tipo});
  const kickers={clandestina:'🔒 MISIÓN CLANDESTINA', waiting_game:'⏳ WAITING GAME', espejo:'🪞 ESPEJO', reto_sin_productividad:'🎲 SOLO POR DIVERSIÓN'};
  $('sorpresaKicker').textContent = kickers[ev.tipo] || '🎲 SORPRESA';
  $('sorpresaTitulo').textContent = ev.contenido.titulo;
  $('sorpresaCuerpo').textContent = ev.contenido.cuerpo;
  $('sorpresaInputWrap').hidden = ev.interaccion!=='input';
  if(ev.interaccion==='input'){ $('sorpresaInput').value=''; $('sorpresaInput').placeholder=ev.contenido.placeholder||'...'; }
  $('sorpresaAccionesPre').hidden=false;
  $('sorpresaAccionesPost').hidden=true;
  mcShowScreen('screenSorpresa');
}

$('sorpresaAceptar').onclick=()=>{
  if(!sorpresaActual) return;
  mcRecordEventOutcome(sorpresaActual.id,'aceptado');
  mcLogInteraction('sorpresa_aceptada',{eventId:sorpresaActual.id, titulo:sorpresaActual.contenido.titulo});
  mcRachaSeñalGlobal('acepta_rapido');
  if(sorpresaActual.interaccion==='input'){
    $('sorpresaAccionesPre').hidden=true; $('sorpresaAccionesPost').hidden=false;
  }else if(sorpresaActual.interaccion==='confirmar_luego'){
    $('sorpresaCuerpo').textContent += ' — cuando lo hagas, vuelve y toca "listo".';
    $('sorpresaAccionesPre').hidden=true; $('sorpresaAccionesPost').hidden=false;
  }else{
    completarSorpresa();
  }
};
$('sorpresaListo').onclick=()=>{
  if(sorpresaActual && sorpresaActual.interaccion==='input'){
    const val=$('sorpresaInput').value.trim();
    if(val) mcLogInteraction('sorpresa_respuesta',{eventId:sorpresaActual.id, respuesta:val});
  }
  completarSorpresa();
};
$('sorpresaCerrar').onclick=()=>{
  if(sorpresaActual){
    mcRecordEventOutcome(sorpresaActual.id,'rechazado');
    mcLogInteraction('sorpresa_rechazada',{eventId:sorpresaActual.id});
    mcRachaSeñalGlobal('rechaza');
  }
  mcShowScreen(null);
};
function completarSorpresa(){
  mcRachaSeñalGlobal('completa');
  mcShowScreen(null);
  toast(fraseCierre());
  evaluarRacha();
}

/* ── Racha dinámica ───────────────────────────────────── */
function evaluarRacha(){
  const encendido = mcState.userState.estadoActual==='encendido';
  const rachaViva = mcState.racha && mcState.racha.activa;
  if(!encendido && !rachaViva) return; // fuera de una racha, no insistir
  if(!rachaViva) mcRachaIniciar();
  if(mcRachaDebeRetirarse()) mostrarRachaRetiro();
  else mostrarRachaContinuar();
}
function mostrarRachaContinuar(){
  $('rachaKicker').textContent='🔥 RACHA';
  $('rachaTexto').textContent='Eso fue rápido. ¿Hasta dónde llega esta vaina hoy?';
  $('rachaGrid').innerHTML=`
    <button data-r="apuesta">😈 Sube la apuesta</button>
    <button data-r="otra">⚡ Otra rápida</button>
    <button data-r="importante">🎯 Dame algo importante</button>
    <button class="salir" data-r="salir">🛑 Salgo de la racha</button>`;
  wireRachaGrid(); mcShowScreen('screenRacha');
}
function mostrarRachaRetiro(){
  mcRachaTerminar();
  $('rachaKicker').textContent='🪫 HASTA AQUÍ';
  $('rachaTexto').textContent='Conseguimos movimiento. Eso es suficiente. Déjalo quieto.';
  $('rachaGrid').innerHTML=`<button class="salir" data-r="ok">Entendido</button>`;
  wireRachaGrid(); mcShowScreen('screenRacha');
}
function wireRachaGrid(){
  $('rachaGrid').querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      const r=b.dataset.r; mcShowScreen(null);
      if(r==='salir'||r==='ok'){ mcRachaTerminar(); return; }
      ofrecerSorpresa(r==='importante');
    };
  });
}

/* ── Cuéntame ─────────────────────────────────────────── */
let cuentameImportantes=[];
$('btnCuentame').onclick=()=>{
  $('cuentameStep1').hidden=false; $('cuentameStep2').hidden=true;
  $('cuentameTexto').value='';
  mcShowScreen('screenCuentame');
};
$('cuentameCerrar').onclick=()=>mcShowScreen(null);
$('cuentameFinCerrar').onclick=()=>mcShowScreen(null);
$('cuentameProcesar').onclick=()=>{
  const texto=$('cuentameTexto').value.trim();
  if(!texto) return;
  const r = mcProcesarVolcado(texto);
  r.todas.forEach(t=>mcAddMission(t,'cuentame'));
  mcLogInteraction('cuentame_volcado',{cantidad:r.todas.length});
  cuentameImportantes = r.importantes;
  $('cuentameResumen').textContent = r.importantes.length
    ? `Ya lo tengo. Hay ${r.importantes.length===1?'una cosa':'dos cosas'} que parecen importantes hoy. El resto me lo quedo yo.`
    : 'Ya lo tengo. Lo guardé todo — nada urgente por ahora.';
  $('cuentameLista').innerHTML = r.importantes.map(t=>`<div class="dump-item"><span>${mcEsc(t)}</span><span class="tag-importante">hoy</span></div>`).join('');
  $('cuentameStep1').hidden=true; $('cuentameStep2').hidden=false;
};
$('cuentameUsuarioDecide').onclick=()=>{ mcShowScreen(null); renderPendientes(); mcShowScreen('screenPendientes'); };
$('cuentameSistemaDecide').onclick=()=>{ mcShowScreen(null); ofrecerSorpresa(true); };

/* ── Boss ─────────────────────────────────────────────── */
let bossActual=null, bossTimerInterval=null;
$('btnVerBoss').onclick=()=>{
  bossActual = { nombre:'El lavaplatos del infierno', condicion:'Sobrevive una ronda de 7 minutos.', tipo:'temporizador' };
  $('bossTeaser').textContent='Hay una vaina que llevas esquivando. Hoy creo que podrías con ella.';
  $('bossPreActions').hidden=false; $('bossRevealed').hidden=true;
  mcShowScreen('screenBoss');
};
$('bossRevelar').onclick=()=>{
  $('bossPreActions').hidden=true; $('bossRevealed').hidden=false;
  $('bossNombre').textContent=bossActual.nombre;
  $('bossCondicion').textContent='Condición de victoria: '+bossActual.condicion;
  mcLogInteraction('boss_revelado',{nombre:bossActual.nombre});
  decidirModoBoss();
};
$('bossRechazar').onclick=()=>{ mcLogInteraction('boss_rechazado',{}); mcShowScreen(null); };
$('bossCerrar').onclick=()=>{ clearInterval(bossTimerInterval); mcShowScreen(null); };
$('bossEmpezarRonda').onclick=()=>{
  $('bossModoNormal').hidden=true; $('bossTimerWrap').hidden=false;
  let seg=420; updateBossTimer(seg);
  bossTimerInterval=setInterval(()=>{
    seg--; updateBossTimer(seg);
    if(seg<=0){ clearInterval(bossTimerInterval); $('bossTimerDisplay').textContent='¡TIEMPO!'; }
  },1000);
};
$('bossSobrevivido').onclick=()=>{
  clearInterval(bossTimerInterval);
  mcCerrarBoss(bossActual.id||'demo');
  mcLogInteraction('boss_sobrevivido',{nombre:bossActual.nombre});
  toast('Sobreviviste. Coño, mira cómo quedó eso.');
  mcShowScreen(null);
  evaluarRacha();
};
function decidirModoBoss(){
  const ctx=mcState.currentContext;
  const puedeAtacar = ctx.mobility==='free' && ctx.locationType==='home';
  $('bossModoNormal').hidden=!puedeAtacar;
  $('bossModoIntel').hidden=puedeAtacar;
  $('bossTimerWrap').hidden=true;
  if(!puedeAtacar){
    $('bossZonas').innerHTML=['Zona izquierda','Zona derecha','Centro','Encima de la mesa'].map(z=>`<button data-z="${z}">${z}</button>`).join('');
    $('bossZonas').querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{
      mcLogInteraction('boss_intelligence',{nombre:bossActual.nombre, zona:b.dataset.z});
      toast('Anotado — otro día atacamos por ahí.');
      mcShowScreen(null);
    });
  }
}

/* ── Expedientes ──────────────────────────────────────── */
function seedExpedienteSiVacio(){
  if(mcState.expedientes.length===0){
    mcAddExpediente({tipo:'aprendizaje', titulo:'[Ejemplo] Expediente de prueba', pistaRecuerdo:'🏺🔥📯', pregunta:'¿Qué representa esta pista?', respuesta:'Reemplaza este expediente por uno real cuando quieras — esto es solo para probar el mecanismo.'});
  }
}
function renderExpedientes(){
  const list=mcState.expedientes;
  if(!list.length){ $('expedientesLista').innerHTML='<div class="plist-empty">Sin expedientes todavía.</div>'; return; }
  $('expedientesLista').innerHTML=list.map(e=>`
    <div class="plist-row">
      <div class="t">${mcEsc(e.titulo)}${e.estado==='dormido'?' <span class="badge-dormido">dormido</span>':''}</div>
      <div class="m">Pista: ${mcEsc(e.pistaRecuerdo||'—')}</div>
      <div class="actions"><button data-recall="${e.id}">Recuperar</button></div>
    </div>`).join('');
  $('expedientesLista').querySelectorAll('[data-recall]').forEach(b=>b.onclick=()=>abrirRecall(b.dataset.recall));
}
function abrirRecall(id){
  const e=mcState.expedientes.find(x=>x.id===id); if(!e) return;
  mcReabrirExpediente(id);
  const resp = prompt(`${e.pistaRecuerdo}\n\n${e.pregunta||'¿Qué recuerdas?'}`);
  if(resp!==null){
    mcLogInteraction('expediente_recall',{expedienteId:id, respuestaUsuario:resp});
    alert(e.respuesta ? ('Respuesta: '+e.respuesta) : 'Guardado.');
  }
  renderExpedientes();
}
$('expedientesCerrar').onclick=()=>mcShowScreen(null);

/* ── Bloqueos ─────────────────────────────────────────── */
function renderBloqueos(){
  const list=mcState.missions.filter(m=>m.estado==='bloqueada');
  if(!list.length){ $('bloqueosLista').innerHTML='<div class="plist-empty">Nada bloqueado por ahora.</div>'; return; }
  $('bloqueosLista').innerHTML=list.map(m=>`
    <div class="plist-row">
      <div class="t">${mcEsc(m.titulo)} <span class="badge-bloqueo">${LABEL_BLOQUEO[m.bloqueo.tipo]||m.bloqueo.tipo}</span></div>
      <div class="m">Bloqueada desde ${new Date(m.bloqueo.desde).toLocaleDateString('es-VE')}</div>
      <div class="actions"><button data-unblock="${m.id}">Desbloquear</button></div>
    </div>`).join('');
  $('bloqueosLista').querySelectorAll('[data-unblock]').forEach(b=>b.onclick=()=>{
    const m=mcState.missions.find(x=>x.id===b.dataset.unblock);
    if(m){ m.estado='pendiente'; m.bloqueo=null; mcSave(); renderBloqueos(); }
  });
}
$('bloqueosCerrar').onclick=()=>mcShowScreen(null);

/* ── Pendientes ───────────────────────────────────────── */
function renderPendientes(){
  const list=mcState.missions.filter(m=>m.estado==='pendiente');
  if(!list.length){ $('pendientesLista').innerHTML='<div class="plist-empty">Nada pendiente. Usa Cuéntame para volcar algo.</div>'; return; }
  $('pendientesLista').innerHTML=list.map(m=>`
    <div class="plist-row">
      <div class="t">${mcEsc(m.titulo)}</div>
      <div class="actions"><button data-done="${m.id}">Hecho</button><button data-block="${m.id}">Bloqueada</button></div>
    </div>`).join('');
  $('pendientesLista').querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{ mcResolverMission(b.dataset.done); renderPendientes(); toast(fraseCierre()); });
  $('pendientesLista').querySelectorAll('[data-block]').forEach(b=>b.onclick=()=>abrirBloquear(b.dataset.block));
}
$('btnVerPendientes').onclick=()=>{ renderPendientes(); mcShowScreen('screenPendientes'); };
$('pendientesCerrar').onclick=()=>mcShowScreen(null);

let bloquearMissionId=null;
function abrirBloquear(missionId){
  bloquearMissionId=missionId;
  const m=mcState.missions.find(x=>x.id===missionId);
  mcRecordarMission(missionId);
  $('bloquearTitulo').textContent = m?m.titulo:'';
  $('bloqueoGrid').innerHTML = TIPOS_BLOQUEO.map(t=>`<button data-tb="${t}">${LABEL_BLOQUEO[t]}</button>`).join('');
  $('bloqueoGrid').querySelectorAll('[data-tb]').forEach(b=>b.onclick=()=>{
    mcBloquearMission(bloquearMissionId, b.dataset.tb);
    mcShowScreen(null);
    toast('Anotado. Dejo de recordarte "hazla" — ahora el problema es otro.');
  });
  mcShowScreen('screenBloquear');
}
$('bloquearCerrar').onclick=()=>mcShowScreen(null);

/* ── Bitácora ─────────────────────────────────────────── */
const BIT_LABELS = {
  mood_click:'Estado', sorpresa_ofrecida:'Sorpresa ofrecida', sorpresa_aceptada:'Sorpresa aceptada',
  sorpresa_rechazada:'Sorpresa rechazada', sorpresa_respuesta:'Respuesta', cuentame_volcado:'Volcado mental',
  mission_resuelta:'Misión resuelta', mission_bloqueada:'Misión bloqueada',
  boss_revelado:'Boss revelado', boss_rechazado:'Boss rechazado', boss_sobrevivido:'Boss superado',
  boss_intelligence:'Boss · Intelligence', expediente_recall:'Expediente recuperado', expediente_reabierto:'Expediente reabierto'
};
function renderBitacora(){
  const list=[...mcState.interactions].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  if(!list.length){ $('bitacoraLista').innerHTML='<div class="plist-empty">Sin actividad todavía.</div>'; return; }
  $('bitacoraLista').innerHTML=list.slice(0,80).map(it=>{
    const f=new Date(it.fecha);
    const extra = it.titulo||it.respuesta||it.respuestaUsuario||it.mood||it.zona||'';
    return `<div class="plist-row"><div class="t">${BIT_LABELS[it.tipo]||it.tipo}</div><div class="m">${f.toLocaleDateString('es-VE',{day:'numeric',month:'short'})} · ${f.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})}${extra?(' — '+mcEsc(String(extra))):''}</div></div>`;
  }).join('');
}
$('bitacoraCerrar').onclick=()=>mcShowScreen(null);

/* ── tab bar ──────────────────────────────────────────── */
document.querySelectorAll('.tabbar button').forEach(b=>{
  b.onclick=()=>{
    if(b.dataset.tab==='home'){ mcShowScreen(null); return; }
    const id=b.dataset.screen;
    if(id==='screenBitacora') renderBitacora();
    if(id==='screenExpedientes') renderExpedientes();
    if(id==='screenBloqueos') renderBloqueos();
    mcShowScreen(id);
  };
});

/* ── init ─────────────────────────────────────────────── */
mcLoad();
seedExpedienteSiVacio();
renderGreet();
renderMoodGrid();
renderCtxRow();
renderHomeMid();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
