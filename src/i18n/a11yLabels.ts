import { useApp } from "../context/AppContext";

/**
 * Host-side labels for screen readers: the iframe titles and the modal's close
 * button. The viewer has no i18n library; these are the only strings it shows
 * to assistive tech in the component's language, so they live here.
 *
 * The 12 languages are the components' (smt-embedded-components
 * src/i18n/locales). Where a component already has a heading, the title reuses
 * its translation (Discover: discover.header.title, Rewards, Challenges,
 * Giveaways); the rest are ours.
 */
const COMPONENT_KEYS = [
  "discover",
  "rewards",
  "challenges",
  "giveaways",
  "card",
  "reward",
  "wearable",
  "map",
] as const;

export type ComponentKey = (typeof COMPONENT_KEYS)[number];

type Labels = Record<ComponentKey, string> & { close: string; embedded: string };

const LABELS: Record<string, Labels> = {
  ar: {
    discover: "اكسب واستبدل",
    rewards: "المكافآت",
    challenges: "التحديات",
    giveaways: "هدايا",
    card: "بطاقة",
    reward: "مكافأة",
    wearable: "فلتر الوجه",
    map: "الخريطة",
    close: "إغلاق",
    embedded: "محتوى مضمّن",
  },
  da: {
    discover: "Optjen & Indløs",
    rewards: "Belønninger",
    challenges: "Udfordringer",
    giveaways: "Giveaways",
    card: "Kort",
    reward: "Belønning",
    wearable: "Ansigtsfilter",
    map: "Kort",
    close: "Luk",
    embedded: "Indlejret indhold",
  },
  de: {
    discover: "Sammeln & Einlösen",
    rewards: "Prämien",
    challenges: "Herausforderungen",
    giveaways: "Gewinnspiele",
    card: "Karte",
    reward: "Prämie",
    wearable: "Gesichtsfilter",
    map: "Karte",
    close: "Schließen",
    embedded: "Eingebetteter Inhalt",
  },
  en: {
    discover: "Earn & Redeem",
    rewards: "Rewards",
    challenges: "Challenges",
    giveaways: "Giveaways",
    card: "Card",
    reward: "Reward",
    wearable: "Face filter",
    map: "Map",
    close: "Close",
    embedded: "Embedded content",
  },
  es: {
    discover: "Ganar y Canjear",
    rewards: "Recompensas",
    challenges: "Desafíos",
    giveaways: "Sorteos",
    card: "Tarjeta",
    reward: "Recompensa",
    wearable: "Filtro facial",
    map: "Mapa",
    close: "Cerrar",
    embedded: "Contenido integrado",
  },
  fr: {
    discover: "Gagner & Échanger",
    rewards: "Récompenses",
    challenges: "Défis",
    giveaways: "Jeux-concours",
    card: "Carte",
    reward: "Récompense",
    wearable: "Filtre visage",
    map: "Plan",
    close: "Fermer",
    embedded: "Contenu intégré",
  },
  id: {
    discover: "Kumpulkan & Tukarkan",
    rewards: "Hadiah",
    challenges: "Tantangan",
    giveaways: "Giveaway",
    card: "Kartu",
    reward: "Hadiah",
    wearable: "Filter wajah",
    map: "Peta",
    close: "Tutup",
    embedded: "Konten tersemat",
  },
  it: {
    discover: "Guadagna e Riscatta",
    rewards: "Premi",
    challenges: "Sfide",
    giveaways: "Concorsi",
    card: "Carta",
    reward: "Premio",
    wearable: "Filtro viso",
    map: "Mappa",
    close: "Chiudi",
    embedded: "Contenuto incorporato",
  },
  ja: {
    discover: "獲得して交換",
    rewards: "リワード",
    challenges: "チャレンジ",
    giveaways: "プレゼント",
    card: "カード",
    reward: "リワード",
    wearable: "フェイスフィルター",
    map: "マップ",
    close: "閉じる",
    embedded: "埋め込みコンテンツ",
  },
  ko: {
    discover: "적립 & 교환",
    rewards: "리워드",
    challenges: "챌린지",
    giveaways: "경품 이벤트",
    card: "카드",
    reward: "리워드",
    wearable: "얼굴 필터",
    map: "지도",
    close: "닫기",
    embedded: "삽입된 콘텐츠",
  },
  nl: {
    discover: "Verdienen en inwisselen",
    rewards: "Beloningen",
    challenges: "Uitdagingen",
    giveaways: "Weggeefacties",
    card: "Kaart",
    reward: "Beloning",
    wearable: "Gezichtsfilter",
    map: "Kaart",
    close: "Sluiten",
    embedded: "Ingesloten inhoud",
  },
  pt: {
    discover: "Ganhar e Resgatar",
    rewards: "Recompensas",
    challenges: "Desafios",
    giveaways: "Sorteios",
    card: "Cartão",
    reward: "Recompensa",
    wearable: "Filtro facial",
    map: "Mapa",
    close: "Fechar",
    embedded: "Conteúdo incorporado",
  },
};

/** The component an iframe URL loads: the last path segment that names one. */
export function componentKeyOf(src: string): ComponentKey | null {
  let segments: string[];
  try {
    segments = new URL(src).pathname.split("/").filter(Boolean);
  } catch {
    return null;
  }
  const key = segments.reverse().find((s) => (COMPONENT_KEYS as readonly string[]).includes(s));
  return (key as ComponentKey | undefined) ?? null;
}

/**
 * The labels in the components' language: the viewer's explicit `?lang=`, or
 * English when none is set.
 */
export function useA11yLabels(): { lang: string; labels: Labels } {
  const { explicitLang } = useApp();
  // "pt-BR" → "pt": the components' locales are per language, not region.
  const base = explicitLang?.split("-")[0].toLowerCase();
  const lang = base && LABELS[base] ? base : "en";
  return { lang, labels: LABELS[lang] };
}
