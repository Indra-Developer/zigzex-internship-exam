"use client";

import { useState } from "react";

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
};

export function PasswordInput({ value, onChange, required, minLength, autoComplete, placeholder, className = "" }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return <div className="relative"><input value={value} onChange={(event) => onChange(event.target.value)} type={visible ? "text" : "password"} required={required} minLength={minLength} autoComplete={autoComplete} placeholder={placeholder} className={`w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`} /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-blue-600">{visible ? <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.3A10.8 10.8 0 0112 4c5.2 0 8.7 4.2 9.8 6a17.5 17.5 0 01-3.1 3.6M6.2 6.2C4.4 7.4 3.2 9 2.2 10.5 3.3 12.3 6.8 16 12 16c.7 0 1.4-.1 2-.2" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.2 10.5C3.3 8.7 6.8 5 12 5s8.7 3.7 9.8 5.5C20.7 12.3 17.2 16 12 16s-8.7-3.7-9.8-5.5z" /><circle cx="12" cy="10.5" r="2.5" /></svg>}</button></div>;
}
