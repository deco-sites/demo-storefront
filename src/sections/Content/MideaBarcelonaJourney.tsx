import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageWidget, VideoWidget } from "~/types/widgets";

/**
 * Midea × FC Barcelona — "Uma viagem por Barcelona" landing page section.
 *
 * Ported from the standalone AEM module (markup + scoped CSS + vanilla JS) into
 * a single React section. All behaviour (hero video player, marquee, metro
 * connectors, fixed route sidebar, keyboard snapping) is kept.
 */

const TMB: Record<string, string> = {
  L1: "#E1322D",
  L3: "#0E9E4F",
  L4: "#F2C300",
  L5: "#0072BC",
  L9: "#F08A2E",
};

/** Metro line for each stop's location label (used to color station names) */
const STATION_LINES = ["L3", "L5", "L1", "L4", "L3", "L1", "L1", "L1", "L3"];
/** Connector segment lines (from i → i+1) */
const FROM_LINES = ["L3", "L5", "L1", "L4", "L3", "L1", "L1", "L1"];
const TO_LINES = ["L5", "L1", "L4", "L3", "L1", "L1", "L1", "L3"];

interface Stop {
  n: string;
  location: string;
  title: string;
  product: string | null;
  link: string | null;
  image: string;
  copy: string;
}

const STOPS: Stop[] = [
  {
    n: "01",
    location: "LESSEPS",
    title: "PARK GÜELL",
    product: null,
    link: null,
    image: "stop-01-parkguell.jpg",
    copy: "Gaudí imaginou primeiro esta colina como um empreendimento habitacional de luxo, mas apenas duas casas chegaram a ser vendidas, e a cidade transformou-a num parque. Desse silencioso fracasso nasceu um dos horizontes mais fotografados do mundo.\n\nA viagem começa aqui: um pontapé, uma bola, e uma cidade prestes a transformar-se.",
  },
  {
    n: "02",
    location: "SAGRADA FAMÍLIA",
    title: "BASÍLICA SAGRADA FAMÍLIA",
    product: "Frigorífico French Door",
    link: "https://www.midea.com/global/refrigerators",
    image: "stop-02-cathedral.jpg",
    copy: "Escondidas no claustro da catedral, treze gansas brancas vivem lá há mais de cinco séculos, uma por cada ano da vida de Santa Eulália. Sob essas abóbadas góticas, o tempo é algo que se protege.\n\nO nosso frigorífico French Door faz o mesmo pelos teus alimentos: climas multizona, humidade precisa e uma engenharia silenciosa que mantém cada ingrediente no seu ponto ideal.",
  },
  {
    n: "03",
    location: "ARC DE TRIOMF",
    title: "ARC DE TRIOMF",
    product: "Ar Condicionado",
    link: "https://www.midea.com/global/hvac",
    image: "stop-03-arc.jpg",
    copy: "Ao contrário da maioria dos arcos do triunfo, este não celebra nenhuma batalha — foi construído como porta de boas-vindas à Exposição Universal de 1888. Pura hospitalidade, esculpida em tijolo vermelho.\n\nO ar condicionado Midea partilha essa ideia: uma receção silenciosa assim que se entra. Arrefecimento uniforme, fluxo de ar inteligente e um desempenho eficiente que transforma qualquer divisão numa chegada tranquila.",
  },
  {
    n: "04",
    location: "BARCELONETA",
    title: "L'ESTEL FERIT",
    product: "Máquina de Lavar Roupa",
    link: "https://www.midea.com/global/laundry",
    image: "stop-04-washer.jpg",
    copy: "Os quatro cubos empilhados de Rebecca Horn foram erguidos como tributo às antigas barracas de pescadores demolidas para os Jogos Olímpicos de 1992, uma pilha inclinada de casas viradas para o vento salgado. Lavar roupa junto ao mar sempre foi um ritual aqui.\n\nA máquina de lavar roupa Midea dá continuidade a essa tradição: suave com os tecidos, implacável com as manchas, com programas a vapor e ciclos inteligentes que respeitam cada peça que adoras.",
  },
  {
    n: "05",
    location: "LICEU",
    title: "BARRI GÒTIC",
    product: "FORNO DE ENCASTRAR",
    link: "https://www.midea.com/global/kitchen-appliances",
    image: "stop-05-ovens.jpg",
    copy: "Grande parte do aspeto medieval do Bairro Gótico não é medieval de todo. Foi restaurado, e em parte inventado, no início do século XX para dar a Barcelona um passado mais romântico. Artesanato a fazer-se passar por história.\n\nO forno Midea faz a mesma magia em casa: convecção, vapor e temperaturas precisas que transformam ingredientes do dia a dia em algo que sabe como se tivesse demorado séculos a aperfeiçoar.",
  },
  {
    n: "06",
    location: "PLAÇA CATALUNYA",
    title: "MERCAT DE LA BOQUERIA",
    product: "Fritadeira de Ar",
    link: "https://www.midea.com/global/small-appliances",
    image: "stop-06-airfryer.jpg",
    copy: "A Boqueria existe, de uma forma ou de outra, desde 1217, quando começou como um mercado ambulante de porcos mesmo fora das antigas muralhas da cidade. Oitocentos anos depois, continua a tratar-se de uma única coisa: bons ingredientes, cozinhados de forma simples.\n\nA nossa fritadeira de ar Midea encaixa perfeitamente: resultados dourados e estaladiços com pouco ou nenhum óleo, rápida o suficiente para um dia de semana e boa o suficiente para um almoço de domingo.",
  },
  {
    n: "07",
    location: "ESPANYA",
    title: "FONT MÀGICA",
    product: "Máquina de Lavar Loiça",
    link: "https://www.midea.com/global/dishwashers",
    image: "stop-07-dishwasher.jpg",
    copy: "A Font Màgica impulsiona mais de 2600 litros de água por segundo através de mais de 3000 luzes, e toda a estrutura foi construída em menos de um ano para a Exposição Universal de 1929. Por trás do espetáculo: uma engenharia invisível, perfeitamente coreografada.\n\nA máquina de lavar loiça Midea é exatamente esse tipo de herói silencioso: uso inteligente da água, baixo consumo de energia e ciclos silenciosos que deixam cada peça impecável.",
  },
  {
    n: "08",
    location: "ESPANYA",
    title: "PLAÇA D'ESPANYA",
    product: "Chiller Comercial",
    link: "https://www.midea.com/global/hvac",
    image: "stop-08-chiller.jpg",
    copy: "As duas torres de estilo veneziano que emolduram a praça inspiraram-se no campanário de São Marcos em Veneza, pensadas para que os visitantes sentissem que entravam num lugar monumental. Grandes espaços exigem grande pensamento climático.\n\nO chiller comercial da Midea oferece exatamente isso: arrefecimento de alta capacidade para hotéis, recintos e grandes edifícios, com a eficiência que uma cidade moderna exige.",
  },
  {
    n: "09",
    location: "LES CORT",
    title: "SPOTIFY CAMP NOU",
    product: "Toda a família de produtos",
    link: "https://www.midea.com/global/space-master",
    image: "stop-09-campnou.jpg",
    copy: "«Camp Nou» significa literalmente «campo novo», um nome provisório escolhido em 1957 que os adeptos tanto adoraram que simplesmente ficou. Algumas coisas são feitas para durar.\n\nA bola chega a casa, e com ela chega toda a família Midea: cozinha, lavandaria, climatização e soluções comerciais, juntas sob os holofotes. Uma cidade, uma equipa, a marca de eletrodomésticos inteligentes número um do mundo.",
  },
];

