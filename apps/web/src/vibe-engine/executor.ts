import type { EditorCore } from "@/core";
import type { ElementRef } from "@/timeline/types";
import type { SceneTracks } from "@/timeline";
import { buildTextElement, buildEffectElement } from "@/timeline/element-utils";
import { findTrackInSceneTracks } from "@/timeline/track-element-update";
import { ZERO_MEDIA_TIME, mediaTimeFromSeconds } from "@/wasm";
import type { VibeAction, VibeActionResult, VibeEditResult } from "./actions";
import { getTemplate, resolveTemplateToActions } from "./templates";

/**
 * Get the currently selected elements from the editor.
 * Falls back to first video element in main track if nothing selected.
 */
export function resolveActiveElements(editor: EditorCore): ElementRef[] {
  const selected = editor.selection.getSelectedElements();
  if (selected.length > 0) return selected;

  // Fallback: get the first visual element on the main track
  const scene = editor.scenes.getActiveSceneOrNull();
  if (!scene) return [];

  const mainTrack = scene.tracks.main;
  const firstVisual = mainTrack.elements.find(
    (el) => el.type === "video" || el.type === "image",
  );
  if (firstVisual) {
    return [{ trackId: mainTrack.id, elementId: firstVisual.id }];
  }

  // Fallback: any element on the main track
  if (mainTrack.elements.length > 0) {
    return [{ trackId: mainTrack.id, elementId: mainTrack.elements[0].id }];
  }

  return [];
}

/**
 * Find which track an element belongs to.
 */
export function findTrackForElement(
  editor: EditorCore,
  elementId: string,
): { trackId: string } | null {
  const scene = editor.scenes.getActiveSceneOrNull();
  if (!scene) return null;

  const tracks = scene.tracks;

  // Check main track
  if (tracks.main.elements.some((el) => el.id === elementId)) {
    return { trackId: tracks.main.id };
  }

  // Check overlay tracks
  for (const track of tracks.overlay) {
    if (track.elements.some((el) => el.id === elementId)) {
      return { trackId: track.id };
    }
  }

  // Check audio tracks
  for (const track of tracks.audio) {
    if (track.elements.some((el) => el.id === elementId)) {
      return { trackId: track.id };
    }
  }

  return null;
}

/**
 * Execute a single vibe action on the editor.
 */
