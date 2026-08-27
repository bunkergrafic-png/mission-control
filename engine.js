/* ── engine.js ────────────────────────────────────────────
   Surprise Engine: sin IA. Rareza + cooldown + Context Engine
   (compatibilidad dura) + racha dinámica (nunca exprimir).

   TODO EL CONTENIDO DE ABAJO ES PLACEHOLDER — se reemplaza en la
   sesión de contenido real acordada, antes de usar esto en serio.
──────────────────────────────────────────────────────────── */

const PESO_RAREZA = { comun:100, poco_comun:40, raro:12, muy_raro:3 };

// PLACEHOLDER — reemplazar con contenido real tuyo.
const SURPRISE_EVENTS = [
  {
    id:'reto_objeto_lugar', tipo:'reto', rareza:'comun', cooldownHoras:6,
    estadosElegibles:null, contextosElegibles:null,
    requires:{ mobility:'free' },
    productividadOculta:true,
    contenido:{ titulo:'[PLACEHOLDER] Reto rápido', cuerpo:'Encuentra una sola cosa fuera de lugar que puedas guardar en menos de 20 segundos.' }
  },
  {
    id:'reto_objeto_absurdo', tipo:'reto_sin_productividad', rareza:'poco_comun', cooldownHoras:24,
    estadosElegibles:null, contextosElegibles:null,
    requires:{}, // sin requisitos: sirve casi en cualquier contexto
    productividadOculta:false, // existe SOLO para hacer reír, no le sigue una tarea
    contenido:{ titulo:'[PLACEHOLDER] Objeto absurdo', cuerpo:'Busca el objeto más absurdo que tengas cerca y ponle nombre.' }
  },
  {
    id:'mision_clandestina_ejemplo', tipo:'clandestina', rareza:'raro', cooldownHoras:48,
    estadosElegibles:null, contextosElegibles:['home'],
    requires:{ mobility:'free', camera:true },
    productividadOculta:true,
    contenido:{ titulo:'[PLACEHOLDER] Misión clandestina', cuerpo:'Necesito una foto. No te diré todavía para qué. PROHIBIDO ordenar.' }
  },
  {
    id:'waiting_game_ejemplo', tipo:'waiting_game', rareza:'comun', cooldownHoras:4,
    estadosElegibles:null, contextosElegibles:['waiting','transport','visit'],
    requires:{ minAvailableTime:'2m' },
    productividadOculta:false,
    contenido:{ titulo:'[PLACEHOLDER] Observación', cuerpo:'Sin levantarte: encuentra la cosa más sospechosa que puedas ver desde donde estás.' }
  },
  {
    id:'espejo_ejemplo', tipo:'espejo', rareza:'raro', cooldownHoras:72,
    estadosElegibles:null, contextosElegibles:null,
    requires:{},
    productividadOculta:false,
    contenido:{ titulo:'[PLACEHOLDER] Espejo', cuerpo:'Creo que descubrí algo. ¿Te hace sentido?' }
  }
];

/* Compatibilidad CurrentContext ↔ requires del evento (filtro duro, no ponderado) */
function mcEsCompatible(evento, ctx){
  const r = evento.requires || {};
  // requires.mobility es un MÍNIMO: si el evento necesita 'free' y el contexto
  // actual es 'seated'/'limited', no es compatible. Pedir menos que 'free' nunca bloquea.
  if(r.mobility==='free' && ctx.mobility!=='free') return false;
  if(r.speech && !ctx.interaction.canSpeak) return false;
  if(r.camera && !ctx.interaction.canTakePhotos) return false;
  if(r.privacy && ctx.privacy!==r.privacy) return false;
  if(evento.contextosElegibles && !evento.contextosElegibles.includes(ctx.locationType)) return false;
  return true;
}

/* Selección en dos pasos: filtro duro por contexto, luego sorteo ponderado por rareza/cooldown/estado. */
function mcElegirEvento(ctx, estadoActual, historialCooldown){
  const ahora=Date.now();
  const elegibles = SURPRISE_EVENTS.filter(ev=>{
    if(!mcEsCompatible(ev, ctx)) return false; // incompatible ≠ rechazo — no penaliza peso
    if(ev.estadosElegibles && !ev.estadosElegibles.includes(estadoActual)) return false;
    const ultima = (historialCooldown||{})[ev.id];
    if(ultima && (ahora-ultima) < ev.cooldownHoras*3600000) return false;
    return true;
  });
  if(!elegibles.length) return null;
  const pesos = elegibles.map(ev=>PESO_RAREZA[ev.rareza]||1);
  const total = pesos.reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for(let i=0;i<elegibles.length;i++){
    r -= pesos[i];
    if(r<=0) return elegibles[i];
  }
  return elegibles[elegibles.length-1];
}

/* Racha dinámica: nunca exprimir. Cuenta señales, no impone un tope fijo de ofertas. */
function mcRachaState(){ return { positivas:0, negativas:0 }; }
function mcRachaSeñal(racha, tipo){
  // tipo: 'acepta_rapido'|'completa'|'pide_otra'|'reporta_fuego'  → positiva
  //       'rechaza'|'despues'|'demora'|'reporta_bajo'             → negativa
  const positivas = ['acepta_rapido','completa','pide_otra','reporta_fuego'];
  if(positivas.includes(tipo)) racha.positivas++; else racha.negativas++;
  return racha;
}
function mcRachaDebeRetirarse(racha){
  // engagement ≠ energía: no basta con "sigue interactuando", se mira el balance de señales.
  return racha.negativas >= 2 && racha.negativas > racha.positivas;
}
