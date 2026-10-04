export const THEME_IDS = ["classic", "confetti", "garden", "midnight", "playful", "minimal"] as const;

export type ThemeId = (typeof THEME_IDS)[number];
export type DisplayFont = "fraunces" | "fredoka" | "inter";

export type InviteTheme = {
  id: ThemeId;
  label: string;
  description: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  soft: string;
  paper: string;
  frame: string;
  display: DisplayFont;
  dark: boolean;
};

export const THEMES: Record<ThemeId, InviteTheme> = {
  classic: {
    id: "classic",
    label: "Classic",
    description: "Wine and cream",
    ink: "#2c1810",
    muted: "#6d5648",
    accent: "#9a3048",
    accentInk: "#ffffff",
    soft: "#f8e7ec",
    paper: "#fbf6ee",
    frame: "#3b1d2a",
    display: "fraunces",
    dark: false,
  },
  confetti: {
    id: "confetti",
    label: "Confetti",
    description: "Birthdays and bright nights",
    ink: "#2a1848",
    muted: "#6d5a86",
    accent: "#d61f78",
    accentInk: "#ffffff",
    soft: "#ffe3f1",
    paper: "#fff8fc",
    frame: "#4c1d95",
    display: "fredoka",
    dark: false,
  },
  garden: {
    id: "garden",
    label: "Garden",
    description: "Soft greens",
    ink: "#1a3324",
    muted: "#4d6656",
    accent: "#1f7a45",
    accentInk: "#ffffff",
    soft: "#e3f5e8",
    paper: "#f4faf4",
    frame: "#1c3d2c",
    display: "fraunces",
    dark: false,
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    description: "Dark with gold",
    ink: "#f7efd8",
    muted: "#cbb98a",
    accent: "#e4c36a",
    accentInk: "#1a1408",
    soft: "#3a3120",
    paper: "#17151d",
    frame: "#0c0b10",
    display: "fraunces",
    dark: true,
  },
  playful: {
    id: "playful",
    label: "Playful",
    description: "Kids and color",
    ink: "#1d2a4d",
    muted: "#5c6b8a",
    accent: "#ef5b2a",
    accentInk: "#ffffff",
    soft: "#ffefe6",
    paper: "#fffaf4",
    frame: "#2f6fed",
    display: "fredoka",
    dark: false,
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Quiet and modern",
    ink: "#1a1a1a",
    muted: "#5c5c5c",
    accent: "#1a1a1a",
    accentInk: "#ffffff",
    soft: "#f2f2f2",
    paper: "#ffffff",
    frame: "#ececec",
    display: "inter",
    dark: false,
  },
};

export const THEME_LIST: InviteTheme[] = THEME_IDS.map((id) => THEMES[id]);

export function themeById(value: string | null | undefined): InviteTheme {
  if (value && Object.prototype.hasOwnProperty.call(THEMES, value)) {
    return THEMES[value as ThemeId];
  }
  return THEMES.classic;
}

export function displayFontFamily(display: DisplayFont) {
  if (display === "fredoka") return "Fredoka";
  if (display === "inter") return "Inter";
  return "Fraunces";
}
