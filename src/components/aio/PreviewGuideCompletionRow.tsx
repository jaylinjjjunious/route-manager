import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { PreviewGuideReadiness } from "./roadReadiness";

export const PREVIEW_GUIDE_CONFIRM_MS = 900;
export const PREVIEW_GUIDE_COLLAPSE_MS = 300;

type CompletionPhase = "visible" | "confirming" | "collapsing" | "hidden";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface PreviewGuideCompletionRowProps {
  jobId: string | null;
  readiness: PreviewGuideReadiness;
}

export function PreviewGuideCompletionRow({ jobId, readiness }: PreviewGuideCompletionRowProps) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<CompletionPhase>(() => readiness === "reviewed" ? "hidden" : "visible");
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef({ jobId, readiness });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(query.matches);
    query.addEventListener?.("change", handleChange);
    return () => query.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    const prior = previous.current;
    previous.current = { jobId, readiness };

    if (prior.jobId !== jobId) {
      setAnnouncement("");
      setPhase(readiness === "reviewed" ? "hidden" : "visible");
      return;
    }

    if (prior.readiness !== "reviewed" && readiness === "reviewed") {
      setAnnouncement("Preview Guide reviewed");
      setPhase(reducedMotion ? "hidden" : "confirming");
      return;
    }

    if (readiness !== "reviewed") {
      setAnnouncement("");
      setPhase("visible");
    }
  }, [jobId, readiness, reducedMotion]);

  useEffect(() => {
    if (phase !== "confirming") return;
    const collapseTimer = window.setTimeout(() => setPhase("collapsing"), PREVIEW_GUIDE_CONFIRM_MS);
    return () => window.clearTimeout(collapseTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "collapsing") return;
    const hideTimer = window.setTimeout(() => setPhase("hidden"), PREVIEW_GUIDE_COLLAPSE_MS);
    return () => window.clearTimeout(hideTimer);
  }, [phase]);

  const completed = readiness === "reviewed";
  const collapsing = phase === "collapsing";

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {phase !== "hidden" && (
        <div
          data-preview-guide-row={phase}
          className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
            collapsing ? "mt-0 grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-start gap-2.5 pb-2">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color] duration-300 motion-reduce:transition-none ${
                  completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-white/50 text-transparent"
                }`}
                aria-hidden="true"
              >
                <Check
                  size={12}
                  strokeWidth={3}
                  className={`transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
                    completed ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`break-words text-[13px] font-bold ${completed ? "text-emerald-100" : "text-white/90"}`}>
                  {completed ? "Preview Guide reviewed" : "Preview Guide ready"}
                </p>
                <p className="mt-0.5 break-words text-[12px] font-medium leading-snug text-white/65">
                  {completed
                    ? "Review complete for the next actionable job"
                    : readiness === "unavailable"
                      ? "Preview Guide is unavailable"
                      : "Review is required before Ride Mode"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
