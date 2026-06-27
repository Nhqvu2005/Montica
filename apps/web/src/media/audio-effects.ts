import type { ParamValues } from "@/params";

// ── Types ────────────────────────────────────────────────────────────────

export type AudioEffectType = "eq" | "compressor" | "reverb";

/**
 * Per-element audio effect instance (mirrors the visual Effect shape but
 * targets the Web Audio API node graph instead of WGSL shaders).
 */
export interface AudioEffect {
	id: string;
	type: AudioEffectType;
	params: AudioEffectParams;
	enabled: boolean;
}

/** Type-level union of every effect's param shape. */
export type AudioEffectParams = ParamValues;

/**
 * Factory that creates an internal Web Audio node chain for one effect.
 *
 * @param audioContext – the context to create nodes from
 * @param params       – resolved effect parameters
 * @param input        – the upstream node to connect to
 * @returns the **last** node in the internal chain (callers connect this to
 *          the next effect or to the clip gain node).
 */
export type AudioEffectNodeFactory = (
	audioContext: BaseAudioContext,
	params: AudioEffectParams,
	input: AudioNode,
) => AudioNode;

export interface AudioEffectDefinition {
	type: AudioEffectType;
	name: string;
	/** Human-readable parameter definitions for the UI (stored here so the
	 *  registry is the single source of truth). */
	params: Array<{
		key: string;
		label: string;
		type: "number" | "boolean";
		default: number | boolean;
		min?: number;
		max?: number;
		step?: number;
	}>;
	createNodes: AudioEffectNodeFactory;
}

// ── Registry ─────────────────────────────────────────────────────────────

class AudioEffectRegistry {
	private definitions = new Map<AudioEffectType, AudioEffectDefinition>();

	register(def: AudioEffectDefinition): void {
		this.definitions.set(def.type, def);
	}

	get(type: AudioEffectType): AudioEffectDefinition | undefined {
		return this.definitions.get(type);
	}

	getAll(): AudioEffectDefinition[] {
		return [...this.definitions.values()];
	}
}

export const audioEffectRegistry = new AudioEffectRegistry();

// ── EQ (3-band) ──────────────────────────────────────────────────────────

const EQ_PARAMS = [
	{ key: "lowGain", label: "Low Gain", type: "number" as const, default: 0, min: -20, max: 20, step: 0.5 },
	{ key: "midFreq", label: "Mid Frequency", type: "number" as const, default: 1000, min: 200, max: 8000, step: 10 },
	{ key: "midGain", label: "Mid Gain", type: "number" as const, default: 0, min: -20, max: 20, step: 0.5 },
	{ key: "highGain", label: "High Gain", type: "number" as const, default: 0, min: -20, max: 20, step: 0.5 },
];

const createEqNodes: AudioEffectNodeFactory = (_ctx, params, input) => {
	const lowShelf = _ctx.createBiquadFilter();
	lowShelf.type = "lowshelf";
	lowShelf.frequency.value = 300;
	lowShelf.gain.value = clampParam(params.lowGain, -20, 20);

	const peaking = _ctx.createBiquadFilter();
	peaking.type = "peaking";
	peaking.frequency.value = clampParam(params.midFreq, 200, 8000);
	peaking.Q.value = 1;
	peaking.gain.value = clampParam(params.midGain, -20, 20);

	const highShelf = _ctx.createBiquadFilter();
	highShelf.type = "highshelf";
	highShelf.frequency.value = 5000;
	highShelf.gain.value = clampParam(params.highGain, -20, 20);

	input.connect(lowShelf);
	lowShelf.connect(peaking);
	peaking.connect(highShelf);
	return highShelf;
};

// ── Compressor ───────────────────────────────────────────────────────────

const COMPRESSOR_PARAMS = [
	{ key: "threshold", label: "Threshold", type: "number" as const, default: -24, min: -60, max: 0, step: 1 },
	{ key: "ratio", label: "Ratio", type: "number" as const, default: 4, min: 1, max: 20, step: 0.5 },
	{ key: "attack", label: "Attack", type: "number" as const, default: 0.003, min: 0, max: 1, step: 0.001 },
	{ key: "release", label: "Release", type: "number" as const, default: 0.25, min: 0, max: 1, step: 0.01 },
	{ key: "knee", label: "Knee", type: "number" as const, default: 0, min: 0, max: 40, step: 1 },
];

const createCompressorNodes: AudioEffectNodeFactory = (_ctx, params, input) => {
	const compressor = _ctx.createDynamicsCompressor();
	compressor.threshold.value = clampParam(params.threshold, -60, 0);
	compressor.ratio.value = clampParam(params.ratio, 1, 20);
	compressor.attack.value = clampParam(params.attack, 0, 1);
	compressor.release.value = clampParam(params.release, 0, 1);
	compressor.knee.value = clampParam(params.knee, 0, 40);

	input.connect(compressor);
	return compressor;
};

// ── Reverb ───────────────────────────────────────────────────────────────

const REVERB_PARAMS = [
	{ key: "decay", label: "Decay", type: "number" as const, default: 2, min: 0.1, max: 10, step: 0.1 },
	{ key: "mix", label: "Mix", type: "number" as const, default: 30, min: 0, max: 100, step: 1 },
];

/**
 * Generate an impulse response buffer for the reverb convolver.
 *
 * Creates white noise shaped by an exponential decay envelope. The result is
 * a stereo buffer that sounds like a natural room tail when convolved.
 */