/** @titleBy location */
export interface StopImage {
  /** @description Location of the stop this image belongs to (informative) */
  location?: string;
  image?: ImageWidget;
}

export interface Props {
  /**
   * @title Base URL dos assets
   * @description Pasta pública (DAM) que serve os ficheiros da campanha. Ex.: /content/dam/midea/fcb-journey/
   */
  assetBaseUrl?: string;
  /** @title Vídeo da campanha */
  video?: VideoWidget;
  /** @title Lockup Midea × FC Barcelona */
  lockup?: ImageWidget;
  /**
   * @title Imagens das paragens
   * @description Opcional. Uma imagem por paragem, na ordem do percurso (01 → 09).
   */
  stopImages?: StopImage[];
}

const GRADIENTS = [
  "linear-gradient(150deg,#0E9E4F,#004D98)",
  "linear-gradient(150deg,#0072BC,#0B0B0F)",
  "linear-gradient(150deg,#E1322D,#7a1512)",
  "linear-gradient(150deg,#F2C300,#E1322D)",
  "linear-gradient(150deg,#0E9E4F,#0B0B0F)",
  "linear-gradient(150deg,#E1322D,#DBBB6C)",
  "linear-gradient(150deg,#0092D8,#004D98)",
  "linear-gradient(150deg,#0B0B0F,#0072BC)",
  "linear-gradient(150deg,#004D98,#E1322D)",
];

