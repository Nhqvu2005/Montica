import type { ParamDefinition, ParamValues } from "@/params";

export type TransitionType = "crossfade" | "wipe" | "glitch" | "slide";

export interface TransitionInstance {
  id: string;
  type: TransitionType;
  clipAId: string;
  clipBId?: string;
  duration: number; // in seconds
  direction?: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top";
  params: ParamValues;
  enabled: boolean;
}

export interface TransitionDefinition {
  type: string;
  name: string;
  description: string;
  keywords: string[];
  params: ParamDefinition[];
  /** Optional: how many clips this transition needs (1 = tail/out transition, 2 = between clips) */
  clipCount: 1 | 2;
}

export interface TransitionPass {
  shader: string;
  uniforms: Record<string, unknown>;
}

export interface TransitionRendererConfig {
  shader: string;
  uniforms(params: {
    transitionParams: ParamValues;
    progress: number; // 0 to 1
    resolution: { width: number; height: number };
  }): Record<string, unknown>;
}

export type TransitionRegistry = Map<string, TransitionDefinition>;
