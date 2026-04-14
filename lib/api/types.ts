import { CanvasSnapshotV1 } from "@/lib/canvas-state";

export interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T | null;
  code?: string;
}

export type ProjectDetail = {
  id: string;
  title: string;
  initialPrompt: string;
  status: "PENDING" | "GENERATING" | "ACTIVE" | "ARCHIVED";
  canvasState: CanvasSnapshotV1 | null;
};

export type ProjectSummary = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
};
