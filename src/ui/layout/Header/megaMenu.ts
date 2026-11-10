// Megamenú de Vender y Comprar: el mismo que las páginas de Joomla
// (joomla/helix-reference/js/custom.js, bindMegaMenu). Si cambia allí, cambiar aquí.
export type MegaLink = { href: string; title: string; text: string };
export type MegaMenu = {
  tone: "sell" | "buy";
  cols: Array<{ title: string; links: MegaLink[] }>;
  card: { title: string; text: string; href: string; cta: string };
};

export const MEGA_SELL: MegaMenu = {
  tone: "sell",
  cols: [
    {
      title: "Vender con nosotros",
      links: [
        { href: "/quieres-vender", title: "Cómo vendemos tu casa", text: "Estrategia, imagen y negociación" },
        { href: "/quieres-vender/antes-y-despues", title: "Antes y después", text: "Renders que enseñan su potencial" },
        { href: "/quieres-vender/asegura-tu-venta", title: "Asegura tu venta", text: "Compra la nueva sin esperar a vender" },
      ],
    },
    {
      title: "Herramientas gratis",
      links: [
        { href: "/valorar/", title: "Valora tu vivienda gratis", text: "En dos minutos, con precios reales" },
        { href: "/herramientas/precio-metro-cuadrado-valencia/", title: "Precio del m² por barrio", text: "Lo que se paga hoy en tu zona" },
        { href: "/herramientas/", title: "Todas las herramientas", text: "Calculadoras para decidir con datos" },
      ],
    },
    {
      title: "Por zona",
      links: [
        { href: "/quieres-vender/vender-en-ruzafa", title: "Vender en Ruzafa", text: "Lo que se vende y a qué precio" },
        { href: "/quieres-vender/vender-en-benimaclet", title: "Vender en Benimaclet", text: "Barrio con alma de pueblo, junto a los campus" },
        { href: "/quieres-vender/vender-en-campanar", title: "Vender en Campanar", text: "Familias, garaje y urbanizaciones con piscina" },
        { href: "/inmobiliaria-valencia", title: "Inmobiliaria en Valencia", text: "Nuestras oficinas y cómo trabajamos" },
      ],
    },
  ],
  card: { title: "¿Cuánto vale tu casa?", text: "Te damos una horquilla al momento, sin compromiso.", href: "/valorar/", cta: "Valorar gratis" },
};

export const MEGA_BUY: MegaMenu = {
  tone: "buy",
  cols: [
    {
      title: "Encuentra tu casa",
      links: [
        { href: "/quieres-comprar#viviendas", title: "Ver viviendas", text: "Inmuebles certificados en toda la provincia" },
        { href: "/quieres-comprar#busqueda", title: "Avísame cuando entre algo", text: "Te llamamos antes de que salga en portales" },
      ],
    },
    {
      title: "Antes de comprar",
      links: [
        { href: "/herramientas/aval-ico-valencia/", title: "Aval ICO: tu primera casa", text: "Compra con el 100 % si cumples requisitos" },
        { href: "/herramientas/precio-metro-cuadrado-valencia/", title: "Precio del m² por barrio", text: "Para saber si una vivienda está en precio" },
        { href: "/herramientas/", title: "Todas las herramientas", text: "Hipoteca, gastos y más" },
      ],
    },
  ],
  card: { title: "Te acompañamos en la compra", text: "Visitas, negociación y notaría, sin coste extra para ti.", href: "/quieres-comprar#viviendas", cta: "Ver viviendas" },
};
