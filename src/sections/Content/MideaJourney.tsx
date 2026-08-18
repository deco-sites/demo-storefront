import { useEffect, useRef, useState } from "react";
import type { ImageWidget, VideoWidget } from "~/types/widgets";

/** TMB metro line colors */
const TMB: Record<string, string> = {
  L1: "#E1322D",
  L3: "#0E9E4F",
  L4: "#F2C300",
  L5: "#0072BC",
  L9: "#F08A2E",
};

type LineKey = "L1" | "L3" | "L4" | "L5" | "L9";

/** @titleBy title */
export interface Stop {
  /** @title Number (e.g. 01) */
  n: string;
  /** @title Metro station */
  location: string;
  /** @title Landmark */
  title: string;
  /** @title Metro line */
  line?: LineKey;
  /** @title Product */
  product?: string;
  /** @title Product link */
  link?: string;
  /** @title Image */
  image?: ImageWidget;
  /**
   * @title Copy
   * @description Separate paragraphs with a blank line
   * @format textarea
   */
  copy: string;
}

/** @titleBy label */
export interface Stat {
  value: string;
  label: string;
  /** @title Accent */
  accent?: "red" | "blue" | "gold";
}

export interface Props {
  /** @title Hero title (use | to break lines) */
  heroTitle?: string;
  /** @title Hero highlighted word */
  heroHighlight?: string;
  /** @title Hero subtitle */
  heroSubtitle?: string;
  /** @title Primary CTA label */
  heroCtaLabel?: string;
  /** @title Video CTA label */
  heroVideoLabel?: string;
  /** @title Campaign video */
  video?: VideoWidget;
  /** @title Hero poster / fallback image */
  heroImage?: ImageWidget;

  /** @title Partnership lockup image */
  lockup?: ImageWidget;
  /** @title Partnership eyebrow */
  partnershipEyebrow?: string;
  /** @title Partnership title */
  partnershipTitle?: string;
  /** @title Partnership highlighted words */
  partnershipHighlight?: string;
  /** @title Partnership lede */
  partnershipLede?: string;
  /** @title Stats */
  stats?: Stat[];

  /** @title Journey eyebrow */
  journeyEyebrow?: string;
  /** @title Journey title line 1 */
  journeyTitle1?: string;
  /** @title Journey title line 2 */
  journeyTitle2?: string;
  /** @title Journey title line 3 */
  journeyTitle3?: string;
  /** @title Journey copy */
  journeyCopy?: string;
  /** @title Route label */
  routeLabel?: string;

  /** @title Stops */
  stops?: Stop[];
}

