/* ── app.js ───────────────────────────────────────────────
   Render + wiring de pantallas. Usa state.js (datos) y engine.js
   (Surprise Engine). Este es el PROTOTIPO VISUAL del Home — la
   navegación completa (Cuéntame real, Bloqueos, Expedientes,
   Mapa, Bitácora) todavía no está construida a propósito.
──────────────────────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const GREETS = [
  '¿Qué está pasando, Dio?',
  '¿Qué coño tendrá hoy?',
  'Aquí sigo. ¿Cómo vamos?',
  '¿Cómo va el día por ahí?'
];

// Botones de estado: este set es más grande que lo que se muestra a la vez —
// la idea (para cuando el engine esté conectado) es que roten, no que sean
// siempre los mismos 4 fijos. Por ahora, para el prototipo visual, se
// muestran 4 fijos representativos.
const MOOD_BUTTONS = [
  {id:'saturado', ico:'🤯', label:'ESTOY SATURADO'},
  {id:'interrumpido', ico:'😡', label:'ME INTERRUMPIERON'},
  {id:'fundido', ico:'😴', label:'ESTOY FUNDIDO'},
  {id:'sorprendeme', ico:'🎲', label:'SORPRÉNDEME'}
];

const CTX_CHIPS = [
  {id:'home', ico:'📍', label:'Estoy en casa', set:{locationType:'home', mobility:'free'}},
  {id:'waiting', ico:'⏳', label:'Estoy esperando', set:{locationType:'waiting', mobility:'seated'}},
  {id:'street', ico:'🚗', label:'Estoy en la calle', set:{locationType:'street', mobility:'limited'}},
  {id:'quiet', ico:'🤫', label:'Solo puedo tocar', set:{interaction:{canSpeak:false,canType:true,canTakePhotos:true,headphones:false}}},
  {id:'headphones', ico:'🎧', label:'Tengo audífonos', set:{interaction:{headphones:true}}}
];

function renderGreet(){
  $('greetLine').textContent = GREETS[Math.floor(Math.random()*GREETS.length)];
}

function renderMoodGrid(){
  $('moodGrid').innerHTML = MOOD_BUTTONS.map(m=>
    `<button class="mood-btn" data-mood="${m.id}"><span class="ico">${m.ico}</span><span>${m.label}</span></button>`
  ).join('');
  $('moodGrid').querySelectorAll('[data-mood]').forEach(b=>{
    b.onclick=()=>{
      mcSetEstado(b.dataset.mood, 'boton_home');
      if(b.dataset.mood==='sorprendeme') mostrarSorpresa();
      else mcLogInteraction('mood_click', {mood:b.dataset.mood});
    };
  });
}

function renderCtxRow(){
  $('ctxRow').innerHTML = CTX_CHIPS.map(c=>`<button class="ctx-chip" data-ctx="${c.id}"><span>${c.ico}</span> ${c.label}</button>`).join('');
  $('ctxRow').querySelectorAll('[data-ctx]').forEach(b=>{
    const chip = CTX_CHIPS.find(c=>c.id===b.dataset.ctx);
    b.onclick=()=>{
      b.classList.toggle('on');
      const val = b.classList.contains('on') ? chip.set : {};
      mcSetContexto(val);
    };
  });
}

/* ── navegación simple entre screens (prototipo) ───────── */
function mostrarScreen(id){
  document.querySelectorAll('.overlay-screen').forEach(s=>s.classList.remove('active'));
  if(id) $(id).classList.add('active');
}

function mostrarSorpresa(){
  // PLACEHOLDER: en la versión real esto viene de mcElegirEvento(ctx, estado, cooldowns)
  const ev = SURPRISE_EVENTS.find(e=>e.id==='reto_objeto_absurdo');
  $('sorpresaTitulo').textContent = ev.contenido.titulo;
  $('sorpresaCuerpo').textContent = ev.contenido.cuerpo;
  mostrarScreen('screenSorpresa');
}

function wireOverlays(){
  $('sorpresaCerrar').onclick = ()=>mostrarScreen(null);
  $('sorpresaAceptar').onclick = ()=>{ mcLogInteraction('sorpresa_aceptada',{}); mostrarScreen(null); };

  $('bossCerrar').onclick = ()=>{ $('bossRevealed').hidden=true; $('bossPreActions').style.display='flex'; mostrarScreen(null); };
  $('bossRechazar').onclick = ()=>{ mcLogInteraction('boss_rechazado',{}); mostrarScreen(null); };
  $('bossRevelar').onclick = ()=>{
    $('bossPreActions').style.display='none';
    $('bossRevealed').hidden=false;
    mcLogInteraction('boss_revelado',{});
  };

  $('protoSorpresa').onclick = mostrarSorpresa;
  $('protoBoss').onclick = ()=>{
    $('bossRevealed').hidden=true;
    $('bossPreActions').style.display='flex';
    mostrarScreen('screenBoss');
  };
}

$('btnCuentame').onclick = ()=>{
  // PLACEHOLDER: la pantalla real de descarga mental (texto + heurística) es el siguiente paso,
  // no parte de este prototipo puramente visual.
  alert('Aquí va la pantalla de descarga mental (Cuéntame) — todavía no construida en este prototipo visual.');
};
$('btnVerPendientes').onclick = ()=>{
  alert('Vista de pendientes — deliberadamente discreta, todavía no construida en este prototipo visual.');
};

/* ── init ─────────────────────────────────────────────── */
mcLoad();
renderGreet();
renderMoodGrid();
renderCtxRow();
wireOverlays();