function executeAction(
  action: VibeAction,
  editor: EditorCore,
): VibeActionResult {
  try {
    switch (action.type) {
      case "apply_effect": {
        const { elementId, effectType, params } = action.params;
        let targetElId = elementId;

        // Auto-resolve element if not specified
        if (!targetElId) {
          const elements = resolveActiveElements(editor);
          if (elements.length === 0) {
            return { action, success: false, error: "No element found on timeline" };
          }
          targetElId = elements[0].elementId;
        }

        // Find track for element
        const track = findTrackForElement(editor, targetElId);
        if (!track) {
          return { action, success: false, error: `Element ${targetElId} not found` };
        }

        // Add effect
        const effectId = editor.timeline.addClipEffect({
          trackId: track.trackId,
          elementId: targetElId,
          effectType,
        });

        // If no params to update, we're done
        if (!params || Object.keys(params).length === 0 || !effectId) {
          return { action, success: true, effectId };
        }

        // Update effect params
        editor.timeline.updateClipEffectParams({
          trackId: track.trackId,
          elementId: targetElId,
          effectId,
          params: params as Record<string, string | number | boolean>,
        });

        return { action, success: true, effectId };
      }

      case "add_transition": {
        const { clipIdA, clipIdB, transitionType, duration } = action.params;

        if (!clipIdA) {
          return { action, success: false, error: "clipIdA is required" };
        }

        // For MVP: transitions are represented as effect elements between clips.
        // Insert a transition effect element at the clip boundary.
        // In future: use the Transition pipeline once WASM compositor supports it.

        const scene = editor.scenes.getActiveSceneOrNull();
        if (!scene) {
          return { action, success: false, error: "No active scene" };
        }

        const trackRef = findTrackForElement(editor, clipIdA);
        if (!trackRef) {
          return { action, success: false, error: `Clip ${clipIdA} not found` };
        }

        const transitionName = `transition_${transitionType}`;

        // Use addClipEffect on clipIdA with the transition as a special effect
        // This is a simplified approach — full transition rendering requires
        // compositor-level cross-clip blending.
        const effectId = editor.timeline.addClipEffect({
          trackId: trackRef.trackId,
          elementId: clipIdA,
          effectType: transitionName,
        });

        return {
          action,
          success: true,
          effectId,
          error: "Transition applied as clip effect (full cross-clip rendering pending compositor support)",
        };
      }

      case "set_property": {
        const { elementId, property, value } = action.params;
        let targetElId = elementId;

        if (!targetElId) {
          const elements = resolveActiveElements(editor);
          if (elements.length === 0) {
            return { action, success: false, error: "No element found" };
          }
          targetElId = elements[0].elementId;
        }

        const track = findTrackForElement(editor, targetElId);
        if (!track) {
          return { action, success: false, error: `Element ${targetElId} not found` };
        }

        // Map property names to element params
        const paramKey = property.startsWith("transform.")
          ? property
          : `transform.${property}`;

        editor.timeline.updateElements({
          updates: [
            {
              trackId: track.trackId,
              elementId: targetElId,
              patch: {
                params: { [paramKey]: value },
              } as Partial<import("@/timeline").TimelineElement>,
            },
          ],
        });

        return { action, success: true };
      }

      case "add_text": {
        const { text, fontFamily, fontSize, color, position, startTime, duration } = action.params;

        const scene = editor.scenes.getActiveSceneOrNull();
        if (!scene) {
          return { action, success: false, error: "No active scene" };
        }

        // Build text params
        const textParams: Record<string, string | number | boolean> = {
          content: text,
        };
        if (fontFamily) textParams.fontFamily = fontFamily;
        if (fontSize) textParams.fontSize = fontSize;
        if (color) textParams.color = color;

        if (position) {
          const positions: Record<string, { x: number; y: number }> = {
            "center": { x: 0, y: 0 },
            "top-left": { x: -0.4, y: -0.4 },
            "top-right": { x: 0.4, y: -0.4 },
            "bottom-left": { x: -0.4, y: 0.4 },
            "bottom-right": { x: 0.4, y: 0.4 },
          };
          const pos = positions[position] ?? positions.center;
          textParams["transform.positionX"] = pos.x;
          textParams["transform.positionY"] = pos.y;
        }

        // Build element
        const element = buildTextElement({
          raw: {
            name: `Text: ${text.slice(0, 20)}`,
            duration: mediaTimeFromSeconds({ seconds: duration }),
            params: textParams,
          },
          startTime: mediaTimeFromSeconds({ seconds: startTime }),
        });

        // Insert into an overlay text track (first available or auto-create)
        const textTrack = scene.tracks.overlay.find((t) => t.type === "text");
        if (textTrack) {
          editor.timeline.insertElement({
            element,
            placement: { mode: "explicit", trackId: textTrack.id },
          });
        } else {
          editor.timeline.insertElement({
            element,
            placement: { mode: "auto", trackType: "text" },
          });
        }

        return { action, success: true };
      }

      case "set_color_grade": {
        const { targetId, saturation, contrast, brightness, warmth, look } = action.params;
        let targetElId = targetId;

        if (!targetElId || targetElId === "project") {
          // Apply to all elements or first selected
          const elements = resolveActiveElements(editor);
          if (elements.length === 0) {
            return { action, success: false, error: "No element found" };
          }
          targetElId = elements[0].elementId;
        }

        const track = findTrackForElement(editor, targetElId);
        if (!track) {
          return { action, success: false, error: `Element ${targetElId} not found` };
        }

        // Add color_grade effect
        const effectId = editor.timeline.addClipEffect({
          trackId: track.trackId,
          elementId: targetElId,
          effectType: "color_grade",
        });

        if (!effectId) {
          return { action, success: false, error: "Failed to add color_grade effect" };
        }

        // Build params (only non-undefined values)
        const params: Record<string, string | number | boolean> = {};
        if (saturation !== undefined) params.saturation = saturation * 100; // scale -1..1 to -100..100
        if (contrast !== undefined) params.contrast = contrast * 100;
        if (brightness !== undefined) params.brightness = brightness * 100;
        if (warmth !== undefined) params.warmth = warmth * 100;
        if (look !== undefined) params.look = look;

        if (Object.keys(params).length > 0) {
          editor.timeline.updateClipEffectParams({
            trackId: track.trackId,
            elementId: targetElId,
            effectId,
            params,
          });
        }

        return { action, success: true, effectId };
      }

      case "apply_template": {
        const { templateId, targetElementIds } = action.params;
        const template = getTemplate(templateId);

        if (!template) {
          return { action, success: false, error: `Template "${templateId}" not found` };
        }

        // Resolve target elements
        let targets: ElementRef[];
        if (targetElementIds && targetElementIds.length > 0) {
          targets = targetElementIds
            .map((id) => {
              const track = findTrackForElement(editor, id);
              return track ? { trackId: track.trackId, elementId: id } : null;
            })
            .filter((t): t is ElementRef => t !== null);
        } else {
          targets = resolveActiveElements(editor);
        }

        if (targets.length === 0) {
          return { action, success: false, error: "No target elements" };
        }

        // Resolve template to actions and execute recursively
        const subActions = resolveTemplateToActions(template, targets);
        if (subActions.length === 0) {
          return { action, success: true, error: "Template resolved to 0 actions" };
        }

        const subResults = executeActions(subActions, editor);
        const allSucceeded = subResults.every((r) => r.success);

        return {
          action,
          success: allSucceeded,
          error: allSucceeded
            ? undefined
            : `${subResults.filter((r) => !r.success).length} sub-actions failed`,
        };
      }

      case "batch": {
        const subActions = action.params.actions;
        if (subActions.length === 0) {
          return { action, success: true };
        }

        const subResults = executeActions(subActions, editor);
        const allSucceeded = subResults.every((r) => r.success);

        return {
          action,
          success: allSucceeded,
          error: allSucceeded
            ? undefined
            : `${subResults.filter((r) => !r.success).length} sub-actions failed`,
        };
      }

      default:
        return { action, success: false, error: `Unknown action type` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[VibeEngine] Action failed:`, error);
    return { action, success: false, error: message };
  }
}

/**
 * Execute all vibe actions sequentially.
 * Returns detailed results for each action.
 */
function executeActions(
  actions: VibeAction[],
  editor: EditorCore,
): VibeActionResult[] {
  return actions.map((action) => executeAction(action, editor));
}

/**
 * Main entry: execute all vibe actions and return a summary result.
 * All actions are executed sequentially for predictable undo behavior.
 */
export function executeVibeActions(
  actions: VibeAction[],
  editor: EditorCore,
): VibeEditResult {
  const results = executeActions(actions, editor);

  return {
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    timestamp: Date.now(),
  };
}
