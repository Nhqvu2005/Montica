import type { TransitionDefinition } from "../types";
import { transitionRegistry } from "../registry";

export const crossfadeTransitionDefinition: TransitionDefinition = {
  type: "crossfade",
  name: "Crossfade",
  description: "Smooth opacity blend from one clip to the next",
  keywords: ["crossfade", "fade", "dissolve", "blend", "smooth"],
  clipCount: 2,
  params: [
    {
      key: "easing",
      label: "Easing",
      type: "select",
      default: "smooth",
      options: [
        { value: "linear", label: "Linear" },
        { value: "smooth", label: "Smooth" },
        { value: "ease-in", label: "Ease In" },
        { value: "ease-out", label: "Ease Out" },
      ],
    },
  ],
};

export const wipeTransitionDefinition: TransitionDefinition = {
  type: "wipe",
  name: "Wipe",
  description: "A line wipes across the screen revealing the next clip",
  keywords: ["wipe", "slide", "reveal", "curtain"],
  clipCount: 2,
  params: [
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "left-to-right",
      options: [
        { value: "left-to-right", label: "Left to Right" },
        { value: "right-to-left", label: "Right to Left" },
        { value: "top-to-bottom", label: "Top to Bottom" },
        { value: "bottom-to-top", label: "Bottom to Top" },
      ],
    },
    {
      key: "softness",
      label: "Edge Softness",
      type: "number",
      default: 0.1,
      min: 0,
      max: 0.5,
      step: 0.05,
    },
  ],
};

export const glitchTransitionDefinition: TransitionDefinition = {
  type: "glitch",
  name: "Glitch",
  description: "Digital glitch effect transitions between clips",
  keywords: ["glitch", "digital", "error", "static", "corrupt", "cyberpunk"],
  clipCount: 2,
  params: [
    {
      key: "intensity",
      label: "Intensity",
      type: "number",
      default: 50,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "blockSize",
      label: "Block Size",
      type: "number",
      default: 20,
      min: 0,
      max: 100,
      step: 1,
    },
  ],
};

export const slideTransitionDefinition: TransitionDefinition = {
  type: "slide",
  name: "Slide",
  description: "The current clip slides off screen revealing the next clip",
  keywords: ["slide", "push", "move", "shift"],
  clipCount: 2,
  params: [
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "left-to-right",
      options: [
        { value: "left-to-right", label: "Left to Right" },
        { value: "right-to-left", label: "Right to Left" },
        { value: "top-to-bottom", label: "Top to Bottom" },
        { value: "bottom-to-top", label: "Bottom to Top" },
      ],
    },
    {
      key: "easing",
      label: "Easing",
      type: "select",
      default: "smooth",
      options: [
        { value: "linear", label: "Linear" },
        { value: "smooth", label: "Smooth" },
        { value: "bounce", label: "Bounce" },
      ],
    },
  ],
};

const defaultTransitions: TransitionDefinition[] = [
  crossfadeTransitionDefinition,
  wipeTransitionDefinition,
  glitchTransitionDefinition,
  slideTransitionDefinition,
];

export function registerDefaultTransitions(): void {
  for (const definition of defaultTransitions) {
    if (transitionRegistry.has(definition.type)) {
      continue;
    }
    transitionRegistry.register({
      key: definition.type,
      definition,
    });
  }
}
