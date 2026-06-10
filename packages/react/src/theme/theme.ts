/** Theme tokens shared by every platform. Plain data so it works on web & native. */

export interface Theme {
  dark: boolean;
  colors: {
    text: string;
    textSecondary: string;
    background: string;
    backgroundSecondary: string;
    border: string;
    accent: string;
    accentSoft: string;
    onAccent: string;
    placeholder: string;
    selection: string;
    code: string;
    codeBackground: string;
    menuBackground: string;
    menuHover: string;
    quoteBar: string;
    divider: string;
  };
  /** Named text colors usable as inline `textColor`. */
  textColors: Record<string, string>;
  /** Named highlight colors usable as inline `backgroundColor`. */
  highlightColors: Record<string, string>;
  fontFamily: string;
  monoFamily: string;
  radius: number;
}

const textColors = {
  default: "inherit",
  gray: "#787774",
  brown: "#9f6b53",
  red: "#e03e3e",
  orange: "#d9730d",
  yellow: "#cb912f",
  green: "#4d6461",
  blue: "#337ea9",
  purple: "#9065b0",
  pink: "#c14c8a",
};

const highlightColors = {
  default: "transparent",
  gray: "#ebeced",
  brown: "#e9e5e3",
  red: "#fdebec",
  orange: "#fbecdd",
  yellow: "#fbf3db",
  green: "#edf3ec",
  blue: "#e7f3f8",
  purple: "#f6f3f9",
  pink: "#faf1f5",
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    text: "#37352f",
    textSecondary: "#787774",
    background: "#ffffff",
    backgroundSecondary: "#f7f6f3",
    border: "#e9e9e7",
    accent: "#2383e2",
    accentSoft: "#e7f1fb",
    onAccent: "#ffffff",
    placeholder: "#b9b9b7",
    selection: "#d3e5fb",
    code: "#eb5757",
    codeBackground: "#f1f1ef",
    menuBackground: "#ffffff",
    menuHover: "#f1f1ef",
    quoteBar: "#37352f",
    divider: "#e9e9e7",
  },
  textColors,
  highlightColors,
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  monoFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  radius: 6,
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    text: "#e6e6e5",
    textSecondary: "#9b9a97",
    background: "#191919",
    backgroundSecondary: "#202020",
    border: "#2f2f2f",
    accent: "#529cca",
    accentSoft: "#1c2b36",
    onAccent: "#ffffff",
    placeholder: "#5a5a58",
    selection: "#2b4b6f",
    code: "#ff7b72",
    codeBackground: "#2b2b2b",
    menuBackground: "#252525",
    menuHover: "#2f2f2f",
    quoteBar: "#9b9a97",
    divider: "#2f2f2f",
  },
  textColors: {
    ...textColors,
    default: "inherit",
    gray: "#979a9b",
    blue: "#5e87c9",
  },
  highlightColors: {
    default: "transparent",
    gray: "#2f2f2f",
    brown: "#4a3228",
    red: "#522e2a",
    orange: "#5c3b23",
    yellow: "#56452f",
    green: "#243d30",
    blue: "#143a4e",
    purple: "#3c2d49",
    pink: "#4e2c3c",
  },
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  monoFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  radius: 6,
};
