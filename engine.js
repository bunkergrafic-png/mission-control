/* ── engine.js ────────────────────────────────────────────
   Surprise Engine: sin IA. Rareza + cooldown + Context Engine
   (compatibilidad dura) + racha dinámica (nunca exprimir).

   El CONTENIDO (títulos/cuerpos) es provisional — suficiente variedad
   para probar el motor, no tu humor/expedientes reales todavía.
──────────────────────────────────────────────────────────── */

const PESO_RAREZA = { comun:100, poco_comun:40, raro:12, muy_raro:3 };

const SURPRISE_EVENTS = [
  // ── retos con productividad (llevan a una microacción real) ──
  {
    id:'reto_objeto_lugar', tipo:'reto', rareza:'comun', cooldownHoras:5,
    estadosElegibles:null, contextosElegibles:['home'],
    requires:{ mobility:'free' }, productividadOculta:true, interaccion:'simple',
    contenido:{ titulo:'Reto rápido', cuerpo:'Encuentra una sola cosa fuera de lugar que puedas guardar en menos de 20 segundos.' }
  },
  {
    id:'reto_20seg_zona', tipo:'reto', rareza:'comun', cooldownHoras:5,
    estadosElegibles:['saturado','normal'], contextosElegibles:['home'],
    requires:{ mobility:'free' }, productividadOculta:true, interaccion:'simple',
    contenido:{ titulo:'20 segundos', cuerpo:'Elige una superficie pequeña — una mesa, un rincón — y despéjala. Nada más que esa.' }
  },
  {
    id:'reto_llamada_corta', tipo:'reto', rareza:'poco_comun', cooldownHoras:12,
    estadosElegibles:null, contextosElegibles:['home','business','other'],
    requires:{ speech:true, privacy:'private' }, productividadOculta:true, interaccion:'confirmar_luego',
    contenido:{ titulo:'Una llamada, ya', cuerpo:'Esa llamada que llevas posponiendo — márcala ahora mismo, antes de que se te vaya el impulso.' }
  },

  // ── retos SIN productividad escondida (existen para entretener) ──
  {
    id:'reto_objeto_absurdo', tipo:'reto_sin_productividad', rareza:'poco_comun', cooldownHoras:24,
    estadosElegibles:null, contextosElegibles:null,
    requires:{}, productividadOculta:false, interaccion:'input',
    contenido:{ titulo:'Objeto absurdo', cuerpo:'Busca el objeto más absurdo que tengas cerca y ponle nombre.', placeholder:'¿Cómo se llama?' }
  },
  {
    id:'reto_sonido_raro', tipo:'reto_sin_productividad', rareza:'poco_comun', cooldownHoras:18,
    estadosElegibles:null, contextosElegibles:null,
    requires:{}, productividadOculta:false, interaccion:'simple',
    contenido:{ titulo:'Ruido de fondo', cuerpo:'Detente 10 segundos. ¿Cuál es el sonido más raro que puedes escuchar ahora mismo?' }
  },
  {
    id:'reto_prediccion', tipo:'reto_sin_productividad', rareza:'raro', cooldownHoras:36,
    estadosElegibles:null, contextosElegibles:null,
    requires:{}, productividadOculta:false, interaccion:'input',
    contenido:{ titulo:'Predicción absurda', cuerpo:'Adivina qué hora es sin mirar el reloj. Después revisa qué tan mal quedaste.', placeholder:'¿Qué hora crees que es?' }
  },

  // ── misión clandestina ──
  {
    id:'mision_clandestina_foto', tipo:'clandestina', rareza:'raro', cooldownHoras:48,
    estadosElegibles:null, contextosElegibles:['home'],
    requires:{ mobility:'free', camera:true }, productividadOculta:true, interaccion:'confirmar_luego',
    contenido:{ titulo:'Misión clandestina', cuerpo:'Necesito una foto. No te diré todavía para qué. Ve a un rincón que llevas evitando y tómale una foto desde afuera. PROHIBIDO ordenar.' }
  },

  // ── waiting games (sin GPS, filtran por contexto) ──
  {
    id:'wg_observacion', tipo:'waiting_game', rareza:'comun', cooldownHoras:3,
    estadosElegibles:null, contextosElegibles:['waiting','transport','street','visit'],
    requires:{ minAvailableTime:'2m' }, productividadOculta:false, interaccion:'input',
    contenido:{ titulo:'Observación', cuerpo:'Sin levantarte: encuentra la cosa más sospechosa que puedas ver desde donde estás.', placeholder:'¿Qué encontraste?' }
  },
  {
    id:'wg_cuenta_algo', tipo:'waiting_game', rareza:'comun', cooldownHoras:3,
    estadosElegibles:null, contextosElegibles:['waiting','transport'],
    requires:{ minAvailableTime:'2m' }, productividadOculta:false, interaccion:'input',
    contenido:{ titulo:'Cuenta algo', cuerpo:'Cuenta cuántas personas a tu alrededor llevan algo de color azul.', placeholder:'¿Cuántas?' }
  },
  {
    id:'wg_memoria_casa', tipo:'waiting_game', rareza:'poco_comun', cooldownHoras:8,
    estadosElegibles:null, contextosElegibles:['waiting','transport','street','visit'],
    requires:{ minAvailableTime:'2m' }, productividadOculta:false, interaccion:'input',
    contenido:{ titulo:'¿Dónde vive esto?', cuerpo:'Piensa en un objeto de tu casa que no tiene un lugar fijo. ¿Dónde debería vivir?', placeholder:'¿Dónde debería vivir?' }
  },

  // ── espejo (patrón observado, siempre como teoría a confirmar) ──
  {
    id:'espejo_generico', tipo:'espejo', rareza:'raro', cooldownHoras:72,
    estadosElegibles:null, contextosElegibles:null,
    requires:{}, productividadOculta:false, interaccion:'confirmar_luego',
    contenido:{ titulo:'Espejo', cuerpo:'Tengo una teoría — todavía con pocos datos, así que puede estar mal. ¿Te la muestro?' }
  }
];

