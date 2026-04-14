"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as htmlToImage from "html-to-image";
import { JetBrains_Mono } from "next/font/google";

import { CanvasFrame } from "@/components/canvas/CanvasFrame";
import {
  InfiniteCanvas,
  InfiniteCanvasHandle,
} from "@/components/canvas/InfiniteCanvas";
import {
  Transform,
  FrameRect,
} from "@/components/canvas/hooks/useCanvasTransform";
import { usePointerMode } from "@/components/canvas/hooks/usePointerMode";
import { CanvasFrameData } from "@/components/canvas/types";
import { Button } from "@/components/ui/button";
import SelectModel from "@/components/SelectModel";
import ProjectMenuPanel from "@/components/projects/TopMenu";
import {
  useProjectCanvasStateUpdateMutation,
  useProjectDeleteMutation,
  useProjectQuery,
  useProjectStatusUpdateMutation,
  useProjectThumbnailUpdateMutation,
} from "@/lib/projects/queries";
import { useUserActivityStore } from "@/providers/zustand-provider";
import { Monitor, Smartphone, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { CanvasSnapshotV1, isCanvasSnapshotV1 } from "@/lib/canvas-state";
import {
  getGenerationLayout,
  getInitialDimensionsForPlatform,
} from "@/lib/canvasLayout";
import logger from "@/lib/logger";
import { GenerationPlatform, WebAppSpec } from "@/lib/types";
import { cn } from "@/lib/utils";

const DASHBOARD_MODEL_ALIASES: string[] = [
  "gemma4:31b",
  "gpt-oss:120b",
  "deepseek-v3.1:671b",
  "qwen3.5",
  "deepseek-v3.2:cloud",
];

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

type GenerationEvent =
  | { type: "spec"; spec: WebAppSpec }
  | { type: "screen_start"; screen: string }
  | { type: "screen_reset"; screen: string; reason?: string }
  | { type: "code_chunk"; screen: string; token: string }
  | { type: "screen_done"; screen: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "design_context"; designContext: unknown }
  | { type: "tree"; tree: unknown };

type ProjectActionId =
  | "all-projects"
  | "share"
  | "download"
  | "edit"
  | "delete";

const CHUNK_FLUSH_MS = 120;

function toFrameRects(frames: CanvasFrameData[]): FrameRect[] {
  return frames.map((frame) => ({
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
  }));
}

function normalizePosition(value: number) {
  return Math.round(value * 100) / 100;
}

const StudioPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const {
    data: project,
    isLoading: projectLoading,
    isError,
    error: projectError,
  } = useProjectQuery(projectId);

  const { mutate: updateProjectStatus } = useProjectStatusUpdateMutation();
  const { mutate: persistCanvasState } = useProjectCanvasStateUpdateMutation();
  const {
    mutate: deleteProject,
    data: deleteProjectData,
    error: deleteError,
    isSuccess: isDeleteSuccess,
  } = useProjectDeleteMutation();
  const { mutateAsync: updateProjectThumbnail } =
    useProjectThumbnailUpdateMutation();

  const model = useUserActivityStore((state) => state.model);
  const setModel = useUserActivityStore((state) => state.setModel);
  const spec = useUserActivityStore((state) => state.spec);
  const setSpec = useUserActivityStore((state) => state.setSpec);

  const canvasRef = useRef<InfiniteCanvasHandle | null>(null);
  const domRef = useRef<HTMLDivElement | null>(null);

  const frameIdsRef = useRef<Map<string, string>>(new Map());
  const screenBuffersRef = useRef<Map<string, string>>(new Map());
  const dirtyScreensRef = useRef<Set<string>>(new Set());
  const framesRef = useRef<Map<string, CanvasFrameData>>(new Map());

  const chunkFlushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isUploadingThumbnailRef = useRef(false);
  const hasInitiatedGenerationRef = useRef(false);
  const hasHydratedCanvasRef = useRef(false);

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStreamingScreen, setActiveStreamingScreen] = useState<
    string | null
  >(null);
  const [frames, setFrames] = useState<Map<string, CanvasFrameData>>(
    () => new Map(),
  );
  const [canvasTransform, setCanvasTransform] = useState<Transform>({
    x: 0,
    y: 0,
    k: 1,
  });

  const {
    activeFrameId,
    selectedFrameId,
    setSelectedFrameId,
    enterFrame,
    exitFrame,
  } = usePointerMode();

  const canGenerate = !!prompt.trim() && !isGenerating;
  const models = [...DASHBOARD_MODEL_ALIASES];

  const frameList = useMemo(() => {
    return [...frames.values()].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }, [frames]);

  const frameRects = useMemo(() => toFrameRects(frameList), [frameList]);

  const applyFrames = useCallback(
    (
      updater: (
        current: Map<string, CanvasFrameData>,
      ) => Map<string, CanvasFrameData>,
    ) => {
      setFrames((current) => {
        const next = updater(current);
        framesRef.current = next;
        return next;
      });
    },
    [],
  );

  const buildSnapshot = useCallback((): CanvasSnapshotV1 => {
    const camera = canvasRef.current?.getTransform() ?? canvasTransform;

    return {
      version: 1,
      camera,
      frames: [...framesRef.current.values()],
      activeFrameId,
      selectedFrameId,
      savedAt: new Date().toISOString(),
    };
  }, [activeFrameId, canvasTransform, selectedFrameId]);

  const scheduleSnapshotPersist = useCallback(() => {
    if (!projectId || !hasHydratedCanvasRef.current) return;

    if (snapshotSaveTimeoutRef.current) {
      clearTimeout(snapshotSaveTimeoutRef.current);
    }

    snapshotSaveTimeoutRef.current = setTimeout(() => {
      snapshotSaveTimeoutRef.current = null;
      persistCanvasState({ id: projectId, canvasState: buildSnapshot() });
    }, 450);
  }, [buildSnapshot, persistCanvasState, projectId]);

  const flushChunkBuffer = useCallback(() => {
    if (dirtyScreensRef.current.size === 0) return;

    const dirtyScreens = [...dirtyScreensRef.current];
    dirtyScreensRef.current.clear();

    applyFrames((current) => {
      let changed = false;
      const next = new Map(current);

      for (const screenName of dirtyScreens) {
        const frameId = frameIdsRef.current.get(screenName);
        if (!frameId) continue;

        const frame = next.get(frameId);
        if (!frame) continue;

        const bufferedContent = screenBuffersRef.current.get(screenName) ?? "";
        if (bufferedContent === frame.content && frame.state === "streaming") {
          continue;
        }

        changed = true;
        next.set(frameId, {
          ...frame,
          content: bufferedContent,
          state: "streaming",
        });
      }

      return changed ? next : current;
    });
  }, [applyFrames]);

  const startChunkFlusher = useCallback(() => {
    if (chunkFlushIntervalRef.current) return;

    chunkFlushIntervalRef.current = setInterval(() => {
      flushChunkBuffer();
    }, CHUNK_FLUSH_MS);
  }, [flushChunkBuffer]);

  const stopChunkFlusher = useCallback(() => {
    if (!chunkFlushIntervalRef.current) return;

    clearInterval(chunkFlushIntervalRef.current);
    chunkFlushIntervalRef.current = null;
  }, []);

  const onCapture = useCallback(async () => {
    if (isUploadingThumbnailRef.current || !domRef.current) {
      return;
    }

    isUploadingThumbnailRef.current = true;
    try {
      const captureTarget = domRef.current;

      const thumbnailBlob = await htmlToImage.toBlob(captureTarget, {
        cacheBust: false,
        pixelRatio: 1,
        backgroundColor: "#111111",
        filter: (node) => node.tagName !== "IFRAME",
      });

      if (!thumbnailBlob) {
        logger.warn("Thumbnail capture returned an empty blob.");
        return;
      }

      await updateProjectThumbnail({
        id: projectId,
        thumbnail: thumbnailBlob,
      });
      logger.info("Project thumbnail updated.", { projectId });
    } catch (error) {
      logger.error("Failed to capture and upload project thumbnail:", error);
    } finally {
      isUploadingThumbnailRef.current = false;
    }
  }, [projectId, updateProjectThumbnail]);

  const restoreFromSnapshot = useCallback(
    (snapshot: CanvasSnapshotV1) => {
      const restoredFrames = new Map<string, CanvasFrameData>(
        snapshot.frames.map((frame) => [frame.id, frame]),
      );

      setFrames(restoredFrames);
      framesRef.current = restoredFrames;
      frameIdsRef.current = new Map(
        snapshot.frames.map((frame) => [frame.screenName, frame.id]),
      );

      setSelectedFrameId(snapshot.selectedFrameId ?? null);
      if (snapshot.activeFrameId) {
        enterFrame(snapshot.activeFrameId);
      } else {
        exitFrame();
      }

      requestAnimationFrame(() => {
        canvasRef.current?.setTransform(snapshot.camera);
        setCanvasTransform(snapshot.camera);
      });
    },
    [enterFrame, exitFrame, setSelectedFrameId],
  );

  const handleEvent = useCallback(
    (event: GenerationEvent) => {
      if (event.type === "design_context" || event.type === "tree") {
        return;
      }

      if (event.type === "spec") {
        const platform: GenerationPlatform =
          event.spec.platform === "mobile" ? "mobile" : "web";

        const screensWithDims = event.spec.screens.map((screenName) => ({
          name: screenName,
          ...getInitialDimensionsForPlatform(screenName, platform),
        }));

        const positions = getGenerationLayout(
          [...framesRef.current.values()],
          screensWithDims,
        );

        const generationId = crypto.randomUUID();
        frameIdsRef.current = new Map();
        screenBuffersRef.current = new Map();
        dirtyScreensRef.current.clear();

        applyFrames((current) => {
          const next = new Map(current);

          screensWithDims.forEach((screen, index) => {
            const frameId = crypto.randomUUID();
            const position = positions[index];

            frameIdsRef.current.set(screen.name, frameId);
            next.set(frameId, {
              id: frameId,
              screenName: screen.name,
              platform,
              x: position.x,
              y: position.y,
              w: screen.w,
              h: screen.h,
              content: "",
              editedContent: null,
              state: "skeleton",
              thumbnail: null,
              generationId,
              error: null,
            });
          });

          return next;
        });

        requestAnimationFrame(() => {
          const allRects = toFrameRects([...framesRef.current.values()]);
          canvasRef.current?.zoomToFit(allRects);
        });
        scheduleSnapshotPersist();
        return;
      }

      if (event.type === "screen_start") {
        const frameId = frameIdsRef.current.get(event.screen);
        screenBuffersRef.current.set(event.screen, "");
        setActiveStreamingScreen(event.screen);
        startChunkFlusher();

        if (frameId) {
          applyFrames((current) => {
            const frame = current.get(frameId);
            if (!frame || frame.state === "streaming") return current;

            const next = new Map(current);
            next.set(frameId, {
              ...frame,
              state: "streaming",
            });
            return next;
          });
        }
        return;
      }

      if (event.type === "screen_reset") {
        const frameId = frameIdsRef.current.get(event.screen);
        screenBuffersRef.current.set(event.screen, "");
        dirtyScreensRef.current.delete(event.screen);
        startChunkFlusher();

        if (!frameId) return;

        applyFrames((current) => {
          const frame = current.get(frameId);
          if (!frame) return current;

          const next = new Map(current);
          next.set(frameId, {
            ...frame,
            content: "",
            state: "streaming",
          });
          return next;
        });
        return;
      }

      if (event.type === "code_chunk") {
        const previous = screenBuffersRef.current.get(event.screen) ?? "";
        screenBuffersRef.current.set(event.screen, previous + event.token);
        dirtyScreensRef.current.add(event.screen);
        startChunkFlusher();
        return;
      }

      if (event.type === "screen_done") {
        flushChunkBuffer();
        const frameId = frameIdsRef.current.get(event.screen);
        if (!frameId) return;

        const finalCode = screenBuffersRef.current.get(event.screen) ?? "";
        screenBuffersRef.current.delete(event.screen);
        dirtyScreensRef.current.delete(event.screen);

        applyFrames((current) => {
          const frame = current.get(frameId);
          if (!frame) return current;

          const next = new Map(current);
          next.set(frameId, {
            ...frame,
            state: "done",
            content: finalCode,
            error: null,
          });
          return next;
        });

        setActiveStreamingScreen((current) =>
          current === event.screen ? null : current,
        );
        scheduleSnapshotPersist();
        return;
      }

      if (event.type === "done") {
        flushChunkBuffer();
        stopChunkFlusher();
        setActiveStreamingScreen(null);

        updateProjectStatus({ id: projectId, status: "ACTIVE" });

        const allRects = toFrameRects([...framesRef.current.values()]);
        if (allRects.length > 0) {
          canvasRef.current?.zoomToFit(allRects);
        }

        if (captureTimeoutRef.current) {
          clearTimeout(captureTimeoutRef.current);
        }

        captureTimeoutRef.current = setTimeout(() => {
          void onCapture();
          captureTimeoutRef.current = null;
        }, 2000);

        scheduleSnapshotPersist();
        return;
      }

      if (event.type === "error") {
        stopChunkFlusher();
        setActiveStreamingScreen(null);
        updateProjectStatus({ id: projectId, status: "ARCHIVED" });
      }
    },
    [
      applyFrames,
      flushChunkBuffer,
      onCapture,
      projectId,
      scheduleSnapshotPersist,
      startChunkFlusher,
      stopChunkFlusher,
      updateProjectStatus,
    ],
  );

  const handleGenerate = useCallback(async () => {
    if (!project) {
      logger.error("Project not found");
      return;
    }

    setIsGenerating(true);
    setActiveStreamingScreen(null);

    try {
      stopChunkFlusher();
      screenBuffersRef.current = new Map();
      dirtyScreensRef.current.clear();

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: project.status === "PENDING" ? project.initialPrompt : prompt,
          platform: spec ?? "web",
        }),
      });

      setPrompt("");

      if (!response.ok || !response.body) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Generation failed");
      }

      updateProjectStatus({ id: projectId, status: "GENERATING" });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            stopChunkFlusher();
            return;
          }

          const event = JSON.parse(raw) as GenerationEvent;
          handleEvent(event);
        }
      }
    } catch (error) {
      stopChunkFlusher();
      updateProjectStatus({ id: projectId, status: "ARCHIVED" });
      logger.error("Error generating layout:", error);
    } finally {
      flushChunkBuffer();
      stopChunkFlusher();
      setActiveStreamingScreen(null);
      setIsGenerating(false);
    }
  }, [
    flushChunkBuffer,
    handleEvent,
    model,
    project,
    projectId,
    prompt,
    spec,
    stopChunkFlusher,
    updateProjectStatus,
  ]);

  const handleMoveFrame = useCallback(
    (id: string, nextX: number, nextY: number) => {
      applyFrames((current) => {
        const frame = current.get(id);
        if (!frame) return current;

        const normalizedX = normalizePosition(nextX);
        const normalizedY = normalizePosition(nextY);

        if (frame.x === normalizedX && frame.y === normalizedY) {
          return current;
        }

        const next = new Map(current);
        next.set(id, {
          ...frame,
          x: normalizedX,
          y: normalizedY,
        });
        return next;
      });

      scheduleSnapshotPersist();
    },
    [applyFrames, scheduleSnapshotPersist],
  );

  const handleResizeFrame = useCallback(
    (id: string, nextW: number, nextH: number) => {
      applyFrames((current) => {
        const frame = current.get(id);
        if (!frame) return current;

        if (frame.w === nextW && frame.h === nextH) {
          return current;
        }

        const next = new Map(current);
        next.set(id, {
          ...frame,
          w: nextW,
          h: nextH,
        });
        return next;
      });

      scheduleSnapshotPersist();
    },
    [applyFrames, scheduleSnapshotPersist],
  );

  const handleTransformChange = useCallback(
    (nextTransform: Transform) => {
      setCanvasTransform(nextTransform);
      scheduleSnapshotPersist();
    },
    [scheduleSnapshotPersist],
  );

  function handleMenuClick(action: ProjectActionId) {
    switch (action) {
      case "all-projects":
        router.push("/");
        break;
      case "share":
        alert("Share functionality is not implemented yet.");
        break;
      case "download":
        alert("Download functionality is not implemented yet.");
        break;
      case "edit":
        alert("Edit functionality is not implemented yet.");
        break;
      case "delete": {
        const confirmed = confirm(
          "Are you sure you want to delete this project? This action cannot be undone.",
        );
        if (confirmed) {
          deleteProject({ id: projectId });
        }
        break;
      }
      default:
        alert("Unknown action: " + action);
        break;
    }
  }

  useEffect(() => {
    if (projectLoading || isError) return;

    logger.info("Project info:", project);
    logger.warn("Project error:", projectError);

    if (!project) {
      logger.error("Project not found");
      return;
    }

    if (!hasHydratedCanvasRef.current) {
      if (isCanvasSnapshotV1(project.canvasState)) {
        restoreFromSnapshot(project.canvasState);
      }
      hasHydratedCanvasRef.current = true;
    }

    if (
      project.status === "PENDING" &&
      !hasInitiatedGenerationRef.current &&
      !isCanvasSnapshotV1(project.canvasState)
    ) {
      hasInitiatedGenerationRef.current = true;
      void handleGenerate();
    }
  }, [
    handleGenerate,
    isError,
    project,
    projectError,
    projectLoading,
    restoreFromSnapshot,
  ]);

  useEffect(() => {
    if (deleteProjectData?.error === false) {
      logger.info("Project deleted successfully:", deleteProjectData);
      router.push("/");
    }
  }, [deleteProjectData, deleteError, router, isDeleteSuccess]);

  useEffect(() => {
    return () => {
      stopChunkFlusher();

      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }

      if (snapshotSaveTimeoutRef.current) {
        clearTimeout(snapshotSaveTimeoutRef.current);
      }
    };
  }, [stopChunkFlusher]);

  return (
    <div
      className={cn(
        "dark relative h-screen w-full overflow-hidden bg-background text-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        "[--radius:2px] [--background:#111111] [--foreground:#e2e2e2]",
        "[--card:#1a1a1a] [--card-foreground:#e2e2e2] [--popover:#1a1a1a] [--popover-foreground:#f9f9f9]",
        "[--primary:#ffffff] [--primary-foreground:#000000] [--secondary:#1a1a1a] [--secondary-foreground:#f1f1f1]",
        "[--muted:#1a1a1a] [--muted-foreground:#777777] [--accent:#222222] [--accent-foreground:#f9f9f9]",
        "[--destructive:#ba1a1a] [--border:#222222] [--input:#333333] [--ring:#777777]",
      )}
    >
      <div className="absolute inset-0 z-40" ref={domRef}>
        <InfiniteCanvas
          ref={canvasRef}
          frames={frameRects}
          activeFrameId={activeFrameId}
          onFrameExit={exitFrame}
          onTransformChange={handleTransformChange}
        >
          {frameList.map((frame) => (
            <CanvasFrame
              key={frame.id}
              {...frame}
              scale={canvasTransform.k}
              isActive={activeFrameId === frame.id}
              isSelected={selectedFrameId === frame.id}
              onSelect={setSelectedFrameId}
              onActivate={(id) => {
                setSelectedFrameId(id);
                enterFrame(id);
                scheduleSnapshotPersist();
              }}
              onMove={handleMoveFrame}
              onResize={handleResizeFrame}
            />
          ))}
        </InfiniteCanvas>
      </div>

      <ProjectMenuPanel
        title={project?.title || "Untitled Project"}
        handleMenuClick={handleMenuClick}
      />

      <div className="pointer-events-none absolute inset-0 z-50">
        <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(980px,calc(100%-1.5rem))] -translate-x-1/2 rounded-md border border-input bg-card/90 p-2.5 shadow-2xl shadow-black/30 backdrop-blur-[1px]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 border border-input bg-muted p-1">
              <Button
                type="button"
                size="xs"
                variant={spec === "web" ? "secondary" : "ghost"}
                onClick={() => setSpec("web")}
                className={cn(
                  "h-7 px-2",
                  spec === "mobile" && "text-muted-foreground",
                )}
              >
                <Monitor data-icon="inline-start" className="size-4" />
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.18em]",
                    mono.className,
                  )}
                >
                  Web
                </span>
              </Button>
              <Button
                type="button"
                size="xs"
                variant={spec === "mobile" ? "secondary" : "ghost"}
                onClick={() => setSpec("mobile")}
                className={cn(
                  "h-7 px-2",
                  spec === "web" && "text-muted-foreground",
                )}
              >
                <Smartphone data-icon="inline-start" className="size-4" />
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.18em]",
                    mono.className,
                  )}
                >
                  Mobile
                </span>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {isGenerating && (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground",
                    mono.className,
                  )}
                >
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  {activeStreamingScreen
                    ? `Generating: ${activeStreamingScreen}`
                    : "Preparing generation..."}
                </span>
              )}
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
                  mono.className,
                )}
              >
                Use Enter to generate and Shift+Enter for a new line
              </span>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <SelectModel list={models} setModel={setModel} model={model} />

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canGenerate) {
                    void handleGenerate();
                  }
                }
              }}
              placeholder="What would you like to change or create?"
              className={cn(
                "scrolling h-15 min-h-11 flex-1 resize-none rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition",
                "placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30",
                isGenerating && "cursor-not-allowed opacity-80",
                mono.className,
              )}
            />

            <Button
              onClick={() => handleGenerate()}
              disabled={!canGenerate}
              className="h-11 rounded-md px-4"
            >
              <Sparkles
                className={`size-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudioPageWrapper = () => {
  return (
    <Suspense>
      <StudioPage />
    </Suspense>
  );
};

export default StudioPageWrapper;