const DEFAULT_STOPS: Stop[] = [
  {
    n: "01",
    location: "LESSEPS",
    title: "PARK GÜELL",
    line: "L3",
    copy: "Gaudí imaginou primeiro esta colina como um empreendimento habitacional de luxo, mas apenas duas casas chegaram a ser vendidas, e a cidade transformou-a num parque. Desse silencioso fracasso nasceu um dos horizontes mais fotografados do mundo.\n\nA viagem começa aqui: um pontapé, uma bola, e uma cidade prestes a transformar-se.",
  },
  {
    n: "02",
    location: "SAGRADA FAMÍLIA",
    title: "BASÍLICA SAGRADA FAMÍLIA",
    line: "L5",
    product: "Frigorífico French Door",
    link: "https://www.midea.com/global/refrigerators",
    copy: "Escondidas no claustro da catedral, treze gansas brancas vivem lá há mais de cinco séculos, uma por cada ano da vida de Santa Eulália. Sob essas abóbadas góticas, o tempo é algo que se protege.\n\nO nosso frigorífico French Door faz o mesmo pelos teus alimentos: climas multizona, humidade precisa e uma engenharia silenciosa que mantém cada ingrediente no seu ponto ideal.",
  },
  {
    n: "03",
    location: "ARC DE TRIOMF",
    title: "ARC DE TRIOMF",
    line: "L1",
    product: "Ar Condicionado",
    link: "https://www.midea.com/global/hvac",
    copy: "Ao contrário da maioria dos arcos do triunfo, este não celebra nenhuma batalha — foi construído como porta de boas-vindas à Exposição Universal de 1888. Pura hospitalidade, esculpida em tijolo vermelho.\n\nO ar condicionado Midea partilha essa ideia: uma receção silenciosa assim que se entra. Arrefecimento uniforme, fluxo de ar inteligente e um desempenho eficiente que transforma qualquer divisão numa chegada tranquila.",
  },
  {
    n: "04",
    location: "BARCELONETA",
    title: "L'ESTEL FERIT",
    line: "L4",
    product: "Máquina de Lavar Roupa",
    link: "https://www.midea.com/global/laundry",
    copy: "Os quatro cubos empilhados de Rebecca Horn foram erguidos como tributo às antigas barracas de pescadores demolidas para os Jogos Olímpicos de 1992, uma pilha inclinada de casas viradas para o vento salgado. Lavar roupa junto ao mar sempre foi um ritual aqui.\n\nA máquina de lavar roupa Midea dá continuidade a essa tradição: suave com os tecidos, implacável com as manchas, com programas a vapor e ciclos inteligentes que respeitam cada peça que adoras.",
  },
  {
    n: "05",
    location: "LICEU",
    title: "BARRI GÒTIC",
    line: "L3",
    product: "Forno de Encastrar",
    link: "https://www.midea.com/global/kitchen-appliances",
    copy: "Grande parte do aspeto medieval do Bairro Gótico não é medieval de todo. Foi restaurado, e em parte inventado, no início do século XX para dar a Barcelona um passado mais romântico. Artesanato a fazer-se passar por história.\n\nO forno Midea faz a mesma magia em casa: convecção, vapor e temperaturas precisas que transformam ingredientes do dia a dia em algo que sabe como se tivesse demorado séculos a aperfeiçoar.",
  },
  {
    n: "06",
    location: "PLAÇA CATALUNYA",
    title: "MERCAT DE LA BOQUERIA",
    line: "L1",
    product: "Fritadeira de Ar",
    link: "https://www.midea.com/global/small-appliances",
    copy: "A Boqueria existe, de uma forma ou de outra, desde 1217, quando começou como um mercado ambulante de porcos mesmo fora das antigas muralhas da cidade. Oitocentos anos depois, continua a tratar-se de uma única coisa: bons ingredientes, cozinhados de forma simples.\n\nA nossa fritadeira de ar Midea encaixa perfeitamente: resultados dourados e estaladiços com pouco ou nenhum óleo, rápida o suficiente para um dia de semana e boa o suficiente para um almoço de domingo.",
  },
  {
    n: "07",
    location: "ESPANYA",
    title: "FONT MÀGICA",
    line: "L1",
    product: "Máquina de Lavar Loiça",
    link: "https://www.midea.com/global/dishwashers",
    copy: "A Font Màgica impulsiona mais de 2600 litros de água por segundo através de mais de 3000 luzes, e toda a estrutura foi construída em menos de um ano para a Exposição Universal de 1929. Por trás do espetáculo: uma engenharia invisível, perfeitamente coreografada.\n\nA máquina de lavar loiça Midea é exatamente esse tipo de herói silencioso: uso inteligente da água, baixo consumo de energia e ciclos silenciosos que deixam cada peça impecável.",
  },
  {
    n: "08",
    location: "ESPANYA",
    title: "PLAÇA D'ESPANYA",
    line: "L1",
    product: "Chiller Comercial",
    link: "https://www.midea.com/global/hvac",
    copy: "As duas torres de estilo veneziano que emolduram a praça inspiraram-se no campanário de São Marcos em Veneza, pensadas para que os visitantes sentissem que entravam num lugar monumental. Grandes espaços exigem grande pensamento climático.\n\nO chiller comercial da Midea oferece exatamente isso: arrefecimento de alta capacidade para hotéis, recintos e grandes edifícios, com a eficiência que uma cidade moderna exige.",
  },
  {
    n: "09",
    location: "LES CORTS",
    title: "SPOTIFY CAMP NOU",
    line: "L3",
    product: "Toda a família de produtos",
    link: "https://www.midea.com/global/space-master",
    copy: "«Camp Nou» significa literalmente «campo novo», um nome provisório escolhido em 1957 que os adeptos tanto adoraram que simplesmente ficou. Algumas coisas são feitas para durar.\n\nA bola chega a casa, e com ela chega toda a família Midea: cozinha, lavandaria, climatização e soluções comerciais, juntas sob os holofotes. Uma cidade, uma equipa, a marca de eletrodomésticos inteligentes número um do mundo.",
  },
];

