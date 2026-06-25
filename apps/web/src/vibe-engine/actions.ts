import type { MediaTime } from "@/wasm";
import type { ElementRef } from "@/timeline/types";

/** Supported action types */
export type VibeActionType =
  | "apply_effect"
  | "add_transition"
  | "set_property"
  | "add_text"
  | "set_color_grade"
  | "apply_template"
  | "batch";

/** Parameter types for each action */
export interface ApplyEffectParams {
  elementId?: string;
  effectType: string;
  params?: Record<string, unknown>;
}

export interface AddTransitionParams {
  clipIdA?: string;
  clipIdB?: string;
  transitionType: string;
  duration: number; // seconds
  direction?: string;
}

export interface SetPropertyParams {
  elementId?: string;
  property: string;
  value: number;
}

export interface AddTextParams {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  startTime: number;
  duration: number;
}

export interface SetColorGradeParams {
  targetId?: string;
  saturation?: number;
  contrast?: number;
  brightness?: number;
  warmth?: number;
  look?: "none" | "teal_orange" | "vintage" | "mono" | "neon";
}

export interface ApplyTemplateParams {
  templateId: string;
  targetElementIds?: string[];
}

export interface BatchParams {
  actions: VibeAction[];
}

/** Discriminated union of all vibe actions */
export type VibeAction =
  | { type: "apply_effect"; params: ApplyEffectParams }
  | { type: "add_transition"; params: AddTransitionParams }
  | { type: "set_property"; params: SetPropertyParams }
  | { type: "add_text"; params: AddTextParams }
  | { type: "set_color_grade"; params: SetColorGradeParams }
  | { type: "apply_template"; params: ApplyTemplateParams }
  | { type: "batch"; params: BatchParams };

/** Result of executing a single action */
export interface VibeActionResult {
  action: VibeAction;
  success: boolean;
  error?: string;
  effectId?: string; // for apply_effect
  elementId?: string; // for add_text
}

/** Overall result of a vibe edit execution */
export interface VibeEditResult {
  total: number;
  succeeded: number;
  failed: number;
  results: VibeActionResult[];
  timestamp: number;
}

/** Validator for action params — returns errors if invalid */
export function validateAction(action: VibeAction): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  switch (action.type) {
    case "apply_effect":
      if (!action.params.effectType) errors.push("effectType is required");
      break;
    case "add_transition":
      if (!action.params.transitionType) errors.push("transitionType is required");
      if (!action.params.duration || action.params.duration <= 0) errors.push("duration must be > 0");
      break;
    case "set_property":
      if (!action.params.property) errors.push("property is required");
      break;
    case "add_text":
      if (!action.params.text) errors.push("text is required");
      if (!action.params.startTime || action.params.duration <= 0) errors.push("startTime and duration required");
      break;
    case "apply_template":
      if (!action.params.templateId) errors.push("templateId is required");
      break;
    case "batch":
      if (!action.params.actions || action.params.actions.length === 0) errors.push("batch requires at least one action");
      break;
    case "set_color_grade":
      break; // all params optional
  }
  return { valid: errors.length === 0, errors };
}
