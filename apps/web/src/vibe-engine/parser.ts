import type { LLMToolCall } from "@/services/llm/types";
import type { VibeAction } from "./actions";
import { getTemplateByName } from "./templates";
import { validateAction } from "./actions";

/**
 * Parse LLM tool calls into typed VibeAction array.
 * Skips invalid tool calls and logs errors.
 */
export function parseLLMToolCalls(toolCalls: LLMToolCall[]): VibeAction[] {
  const actions: VibeAction[] = [];

  for (const call of toolCalls) {
    const action = toolCallToAction(call);
    if (action) {
      const validation = validateAction(action);
      if (validation.valid) {
        actions.push(action);
      } else {
        console.warn(`[VibeEngine] Skipping invalid action ${call.name}:`, validation.errors);
      }
    }
  }

  return actions;
}

function toolCallToAction(call: LLMToolCall): VibeAction | null {
  const args = call.arguments;

  switch (call.name) {
    case "apply_effect":
      return {
        type: "apply_effect",
        params: {
          elementId: args.elementId as string | undefined,
          effectType: args.effectType as string,
          params: (args.params as Record<string, unknown>) ?? {},
        },
      };

    case "add_transition":
      return {
        type: "add_transition",
        params: {
          clipIdA: args.clipIdA as string | undefined,
          clipIdB: args.clipIdB as string | undefined,
          transitionType: args.transitionType as string,
          duration: args.duration as number,
          direction: args.direction as string | undefined,
        },
      };

    case "set_element_property":
      return {
        type: "set_property",
        params: {
          elementId: args.elementId as string | undefined,
          property: args.property as string,
          value: args.value as number,
        },
      };

    case "add_text_overlay":
      return {
        type: "add_text",
        params: {
          text: args.text as string,
          fontFamily: args.fontFamily as string | undefined,
          fontSize: args.fontSize as number | undefined,
          color: args.color as string | undefined,
          position: args.position as "center" | undefined,
          startTime: args.startTime as number,
          duration: args.duration as number,
        },
      };

    case "set_color_grade":
      return {
        type: "set_color_grade",
        params: {
          targetId: args.targetId as string | undefined,
          saturation: args.saturation as number | undefined,
          contrast: args.contrast as number | undefined,
          brightness: args.brightness as number | undefined,
          warmth: args.warmth as number | undefined,
          look: args.look as "none" | "teal_orange" | "vintage" | "mono" | "neon" | undefined,
        },
      };

    case "apply_template":
      return {
        type: "apply_template",
        params: {
          templateId: args.templateId as string,
          targetElementIds: args.targetElements as string[] | undefined,
        },
      };

    case "suggest_edit":
      // suggest_edit is pure text — no action needed
      return null;

    default:
      console.warn(`[VibeEngine] Unknown tool call: ${call.name}`);
      return null;
  }
}

/**
 * Try to detect a template name from free-form text (fallback when no tool calls).
 * Returns template ID or null.
 */
export function parseTemplateName(text: string): string | null {
  const lower = text.toLowerCase();

  // Direct template references
  const templatePatterns: Array<{ pattern: RegExp; templateId: string }> = [
    { pattern: /montica(\s+cyan)?/i, templateId: "montica-cyan" },
    { pattern: /(cyan|icy)\s+(mode|style|theme)/i, templateId: "montica-cyan" },
  ];

  for (const { pattern, templateId } of templatePatterns) {
    if (pattern.test(lower)) {
      return templateId;
    }
  }

  // Try fuzzy matching through template names
  const template = getTemplateByName(text);
  return template?.id ?? null;
}
