"use client";

/* Profile photo URLs are user-provided; next/image would require a fixed remote host allowlist. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ExamLanguage, StudentAttempt, StudentMe } from "@/types/exam";
import type { StudentResult } from "@/types/result";
import { ExamInterface } from "@/components/student/ExamInterface";
import { ExamInstructions } from "@/components/student/ExamInstructions";
import { PreExamChecks, type BrowserPermission } from "@/components/student/PreExamChecks";
import { StudentResultCard } from "@/components/student/StudentResultCard";
import { StudentSignOutButton } from "@/components/student/StudentSignOutButton";

type PortalView = "loading" | "identity" | "exam" | "closed";

async function readJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function StudentHeader({ name, email }: { name: string; email: string }) {
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div className="flex items-center gap-3"><Image src="/zigzex-logo.png" alt="ZIGZEX IT Services Private Limited" width={260} height={108} priority className="h-10 w-auto object-contain" /><span className="sr-only">Internship Examination</span></div><div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{name}</p><p className="text-xs text-slate-500">{email}</p></div><StudentSignOutButton /></div></div></header>;
}

export function StudentPortal() {
  const [me, setMe] = useState<StudentMe | null>(null);
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [view, setView] = useState<PortalView>("loading");
  const [language, setLanguage] = useState<ExamLanguage>("python");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPreviewStream, setCameraPreviewStream] = useState<MediaStream | null>(null);
  const [microphonePreviewStream, setMicrophonePreviewStream] = useState<MediaStream | null>(null);
  const [cameraNotice, setCameraNotice] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [cameraTesting, setCameraTesting] = useState(false);
  const [microphoneTesting, setMicrophoneTesting] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<BrowserPermission>("unknown");
  const [microphonePermission, setMicrophonePermission] = useState<BrowserPermission>("unknown");
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [previewTick, setPreviewTick] = useState(0);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  const refreshBrowserPermissions = useCallback(async () => {
    if (!navigator.permissions?.query) return;
    const readPermission = async (name: "camera" | "microphone", update: (state: BrowserPermission) => void) => {
      try {
        const permission = await navigator.permissions.query({ name: name as PermissionName });
        update(permission.state as BrowserPermission);
      } catch {
        update("unknown");
      }
    };
    await Promise.all([
      readPermission("camera", setCameraPermission),
      readPermission("microphone", setMicrophonePermission),
    ]);
  }, []);

  useEffect(() => {
    if (view !== "identity") return;
    let disposed = false;
    const bindings: Array<{ name: "camera" | "microphone"; update: (state: BrowserPermission) => void }> = [
      { name: "camera", update: setCameraPermission },
      { name: "microphone", update: setMicrophonePermission },
    ];
    const permissionStatuses: Array<{ status: PermissionStatus; handler: () => void }> = [];
    const bindPermissionChanges = async () => {
      if (!navigator.permissions?.query) return;
      for (const binding of bindings) {
        try {
          const status = await navigator.permissions.query({ name: binding.name as PermissionName });
          if (disposed) return;
          binding.update(status.state as BrowserPermission);
          const handler = () => binding.update(status.state as BrowserPermission);
          status.addEventListener("change", handler);
          permissionStatuses.push({ status, handler });
        } catch {
          binding.update("unknown");
        }
      }
    };
    const handleFullscreenChange = () => setFullscreenActive(Boolean(document.fullscreenElement));

    handleFullscreenChange();
    void refreshBrowserPermissions();
    void bindPermissionChanges();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    const interval = window.setInterval(() => { void refreshBrowserPermissions(); }, 1000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      permissionStatuses.forEach(({ status, handler }) => status.removeEventListener("change", handler));
    };
  }, [refreshBrowserPermissions, view]);

  useEffect(() => {
    if (!cameraVideoRef.current) return;
    cameraVideoRef.current.srcObject = cameraPreviewStream;
    if (cameraPreviewStream) void cameraVideoRef.current.play().catch(() => undefined);
  }, [cameraPreviewStream]);

  useEffect(() => {
    const cameraTracks = cameraPreviewStream?.getVideoTracks() || [];
    const microphoneTracks = microphonePreviewStream?.getAudioTracks() || [];
    const handleCameraEnded = () => {
      setPreviewTick((value) => value + 1);
      setCameraPermission("unknown");
      setError("Camera access was interrupted. Complete the camera check again.");
    };
    const handleMicrophoneEnded = () => {
      setPreviewTick((value) => value + 1);
      setMicrophonePermission("unknown");
      setMicrophoneLevel(0);
      setError("Microphone access was interrupted. Complete the microphone check again.");
    };
    cameraTracks.forEach((track) => track.addEventListener("ended", handleCameraEnded));
    microphoneTracks.forEach((track) => track.addEventListener("ended", handleMicrophoneEnded));
    return () => {
      cameraTracks.forEach((track) => track.removeEventListener("ended", handleCameraEnded));
      microphoneTracks.forEach((track) => track.removeEventListener("ended", handleMicrophoneEnded));
    };
  }, [cameraPreviewStream, microphonePreviewStream]);

  useEffect(() => {
    if (!microphonePreviewStream) return;
    let audioContext: AudioContext | null = null;
    let animationFrame = 0;
    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(microphonePreviewStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const updateLevel = () => {
        analyser.getByteTimeDomainData(data);
        let total = 0;
        data.forEach((value) => {
          const normalized = (value - 128) / 128;
          total += normalized * normalized;
        });
        setMicrophoneLevel(Math.min(100, Math.round(Math.sqrt(total / data.length) * 220)));
        animationFrame = window.requestAnimationFrame(updateLevel);
      };
      void audioContext.resume().catch(() => undefined);
      updateLevel();
      return () => {
        window.cancelAnimationFrame(animationFrame);
        source.disconnect();
        analyser.disconnect();
        void audioContext?.close();
      };
    } catch {
      return undefined;
    }
  }, [microphonePreviewStream]);

  useEffect(() => () => {
    stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  useEffect(() => () => {
    cameraPreviewStream?.getTracks().forEach((track) => track.stop());
  }, [cameraPreviewStream]);

  useEffect(() => () => {
    microphonePreviewStream?.getTracks().forEach((track) => track.stop());
  }, [microphonePreviewStream]);

  const loadPortal = useCallback(async () => {
    try {
      const profile = await readJson<StudentMe>("/api/student/me", { cache: "no-store" });
      setMe(profile);
      if (!profile.attempt) {
        setAttempt(null);
        setResult(null);
        setView("identity");
        return;
      }

      const existing = await readJson<{ attempt: StudentAttempt }>("/api/student/attempt", { cache: "no-store" });
      setAttempt(existing.attempt);
      if (existing.attempt.status === "in-progress") {
        if (navigator.mediaDevices?.getUserMedia) {
          try {
            const refreshedStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const cameraReady = refreshedStream.getVideoTracks().some((track) => track.readyState === "live");
            const microphoneReady = refreshedStream.getAudioTracks().some((track) => track.readyState === "live");
            if (!cameraReady || !microphoneReady) {
              refreshedStream.getTracks().forEach((track) => track.stop());
              throw new Error("Camera and microphone access is required to continue monitoring.");
            }
            setStream(refreshedStream);
          } catch {
            setCameraNotice("Camera and microphone access is required to continue monitoring. Reconnect both devices if necessary.");
            await fetch("/api/student/attempt/violation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "webcam-interrupted" }) }).catch(() => undefined);
            await fetch("/api/student/attempt/violation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "microphone-interrupted" }) }).catch(() => undefined);
          }
        }
        setView("exam");
      } else {
        const resultData = await readJson<{ result: StudentResult | null }>("/api/student/result", { cache: "no-store" });
        setResult(resultData.result);
        setView("closed");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your examination.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPortal(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPortal]);

  async function enterFullscreen() {
    setError("");
    if (!document.documentElement.requestFullscreen) {
      setError("Fullscreen mode is not supported by this browser.");
      return;
    }
    const granted = await document.documentElement.requestFullscreen().then(() => true).catch(() => false);
    if (!granted || !document.fullscreenElement) {
      setFullscreenActive(false);
      setError("Fullscreen mode is required before starting the examination.");
    } else {
      setFullscreenActive(true);
    }
  }

  async function testCamera() {
    setCameraTesting(true); setError("");
    cameraPreviewStream?.getTracks().forEach((track) => track.stop());
    setCameraPreviewStream(null);
    let nextStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not supported by this browser.");
      nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const cameraReady = nextStream.getVideoTracks().some((track) => track.readyState === "live");
      if (!cameraReady) throw new Error("Camera access could not be confirmed.");
      setCameraPreviewStream(nextStream);
      nextStream = null;
      setCameraPermission("granted");
      void refreshBrowserPermissions();
    } catch (caught) {
      await refreshBrowserPermissions();
      setError(caught instanceof Error ? caught.message : "Allow camera access, then test the camera again.");
    } finally {
      nextStream?.getTracks().forEach((track) => track.stop());
      setCameraTesting(false);
    }
  }

  async function testMicrophone() {
    if (!cameraPreviewStream) {
      setError("Complete the camera check before testing the microphone.");
      return;
    }
    setMicrophoneTesting(true); setError("");
    microphonePreviewStream?.getTracks().forEach((track) => track.stop());
    setMicrophonePreviewStream(null);
    setMicrophoneLevel(0);
    let nextStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is not supported by this browser.");
      nextStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      const microphoneReady = nextStream.getAudioTracks().some((track) => track.readyState === "live");
      if (!microphoneReady) throw new Error("Microphone access could not be confirmed.");
      setMicrophonePreviewStream(nextStream);
      nextStream = null;
      setMicrophonePermission("granted");
      void refreshBrowserPermissions();
    } catch (caught) {
      await refreshBrowserPermissions();
      setError(caught instanceof Error ? caught.message : "Allow microphone access, then test the microphone again.");
    } finally {
      nextStream?.getTracks().forEach((track) => track.stop());
      setMicrophoneTesting(false);
    }
  }

  async function startExam() {
    if (!me?.canStart || starting) return;
    setStarting(true); setError(""); setCameraNotice("");
    cameraPreviewStream?.getTracks().forEach((track) => track.stop());
    microphonePreviewStream?.getTracks().forEach((track) => track.stop());
    setMicrophoneLevel(0);
    setCameraPreviewStream(null); setMicrophonePreviewStream(null);
    let nextStream: MediaStream | null = null;
    try {
      if (!document.fullscreenElement) throw new Error("Enter fullscreen mode before starting the examination.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera and microphone access is not supported by this browser.");
      nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const cameraReady = nextStream.getVideoTracks().some((track) => track.readyState === "live");
      const microphoneReady = nextStream.getAudioTracks().some((track) => track.readyState === "live");
      if (!cameraReady || !microphoneReady) throw new Error("Camera and microphone permissions are required to start the examination.");
      const response = await readJson<{ attempt: StudentAttempt }>("/api/student/attempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ language }) });
      setStream(nextStream); setAttempt(response.attempt); setView("exam");
    } catch (caught) {
      nextStream?.getTracks().forEach((track) => track.stop());
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setFullscreenActive(false);
      await refreshBrowserPermissions();
      setError(caught instanceof Error ? caught.message : "Fullscreen, camera and microphone access are required to start the examination.");
    } finally { setStarting(false); }
  }

  function finishExam(status: "submitted" | "expired") {
    setAttempt((current) => current ? { ...current, status, submittedAt: new Date().toISOString() } : current);
    setView("closed");
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    void loadPortal();
  }

  if (view === "loading" || !me) return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6"><div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">Loading your examination…</div></main>;

  const cameraPreviewReady = Boolean(cameraPreviewStream && cameraPreviewStream.getVideoTracks().some((track) => track.readyState === "live") && previewTick >= 0);
  const microphonePreviewReady = Boolean(microphonePreviewStream && microphonePreviewStream.getAudioTracks().some((track) => track.readyState === "live") && previewTick >= 0);
  const startReady = me.canStart && fullscreenActive && cameraPermission === "granted" && microphonePermission === "granted" && cameraPreviewReady && microphonePreviewReady && !starting;

  return <div className="min-h-screen bg-slate-50"><StudentHeader name={me.student.fullName} email={me.student.email} />{view === "exam" && attempt ? <ExamInterface attempt={attempt} studentName={me.student.fullName} cameraStream={stream} initialNotice={cameraNotice} onFinished={finishExam} /> : view === "closed" && attempt && result ? <StudentResultCard result={result} /> : view === "closed" && attempt ? <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center px-6 py-12"><section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">✓</div><p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Examination submitted</p><h1 className="mt-3 text-3xl font-bold text-slate-950">Your attempt is locked</h1><p className="mx-auto mt-4 max-w-lg leading-7 text-slate-500">Your answers are saved. The result is being prepared and will appear here when evaluation is complete.</p></section></main> : <main className="mx-auto max-w-5xl px-6 py-10"><div className="space-y-8"><section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Identity confirmation</p><h1 className="mt-3 text-3xl font-bold text-slate-950">Confirm your identity before starting</h1><p className="mt-3 max-w-2xl leading-7 text-slate-500">Check your profile details, choose a programming language and complete the required examination checks before you begin.</p><div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr] md:items-center"><div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-blue-50 text-4xl font-bold text-blue-700">{me.student.photoUrl ? <img src={me.student.photoUrl} alt="Profile" className="h-full w-full object-cover" /> : me.student.fullName.charAt(0).toUpperCase()}</div><div><p className="text-2xl font-bold text-slate-950">{me.student.fullName}</p><p className="mt-1 text-slate-500">{me.student.email}</p><div className="mt-5 flex flex-wrap gap-3"><label className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${language === "python" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><input type="radio" name="language" value="python" checked={language === "python"} onChange={() => setLanguage("python")} className="sr-only" />Python</label><label className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${language === "java" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><input type="radio" name="language" value="java" checked={language === "java"} onChange={() => setLanguage("java")} className="sr-only" />Java</label></div></div></div><PreExamChecks fullscreenActive={fullscreenActive} cameraPermission={cameraPermission} microphonePermission={microphonePermission} cameraReady={cameraPreviewReady} microphoneReady={microphonePreviewReady} microphoneLevel={microphoneLevel} cameraVideoRef={cameraVideoRef} cameraTesting={cameraTesting} microphoneTesting={microphoneTesting} onEnterFullscreen={() => void enterFullscreen()} onTestCamera={() => void testCamera()} onTestMicrophone={() => void testMicrophone()} />{!me.settings.enabled && <p className="mt-8 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">The examination is currently disabled by the administrator. Access will be available when the examination is enabled.</p>}{error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}<div className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center"><p className="text-sm leading-6 text-slate-500">{startReady ? "All required checks are complete. You may start the examination." : "Complete fullscreen, camera and microphone checks in order to continue."}</p><button type="button" disabled={!startReady} onClick={() => void startExam()} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{starting ? "Preparing examination…" : "Start examination"}</button></div></section><ExamInstructions durationMinutes={me.settings.durationMinutes} /></div></main>}</div>;
}
