import type { LLMToolDefinition } from "./types";

/**
 * System prompt for the AI Assistant in the video editor context.
 * Guides the LLM to understand what it can do with Montica.
 */
export const SYSTEM_PROMPT = `You are Montica AI, an intelligent assistant built into Montica — a professional video editing application.

You help users edit videos by understanding their natural language requests and translating them into editing actions. You have access to various tools that let you manipulate the video timeline, apply effects, add transitions, and more.

## Your Capabilities
- You can create, modify, and arrange video/audio/text elements on the timeline
- You can apply visual effects (Glitch, Blur, Chroma Key, Color Grade)
- You can add transitions between clips (Crossfade, Wipe, Slide, Glitch)
- You can adjust element properties (position, scale, rotation, opacity)
- You can add text overlays and stickers
- You can import media files and manage projects
- You can export videos in various formats
- You can apply complete style templates with one command

## Available Effects
- **blur**: Gaussian blur with adjustable intensity (0-100)
- **glitch**: Digital glitch with distortion, block displacement, and RGB offset. Params: intensity (0-100), frequency (0-100), distortion (0-100), blockSize (0-100)
- **chroma_key**: Green/blue screen removal. Params: keyColor (hex color), similarity (0-100), smoothness (0-100), spillReduction (0-100)
- **color_grade**: Color correction with saturation (-100 to 100), contrast (-100 to 100), brightness (-100 to 100), warmth (-100 to 100). Also has look presets: "teal_orange", "vintage", "mono", "neon"

## Available Transitions
- **crossfade**: Smooth opacity blend between clips
- **wipe**: Directional wipe reveal
- **glitch**: Digital glitch effect transition
- **slide**: Clip slides off to reveal next clip

## Style Templates
- **montica-cyan**: Modern cyan-accented style. Dark mode: cyan + black. Light mode: icy cyan + white. Subtle glitch, color grade with neon look, crossfade transitions, clean sans-serif typography.
- **cyberpunk**: Neon colors, glitch effects, tech fonts, high contrast
- **cinematic**: Letterbox (2.35:1), color grade, slow motion
- **retro**: VHS滤镜, warm colors, scan lines
- **minimalist**: Clean sans-serif, muted colors, simple transitions
- **vaporwave**: Pastel gradients, retro fonts, glitch effects

Users can apply a template by saying "apply montica-cyan style" or "make it cyberpunk" — use the 'apply_template' tool for this.

## Best Practices
- Suggest appropriate effects based on the content type
- Consider pacing and rhythm when making editing suggestions
- Respect the user's creative vision — you're an assistant, not the director
- When unsure, provide multiple options for the user to choose from
`;

/**
 * System prompt for the vibe edit mode — where users describe a "vibe"
 * and Montica automatically applies a matching style.
 */
export const VIBE_EDIT_PROMPT = `You are Montica's Vibe Edit Engine. Your job is to interpret the user's description of a "vibe" or "style" and translate it into concrete editing actions.

When a user describes a vibe (e.g. "make it cyberpunk", "give me retro vibes", "cinematic feel"), analyze the request and apply appropriate combination of:
1. Color grading (LUTs, saturation, contrast)
2. Effects (glitch, blur, chroma key)
3. Transitions
4. Typography choices
5. Pacing changes (speed ramps)

Map the user's description to one or more style templates and suggest specific actions.

## Available Style Templates
- **montica-cyan**: Modern cyan-accented look (default). Dark mode: cyan + black. Light mode: icy cyan + white.
- **cyberpunk**: Neon colors, glitch, tech fonts
- **cinematic**: Color graded, letterbox
- **vaporwave**: Pastel, retro, glitch

When you identify a template match, use 'apply_template' or the individual tools to execute the look.`;