const DEFAULT_STATS: Stat[] = [
  { value: "5", label: "Épocas", accent: "red" },
  { value: "2026/27", label: "Época de estreia", accent: "blue" },
  { value: "Manga", label: "Posição do logótipo", accent: "gold" },
];

function Connector({
  index,
  reverse,
  from,
  to,
}: {
  index: number;
  reverse: boolean;
  from: string;
  to: string;
}) {
  const fromColor = TMB[from] ?? TMB.L1;
  const toColor = TMB[to] ?? TMB.L1;
  const startX = reverse ? 71 : 29;
  const endX = reverse ? 29 : 71;
  const midX = (startX + endX) / 2;
  const pathReverse = startX > endX;
  const same = from === to;

  const leftLabel = pathReverse ? to : from;
  const leftColor = pathReverse ? toColor : fromColor;
  const rightLabel = pathReverse ? from : to;
  const rightColor = pathReverse ? fromColor : toColor;

  const stroke = {
    fill: "none",
    strokeWidth: 9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <div className="mxb-connector" aria-hidden="true" key={index}>
      <svg viewBox="0 0 100 140" preserveAspectRatio="none">
        <path d={`M ${startX} 0 L ${startX} 50 L ${midX} 70`} stroke={fromColor} {...stroke} />
        <path d={`M ${midX} 70 L ${endX} 90 L ${endX} 140`} stroke={toColor} {...stroke} />
      </svg>
      <span
        className="mxb-station"
        style={{ left: `${startX}%`, top: 0, boxShadow: `0 0 0 3px ${fromColor}` }}
      />
      <span
        className="mxb-station"
        style={{ left: `${endX}%`, top: "100%", boxShadow: `0 0 0 3px ${toColor}` }}
      />
      <span className="mxb-line-pill">
        <span className="mxb-line-dot" style={{ background: leftColor }}>
          {leftLabel}
        </span>
        {!same && (
          <>
            <span className="mxb-line-arrow">{pathReverse ? "←" : "→"}</span>
            <span className="mxb-line-dot" style={{ background: rightColor }}>
              {rightLabel}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

export default function MideaJourney({
  heroTitle = "UMA VIAGEM|POR",
  heroHighlight = "BARCELONA",
  heroSubtitle = "Uma bola. Sete ícones. Inovação sem fim.\nBarcelona encontra a Midea, onde cada lance revela um lar.",
  heroCtaLabel = "Começar a viagem",
  heroVideoLabel = "Ver o vídeo",
  video,
  heroImage,
  lockup,
  partnershipEyebrow = "Lançamento da parceria",
  partnershipTitle = "A Midea junta-se ao",
  partnershipHighlight = "FC Barcelona.",
  partnershipLede = "A partir da época 2026/27, a Midea junta-se ao FC Barcelona por cinco épocas, com o logótipo Midea presente em todas as camisolas de jogo e treino.",
  stats = DEFAULT_STATS,
  journeyEyebrow = "A viagem",
  journeyTitle1 = "NOVE MARCOS ICÓNICOS.",
  journeyTitle2 = "SETE PROTAGONISTAS.",
  journeyTitle3 = "UMA CIDADE.",
  journeyCopy = "Acompanha a bola blaugrana por Barcelona: cada marco revela um produto emblemático da Midea, pensado para a casa moderna.",
  routeLabel = "O percurso",
  stops = DEFAULT_STOPS,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const [routeVisible, setRouteVisible] = useState(false);

  const list = stops?.length ? stops : DEFAULT_STOPS;
  const dots = list.slice(1);

  useEffect(() => {
    const compute = () => {
      const root = rootRef.current;
      if (!root) return;
      const vh = window.innerHeight;
      const probe = vh * 0.35;
      const els = list.map((s) => root.querySelector<HTMLElement>(`#mxb-stop-${s.n}`));
      let next = 0;
      let bestTop = -Infinity;
      els.forEach((el, i) => {
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top <= probe && top > bestTop) {
          bestTop = top;
          next = i;
        }
      });
      setActive(next);

      const first = els[0];
      const last = els[els.length - 1];
      if (!first) return;
      const afterFirst = first.getBoundingClientRect().top < vh * 0.75;
      const beforeEnd = !last || last.getBoundingClientRect().top > vh * 0.5;
      setRouteVisible(afterFirst && beforeEnd);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [list]);

  const clamped = Math.min(Math.max(active, 0), Math.max(0, dots.length - 1));
  const marqueeStations = list.map((s) => s.location).filter((loc, i, arr) => loc !== arr[i - 1]);

  return (
    <div className="mxb-root" ref={rootRef} lang="pt">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* HERO */}
      <header className="mxb-hero" id="mxb-top" data-mxb-playing={playing ? "true" : undefined}>
        <div className="mxb-hero-media">
          {video ? (
            <video
              className="mxb-hero-video"
              src={video}
              poster={heroImage}
              controls={playing}
              preload="metadata"
              autoPlay
              muted
              loop={!playing}
              playsInline
            />
          ) : heroImage ? (
            <img className="mxb-hero-video" src={heroImage} alt="" />
          ) : (
            <div className="mxb-hero-video mxb-hero-fallback" />
          )}
          <div className="mxb-hero-scrim" />
        </div>

        {playing && (
          <button
            type="button"
            className="mxb-hero-close"
            aria-label="Fechar vídeo"
            onClick={() => setPlaying(false)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <div className="mxb-hero-content">
          <h1 className="mxb-hero-title">
            {heroTitle.split("|").map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            <span className="mxb-gold">{heroHighlight}</span>
          </h1>
          <p className="mxb-hero-sub">
            {heroSubtitle.split("\n").map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </p>
          <div className="mxb-hero-ctas">
            <a className="mxb-btn mxb-btn-primary" href="#mxb-journey">
              {heroCtaLabel}
            </a>
            {video && (
              <button
                type="button"
                className="mxb-btn mxb-btn-dark"
                onClick={() => setPlaying(true)}
              >
                {heroVideoLabel}
              </button>
            )}
          </div>
        </div>

        <a href="#mxb-journey" className="mxb-scroll-cue" aria-label="Deslizar para a viagem">
          <span className="mxb-scroll-cue-ring">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </a>
      </header>

      {/* PARTNERSHIP */}
      <section className="mxb-partnership" id="mxb-partnership">
        <div className="mxb-partnership-glow mxb-partnership-glow-red" aria-hidden="true" />
        <div className="mxb-partnership-glow mxb-partnership-glow-blue" aria-hidden="true" />
        <div className="mxb-partnership-inner">
          {lockup && (
            <img
              className="mxb-lockup"
              src={lockup}
              alt="Midea — Patrocinador do FC Barcelona"
              loading="lazy"
            />
          )}
          <p className="mxb-partnership-eyebrow">{partnershipEyebrow}</p>
          <h2 className="mxb-partnership-title">
            {partnershipTitle}{" "}
            <span className="mxb-text-blue mxb-nowrap">{partnershipHighlight}</span>
          </h2>
          <p className="mxb-partnership-lede">{partnershipLede}</p>
          <div className="mxb-stats">
            {stats?.map((stat) => (
              <div key={stat.label} className={`mxb-stat mxb-stat-${stat.accent ?? "red"}`}>
                <span className="mxb-stat-value">{stat.value}</span>
                <span className="mxb-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="mxb-marquee" aria-hidden="true">
        <div className="mxb-marquee-track">
          {[0, 1].map((group) => (
            <div className="mxb-marquee-group" key={group}>
              {marqueeStations.map((loc) => (
                <span className="mxb-marquee-item" key={loc}>
                  <span>{loc}</span>
                  <span className="mxb-marquee-dot" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* JOURNEY */}
      <section className="mxb-journey" id="mxb-journey">
        <div className="mxb-journey-inner">
          <aside
            className="mxb-route"
            data-mxb-visible={routeVisible ? "true" : "false"}
            aria-hidden="true"
          >
            <p className="mxb-route-label">{routeLabel}</p>
            <div className="mxb-route-track">
              <div
                className="mxb-route-fill"
                style={{ height: `${(clamped / Math.max(1, dots.length - 1)) * 100}%` }}
              />
              <div className="mxb-route-dots">
                {dots.map((d, i) => (
                  <a
                    key={d.n}
                    className="mxb-route-dot"
                    href={`#mxb-stop-${d.n}`}
                    aria-label={d.location}
                    data-mxb-active={i === clamped ? "true" : "false"}
                    style={{ top: `${(i / Math.max(1, dots.length - 1)) * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="mxb-route-next">
              <p className="mxb-route-next-label">
                {active >= list.length - 1 ? "ÚLTIMA PARAGEM:" : "PRÓXIMA PARAGEM:"}
              </p>
              <p className="mxb-route-next-name">{dots[clamped]?.location ?? ""}</p>
            </div>
          </aside>

          <div className="mxb-stops">
            <div className="mxb-intro" id="mxb-journey-intro">
              <p className="mxb-intro-eyebrow">{journeyEyebrow}</p>
              <h2 className="mxb-intro-title">
                <span className="mxb-blue">{journeyTitle1}</span>
                <br />
                <span className="mxb-red">{journeyTitle2}</span>
                <br />
                <span className="mxb-gold">{journeyTitle3}</span>
              </h2>
              <p className="mxb-intro-copy">{journeyCopy}</p>
            </div>

            <div>
              {list.map((stop, i) => {
                const reverse = i % 2 === 1;
                const line = stop.line ?? "L1";
                return (
                  <div className="mxb-stop-wrap" key={stop.n}>
                    <article
                      className="mxb-stop"
                      id={`mxb-stop-${stop.n}`}
                      data-mxb-reverse={reverse ? "true" : "false"}
                    >
                      <div className="mxb-stop-media">
                        <div className="mxb-stop-image-wrap">
                          {stop.image ? (
                            <img
                              className="mxb-stop-image"
                              src={stop.image}
                              alt={`${stop.location} — ${stop.product ?? "transição"}`}
                              loading="lazy"
                              width={1280}
                              height={1706}
                            />
                          ) : (
                            <div
                              className="mxb-stop-image mxb-stop-image-placeholder"
                              style={{ ["--stop-line" as string]: TMB[line] }}
                            >
                              <span>{stop.n}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mxb-stop-body">
                        <span className="mxb-stop-location" style={{ color: TMB[line] }}>
                          {stop.location}
                        </span>
                        <h3 className="mxb-stop-title">{stop.title}</h3>
                        {stop.product && <p className="mxb-stop-product">{stop.product}</p>}
                        <div className="mxb-stop-copy">
                          {stop.copy.split(/\n\s*\n/).map((p) => (
                            <p key={p.slice(0, 24)}>{p}</p>
                          ))}
                        </div>
                        {stop.product && (
                          <a
                            className="mxb-btn mxb-btn-primary"
                            href={stop.link || "#mxb-journey"}
                            target={stop.link ? "_blank" : undefined}
                            rel={stop.link ? "noopener noreferrer" : undefined}
                          >
                            Saber mais
                          </a>
                        )}
                      </div>
                    </article>
                    {i < list.length - 1 && (
                      <Connector
                        index={i}
                        reverse={reverse}
                        from={line}
                        to={list[i + 1].line ?? "L1"}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const CSS = `
.mxb-root {
  --mxb-red:#E1322D; --mxb-blue:#004D98; --mxb-gold:#DBBB6C; --mxb-gold-2:#E7C56A; --mxb-city:#0092D8;
  --mxb-bg:#0B0B0F; --mxb-fg:#F5F5F5; --mxb-ink:#0B0B0F;
  position:relative; color:var(--mxb-fg); background:var(--mxb-bg); font-family:inherit; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.mxb-root *, .mxb-root *::before, .mxb-root *::after { box-sizing:border-box; }
.mxb-root img, .mxb-root video, .mxb-root svg { display:block; max-width:100%; }
.mxb-root a { color:inherit; text-decoration:none; }
.mxb-root button { font:inherit; cursor:pointer; border:0; background:transparent; color:inherit; }
.mxb-root .mxb-red { color:var(--mxb-red); }
.mxb-root .mxb-blue { color:var(--mxb-blue); }
.mxb-root .mxb-gold { color:var(--mxb-gold-2); }
.mxb-root .mxb-nowrap { white-space:nowrap; }

/* HERO */
.mxb-root .mxb-hero { position:relative; min-height:92vh; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; padding:4rem 1.5rem; }
.mxb-root .mxb-hero-media { position:absolute; inset:0; z-index:0; }
.mxb-root .mxb-hero-video { width:100%; height:100%; object-fit:cover; opacity:.5; background:#000; }
.mxb-root .mxb-hero-fallback { opacity:1; background:radial-gradient(ellipse at 20% 20%, rgba(225,50,45,.55), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(0,77,152,.6), transparent 60%), #0B0B0F; }
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-hero-video { object-fit:contain; opacity:1; }
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-hero-scrim,
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-scroll-cue { display:none; }
.mxb-root .mxb-hero-scrim { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(11,11,15,.4) 0%, rgba(11,11,15,.3) 40%, rgba(11,11,15,1) 100%); }
.mxb-root .mxb-hero-close { position:absolute; top:1rem; right:1rem; z-index:3; width:2.75rem; height:2.75rem; display:inline-flex; align-items:center; justify-content:center; border-radius:999px; background:rgba(11,11,15,.8); color:var(--mxb-fg); border:1px solid rgba(255,255,255,.1); }
.mxb-root .mxb-hero-content { position:relative; z-index:1; text-align:center; max-width:64rem; padding:2rem 0; }
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-hero-content { display:none; }
.mxb-root .mxb-hero-title { font-size:clamp(2.5rem, 12vw, 9rem); line-height:1.05; letter-spacing:-.02em; text-transform:uppercase; margin:0 0 2.5rem; font-weight:800; }
.mxb-root .mxb-hero-sub { max-width:36rem; margin:0 auto 2.25rem; color:rgba(245,245,245,.72); font-size:clamp(1rem, 1.4vw, 1.125rem); }
.mxb-root .mxb-hero-ctas { display:flex; flex-direction:column; gap:.75rem; align-items:center; justify-content:center; }
@media (min-width:640px) { .mxb-root .mxb-hero-ctas { flex-direction:row; } }
.mxb-root .mxb-btn { display:inline-flex; align-items:center; justify-content:center; padding:.85rem 2rem; border-radius:999px; font-size:1rem; transition:opacity .2s ease; white-space:nowrap; }
.mxb-root .mxb-btn-primary { background:var(--mxb-city); color:#fff; }
.mxb-root .mxb-btn-dark { background:var(--mxb-fg); color:var(--mxb-ink); }
.mxb-root .mxb-btn:hover { opacity:.9; }
.mxb-root .mxb-scroll-cue { position:absolute; bottom:2.5rem; z-index:1; display:inline-flex; color:#fff; animation:mxb-bounce 2.2s ease-in-out infinite; }
.mxb-root .mxb-scroll-cue-ring { width:3.5rem; height:3.5rem; border-radius:999px; border:2px solid rgba(255,255,255,.3); display:inline-flex; align-items:center; justify-content:center; }
@keyframes mxb-bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(10px); } }

/* MARQUEE */
.mxb-root .mxb-marquee { position:relative; z-index:1; border-top:1px solid rgba(255,255,255,.1); border-bottom:1px solid rgba(255,255,255,.1); background:rgba(11,11,15,.4); overflow:hidden; }
.mxb-root .mxb-marquee-track { display:flex; gap:2.5rem; padding:1.25rem 0; white-space:nowrap; font-size:1.75rem; letter-spacing:-.02em; text-transform:uppercase; font-weight:800; animation:mxb-marquee 25s linear infinite; width:max-content; }
.mxb-root .mxb-marquee-group { display:inline-flex; gap:2.5rem; align-items:center; padding-right:2.5rem; }
.mxb-root .mxb-marquee-item { display:inline-flex; gap:2.5rem; align-items:center; }
.mxb-root .mxb-marquee-dot { display:inline-block; width:.4em; height:.4em; border-radius:9999px; background:var(--mxb-gold-2); flex-shrink:0; }
@keyframes mxb-marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }

/* JOURNEY */
.mxb-root .mxb-journey { position:relative; padding:8rem 1.5rem; background:#fff; color:var(--mxb-ink); overflow:clip; }
.mxb-root .mxb-journey-inner { position:relative; max-width:1400px; margin:0 auto; }
@media (min-width:1024px) { .mxb-root .mxb-journey-inner { padding-left:14rem; } }
.mxb-root .mxb-route { display:none; position:fixed; top:8rem; left:max(1.5rem, calc((100vw - 1400px) / 2 + 1.5rem)); width:11rem; z-index:5; opacity:0; visibility:hidden; transition:opacity .5s ease, visibility .5s ease; }
@media (min-width:1024px) { .mxb-root .mxb-route { display:block; } }
.mxb-root .mxb-route[data-mxb-visible="true"] { opacity:1; visibility:visible; }
.mxb-root .mxb-route-label { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:rgba(11,11,15,.4); margin:0 0 1.25rem; }
.mxb-root .mxb-route-track { position:relative; width:2px; height:18rem; background:rgba(11,11,15,.1); margin:0 0 1.5rem .5rem; }
.mxb-root .mxb-route-fill { position:absolute; top:0; left:0; width:100%; background:linear-gradient(to bottom, #E1322D 0%, #E1322D 45%, #004D98 55%, #004D98 100%); transition:height .5s ease; }
.mxb-root .mxb-route-dot { position:absolute; left:-4px; width:10px; height:10px; border-radius:999px; background:rgba(0,0,0,.15); border:1px solid transparent; transition:all .25s ease; }
.mxb-root .mxb-route-dot[data-mxb-active="true"] { width:14px; height:14px; left:-6px; background:conic-gradient(from 0deg, #004D98 0deg 180deg, #E1322D 180deg 360deg); border-color:#E7C56A; box-shadow:0 0 0 3px rgba(231,197,106,.25); }
.mxb-root .mxb-route-next-label { font-size:10px; color:var(--mxb-red); margin:0; letter-spacing:.05em; }
.mxb-root .mxb-route-next-name { font-size:1.125rem; text-transform:uppercase; line-height:1.1; margin:.25rem 0 0; font-weight:800; }
.mxb-root .mxb-intro { max-width:42rem; margin:0 0 8rem; scroll-margin-top:8rem; }
.mxb-root .mxb-intro-eyebrow { font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:#000; margin:0 0 1rem; }
.mxb-root .mxb-intro-title { font-size:clamp(2.5rem, 6vw, 4.5rem); line-height:.9; text-transform:uppercase; margin:0 0 1.5rem; font-weight:800; }
.mxb-root .mxb-intro-copy { color:rgba(11,11,15,.6); font-size:1.125rem; margin:0; }
.mxb-root .mxb-stop { display:grid; grid-template-columns:1fr; gap:1.5rem; align-items:start; text-align:left; scroll-margin-top:8rem; min-height:100vh; padding:6rem 0 5rem; }
@media (min-width:768px) { .mxb-root .mxb-stop { grid-template-columns:repeat(12, 1fr); gap:3rem; align-items:center; min-height:0; padding:0; } }
.mxb-root .mxb-stop-media, .mxb-root .mxb-stop-body { grid-column:span 1; }
@media (min-width:768px) {
  .mxb-root .mxb-stop-media { grid-column:span 7; }
  .mxb-root .mxb-stop-body { grid-column:span 5; }
  .mxb-root .mxb-stop[data-mxb-reverse="true"] .mxb-stop-media { order:2; }
  .mxb-root .mxb-stop[data-mxb-reverse="true"] .mxb-stop-body { order:1; }
}
.mxb-root .mxb-stop-image-wrap { position:relative; overflow:hidden; border-radius:12px; border:1px solid rgba(11,11,15,.1); margin:0; width:100%; }
@media (min-width:768px) { .mxb-root .mxb-stop-image-wrap { margin:0 auto; max-width:360px; } }
@media (min-width:1024px) { .mxb-root .mxb-stop-image-wrap { max-width:420px; } }
.mxb-root .mxb-stop-image { width:100%; aspect-ratio:3 / 4; object-fit:cover; max-height:70vh; transition:transform .7s ease; }
.mxb-root .mxb-stop:hover .mxb-stop-image { transform:scale(1.05); }
.mxb-root .mxb-stop-image-placeholder { display:flex; align-items:center; justify-content:center; background:linear-gradient(150deg, var(--stop-line, #004D98) 0%, rgba(11,11,15,.9) 100%); color:rgba(255,255,255,.85); font-size:clamp(3rem, 8vw, 5rem); font-weight:800; letter-spacing:-.03em; }
.mxb-root .mxb-stop-location { display:block; font-size:.875rem; margin:0 0 1rem; letter-spacing:.04em; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
.mxb-root .mxb-stop-title { font-size:clamp(2rem, 4vw, 3rem); line-height:.95; text-transform:uppercase; margin:0 0 .75rem; font-weight:800; }
.mxb-root .mxb-stop-product { font-size:12px; letter-spacing:.18em; text-transform:uppercase; font-weight:700; color:#000; margin:0 0 1.5rem; }
.mxb-root .mxb-stop-copy { color:rgba(11,11,15,.6); max-width:32rem; margin:0 0 2rem; font-size:1rem; line-height:1.55; }
.mxb-root .mxb-stop-copy p { margin:0 0 .75rem; }
.mxb-root .mxb-stop-copy p:last-child { margin-bottom:0; }
@media (min-width:1024px) { .mxb-root .mxb-stop-copy { font-size:1.125rem; } }
.mxb-root .mxb-connector { position:relative; height:8rem; margin:-4rem 0; overflow:visible; }
@media (min-width:768px) { .mxb-root .mxb-connector { height:14rem; margin:0; } }
.mxb-root .mxb-connector svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.mxb-root .mxb-station { position:absolute; width:14px; height:14px; border-radius:999px; background:#fff; transform:translate(-50%, -50%); }
.mxb-root .mxb-line-pill { position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); display:inline-flex; align-items:center; gap:.375rem; background:#fff; border:1px solid rgba(11,11,15,.15); color:var(--mxb-ink); padding:2px 8px; border-radius:999px; font-size:10px; letter-spacing:.18em; text-transform:uppercase; box-shadow:0 2px 10px -4px rgba(0,0,0,.25); font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
.mxb-root .mxb-line-dot { display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:999px; color:#fff; font-size:10px; font-weight:800; line-height:1; }
.mxb-root .mxb-line-arrow { color:rgba(11,11,15,.5); }

/* PARTNERSHIP */
.mxb-root .mxb-partnership { position:relative; z-index:10; padding:5rem 1.5rem; border-bottom:1px solid rgba(255,255,255,.05); overflow:hidden; }
@media (min-width:768px) { .mxb-root .mxb-partnership { padding:7rem 1.5rem; } }
.mxb-root .mxb-partnership-glow { position:absolute; top:0; bottom:0; width:55%; pointer-events:none; }
.mxb-root .mxb-partnership-glow-red { left:0; background:radial-gradient(ellipse 60% 70% at 0% 50%, hsla(348,83%,47%,.28), transparent 65%); }
.mxb-root .mxb-partnership-glow-blue { right:0; background:radial-gradient(ellipse 60% 70% at 100% 50%, hsla(214,100%,30%,.32), transparent 65%); }
.mxb-root .mxb-partnership-inner { position:relative; max-width:56rem; margin:0 auto; text-align:center; }
.mxb-root .mxb-lockup { display:block; width:100%; max-width:348px; height:auto; margin:0 auto 2.5rem; }
@media (min-width:768px) { .mxb-root .mxb-lockup { max-width:509px; margin-bottom:3rem; } }
.mxb-root .mxb-partnership-eyebrow { font-size:.625rem; letter-spacing:.25em; text-transform:uppercase; color:var(--mxb-gold-2); margin:0 0 1rem; }
@media (min-width:640px) { .mxb-root .mxb-partnership-eyebrow { font-size:.75rem; } }
.mxb-root .mxb-partnership-title { font-weight:800; font-size:clamp(2rem, 5vw, 3.5rem); line-height:.95; letter-spacing:-.02em; text-transform:uppercase; margin:0 0 1.5rem; color:var(--mxb-fg); text-wrap:balance; }
.mxb-root .mxb-text-blue { color:#2A6FC4; }
.mxb-root .mxb-partnership-lede { max-width:42rem; margin:0 auto; font-size:1rem; line-height:1.6; color:rgba(245,245,245,.7); }
@media (min-width:768px) { .mxb-root .mxb-partnership-lede { font-size:1.125rem; } }
.mxb-root .mxb-stats { display:grid; grid-template-columns:1fr; gap:1rem; max-width:48rem; margin:3rem auto 0; }
@media (min-width:640px) { .mxb-root .mxb-stats { grid-template-columns:repeat(3, 1fr); gap:1.5rem; margin-top:4rem; } }
.mxb-root .mxb-stat { position:relative; overflow:hidden; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.03); border-radius:.75rem; padding:1.75rem 1.5rem; text-align:left; }
.mxb-root .mxb-stat::before { content:""; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--accent, var(--mxb-red)); }
.mxb-root .mxb-stat-red { --accent:var(--mxb-red); }
.mxb-root .mxb-stat-blue { --accent:#2A6FC4; }
.mxb-root .mxb-stat-gold { --accent:var(--mxb-gold-2); }
.mxb-root .mxb-stat-value { display:block; font-weight:800; font-size:clamp(1.75rem, 4vw, 2.75rem); line-height:1; letter-spacing:-.02em; margin-bottom:.5rem; color:var(--accent); }
.mxb-root .mxb-stat-label { display:block; font-size:.6875rem; letter-spacing:.15em; text-transform:uppercase; color:rgba(245,245,245,.6); }
`;
