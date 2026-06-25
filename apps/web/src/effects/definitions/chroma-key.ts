import type { EffectDefinition } from "@/effects/types";

export const CHROMA_KEY_SHADER = "chroma_key";

/** Parse a hex color string to [r, g, b] values in 0-1 range */
function hexToRgb(hex: string): [number, number, number] {
	const clean = hex.replace("#", "");
	const num = Number.parseInt(clean, 16);
	if (clean.length === 3) {
		const r = ((num >> 8) & 0xf) / 15;
		const g = ((num >> 4) & 0xf) / 15;
		const b = (num & 0xf) / 15;
		return [r, g, b];
	}
	const r = ((num >> 16) & 0xff) / 255;
	const g = ((num >> 8) & 0xff) / 255;
	const b = (num & 0xff) / 255;
	return [r, g, b];
}

export const chromaKeyEffectDefinition: EffectDefinition = {
	type: "chroma_key",
	name: "Chroma Key",
	keywords: ["chroma", "green screen", "key", "background removal", "gs", "chroma key", "spill", "keying"],
	params: [
		{
			key: "keyColor",
			label: "Key Color",
			type: "color",
			default: "#00FF00",
		},
		{
			key: "similarity",
			label: "Similarity",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "smoothness",
			label: "Smoothness",
			type: "number",
			default: 10,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "spillReduction",
			label: "Spill Reduction",
			type: "number",
			default: 30,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: CHROMA_KEY_SHADER,
				uniforms: ({ effectParams }) => {
					const colorHex = String(effectParams.keyColor || "#00FF00");
					const [r, g, b] = hexToRgb(colorHex);
					return {
						u_keyColor: [r, g, b],
						u_similarity: Number(effectParams.similarity) || 50,
						u_smoothness: Number(effectParams.smoothness) || 10,
						u_spillReduction: Number(effectParams.spillReduction) || 30,
					};
				},
			},
		],
	},
};