export const TOOL_DEFINITIONS: LLMToolDefinition[] = [
	{
		name: "apply_effect",
		description: "Apply a visual effect to a timeline element",
		inputSchema: {
			type: "object",
			properties: {
				elementId: {
					type: "string",
					description: "ID of the timeline element",
				},
				effectType: {
					type: "string",
					enum: ["glitch", "blur", "chroma_key", "color_grade"],
					description: "Type of effect to apply",
				},
				params: {
					type: "object",
					description: "Effect-specific parameters",
					additionalProperties: true,
				},
			},
			required: ["elementId", "effectType"],
		},
	},
	{
		name: "add_transition",
		description: "Add a transition between two clips on the timeline",
		inputSchema: {
			type: "object",
			properties: {
				clipIdA: {
					type: "string",
					description: "ID of the first clip",
				},
				clipIdB: {
					type: "string",
					description: "ID of the second clip (optional for tail transition)",
				},
				transitionType: {
					type: "string",
					enum: ["crossfade", "wipe", "slide", "glitch"],
					description: "Type of transition",
				},
				duration: {
					type: "number",
					description: "Duration in seconds",
				},
			},
			required: ["clipIdA", "transitionType", "duration"],
		},
	},
	{
		name: "set_element_property",
		description: "Set a visual property on a timeline element",
		inputSchema: {
			type: "object",
			properties: {
				elementId: {
					type: "string",
					description: "ID of the timeline element",
				},
				property: {
					type: "string",
					enum: [
						"positionX",
						"positionY",
						"scaleX",
						"scaleY",
						"rotation",
						"opacity",
						"volume",
					],
					description: "Property to modify",
				},
				value: {
					type: "number",
					description: "New value for the property",
				},
			},
			required: ["elementId", "property", "value"],
		},
	},
	{
		name: "add_text_overlay",
		description: "Add a text overlay to the timeline",
		inputSchema: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "Text content to display",
				},
				fontFamily: {
					type: "string",
					description: "Font family name",
				},
				fontSize: {
					type: "number",
					description: "Font size in pixels",
				},
				color: {
					type: "string",
					description: "Text color (hex format)",
				},
				position: {
					type: "string",
					enum: ["center", "top-left", "top-right", "bottom-left", "bottom-right"],
					description: "Screen position",
				},
				startTime: {
					type: "number",
					description: "Start time in seconds",
				},
				duration: {
					type: "number",
					description: "Duration in seconds",
				},
			},
			required: ["text", "startTime", "duration"],
		},
	},
	{
		name: "set_color_grade",
		description: "Apply color grading to a clip or entire project",
		inputSchema: {
			type: "object",
			properties: {
				targetId: {
					type: "string",
					description: "Element ID or 'project' for global grading",
				},
				saturation: {
					type: "number",
					description: "Saturation adjustment (-1 to 1)",
				},
				contrast: {
					type: "number",
					description: "Contrast adjustment (-1 to 1)",
				},
				brightness: {
					type: "number",
					description: "Brightness adjustment (-1 to 1)",
				},
				warmth: {
					type: "number",
					description: "Warmth adjustment (-1 to 1)",
				},
				look: {
					type: "string",
					enum: ["none", "teal_orange", "vintage", "mono", "neon"],
					description: "Predefined color look",
				},
			},
			required: ["targetId"],
		},
	},
	{
		name: "suggest_edit",
		description: "Provide a text suggestion or answer a question about video editing",
		inputSchema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					description: "The suggestion or answer text",
				},
			},
			required: ["message"],
		},
	},
	{
		name: "apply_template",
		description: "Apply a complete style template to the timeline or selected elements. Templates bundle multiple effects, transitions, and typography settings into one action.",
		inputSchema: {
			type: "object",
			properties: {
				templateId: {
					type: "string",
					enum: ["montica-cyan", "cyberpunk", "cinematic", "vaporwave"],
					description: "Which style template to apply",
				},
				targetElements: {
					type: "array",
					items: { type: "string" },
					description: "Optional: element IDs to apply the template to. If empty, applies to selected or first clip.",
				},
			},
			required: ["templateId"],
		},
	},
];
