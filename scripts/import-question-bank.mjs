import { readFile } from "node:fs/promises";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY before importing.");
}

const raw = await readFile(new URL("../src/data/question-bank.json", import.meta.url), "utf8");
const questions = JSON.parse(raw);
if (!Array.isArray(questions) || questions.length !== 105) throw new Error("Question bank must contain exactly 105 questions.");
if (new Set(questions.map((question) => question.id)).size !== 105) throw new Error("Question IDs must be unique.");

const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const firestore = getFirestore(app);
const batch = firestore.batch();
for (const question of questions) {
  batch.set(firestore.collection("questions").doc(question.id), { ...question, importedAt: FieldValue.serverTimestamp() });
}
await batch.commit();
console.log(`Imported ${questions.length} questions into Firestore.`);
