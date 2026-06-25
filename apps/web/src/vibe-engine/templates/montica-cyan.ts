import type { StyleTemplate } from "./index";

export const monticaCyanTemplate: StyleTemplate = {
  id: "montica-cyan",
  name: "Montica Cyan",
  description: "Cyan-accented modern look with subtle glitch and clean typography. Dark mode: cyan + black. Light mode: icy cyan + white.",
  tags: ["modern", "cyan", "clean", "tech", "default"],
  effects: [
    {
      effectType: "glitch",
      params: { intensity: 15, frequency: 10, distortion: 20, blockSize: 10 },
    },
    {
      effectType: "color_grade",
      params: { saturation: 10, contrast: 15, brightness: 5, warmth: -10, look: "neon" },
    },
  ],
  transitions: [
    {
      transitionType: "crossfade",
      duration: 0.5,
    },
  ],
  textStyle: {
    fontFamily: "Inter, sans-serif",
    fontSize: 18,
    color: "#00e5ff",
    position: "center",
  },
  colorScheme: {
    primary: "#00e5ff",
    secondary: "#0088cc",
    accent: "#00bcd4",
    background: "#0a0a0f",
    text: "#e0e0e0",
  },
};
