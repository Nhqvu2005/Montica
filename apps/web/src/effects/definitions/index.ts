import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import { glitchEffectDefinition } from "./glitch";
import { chromaKeyEffectDefinition } from "./chroma-key";
import { colorGradeEffectDefinition } from "./color-grade";
import { cropEffectDefinition } from "./crop";
import { vignetteEffectDefinition } from "./vignette";
import { filmGrainEffectDefinition } from "./film-grain";
import { pixelateEffectDefinition } from "./pixelate";
import { vhsScanlinesEffectDefinition } from "./vhs-scanlines";

const defaultEffects = [
	blurEffectDefinition,
	glitchEffectDefinition,
	chromaKeyEffectDefinition,
	colorGradeEffectDefinition,
	cropEffectDefinition,
	vignetteEffectDefinition,
	filmGrainEffectDefinition,
	pixelateEffectDefinition,
	vhsScanlinesEffectDefinition,
];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register({
			key: definition.type,
			definition,
		});
	}
}
