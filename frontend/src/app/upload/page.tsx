"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { VideoItem } from "@/lib/types";
import PoseCanvas, { OverlayFlags } from "@/components/PoseCanvas";
import MovementTimeline from "@/components/MovementTimeline";
import CircularMeter from "@/components/CircularMeter";
import JointAngleGraph from "@/components/JointAngleGraph";
import { ANGLE_CARDS, GRAPH_JOINTS, OPTIMAL_RANGES, Side, angleKey, nearestFrame, statusForValue } from "@/lib/pose";

const SPORTS = ["Football", "Basketball", "Track & Field", "Soccer", "Tennis", "Swimming", "General"];
const MOVEMENTS = ["Sprint Acceleration", "Vertical Jump", "Change of Direction", "Throwing Motion", "General Movement"];
const CAMERA_ANGLES = ["Side view", "Front view", "Rear view", "45-degree view"];
const STEPS = [
  "Video uploaded",
  "Detecting athlete",
  "Estimating body pose",
  "Tracking movement",
  "Calculating joint angles",
  "Generating biomechanical report",
];

type Stage = "setup" | "processing" | "results";

function UploadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingVideoId = searchParams.get("video");

  const [stage, setStage] = useState<Stage>(existingVideoId ? "processing" : "setup");
  const [loadingExisting, setLoadingExisting] = useState(!!existingVideoId);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [sport, setSport] = useState(SPORTS[0]);
  const [movement, setMovement] = useState(MOVEMENTS[0]);
  const [cameraAngle, setCameraAngle] = useState(CAMERA_ANGLES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [video, setVideo] = useState<VideoItem | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // --- results-stage playback state ---
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slowMo, setSlowMo] = useState(false);
  const [overlays, setOverlays] = useState<OverlayFlags>({
    skeleton: true,
    jointPoints: true,
    jointAngles: true,
    movementPath: true,
    centerOfMass: false,
    heatmap: false,
  });
  const [cardSide, setCardSide] = useState<Side | "compare">("left");
  const [graphJoint, setGraphJoint] = useState("knee");

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!existingVideoId) return;
    let cancelled = false;
    api
      .getVideo(Number(existingVideoId))
      .then((v) => {
        if (cancelled) return;
        setVideo(v);
        setStage("results");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load this analysis");
        setStage("setup");
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [existingVideoId]);

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  }

  async function startAnalysis() {
    if (!file) return;
    setError(null);
    setStage("processing");
    setStepIndex(0);

    let apiDone = false;
    let apiError: string | null = null;
    let apiResult: VideoItem | null = null;

    const request = (async () => {
      try {
        const form = new FormData();
        form.append("title", title || file.name);
        form.append("tags", tags);
        form.append("visibility", "public");
        form.append("sport", sport);
        form.append("movement", movement);
        form.append("camera_angle", cameraAngle);
        form.append("file", file);
        const uploaded = await api.uploadVideo(form);
        apiResult = uploaded;
      } catch (err) {
        apiError = err instanceof Error ? err.message : "Analysis failed";
      } finally {
        apiDone = true;
      }
    })();

    let i = 0;
    stepTimerRef.current = setInterval(() => {
      i += 1;
      setStepIndex(Math.min(i, STEPS.length - 1));
      if (i >= STEPS.length - 1 && apiDone) {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        if (apiError) {
          setError(apiError);
          setStage("setup");
        } else if (apiResult) {
          setVideo(apiResult);
          setStage("results");
        }
      }
    }, 450);

    await request;
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }

  function toggleSlowMo() {
    const v = videoRef.current;
    const next = !slowMo;
    setSlowMo(next);
    if (v) v.playbackRate = next ? 0.5 : 1;
  }

  function stepFrame(dir: 1 | -1) {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setIsPlaying(false);
    const dt = video?.fps ? 1 / video.fps : 1 / 30;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + dir * dt));
  }

  function seekTo(t: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setCurrentTime(t);
  }

  function downloadReport() {
    if (!video) return;
    const lines = [
      `StrydeX AI Movement Report`,
      `Title: ${video.title}`,
      `Sport: ${video.sport ?? "—"}  |  Movement: ${video.movement ?? "—"}  |  Camera angle: ${video.camera_angle ?? "—"}`,
      ``,
      `AI Movement Score: ${video.score_overall ?? "—"}/100`,
      `  Technique: ${video.score_technique ?? "—"}`,
      `  Stability: ${video.score_stability ?? "—"}`,
      `  Symmetry: ${video.score_symmetry ?? "—"}`,
      `  Efficiency: ${video.score_efficiency ?? "—"}`,
      ``,
      `Duration: ${video.duration_sec ?? "—"}s   Frames: ${video.frame_count ?? "—"}`,
      `Avg knee flexion: ${video.avg_knee_angle_deg ?? "—"}°   Avg trunk lean: ${video.avg_trunk_lean_deg ?? "—"}°`,
      `Estimated cadence: ${video.estimated_cadence_spm ?? "—"} strides/min`,
      ``,
      video.pose_summary ?? "",
      ``,
      video.ai_report?.summary ?? "",
      video.ai_report?.strengths ? `Strengths: ${video.ai_report.strengths}` : "",
      video.ai_report?.weaknesses ? `Focus areas: ${video.ai_report.weaknesses}` : "",
      video.ai_report?.drills ? `Drills: ${video.ai_report.drills}` : "",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${video.title.replace(/\s+/g, "_")}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------- SETUP
  if (stage === "setup") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="display-heading text-3xl">Upload Your Video</h1>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll estimate body pose, track your movement, and generate a biomechanical report.
        </p>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragOver ? "border-accent bg-surface-2" : "border-border bg-surface"
          }`}
        >
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <div className="display-heading text-lg">
            {file ? file.name : "Drag and drop a video or browse files"}
          </div>
          <div className="mt-2 text-xs text-muted">MP4, MOV • 10–60 seconds recommended</div>
        </label>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 100m Sprint Session"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="sprint, track"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              >
                {SPORTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Movement</label>
              <select
                value={movement}
                onChange={(e) => setMovement(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              >
                {MOVEMENTS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Camera angle</label>
              <select
                value={cameraAngle}
                onChange={(e) => setCameraAngle(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              >
                {CAMERA_ANGLES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-muted">
            Tip: keep the full body visible, use good lighting, and place the camera on a stable surface.
          </p>
        </div>

        {error && <p className="mt-4 text-sm text-clay">{error}</p>}

        <button
          onClick={startAnalysis}
          disabled={!file}
          className="mt-8 w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
        >
          Start AI Analysis
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------ PROCESSING
  if (stage === "processing" && loadingExisting) {
    return <div className="px-6 py-16 text-center text-muted">Loading analysis...</div>;
  }

  if (stage === "processing") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="display-heading text-2xl">Analyzing Your Movement</h1>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {previewUrl && (
              <video src={previewUrl} muted autoPlay loop playsInline className="h-full w-full object-cover" />
            )}
          </div>
          <ul className="space-y-4 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    i < stepIndex
                      ? "bg-accent text-accent-ink"
                      : i === stepIndex
                      ? "border-2 border-accent text-accent"
                      : "border border-border text-muted"
                  }`}
                >
                  {i < stepIndex ? "✓" : i === stepIndex ? "●" : "○"}
                </span>
                <span className={i <= stepIndex ? "text-foreground" : "text-muted"}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- RESULTS
  if (!video) return null;
  const frameSeries = video.frame_series ?? [];
  const duration = video.duration_sec ?? videoRef.current?.duration ?? 0;
  const currentFrame = nearestFrame(frameSeries, currentTime);

  function valueFor(joint: string, side: Side): number | undefined {
    if (!currentFrame) return undefined;
    return currentFrame.ang[angleKey(joint, side)];
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-heading text-2xl">{video.title}</h1>
          <p className="mt-1 text-xs text-muted">
            {video.sport} &middot; {video.movement} &middot; {video.camera_angle}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
        >
          Back to dashboard
        </button>
      </div>

      <div className="lane-rule my-6" />

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        {/* LEFT: video + skeleton overlay */}
        <div>
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            <video
              ref={videoRef}
              src={api.videoFileUrl(video.id)}
              className="block w-full"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onSeeking={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = slowMo ? 0.5 : 1;
              }}
            />
            <PoseCanvas videoRef={videoRef} frameSeries={frameSeries} overlays={overlays} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button onClick={togglePlay} className="rounded-full border border-border px-4 py-1.5 hover:border-accent">
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={toggleSlowMo}
              className={`rounded-full border px-4 py-1.5 ${slowMo ? "border-accent text-accent" : "border-border hover:border-accent"}`}
            >
              0.5×
            </button>
            <button onClick={() => stepFrame(-1)} className="rounded-full border border-border px-3 py-1.5 hover:border-accent">
              ◀ Frame
            </button>
            <button onClick={() => stepFrame(1)} className="rounded-full border border-border px-3 py-1.5 hover:border-accent">
              Frame ▶
            </button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="ml-1 h-1.5 flex-1 accent-accent"
            />
            <span className="stat-value w-16 text-right text-xs text-muted">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-surface p-4">
            <div className="display-heading text-xs text-muted">Overlays</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {(
                [
                  ["skeleton", "Body Skeleton"],
                  ["jointPoints", "Joint Points"],
                  ["jointAngles", "Joint Angles"],
                  ["movementPath", "Movement Path"],
                  ["centerOfMass", "Center of Mass"],
                  ["heatmap", "Motion Heatmap"],
                ] as [keyof OverlayFlags, string][]
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-muted">
                  <input
                    type="checkbox"
                    checked={overlays[key]}
                    onChange={(e) => setOverlays((o) => ({ ...o, [key]: e.target.checked }))}
                    className="accent-accent"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {video.phases && video.phases.length > 0 && (
            <MovementTimeline phases={video.phases} duration={duration} currentTime={currentTime} onSeek={seekTo} />
          )}

          {frameSeries.length === 0 && (
            <p className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              No clear pose was detected in this clip — try a well-lit side-view video with the full body visible.
            </p>
          )}

          {/* Joint angle cards */}
          {frameSeries.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="display-heading text-sm text-muted">Joint Angles</h2>
                <div className="flex gap-2 text-xs">
                  {(["left", "right", "compare"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCardSide(s)}
                      className={`rounded-full border px-3 py-1 ${
                        cardSide === s ? "border-accent text-accent" : "border-border text-muted hover:border-accent"
                      }`}
                    >
                      {s === "left" ? "Left Side" : s === "right" ? "Right Side" : "Compare"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {ANGLE_CARDS.map(({ key, label }) => {
                  const range = OPTIMAL_RANGES[key];
                  const sidesToShow: Side[] = cardSide === "compare" ? ["left", "right"] : [cardSide];
                  return (
                    <div key={key} className="rounded-lg border border-border bg-surface p-4">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="mt-2 flex justify-center gap-4">
                        {sidesToShow.map((side) => {
                          const val = valueFor(key, side);
                          return (
                            <CircularMeter
                              key={side}
                              value={val}
                              displayMin={Math.max(0, range[0] - 40)}
                              displayMax={range[1] + 40}
                              optimalRange={range}
                              label={sidesToShow.length > 1 ? (side === "left" ? "Left" : "Right") : label}
                            />
                          );
                        })}
                      </div>
                      {sidesToShow.map((side) => {
                        const val = valueFor(key, side);
                        const status = statusForValue(val, range);
                        return (
                          <div key={side} className="mt-1 text-center text-xs">
                            {status === "good" && <span className="text-accent">✓ Within expected range</span>}
                            {status === "low" && <span className="text-clay">⚠ Below target range</span>}
                            {status === "high" && <span className="text-clay">⚠ Above target range</span>}
                            {status === "unknown" && <span className="text-muted">No data at this frame</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Graphs */}
          {frameSeries.length > 0 && (
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="display-heading text-sm text-muted">Movement Graphs</h2>
                <div className="flex flex-wrap gap-2 text-xs">
                  {GRAPH_JOINTS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setGraphJoint(g.key)}
                      className={`rounded-full border px-3 py-1 ${
                        graphJoint === g.key ? "border-accent text-accent" : "border-border text-muted hover:border-accent"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <JointAngleGraph
                  frameSeries={frameSeries}
                  joint={graphJoint}
                  jointLabel={GRAPH_JOINTS.find((g) => g.key === graphJoint)?.label.replace(" angle", "") ?? graphJoint}
                  currentTime={currentTime}
                  onSeek={seekTo}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: AI movement score */}
        <div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="display-heading text-xs text-muted">AI Movement Score</div>
            <div className="stat-value mt-2 text-5xl font-medium text-accent">
              {video.score_overall ?? "—"}
              <span className="text-lg text-muted"> /100</span>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Technique", video.score_technique],
                ["Stability", video.score_stability],
                ["Symmetry", video.score_symmetry],
                ["Efficiency", video.score_efficiency],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-xs text-muted">
                    <span>{label}</span>
                    <span className="stat-value text-foreground">{val ?? "—"}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div
                      className="h-1.5 rounded-full bg-accent"
                      style={{ width: `${typeof val === "number" ? val : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={downloadReport}
              className="mt-6 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90"
            >
              Download Report
            </button>
          </div>

          {video.ai_report && (
            <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface p-5 text-sm">
              <p>{video.ai_report.summary}</p>
              {video.ai_report.strengths && <p className="text-accent">Strengths: {video.ai_report.strengths}</p>}
              {video.ai_report.weaknesses && <p className="text-clay">Focus areas: {video.ai_report.weaknesses}</p>}
              {video.ai_report.drills && <p className="text-muted">Drills: {video.ai_report.drills}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="px-6 py-16 text-center text-muted">Loading...</div>}>
      <UploadPageInner />
    </Suspense>
  );
}
