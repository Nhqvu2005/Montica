import type { TActionWithOptionalArgs } from "./types";

export * from "./definitions";
export * from "./types";
export * from "./registry";

const ALL_ACTION_KEYS = new Set<string>([
	"toggle-play",
	"stop-playback",
	"seek-forward",
	"seek-backward",
	"frame-step-forward",
	"frame-step-backward",
	"jump-forward",
	"jump-backward",
	"goto-start",
	"goto-end",
	"split",
	"split-left",
	"split-right",
	"delete-selected",
	"copy-selected",
	"paste-copied",
	"toggle-snapping",
	"toggle-ripple-editing",
	"toggle-source-audio",
	"select-all",
	"cancel-interaction",
	"deselect-all",
	"duplicate-selected",
	"toggle-elements-muted-selected",
	"toggle-elements-visibility-selected",
	"toggle-bookmark",
	"undo",
	"redo",
	"remove-media-asset",
	"remove-media-assets",
]);

export function isActionWithOptionalArgs(value: string): value is TActionWithOptionalArgs {
	return ALL_ACTION_KEYS.has(value);
}