function generateImpulseResponse(
	audioContext: BaseAudioContext,
	decaySeconds: number,
): AudioBuffer {
	const sampleRate = audioContext.sampleRate;
	const length = Math.ceil(sampleRate * decaySeconds);
	const buffer = audioContext.createBuffer(2, length, sampleRate);

	for (let channel = 0; channel < 2; channel++) {
		const data = buffer.getChannelData(channel);
		for (let i = 0; i < length; i++) {
			const t = i / sampleRate;
			// Exponentially-decaying noise; add a tiny bit of early reflection
			// energy by skewing the decay curve.
			const envelope = Math.exp(-3 * t / decaySeconds);
			// Two uncorrelated noise seeds per channel for stereo spread
			const noise = (channel === 0 ? seededRandom(i * 2) : seededRandom(i * 2 + 1)) * 2 - 1;
			data[i] = noise * envelope;
		}
	}

	return buffer;
}

/** Simple deterministic pseudo-random for reproducible IR generation. */
function seededRandom(seed: number): number {
	const x = Math.sin(seed * 9301 + 49297) * 49297;
	return x - Math.floor(x);
}

const createReverbNodes: AudioEffectNodeFactory = (_ctx, params, input) => {
	const mix = clampParam(params.mix, 0, 100) / 100;
	const decay = clampParam(params.decay, 0.1, 10);

	// Dry path
	const dryGain = _ctx.createGain();
	dryGain.gain.value = 1 - mix;

	// Wet path
	const wetGain = _ctx.createGain();
	wetGain.gain.value = mix;

	const convolver = _ctx.createConvolver();
	convolver.buffer = generateImpulseResponse(_ctx, decay);

	// Mix bus – sums dry + wet
	const output = _ctx.createGain();

	input.connect(dryGain);
	dryGain.connect(output);

	input.connect(wetGain);
	wetGain.connect(convolver);
	convolver.connect(output);

	return output;
};

// ── Default parameter helpers ────────────────────────────────────────────

/** Returns the default params for a given effect type. */
export function getDefaultAudioEffectParams(type: AudioEffectType): AudioEffectParams {
	const def = audioEffectRegistry.get(type);
	if (!def) return {};
	const entries = def.params.map((p) => [p.key, p.default]);
	return Object.fromEntries(entries);
}

/** Create a new AudioEffect instance with default params. */
export function createAudioEffect(type: AudioEffectType, id?: string): AudioEffect {
	return {
		id: id ?? `${type}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`,
		type,
		params: getDefaultAudioEffectParams(type),
		enabled: true,
	};
}

// ── Chain builder (used by both playback and export) ─────────────────────

/**
 * Build a chain of audio effect nodes.
 *
 * @param audioContext – the context to create nodes in
 * @param effects      – enabled effects to apply (already filtered)
 * @param input        – the node to start from (e.g. an AudioBufferSourceNode)
 * @returns the **last** node in the effect chain. Connect this to a gain node
 *          or destination to complete the signal path.
 */
export function buildAudioEffectChain(
	audioContext: BaseAudioContext,
	effects: AudioEffect[],
	input: AudioNode,
): AudioNode {
	let lastNode = input;

	for (const effect of effects) {
		if (!effect.enabled) continue;
		const def = audioEffectRegistry.get(effect.type);
		if (!def) continue;
		lastNode = def.createNodes(audioContext, effect.params, lastNode);
	}

	return lastNode;
}

// ── Render a buffer through an effect chain (for export) ─────────────────

/**
 * Render an AudioBuffer through a chain of audio effects using an
 * OfflineAudioContext.
 *
 * @param audioContext – a live AudioContext (used for shared sample-rate / IR
 *                       generation only; the actual rendering is offline).
 * @param buffer       – the input audio buffer
 * @param effects      – enabled effects to apply
 * @returns a new AudioBuffer with effects applied (same channel count & rate)
 */
export async function renderBufferWithEffects({
	audioContext,
	buffer,
	effects,
}: {
	audioContext: BaseAudioContext;
	buffer: AudioBuffer;
	effects: AudioEffect[];
}): Promise<AudioBuffer> {
	const enabledEffects = effects.filter((e) => e.enabled);
	if (enabledEffects.length === 0) return buffer;

	const offlineCtx = new OfflineAudioContext(
		buffer.numberOfChannels,
		buffer.length,
		buffer.sampleRate,
	);

	const source = offlineCtx.createBufferSource();
	source.buffer = buffer;

	const lastNode = buildAudioEffectChain(offlineCtx, enabledEffects, source);
	lastNode.connect(offlineCtx.destination);
	source.start(0);

	return await offlineCtx.startRendering();
}

// ── Register built-in effects ────────────────────────────────────────────

audioEffectRegistry.register({
	type: "eq",
	name: "Equalizer",
	params: EQ_PARAMS,
	createNodes: createEqNodes,
});

audioEffectRegistry.register({
	type: "compressor",
	name: "Compressor",
	params: COMPRESSOR_PARAMS,
	createNodes: createCompressorNodes,
});

audioEffectRegistry.register({
	type: "reverb",
	name: "Reverb",
	params: REVERB_PARAMS,
	createNodes: createReverbNodes,
});

// ── Helpers ──────────────────────────────────────────────────────────────

function clampParam(value: unknown, min: number, max: number): number {
	const num = typeof value === "number" ? value : min;
	return Math.min(max, Math.max(min, num));
}
