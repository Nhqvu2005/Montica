import type { VibeAction } from "../actions";
import { monticaCyanTemplate } from "./montica-cyan";

export type StyleTemplate = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  effects: Array<{
    effectType: string;
    params: Record<string, unknown>;
  }>;
  transitions: Array<{
    transitionType: string;
    duration: number;
    direction?: string;
  }>;
  textStyle?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    position?: string;
  };
  colorScheme?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
};

const defaultTemplates: StyleTemplate[] = [
  monticaCyanTemplate,
];

const templateRegistry = new Map<string, StyleTemplate>();

// Initialize registry
for (const template of defaultTemplates) {
  templateRegistry.set(template.id, template);
}

export function getTemplate(id: string): StyleTemplate | undefined {
  return templateRegistry.get(id);
}

export function getTemplateByName(name: string): StyleTemplate | undefined {
  const lower = name.toLowerCase();
  return defaultTemplates.find(
    (t) =>
      t.id.toLowerCase().includes(lower) ||
      t.name.toLowerCase().includes(lower) ||
      t.tags.some((tag) => tag.includes(lower)),
  );
}

export function getAllTemplates(): StyleTemplate[] {
  return defaultTemplates;
}

export function registerTemplate(template: StyleTemplate): void {
  templateRegistry.set(template.id, template);
}

/** Expand a template into concrete VibeActions targeting specific elements */
export function resolveTemplateToActions(
  template: StyleTemplate,
  targetElements: Array<{ trackId: string; elementId: string }>,
): VibeAction[] {
  const actions: VibeAction[] = [];

  for (const target of targetElements) {
    // Add effects from template
    for (const effect of template.effects) {
      actions.push({
        type: "apply_effect",
        params: {
          elementId: target.elementId,
          effectType: effect.effectType,
          params: effect.params,
        },
      });
    }

    // Add transitions
    for (const transition of template.transitions) {
      actions.push({
        type: "add_transition",
        params: {
          clipIdA: target.elementId,
          transitionType: transition.transitionType,
          duration: transition.duration,
          direction: transition.direction,
        },
      });
    }

    // Add text style overlay if defined
    if (template.textStyle) {
      actions.push({
        type: "add_text",
        params: {
          text: "",
          fontFamily: template.textStyle.fontFamily,
          fontSize: template.textStyle.fontSize,
          color: template.textStyle.color,
          position: template.textStyle.position as "center",
          startTime: 0,
          duration: 5,
        },
      });
    }
  }

  return actions;
}
