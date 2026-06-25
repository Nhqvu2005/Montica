import { DefinitionRegistry } from "@/params/registry";
import type { TransitionDefinition } from "./types";

export class TransitionRegistry extends DefinitionRegistry<string, TransitionDefinition> {
  constructor() {
    super("transition");
  }
}

export const transitionRegistry = new TransitionRegistry();