export default function MideaBarcelonaJourney({
  assetBaseUrl = "",
  video,
  lockup,
  stopImages = [],
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const routeRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [videoHint, setVideoHint] = useState("");
  const [active, setActive] = useState(0);
  const [routeVisible, setRouteVisible] = useState(false);

  const asset = useCallback(
    (name?: string) => {
      if (!name) return "";
      if (!assetBaseUrl) return "";
      return `${assetBaseUrl.replace(/\/+$/, "")}/${name}`;
    },
    [assetBaseUrl],
  );

  const stopImage = (i: number) => stopImages?.[i]?.image || asset(STOPS[i].image);

  const dots = STOPS.slice(1);
  const clamped = Math.min(Math.max(active, 0), dots.length - 1);

  /* ---------------------- scroll / sidebar ------------------------------ */
  useEffect(() => {
    const compute = () => {
      const root = rootRef.current;
      if (!root) return;
      const stopEls = STOPS.map((s) => root.querySelector<HTMLElement>(`#mxb-stop-${s.n}`));
      const first = stopEls[0];
      const last = stopEls[stopEls.length - 1];
      if (!first) return;

      const vh = window.innerHeight;
      const probe = vh * 0.35;

      let idx = 0;
      let bestTop = -Infinity;
      stopEls.forEach((eln, i) => {
        if (!eln) return;
        const top = eln.getBoundingClientRect().top;
        if (top <= probe && top > bestTop) {
          bestTop = top;
          idx = i;
        }
      });
      setActive(idx);

      const afterFirst = first.getBoundingClientRect().top < vh * 0.75;
      const beforeFinal = !last || last.getBoundingClientRect().top > vh * 0.5;
      setRouteVisible(afterFirst && beforeFinal);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  /* ---------------------- keyboard snapping ---------------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia?.("(max-width: 767px)").matches) return;

    const targets = ["#mxb-top", "#mxb-journey-intro"]
      .map((sel) => root.querySelector<HTMLElement>(sel))
      .filter(Boolean)
      .concat(
        STOPS.map((s) => root.querySelector<HTMLElement>(`#mxb-stop-${s.n}`)).filter(Boolean),
      ) as HTMLElement[];
    if (!targets.length) return;

    const DURATION = 1100;
    let locked = false;

    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const targetYFor = (eln: HTMLElement) => {
      const r = eln.getBoundingClientRect();
      const vh = window.innerHeight;
      const HEADER_OFFSET = 72;
      const fits = r.height + HEADER_OFFSET <= vh;
      const raw = fits
        ? window.scrollY + r.top + r.height / 2 - vh / 2
        : window.scrollY + r.top - HEADER_OFFSET;
      const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      return Math.min(maxY, Math.max(0, raw));
    };

    const tween = (targetY: number) => {
      const startY = window.scrollY;
      const delta = targetY - startY;
      if (Math.abs(delta) < 1) return false;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / DURATION);
        window.scrollTo(0, startY + delta * ease(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      return true;
    };

    const snap = (dir: 1 | -1) => {
      const y = window.scrollY;
      const EPS = 12;
      let idx = -1;
      if (dir === 1) {
        for (let i = 0; i < targets.length; i++) {
          if (targetYFor(targets[i]) > y + EPS) {
            idx = i;
            break;
          }
        }
      } else {
        for (let j = targets.length - 1; j >= 0; j--) {
          if (targetYFor(targets[j]) < y - EPS) {
            idx = j;
            break;
          }
        }
      }
      if (idx < 0) return false;
      if (!tween(targetYFor(targets[idx]))) return false;
      locked = true;
      setTimeout(() => {
        locked = false;
      }, DURATION + 120);
      return true;
    };

    const inJourney = () => {
      const top = targets[0].getBoundingClientRect().top;
      const bottom = targets[targets.length - 1].getBoundingClientRect().bottom;
      const vh = window.innerHeight;
      return top < vh * 0.6 && bottom > vh * 0.4;
    };

    const onKey = (e: KeyboardEvent) => {
      if (!inJourney() || locked) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        if (snap(1)) e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (snap(-1)) e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------------------- video ---------------------------------- */
  const openVideo = () => {
    setPlaying(true);
    setVideoHint("");
    const v = videoRef.current;
    if (!v) return;
    v.loop = false;
    v.controls = true;
    v.muted = true;
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => setVideoHint("Toque no controlo de reprodução para iniciar o vídeo."));
    }
  };

  const closeVideo = () => {
    setPlaying(false);
    setVideoHint("");
    const v = videoRef.current;
    if (!v) return;
    v.controls = false;
    v.loop = true;
    v.muted = true;
    try {
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* ignore */
    }
  };

  const heroPoster = stopImage(0) || undefined;
  const heroVideo = video || asset("campaign-web.mp4");
  const lockupSrc = lockup || asset("midea-fcb-lockup.png");

  /* marquee: unique consecutive locations, duplicated for a seamless loop */
  const marqueeItems = STOPS.filter((s, i) => i === 0 || STOPS[i - 1].location !== s.location);

  return (
    <div className="mxb-root" lang="pt" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* HERO */}
      <header
        className="mxb-hero"
        id="mxb-top"
        ref={heroRef}
        data-mxb-playing={playing ? "true" : undefined}
      >
        <div className="mxb-hero-media">
          {heroVideo ? (
            <video
              className="mxb-hero-video"
              ref={videoRef}
              src={heroVideo}
              poster={heroPoster}
              preload="metadata"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <div className="mxb-hero-video mxb-hero-fallback" aria-hidden="true" />
          )}
          <div className="mxb-hero-scrim" />
        </div>

        {playing && (
          <button
            type="button"
            className="mxb-hero-close"
            aria-label="Fechar vídeo"
            onClick={closeVideo}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {videoHint && (
          <p className="mxb-video-status" data-mxb-visible="true">
            {videoHint}
          </p>
        )}

        <div className="mxb-hero-content">
          <h1 className="mxb-hero-title">
            UMA VIAGEM
            <br />
            POR
            <br />
            <span className="mxb-gold">BARCELONA</span>
          </h1>
          <p className="mxb-hero-sub">
            Uma bola. Sete ícones. Inovação sem fim.
            <br />
            Barcelona encontra a Midea, onde cada lance revela um lar.
          </p>
          <div className="mxb-hero-ctas">
            <a className="mxb-btn mxb-btn-primary" href="#mxb-journey">
              Começar a viagem
            </a>
            {heroVideo && (
              <button type="button" className="mxb-btn mxb-btn-dark" onClick={openVideo}>
                Ver o vídeo
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
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </a>
      </header>

      {/* PARTNERSHIP LAUNCH */}
      <section
        className="mxb-partnership"
        id="mxb-partnership"
        aria-labelledby="mxb-partnership-title"
      >
        <div className="mxb-partnership-glow mxb-partnership-glow-red" aria-hidden="true" />
        <div className="mxb-partnership-glow mxb-partnership-glow-blue" aria-hidden="true" />
        <div className="mxb-partnership-inner">
          {lockupSrc && (
            <img
              className="mxb-lockup"
              src={lockupSrc}
              alt="Midea — Patrocinador Principal do FC Barcelona"
              loading="lazy"
            />
          )}
          <p className="mxb-partnership-eyebrow">Lançamento da parceria</p>
          <h2 className="mxb-partnership-title" id="mxb-partnership-title">
            A Midea junta-se ao{" "}
            <span className="mxb-text-blue" style={{ whiteSpace: "nowrap" }}>
              FC Barcelona.
            </span>
          </h2>
          <p className="mxb-partnership-lede">
            A partir da época 2026/27, a Midea junta-se ao FC Barcelona por cinco épocas, com o
            logótipo Midea presente em todas as camisolas de jogo e treino.
          </p>
          <div className="mxb-stats">
            <div className="mxb-stat mxb-stat-red">
              <span className="mxb-stat-value">5</span>
              <span className="mxb-stat-label">Épocas</span>
            </div>
            <div className="mxb-stat mxb-stat-blue">
              <span className="mxb-stat-value">2026/27</span>
              <span className="mxb-stat-label">Época de estreia</span>
            </div>
            <div className="mxb-stat mxb-stat-gold">
              <span className="mxb-stat-value">Manga</span>
              <span className="mxb-stat-label">Posição do logótipo</span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="mxb-marquee" aria-hidden="true">
        <div className="mxb-marquee-track">
          {[0, 1].map((g) => (
            <div className="mxb-marquee-group" key={g}>
              {marqueeItems.map((s) => (
                <span className="mxb-marquee-item" key={`${g}-${s.n}`}>
                  <span>{s.location}</span>
                  <span className="mxb-marquee-dot" aria-hidden="true" />
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
            ref={routeRef}
            data-mxb-visible={routeVisible ? "true" : "false"}
            aria-hidden={routeVisible ? "false" : "true"}
          >
            <p className="mxb-route-label">O percurso</p>
            <div className="mxb-route-track">
              <div
                className="mxb-route-fill"
                ref={fillRef}
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
                    style={{ top: `${(i / (dots.length - 1)) * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="mxb-route-next">
              <p className="mxb-route-next-label">
                {active >= STOPS.length - 1 ? "ÚLTIMA PARAGEM:" : "PRÓXIMA PARAGEM:"}
              </p>
              <p className="mxb-route-next-name">{dots[clamped]?.location ?? ""}</p>
            </div>
          </aside>

          <div className="mxb-stops">
            <div className="mxb-intro" id="mxb-journey-intro">
              <p className="mxb-intro-eyebrow">A viagem</p>
              <h2 className="mxb-intro-title">
                <span className="mxb-blue">NOVE MARCOS ICÓNICOS.</span>
                <br />
                <span className="mxb-red">SETE PROTAGONISTAS.</span>
                <br />
                <span className="mxb-gold">UMA CIDADE.</span>
              </h2>
              <p className="mxb-intro-copy">
                Acompanha a bola blaugrana por Barcelona: cada marco revela um produto emblemático
                da Midea, pensado para a casa moderna.
              </p>
            </div>

            <div>
              {STOPS.map((stop, i) => {
                const reverse = i % 2 === 1;
                const src = stopImage(i);
                return (
                  <div className="mxb-stop-wrap" key={stop.n}>
                    <article
                      className="mxb-stop"
                      id={`mxb-stop-${stop.n}`}
                      data-mxb-reverse={reverse ? "true" : "false"}
                    >
                      <div className="mxb-stop-media">
                        <div className="mxb-stop-image-wrap">
                          {src ? (
                            <img
                              className="mxb-stop-image"
                              src={src}
                              alt={`${stop.location} — ${stop.product || "transição"}`}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="mxb-stop-image mxb-stop-image-placeholder"
                              style={{ background: GRADIENTS[i] }}
                              aria-hidden="true"
                            >
                              <span className="mxb-stop-placeholder-n">{stop.n}</span>
                              <span className="mxb-stop-placeholder-name">{stop.title}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mxb-stop-body">
                        <span
                          className="mxb-stop-location"
                          style={{ color: TMB[STATION_LINES[i]] }}
                        >
                          {stop.location}
                        </span>
                        <h3 className="mxb-stop-title">{stop.title}</h3>
                        {stop.product && <p className="mxb-stop-product">{stop.product}</p>}
                        <div className="mxb-stop-copy">
                          {stop.copy.split(/\n\s*\n/).map((p, k) => (
                            <p key={k}>{p}</p>
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
                    {i < STOPS.length - 1 && <Connector index={i} reverse={reverse} />}
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

function Connector({ index, reverse }: { index: number; reverse: boolean }) {
  const fromLabel = FROM_LINES[index];
  const toLabel = TO_LINES[index];
  const fromColor = TMB[fromLabel];
  const toColor = TMB[toLabel];

  const startX = reverse ? 71 : 29;
  const endX = reverse ? 29 : 71;
  const midX = (startX + endX) / 2;
  const pathReverse = startX > endX;
  const same = fromLabel === toLabel;

  const leftLabel = pathReverse ? toLabel : fromLabel;
  const leftColor = pathReverse ? toColor : fromColor;
  const rightLabel = pathReverse ? fromLabel : toLabel;
  const rightColor = pathReverse ? fromColor : toColor;

  const stroke = {
    fill: "none",
    strokeWidth: 9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <div className="mxb-connector" aria-hidden="true">
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

const CSS = `
.mxb-root {
  --mxb-red:    #E1322D;
  --mxb-blue:   #004D98;
  --mxb-gold:   #DBBB6C;
  --mxb-gold-2: #E7C56A;
  --mxb-city:   #0092D8;
  --mxb-bg:     #0B0B0F;
  --mxb-fg:     #F5F5F5;
  --mxb-ink:    #0B0B0F;
  position: relative;
  color: var(--mxb-fg);
  background: var(--mxb-bg);
  font-family: inherit;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.mxb-root *, .mxb-root *::before, .mxb-root *::after { box-sizing: border-box; }
.mxb-root img, .mxb-root video, .mxb-root svg { display: block; max-width: 100%; }
.mxb-root a { color: inherit; text-decoration: none; }
.mxb-root button { font: inherit; cursor: pointer; border: 0; background: transparent; color: inherit; }
.mxb-root .mxb-red  { color: var(--mxb-red); }
.mxb-root .mxb-blue { color: var(--mxb-blue); }
.mxb-root .mxb-gold { color: var(--mxb-gold-2); }

/* HERO */
.mxb-root .mxb-hero {
  position: relative; min-height: 92vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  overflow: hidden; padding: 4rem 1.5rem;
}
.mxb-root .mxb-hero-media { position: absolute; inset: 0; z-index: 0; }
.mxb-root .mxb-hero-video { width: 100%; height: 100%; object-fit: cover; opacity: .5; background: #000; }
.mxb-root .mxb-hero-fallback {
  opacity: 1;
  background: radial-gradient(ellipse at 20% 20%, rgba(225,50,45,.55), transparent 60%),
              radial-gradient(ellipse at 80% 70%, rgba(0,77,152,.6), transparent 60%), #0B0B0F;
}
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-hero-video { object-fit: contain; opacity: 1; }
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-hero-scrim,
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-scroll-cue,
.mxb-root .mxb-hero[data-mxb-playing="true"] .mxb-hero-content { display: none; }
.mxb-root .mxb-hero-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(11,11,15,.4) 0%, rgba(11,11,15,.3) 40%, rgba(11,11,15,1) 100%);
}
.mxb-root .mxb-hero-close {
  position: absolute; top: 1rem; right: 1rem; z-index: 3;
  width: 2.75rem; height: 2.75rem;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; background: rgba(11,11,15,.8); color: var(--mxb-fg);
  border: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(6px);
  transition: background .2s ease;
}
.mxb-root .mxb-hero-close:hover { background: rgba(11,11,15,1); }
.mxb-root .mxb-video-status {
  position: absolute; left: 50%; bottom: 5.25rem; z-index: 3;
  transform: translateX(-50%); margin: 0; padding: .6rem 1rem;
  border-radius: 999px; background: rgba(11,11,15,.78); color: var(--mxb-fg);
  font-size: .875rem; line-height: 1.2; text-align: center;
}
.mxb-root .mxb-hero-content { position: relative; z-index: 1; text-align: center; max-width: 64rem; padding: 2rem 0; }
.mxb-root .mxb-hero-title {
  font-size: clamp(2.5rem, 14vw, 9rem); line-height: 1.05; letter-spacing: -.02em;
  text-transform: uppercase; margin: 0 0 2.5rem; font-weight: 800;
}
.mxb-root .mxb-hero-title .mxb-gold { color: var(--mxb-gold-2); }
.mxb-root .mxb-hero-sub {
  max-width: 36rem; margin: 0 auto 2.25rem; color: rgba(245,245,245,.72);
  font-size: clamp(1rem, 1.4vw, 1.125rem);
}
.mxb-root .mxb-hero-ctas { display: flex; flex-direction: column; gap: .75rem; align-items: center; justify-content: center; }
@media (min-width: 640px) { .mxb-root .mxb-hero-ctas { flex-direction: row; } }
.mxb-root .mxb-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: .85rem 2rem; border-radius: 999px; font-size: 1rem;
  transition: background-color .2s ease, opacity .2s ease; white-space: nowrap;
}
.mxb-root .mxb-btn-primary { background: var(--mxb-city); color: #fff; }
.mxb-root .mxb-btn-primary:hover { background: #0079b3; }
.mxb-root .mxb-btn-dark { background: var(--mxb-fg); color: var(--mxb-ink); }
.mxb-root .mxb-btn-dark:hover { background: #dcdcdc; }
.mxb-root .mxb-scroll-cue {
  position: absolute; bottom: 2.5rem; z-index: 1; display: inline-flex; color: #fff;
  animation: mxb-bounce 2.2s ease-in-out infinite;
}
.mxb-root .mxb-scroll-cue-ring {
  width: 3.5rem; height: 3.5rem; border-radius: 999px;
  border: 2px solid rgba(255,255,255,.3);
  display: inline-flex; align-items: center; justify-content: center;
}
@keyframes mxb-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(10px); } }

/* MARQUEE */
.mxb-root .mxb-marquee {
  position: relative; z-index: 1;
  border-top: 1px solid rgba(255,255,255,.1);
  border-bottom: 1px solid rgba(255,255,255,.1);
  background: rgba(11,11,15,.4); backdrop-filter: blur(8px); overflow: hidden;
}
.mxb-root .mxb-marquee-track {
  display: flex; gap: 2.5rem; padding: 1.25rem 0; white-space: nowrap;
  font-size: 1.75rem; letter-spacing: -.02em; text-transform: uppercase; font-weight: 800;
  animation: mxb-marquee 25s linear infinite; width: max-content;
}
.mxb-root .mxb-marquee-group { display: inline-flex; gap: 2.5rem; align-items: center; padding-right: 2.5rem; }
.mxb-root .mxb-marquee-item { display: inline-flex; gap: 2.5rem; align-items: center; }
.mxb-root .mxb-marquee-dot {
  display: inline-block; width: 0.4em; height: 0.4em; border-radius: 9999px;
  background: var(--mxb-gold-2); flex-shrink: 0;
}
@keyframes mxb-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* JOURNEY */
.mxb-root .mxb-journey {
  position: relative; padding: 8rem 1.5rem; background: #fff; color: var(--mxb-ink); overflow: clip;
}
.mxb-root .mxb-journey-inner { position: relative; max-width: 1400px; margin: 0 auto; }
@media (min-width: 1024px) { .mxb-root .mxb-journey-inner { padding-left: 14rem; } }

.mxb-root .mxb-route {
  display: none; position: fixed; top: 8rem;
  left: max(1.5rem, calc((100vw - 1400px) / 2 + 1.5rem));
  width: 11rem; z-index: 5; opacity: 0; visibility: hidden;
  transition: opacity .5s ease, visibility .5s ease;
}
@media (min-width: 1024px) { .mxb-root .mxb-route { display: block; } }
.mxb-root .mxb-route[data-mxb-visible="true"] { opacity: 1; visibility: visible; }
.mxb-root .mxb-route-label {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: rgba(11,11,15,.4); margin: 0 0 1.25rem;
}
.mxb-root .mxb-route-track {
  position: relative; width: 2px; height: 18rem;
  background: rgba(11,11,15,.1); margin: 0 0 1.5rem .5rem;
}
.mxb-root .mxb-route-fill {
  position: absolute; top: 0; left: 0; width: 100%;
  background: linear-gradient(to bottom, #E1322D 0%, #E1322D 45%, #004D98 55%, #004D98 100%);
  transition: height .5s ease;
}
.mxb-root .mxb-route-dot {
  position: absolute; left: -4px; width: 10px; height: 10px; border-radius: 999px;
  background: rgba(0,0,0,.15); border: 1px solid transparent;
  transition: background .25s ease, box-shadow .25s ease, width .25s ease, height .25s ease, left .25s ease, border-color .25s ease;
}
.mxb-root .mxb-route-dot[data-mxb-active="true"] {
  width: 14px; height: 14px; left: -6px;
  background: conic-gradient(from 0deg, #004D98 0deg 180deg, #E1322D 180deg 360deg);
  border-color: #E7C56A; box-shadow: 0 0 0 3px rgba(231,197,106,.25);
}
.mxb-root .mxb-route-next-label { font-size: 10px; color: var(--mxb-red); margin: 0; letter-spacing: .05em; }
.mxb-root .mxb-route-next-name {
  font-size: 1.125rem; text-transform: uppercase; line-height: 1.1; margin: .25rem 0 0; font-weight: 800;
}

.mxb-root .mxb-intro { max-width: 42rem; margin: 0 0 8rem; scroll-margin-top: 8rem; }
.mxb-root .mxb-intro-eyebrow {
  font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: #000; margin: 0 0 1rem;
}
.mxb-root .mxb-intro-title {
  font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: .9; text-transform: uppercase;
  margin: 0 0 1.5rem; font-weight: 800;
}
.mxb-root .mxb-intro-copy { color: rgba(11,11,15,.6); font-size: 1.125rem; margin: 0; }

.mxb-root .mxb-stop {
  display: grid; grid-template-columns: 1fr; gap: 1.5rem; align-items: start;
  text-align: left; scroll-margin-top: 8rem; min-height: 100vh; padding: 6rem 0 5rem;
}
@media (min-width: 768px) {
  .mxb-root .mxb-stop {
    grid-template-columns: repeat(12, 1fr); gap: 3rem; align-items: center; min-height: 0; padding: 0;
  }
}
.mxb-root .mxb-stop-media { grid-column: span 1; }
.mxb-root .mxb-stop-body  { grid-column: span 1; }
@media (min-width: 768px) {
  .mxb-root .mxb-stop-media { grid-column: span 7; }
  .mxb-root .mxb-stop-body  { grid-column: span 5; }
  .mxb-root .mxb-stop[data-mxb-reverse="true"] .mxb-stop-media { order: 2; }
  .mxb-root .mxb-stop[data-mxb-reverse="true"] .mxb-stop-body  { order: 1; }
}
.mxb-root .mxb-stop-image-wrap {
  position: relative; overflow: hidden; border-radius: 12px;
  border: 1px solid rgba(11,11,15,.1); margin: 0; width: 100%; max-width: none;
}
@media (min-width: 768px) { .mxb-root .mxb-stop-image-wrap { margin: 0 auto; max-width: 360px; } }
@media (min-width: 1024px) { .mxb-root .mxb-stop-image-wrap { max-width: 420px; } }
.mxb-root .mxb-stop-image {
  width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: center center;
  max-height: 70vh; transition: transform .7s ease;
}
.mxb-root .mxb-stop:hover .mxb-stop-image { transform: scale(1.05); }
.mxb-root .mxb-stop-image-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: .5rem; color: #fff; text-align: center; padding: 1.5rem;
}
.mxb-root .mxb-stop-placeholder-n {
  font-size: clamp(3rem, 8vw, 5rem); font-weight: 800; line-height: 1; opacity: .9;
}
.mxb-root .mxb-stop-placeholder-name {
  font-size: .75rem; letter-spacing: .18em; text-transform: uppercase; opacity: .85;
}
.mxb-root .mxb-stop-location {
  display: block; font-size: .875rem; margin: 0 0 1rem; letter-spacing: .04em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.mxb-root .mxb-stop-title {
  font-size: clamp(2rem, 4vw, 3rem); line-height: .95; text-transform: uppercase;
  margin: 0 0 .75rem; font-weight: 800;
}
.mxb-root .mxb-stop-product {
  font-size: 12px; letter-spacing: .18em; text-transform: uppercase;
  font-weight: 700; color: #000; margin: 0 0 1.5rem;
}
.mxb-root .mxb-stop-copy {
  color: rgba(11,11,15,.6); max-width: 32rem; margin: 0 0 2rem; font-size: 1rem; line-height: 1.55;
}
.mxb-root .mxb-stop-copy p { margin: 0 0 .75rem; font-size: inherit; line-height: inherit; }
.mxb-root .mxb-stop-copy p:last-child { margin-bottom: 0; }
@media (min-width: 768px) { .mxb-root .mxb-stop-copy { font-size: 1.0625rem; } }
@media (min-width: 1024px) { .mxb-root .mxb-stop-copy { font-size: 1.125rem; } }

.mxb-root .mxb-connector { position: relative; height: 8rem; margin: -4rem 0; overflow: visible; }
@media (min-width: 768px) { .mxb-root .mxb-connector { height: 14rem; margin: 0; } }
.mxb-root .mxb-connector svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.mxb-root .mxb-station {
  position: absolute; width: 14px; height: 14px; border-radius: 999px;
  background: #fff; transform: translate(-50%, -50%);
}
.mxb-root .mxb-line-pill {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: inline-flex; align-items: center; gap: .375rem;
  background: #fff; border: 1px solid rgba(11,11,15,.15); color: var(--mxb-ink);
  padding: 2px 8px; border-radius: 999px;
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  box-shadow: 0 2px 10px -4px rgba(0,0,0,.25);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.mxb-root .mxb-line-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 999px; color: #fff; font-size: 10px; font-weight: 800; line-height: 1;
}
.mxb-root .mxb-line-arrow { color: rgba(11,11,15,.5); }

/* PARTNERSHIP */
.mxb-root .mxb-partnership {
  position: relative; z-index: 10; padding: 5rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05); overflow: hidden;
}
@media (min-width: 768px) { .mxb-root .mxb-partnership { padding: 7rem 1.5rem; } }
.mxb-root .mxb-partnership-glow { position: absolute; top: 0; bottom: 0; width: 55%; pointer-events: none; }
.mxb-root .mxb-partnership-glow-red {
  left: 0; background: radial-gradient(ellipse 60% 70% at 0% 50%, hsla(348, 83%, 47%, 0.28), transparent 65%);
}
.mxb-root .mxb-partnership-glow-blue {
  right: 0; background: radial-gradient(ellipse 60% 70% at 100% 50%, hsla(214, 100%, 30%, 0.32), transparent 65%);
}
.mxb-root .mxb-partnership-inner { position: relative; max-width: 56rem; margin: 0 auto; text-align: center; }
.mxb-root .mxb-lockup { display: block; width: 100%; max-width: 348px; height: auto; margin: 0 auto 2.5rem; }
@media (min-width: 640px) { .mxb-root .mxb-lockup { max-width: 428px; } }
@media (min-width: 768px) { .mxb-root .mxb-lockup { max-width: 509px; margin-bottom: 3rem; } }
.mxb-root .mxb-partnership-eyebrow {
  font-size: 0.625rem; letter-spacing: 0.25em; text-transform: uppercase;
  color: var(--mxb-gold-2); margin: 0 0 1rem;
}
@media (min-width: 640px) { .mxb-root .mxb-partnership-eyebrow { font-size: 0.75rem; } }
.mxb-root .mxb-partnership-title {
  font-weight: 800; font-size: clamp(2rem, 5vw, 3.5rem); line-height: 0.95;
  letter-spacing: -0.02em; text-transform: uppercase; margin: 0 0 1.5rem;
  color: var(--mxb-fg); text-wrap: balance;
}
.mxb-root .mxb-text-blue { color: #2f7fd4; }
.mxb-root .mxb-partnership-lede {
  max-width: 42rem; margin: 0 auto; font-size: 1rem; line-height: 1.6; color: rgba(245,245,245,0.7);
}
@media (min-width: 768px) { .mxb-root .mxb-partnership-lede { font-size: 1.125rem; } }
.mxb-root .mxb-stats {
  display: grid; grid-template-columns: 1fr; gap: 1rem; max-width: 48rem; margin: 3rem auto 0;
}
@media (min-width: 640px) {
  .mxb-root .mxb-stats { grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 4rem; }
}
.mxb-root .mxb-stat {
  position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03); border-radius: 0.75rem; padding: 1.75rem 1.5rem; text-align: left;
}
.mxb-root .mxb-stat::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--accent, var(--mxb-red));
}
.mxb-root .mxb-stat-red  { --accent: var(--mxb-red); }
.mxb-root .mxb-stat-blue { --accent: #2f7fd4; }
.mxb-root .mxb-stat-gold { --accent: var(--mxb-gold-2); }
.mxb-root .mxb-stat-value {
  display: block; font-weight: 800; font-size: clamp(1.75rem, 4vw, 2.75rem);
  line-height: 1; letter-spacing: -0.02em; margin-bottom: 0.5rem; color: var(--accent);
}
.mxb-root .mxb-stat-label {
  display: block; font-size: 0.6875rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(245,245,245,0.6);
}
`;
