import { useEffect, useState } from "react";

const THEME_KEY = "queenema_theme";

export const THEMES = [
  {
    id: "noir",
    label: "Noir",
    vars: {
      "--ink": "#0a0b0f",
      "--foam": "#f2efe8",
      "--mist": "rgba(242, 239, 232, 0.55)",
      "--gold": "#d6b36a",
      "--gold-soft": "rgba(214, 179, 106, 0.18)",
      "--line": "rgba(242, 239, 232, 0.1)",
      "--accent": "#d6b36a",
      "--red": "#c45c5c",
      "--green": "#6fb89a",
      "--stage-a": "rgba(214, 179, 106, 0.16)",
      "--stage-b": "rgba(111, 184, 154, 0.08)",
      "--stage-top": "#12141c",
    },
  },
  {
    id: "ink",
    label: "Ink",
    vars: {
      "--ink": "#0c1218",
      "--foam": "#e8eef4",
      "--mist": "rgba(232, 238, 244, 0.55)",
      "--gold": "#7eb6d9",
      "--gold-soft": "rgba(126, 182, 217, 0.18)",
      "--line": "rgba(232, 238, 244, 0.1)",
      "--accent": "#7eb6d9",
      "--red": "#d07a7a",
      "--green": "#6fb89a",
      "--stage-a": "rgba(126, 182, 217, 0.16)",
      "--stage-b": "rgba(90, 120, 160, 0.1)",
      "--stage-top": "#101820",
    },
  },
  {
    id: "ember",
    label: "Ember",
    vars: {
      "--ink": "#120c0a",
      "--foam": "#f6efe8",
      "--mist": "rgba(246, 239, 232, 0.55)",
      "--gold": "#e0a070",
      "--gold-soft": "rgba(224, 160, 112, 0.18)",
      "--line": "rgba(246, 239, 232, 0.1)",
      "--accent": "#e0a070",
      "--red": "#c45c5c",
      "--green": "#8fb89a",
      "--stage-a": "rgba(224, 160, 112, 0.18)",
      "--stage-b": "rgba(160, 70, 50, 0.1)",
      "--stage-top": "#1a1210",
    },
  },
  {
    id: "mist",
    label: "Mist",
    vars: {
      "--ink": "#f4f1ea",
      "--foam": "#1a1814",
      "--mist": "rgba(26, 24, 20, 0.5)",
      "--gold": "#7a6240",
      "--gold-soft": "rgba(122, 98, 64, 0.15)",
      "--line": "rgba(26, 24, 20, 0.1)",
      "--accent": "#7a6240",
      "--red": "#a04545",
      "--green": "#3d7a62",
      "--stage-a": "rgba(122, 98, 64, 0.12)",
      "--stage-b": "rgba(180, 170, 150, 0.2)",
      "--stage-top": "#ebe6dc",
    },
  },
];

export function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.theme = theme.id;
  localStorage.setItem(THEME_KEY, theme.id);
  return theme.id;
}

export function useTheme() {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "noir";
    } catch {
      return "noir";
    }
  });

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  return {
    themeId,
    themes: THEMES,
    setTheme: setThemeId,
  };
}