/* Compatibilidad CurrentContext ↔ requires del evento (filtro duro, no ponderado) */
function mcEsCompatible(evento, ctx){
  const r = evento.requires || {};
  if(r.mobility==='free' && ctx.mobility!=='free') return false;
  if(r.speech && !ctx.interaction.canSpeak) return false;
  if(r.camera && !ctx.interaction.canTakePhotos) return false;
  if(r.privacy && ctx.privacy!==r.privacy) return false;
  if(r.minAvailableTime && ctx.availableTime==='unknown'){ /* sin dato: no bloquea, se asume viable */ }
  if(evento.contextosElegibles && !evento.contextosElegibles.includes(ctx.locationType)) return false;
  return true;
}

/* Selección en dos pasos: filtro duro por contexto, luego sorteo ponderado por rareza/cooldown/estado. */
function mcElegirEvento(ctx, estadoActual, cooldownsMs, excluirIds){
  const ahora=Date.now();
  const excluir = excluirIds||[];
  const elegibles = SURPRISE_EVENTS.filter(ev=>{
    if(excluir.includes(ev.id)) return false;
    if(!mcEsCompatible(ev, ctx)) return false; // incompatible ≠ rechazo — no penaliza peso
    if(ev.estadosElegibles && !ev.estadosElegibles.includes(estadoActual)) return false;
    const ultima = (cooldownsMs||{})[ev.id];
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

/* Wrapper: toma el contexto/estado/cooldowns directo de mcState */
function mcSeleccionarEvento(excluirIds){
  return mcElegirEvento(mcState.currentContext, mcState.userState.estadoActual, mcState.eventCooldowns, excluirIds);
}

/* ── Descarga mental: heurística local, sin IA ─────────
   Divide el texto libre en fragmentos candidatos a "misión",
   descarta fragmentos que suenan a estado de ánimo (no son tareas),
   y marca como "importantes" los 2 primeros fragmentos válidos. */
const FRASES_NO_TAREA = /^(estoy|me siento|ando|tengo sueño|tengo flojera|qué cansancio|que cansancio)\b/i;
function mcProcesarVolcado(texto){
  const crudos = texto
    .split(/[,\n]| y (?=[a-záéíóúñ])/i)
    .map(f=>f.trim())
    .filter(f=>f.length>3);
  const candidatos = crudos.filter(f=>!FRASES_NO_TAREA.test(f));
  const descartados = crudos.filter(f=>FRASES_NO_TAREA.test(f));
  return {
    todas: candidatos,
    importantes: candidatos.slice(0,2),
    resto: candidatos.slice(2),
    descartados
  };
}

/* Racha dinámica: nunca exprimir. */
function mcRachaDebeRetirarse(){
  const r = mcState.racha;
  if(!r || !r.activa) return true;
  return r.negativas >= 2 && r.negativas >= r.positivas;
}
