type ExamInstructionsProps = {
  durationMinutes: number;
};

const instructions = [
  {
    title: "Question format",
    text: "The examination contains 50 multiple-choice questions for a total of 100 marks.",
  },
  {
    title: "Time limit",
    text: "You have the duration shown below to complete and submit the examination.",
  },
  {
    title: "Examination environment",
    text: "Fullscreen mode, camera access and microphone access must remain active throughout the examination.",
  },
  {
    title: "Answer saving",
    text: "Answers are saved automatically. Select one answer for each question and review the question palette before submitting.",
  },
  {
    title: "Submission",
    text: "Submit before the timer expires. After submission, the examination attempt cannot be reopened.",
  },
];

export function ExamInstructions({ durationMinutes }: ExamInstructionsProps) {
  return (
    <section className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 sm:p-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Examination instructions</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Read before you begin</h2>
        </div>
        <p className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm">Duration: {durationMinutes} minutes</p>
      </div>
      <ol className="mt-6 grid gap-4 md:grid-cols-2">
        {instructions.map((instruction, index) => (
          <li key={instruction.title} className="flex gap-3 rounded-2xl border border-blue-100 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span>
            <div>
              <p className="font-semibold text-slate-900">{instruction.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{instruction.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
