"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudentAttempt, ViolationKind } from "@/types/exam";

type Props = {
  attempt: StudentAttempt;
  studentName: string;
  cameraStream: MediaStream | null;
  initialNotice: string;
  onFinished: (status: "submitted" | "expired") => void;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function categoryLabel(category: string) {
  if (category === "technical") return "Technical MCQ";
  if (category === "aptitude") return "Easy Aptitude";
  return `${category === "python" ? "Python" : "Java"} Logic`;
}

export function ExamInterface({ attempt, studentName, cameraStream, initialNotice, onFinished }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(attempt.answers);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [warning, setWarning] = useState(initialNotice);
  const [mediaTick, setMediaTick] = useState(0);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastViolationRef = useRef<Record<string, number>>({});
  const timeoutSubmittedRef = useRef(false);

  const readOnly = attempt.status !== "in-progress";
  const currentQuestion = attempt.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const cameraConnected = Boolean(cameraStream && cameraStream.getVideoTracks().some((track) => track.readyState === "live") && mediaTick >= 0);
  const microphoneConnected = Boolean(cameraStream && cameraStream.getAudioTracks().some((track) => track.readyState === "live") && mediaTick >= 0);
  const examinationReady = !readOnly && fullscreenActive && cameraConnected && microphoneConnected;

  const logViolation = useCallback(async (kind: ViolationKind, text: string) => {
    setWarning(text);
    const now = Date.now();
    if (now - (lastViolationRef.current[kind] || 0) < 5000) return;
    lastViolationRef.current[kind] = now;
    await fetch("/api/student/attempt/violation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) }).catch(() => undefined);
  }, []);

  const saveCurrentAnswers = useCallback(async () => {
    if (!dirty || readOnly) return;
    setSaving(true); setSaveError("");
    try {
      const response = await fetch("/api/student/attempt/answers", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save answers.");
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [answers, dirty, readOnly]);

  const submitAttempt = useCallback(async (reason: "manual" | "timeout") => {
    if (submitting || readOnly) return;
    setSubmitting(true);
    try {
      await saveCurrentAnswers().catch((caught: unknown) => {
        setSaveError(caught instanceof Error ? caught.message : "Some recent answers could not be saved.");
      });
      const response = await fetch("/api/student/attempt/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
      const data = (await response.json()) as { status?: "submitted" | "expired"; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to submit examination.");
      onFinished(data.status === "expired" ? "expired" : "submitted");
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Unable to submit examination.");
      setSubmitting(false);
    }
  }, [onFinished, readOnly, saveCurrentAnswers, submitting]);

  useEffect(() => {
    if (!videoRef.current || !cameraStream) return;
    videoRef.current.srcObject = cameraStream;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraStream]);

  useEffect(() => {
    if (!cameraStream || readOnly) return;
    const videoTracks = cameraStream.getVideoTracks();
    const audioTracks = cameraStream.getAudioTracks();
    const handleCameraEnded = () => {
      setMediaTick((value) => value + 1);
      void logViolation("webcam-interrupted", "Camera access was interrupted. Reconnect the camera to continue.");
    };
    const handleMicrophoneEnded = () => {
      setMediaTick((value) => value + 1);
      void logViolation("microphone-interrupted", "Microphone access was interrupted. Reconnect the microphone to continue.");
    };
    videoTracks.forEach((track) => track.addEventListener("ended", handleCameraEnded));
    audioTracks.forEach((track) => track.addEventListener("ended", handleMicrophoneEnded));
    return () => {
      videoTracks.forEach((track) => track.removeEventListener("ended", handleCameraEnded));
      audioTracks.forEach((track) => track.removeEventListener("ended", handleMicrophoneEnded));
    };
  }, [cameraStream, logViolation, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") void logViolation("tab-hidden", "The examination tab is hidden. Keep this tab visible until submission.");
    };
    const handleFullscreen = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreenActive(active);
      if (!active) void logViolation("fullscreen-exit", "Fullscreen mode was exited. Return to fullscreen mode to continue.");
    };
    handleFullscreen();
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreen);
    };
  }, [logViolation, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const updateClock = () => {
      const next = Math.max(0, Math.floor((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0 && !timeoutSubmittedRef.current) {
        timeoutSubmittedRef.current = true;
        void submitAttempt("timeout");
      }
    };
    const initial = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [attempt.deadlineAt, readOnly, submitAttempt]);

  useEffect(() => {
    if (!dirty || readOnly) return;
    const timer = window.setTimeout(async () => {
      setSaving(true); setSaveError("");
      try {
        const response = await fetch("/api/student/attempt/answers", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error || "Unable to save answers.");
        setDirty(false);
      } catch (caught) {
        setSaveError(caught instanceof Error ? caught.message : "Unable to save answers.");
      } finally {
        setSaving(false);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [answers, dirty, readOnly]);

  const palette = useMemo(() => attempt.questions.map((question, index) => ({ question, index, answered: Boolean(answers[question.id]) })), [answers, attempt.questions]);

  function chooseAnswer(optionId: string) {
    if (readOnly || !examinationReady) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: optionId }));
    setDirty(true);
    if (currentIndex < attempt.questions.length - 1) setCurrentIndex((index) => index + 1);
  }

  function confirmSubmit() {
    if (window.confirm(`Submit your examination with ${answeredCount} of ${attempt.questions.length} questions answered?`)) void submitAttempt("manual");
  }

  if (!currentQuestion) return <main className="mx-auto max-w-3xl px-6 py-12"><p className="rounded-2xl bg-red-50 p-5 text-red-700">The assigned examination questions could not be loaded.</p></main>;

  const monitoringNotice = !readOnly && !fullscreenActive
    ? "Fullscreen mode is required to continue."
    : !readOnly && !cameraConnected
      ? "Camera access is required to continue."
      : !readOnly && !microphoneConnected
        ? "Microphone access is required to continue."
        : "";

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">ZIGZEX examination</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Good luck, {studentName.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-slate-500">50 questions · 100 marks · one attempt</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-xl px-4 py-2.5 text-lg font-bold tabular-nums ${secondsLeft <= 300 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{formatTime(secondsLeft)}</span>
          <button type="button" disabled={submitting || readOnly} onClick={confirmSubmit} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? "Submitting…" : "Submit examination"}</button>
        </div>
      </div>

      {(warning || saveError || monitoringNotice) && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">{warning || saveError || monitoringNotice}</div>}

      <section className="mt-5 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Examination monitoring</p>
            <h2 className="mt-2 text-xl font-bold">Maintain the required examination environment</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full px-3 py-1.5 ${cameraConnected ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>Camera {cameraConnected ? "active" : "unavailable"}</span>
            <span className={`rounded-full px-3 py-1.5 ${microphoneConnected ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>Microphone {microphoneConnected ? "active" : "unavailable"}</span>
            <span className={`rounded-full px-3 py-1.5 ${fullscreenActive ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>Fullscreen {fullscreenActive ? "active" : "required"}</span>
          </div>
        </div>
        <div className="grid gap-5 border-t border-white/10 p-5 sm:p-6 md:grid-cols-[minmax(0,340px)_1fr] md:items-center">
          <div className="overflow-hidden rounded-2xl bg-slate-800">
            <video ref={videoRef} muted playsInline className={`aspect-video w-full object-cover ${cameraConnected ? "" : "hidden"}`} />
            {!cameraConnected && <div className="flex aspect-video items-center justify-center px-4 text-center text-sm leading-6 text-slate-400">Camera preview unavailable.<br />Camera access is required.</div>}
          </div>
          <div className="max-w-2xl text-sm leading-6 text-slate-300">
            <p>Keep fullscreen mode active and maintain camera and microphone access until the examination is submitted.</p>
            <p className="mt-3 text-slate-400">Tab visibility and fullscreen status are checked during the examination.</p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <p className="text-sm font-semibold text-blue-700">Question {currentIndex + 1} of {attempt.questions.length}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">{categoryLabel(currentQuestion.category)} · {currentQuestion.marks} marks</p>
            </div>
            <p className="text-sm text-slate-500">{saving ? "Saving answer…" : dirty ? "Answer not saved yet" : `${answeredCount}/${attempt.questions.length} answered`}</p>
          </div>
          <h2 className="mt-8 max-w-3xl text-2xl font-bold leading-relaxed text-slate-950">{currentQuestion.question}</h2>
          <div className="mt-8 grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const selected = answers[currentQuestion.id] === option.id;
              return <button key={option.id} type="button" disabled={readOnly || !examinationReady} onClick={() => chooseAnswer(option.id)} className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition ${selected ? "border-blue-500 bg-blue-50 text-blue-950 ring-4 ring-blue-100" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-60`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{String.fromCharCode(65 + index)}</span><span className="pt-1 font-medium">{option.text}</span></button>;
            })}
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <button type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-40">← Previous</button>
            <button type="button" disabled={currentIndex === attempt.questions.length - 1} onClick={() => setCurrentIndex((index) => Math.min(attempt.questions.length - 1, index + 1))} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Next →</button>
          </div>
        </section>

        <aside>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Question palette</h2><span className="text-xs text-slate-400">{answeredCount}/{attempt.questions.length}</span></div>
            <div className="mt-4 grid grid-cols-5 gap-2">{palette.map(({ question, index, answered }) => <button type="button" key={question.id} onClick={() => setCurrentIndex(index)} className={`h-9 rounded-lg text-xs font-bold transition ${index === currentIndex ? "bg-blue-600 text-white" : answered ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{index + 1}</button>)}</div>
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />Answered</p><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />Unanswered</p></div>
          </section>
        </aside>
      </div>
    </main>
  );
}
