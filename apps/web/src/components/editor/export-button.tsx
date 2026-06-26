"use client";

import { useState } from "react";
import { useEditor } from "@/editor/use-editor";
import { ExportDialog, ExportButtonTrigger } from "./export-dialog";

export function ExportButton() {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const hasProject = !!activeProject;

	return (
		<>
			<ExportButtonTrigger
				onClick={() => setIsDialogOpen(true)}
				hasProject={hasProject}
			/>
			{hasProject && (
				<ExportDialog
					open={isDialogOpen}
					onOpenChange={setIsDialogOpen}
				/>
			)}
		</>
	);
}
