/** Protousuarios / buyer personas de la clase anterior (Laboratorio Buyer Persona · UAX). */
export interface Persona {
  key: string;
  name: string;
  /** Edad, rol y tipo de caso en una línea */
  subtitle: string;
  summary: string;
  quote: string;
  /** Pares etiqueta · valor que se muestran como ficha */
  details: { label: string; value: string }[];
}

export const DEFAULT_PERSONAS: Persona[] = [
  {
    key: "lucia",
    name: "Lucía · 29 años",
    subtitle: "La primera carrera · Compradora y usuaria · Iniciación",
    summary:
      "Trabaja con turnos cambiantes y pasa gran parte de la jornada de pie. Se ha propuesto empezar a correr para encontrarse más activa. Nunca ha comprado zapatillas de running y está valorando Decathlon, pero no sabe por dónde empezar.",
    quote: "Quiero empezar a correr, pero no tengo ni idea de qué zapatillas necesito. ¿Podríais recomendarme un modelo cómodo para principiantes?",
    details: [
      { label: "Objetivo principal", value: "Mejorar su estado de forma y sentirse mejor consigo misma; desconectar del trabajo" },
      { label: "Detonante", value: "La decisión de salir de la rutina y hacer deporte" },
      { label: "Necesidad funcional", value: "Calzado cómodo y funcional" },
      { label: "Frustración", value: "No sabe qué modelo necesita realmente para iniciarse" },
      { label: "Miedo", value: "Gastar mucho en algo que luego deje de hacer" },
      { label: "Canales y confianza", value: "Tienda física, reseñas de internet; expertos en running" },
      { label: "Criterios de decisión", value: "Precio, comodidad, estética" },
      { label: "Tensión", value: "Poca experiencia + tiempo irregular + exceso de opciones" },
    ],
  },
  {
    key: "marcos",
    name: "Marcos · 38 años",
    subtitle: "La carrera contra el crono · Comprador y usuario · Rendimiento",
    summary:
      "Corre tres veces por semana y se ha inscrito en una carrera de 10 km dentro de dos meses. Sus zapatillas están gastadas. Compara opciones, incluido el catálogo de Decathlon, sin marca ni modelo decidido.",
    quote: "Buscaba unas zapatillas que estén bien de calidad-precio para mí, que soy runner habitual y tengo una carrera en dos meses.",
    details: [
      { label: "Objetivo principal", value: "Mejorar forma física y resistencia marcándose nuevas metas" },
      { label: "Detonante", value: "Carrera cercana y zapatillas gastadas" },
      { label: "Necesidad funcional", value: "Buena sujeción, transpirable, amortiguación" },
      { label: "Frustración", value: "Mucha información técnica que no sabe convertir en una decisión segura; pierde tiempo comparando webs y vídeos" },
      { label: "Miedo", value: "Que no estén adaptadas a su tipo de carrera" },
      { label: "Canales y confianza", value: "Amigos runners y voces con experiencia" },
      { label: "Criterios de decisión", value: "Comodidad para 10 km, estética que motive, calidad-precio" },
      { label: "Tensión", value: "Experiencia previa + presión de una fecha + comparación de opciones" },
    ],
  },
  {
    key: "sara",
    name: "Sara · 44 años",
    subtitle: "Comprar para quien corre · Compradora; su hija es la usuaria · Compra ≠ uso",
    summary:
      "Su hija de 15 años ha empezado atletismo en el instituto y necesita zapatillas. Sara paga y quiere acertar; su hija participa en la elección y será quien las use. Está considerando Decathlon y tiene poco tiempo antes del próximo entrenamiento.",
    quote: "Quiero comprarle a mi hija unas zapatillas adecuadas para empezar atletismo, que sean cómodas, estén bien de precio y pueda tenerlas antes de su próximo entrenamiento.",
    details: [
      { label: "Roles", value: "La hija detecta la necesidad e influye; deciden ambas; Sara paga" },
      { label: "Objetivo principal", value: "Comodidad, durabilidad y resistencia; para la hija, también diseño y color" },
      { label: "Detonante", value: "El comienzo de las clases de atletismo" },
      { label: "Necesidad funcional", value: "Sujeción del tobillo, plantilla cómoda, tallas, precio y disponibilidad; poder probarlas" },
      { label: "Frustración", value: "Que a la hija no le gusten o no le resulten cómodas; elegir por precio y perder comodidad" },
      { label: "Miedo", value: "Que las use por primera vez en clase, no esté conforme y ya no puedan cambiarlas" },
      { label: "Canales y confianza", value: "Web de Decathlon, opiniones, personal de tienda, entrenador; la hija, redes y compañeras" },
      { label: "Criterios de decisión", value: "Sara: calidad-precio, diseño, durabilidad · Hija: calzado específico y amortiguación" },
      { label: "Tensión", value: "Decide y paga una persona + usa otra + necesidad próxima" },
    ],
  },
];

export function personaOf(personas: Persona[] | null | undefined, key: string | null | undefined) {
  if (!key || !personas) return null;
  return personas.find((p) => p.key === key) ?? null;
}
