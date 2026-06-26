import { BaseNode } from "./base-node";
import type { TransitionType } from "@/transitions/types";

export type TransitionNodeParams = {
	transitionType: TransitionType;
	overlapStart: number; // time when transition begins
	overlapEnd: number; // time when transition ends
	direction?: string;
};

/**
 * Per-frame resolved state for a transition.
 * `progress` goes from 0→1 over [overlapStart, overlapEnd].
 */
export type ResolvedTransitionState = {
	progress: number;
	time: number;
};

export class TransitionNode extends BaseNode<
	TransitionNodeParams,
	ResolvedTransitionState
> {
	get overlapStart(): number {
		return this.params.overlapStart;
	}

	get overlapEnd(): number {
		return this.params.overlapEnd;
	}
}
