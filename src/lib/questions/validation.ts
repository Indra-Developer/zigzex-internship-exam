export const questionCategories = ["technical", "aptitude", "python", "java"] as const;

export type QuestionCategory = (typeof questionCategories)[number];

export type QuestionRecord = {
  id: string;
  category: QuestionCategory;
  question: string;
  options: { id: string; text: string }[];
  correctOption: string;
  marks: number;
};

const expectedCounts: Record<QuestionCategory, number> = {
  technical: 30,
  aptitude: 15,
  python: 30,
  java: 30,
};

export function validateQuestionBank(input: unknown): QuestionRecord[] {
  if (!Array.isArray(input)) throw new Error("Question bank must be an array.");
  const ids = new Set<string>();
  const counts = { technical: 0, aptitude: 0, python: 0, java: 0 };

  const questions = input.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Question ${index + 1} is invalid.`);
    const candidate = value as Record<string, unknown>;
    const id = candidate.id;
    const category = candidate.category;
    const question = candidate.question;
    const options = candidate.options;
    const correctOption = candidate.correctOption;
    const marks = candidate.marks;

    if (typeof id !== "string" || !id || ids.has(id)) throw new Error(`Question ${index + 1} has a duplicate or invalid ID.`);
    if (!questionCategories.includes(category as QuestionCategory)) throw new Error(`Question ${id} has an invalid category.`);
    if (typeof question !== "string" || !question.trim()) throw new Error(`Question ${id} has no question text.`);
    if (!Array.isArray(options) || options.length !== 4) throw new Error(`Question ${id} must have exactly four options.`);
    if (!options.every((option) => option && typeof option === "object" && typeof (option as Record<string, unknown>).id === "string" && typeof (option as Record<string, unknown>).text === "string")) throw new Error(`Question ${id} has invalid options.`);
    if (typeof correctOption !== "string" || !options.some((option) => (option as { id: string }).id === correctOption)) throw new Error(`Question ${id} has an invalid correct option.`);
    if (marks !== 2) throw new Error(`Question ${id} must be worth 2 marks.`);

    ids.add(id);
    counts[category as QuestionCategory] += 1;
    return { id, category: category as QuestionCategory, question, options: options as QuestionRecord["options"], correctOption, marks };
  });

  if (questions.length !== 105) throw new Error(`Question bank must contain 105 questions, found ${questions.length}.`);
  for (const category of questionCategories) {
    if (counts[category] !== expectedCounts[category]) throw new Error(`${category} must contain ${expectedCounts[category]} questions, found ${counts[category]}.`);
  }
  return questions;
}
