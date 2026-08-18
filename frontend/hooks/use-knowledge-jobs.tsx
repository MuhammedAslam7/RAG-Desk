"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, Upload, Globe, CheckCircle2, AlertCircle } from "lucide-react";
import { KnowledgeJob } from "@/types";

export interface JobToast extends KnowledgeJob {
  key: string;
}

export interface JobRunCtx {
  update: (p: KnowledgeJob) => void;
}

export interface StartJobOptions {
  kind: "upload" | "crawl";
  initial: { stage: string; progress: number; message: string };
  run: (ctx: JobRunCtx) => Promise<void>;
}

interface KnowledgeJobsValue {
  jobs: JobToast[];
  startJob: (opts: StartJobOptions) => void;
}

const KnowledgeJobsContext = createContext<KnowledgeJobsValue | null>(null);

let keyCounter = 0;

/**
 * Global provider for knowledge ingestion jobs (upload / crawl). Renders each
 * running job as a progress toast (bottom-right) that survives page
 * navigation. The ✕ button only dismisses the toast — the job keeps running in
 * the background and the knowledge list refreshes when it finishes.
 */
export function KnowledgeJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobToast[]>([]);
  const timeouts = useRef(new Map<string, number>());

  const removeToast = useCallback((key: string) => {
    const t = timeouts.current.get(key);
    if (t) window.clearTimeout(t);
    timeouts.current.delete(key);
    setJobs((prev) => prev.filter((j) => j.key !== key));
  }, []);

  const startJob = useCallback(
    ({ kind, initial, run }: StartJobOptions) => {
      const key = `job-${++keyCounter}`;
      setJobs((prev) => [
        ...prev,
        {
          id: "",
          key,
          kind,
          status: "running",
          stage: initial.stage,
          progress: initial.progress,
          message: initial.message,
          error: null,
        },
      ]);

      const ctx: JobRunCtx = {
        update: (p) =>
          setJobs((prev) => prev.map((j) => (j.key === key ? { ...j, ...p, key } : j))),
      };

      const finish = (
        status: "completed" | "failed",
        message: string,
        error: string | null,
        delay: number
      ) => {
        setJobs((prev) =>
          prev.map((j) => (j.key === key ? { ...j, status, message, error } : j))
        );
        const t = window.setTimeout(() => removeToast(key), delay);
        timeouts.current.set(key, t);
      };

      // Defer run() so a synchronous throw is handled by the rejection path
      // instead of crashing the caller.
      Promise.resolve()
        .then(() => run(ctx))
        .then(
          () =>
            finish(
              "completed",
              kind === "crawl" ? "Pages are ready to use" : "Your content is ready to use",
              null,
              1800
            ),
          (err: Error) =>
            finish("failed", err.message || "Operation failed", err.message || "Operation failed", 8000)
        );
    },
    [removeToast]
  );

  const value = useMemo(() => ({ jobs, startJob }), [jobs, startJob]);

  return (
    <KnowledgeJobsContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2 pointer-events-none">
        {jobs.map((job) => (
          <ToastCard key={job.key} job={job} onDismiss={() => removeToast(job.key)} />
        ))}
      </div>
    </KnowledgeJobsContext.Provider>
  );
}

function ToastCard({ job, onDismiss }: { job: JobToast; onDismiss: () => void }) {
  const isRunning = job.status === "running";
  const indeterminate = isRunning && (job.indeterminate || job.progress <= 0);
  const Icon = job.kind === "crawl" ? Globe : Upload;
  return (
    <div className="pointer-events-auto rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              job.status === "failed"
                ? "bg-destructive/10 text-destructive"
                : job.kind === "crawl"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-primary/10 text-primary"
            }`}
          >
            {job.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : job.status === "failed" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground truncate">
            {job.status === "failed"
              ? "Add failed"
              : job.status === "completed"
                ? job.kind === "crawl"
                  ? "Crawl complete"
                  : "Upload complete"
                : job.kind === "crawl"
                  ? "Crawling website"
                  : "Uploading file"}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isRunning ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate">{job.message}</p>
            {!indeterminate && (
              <span className="text-xs font-semibold text-foreground tabular-nums flex-shrink-0">
                {job.progress}%
              </span>
            )}
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            {indeterminate ? (
              <div
                className="h-full w-1/3 rounded-full bg-primary"
                style={{ animation: "progress-indeterminate 1.4s ease-in-out infinite" }}
              />
            ) : (
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${job.progress}%` }}
              />
            )}
          </div>
        </div>
      ) : (
        <p
          className={`mt-2 text-xs ${
            job.status === "failed" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {job.message}
        </p>
      )}
    </div>
  );
}

export function useKnowledgeJobs(): KnowledgeJobsValue {
  const ctx = useContext(KnowledgeJobsContext);
  if (!ctx) throw new Error("useKnowledgeJobs must be used within KnowledgeJobsProvider");
  return ctx;
}
