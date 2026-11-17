# ZIGZEX Internship Entrance Examination

A lightweight Next.js examination platform for ZIGZEX IT Services Private Limited.

## Technology

- Next.js App Router with TypeScript
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Next.js Route Handlers for protected server operations
- Vercel-compatible deployment

## Included functionality

- Administrator authentication and protected dashboard
- Candidate account creation, editing, activation, deactivation, deletion and password changes
- Examination settings and cutoff management
- Validated 105-question bank with stable IDs
- Python or Java selection with randomized server-created attempts
- Automatic answer saving, countdown timer and one-attempt protection
- Fullscreen, camera, microphone and supported browser monitoring checks
- Automatic evaluation, qualification status and result display
- Administrative result filtering and CSV export

## Local setup

1. Install Node.js 24.x or use the Node.js version configured by Vercel.
2. Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

3. Fill the server-only values in `.env.local`:

```env
FIREBASE_PROJECT_ID=zigzex-internship-exam
FIREBASE_CLIENT_EMAIL=your-service-account-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_EMAILS=administrator@example.com
```

`FIREBASE_PRIVATE_KEY` must be the private key from the Firebase service-account JSON. Keep `.env.local` private. It is ignored by Git.

4. Install and run:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Firebase setup

1. Open the Firebase project `zigzex-internship-exam`.
2. Enable Authentication → Sign-in method → Email/Password.
3. Create the administrator account under Authentication → Users.
4. Add the administrator email to `ADMIN_EMAILS`.
5. Create a Cloud Firestore database.
6. Deploy the rules from this repository:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

7. After deployment, create or import the question bank from the administrator dashboard.
8. Add the deployed Vercel domain to Firebase Authentication → Settings → Authorized domains. Add both the default `*.vercel.app` domain and any custom domain used by the examination site.

## Environment variables

The browser Firebase values use the `NEXT_PUBLIC_` prefix because Firebase Authentication runs in the browser. Firebase web configuration values are intended to be public; the Firebase Admin values must remain server-only.

Required variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
ADMIN_EMAILS
```

Optional variables:

```text
ADMIN_SESSION_COOKIE=zigzex_admin_session
STUDENT_SESSION_COOKIE=zigzex_student_session
```

Vercel does not automatically import `.env.local` from GitHub. Add the variables once in the Vercel project settings or with the Vercel CLI. After they are saved for the selected environment, Vercel injects them automatically during future builds and deployments.

## GitHub deployment process

Create an empty GitHub repository first. Do not upload `.env.local` or any service-account JSON file.

From the project folder:

```powershell
git status
git add .
git commit -m "Prepare ZIGZEX examination platform for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

If a remote already exists, skip `git remote add origin` and verify it with:

```powershell
git remote -v
```

The committed `.env.example` documents the required variables. The real `.env.local` remains ignored.

## Vercel deployment through the dashboard

1. Open [Vercel](https://vercel.com) and select **Add New → Project**.
2. Import the GitHub repository.
3. Keep the detected framework as **Next.js**.
4. Keep the default build command, or use `npm run build`.
5. In **Environment Variables**, add every required variable listed above.
6. Select **Production** for the live site. Select **Preview** and **Development** too if preview deployments need Firebase access.
7. Deploy the project.
8. Add the generated Vercel domain to Firebase Authentication authorized domains.

For `FIREBASE_PRIVATE_KEY`, paste the complete service-account private key. The application converts escaped `\\n` characters to real line breaks at runtime.

## Vercel deployment through the CLI

Use the CLI if you prefer terminal-based deployment:

```powershell
npm install -g vercel
vercel login
vercel link
```

Add each variable when prompted. Repeat for `preview` or `development` if required:

```powershell
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
vercel env add FIREBASE_PROJECT_ID production
vercel env add FIREBASE_CLIENT_EMAIL production
vercel env add FIREBASE_PRIVATE_KEY production
vercel env add ADMIN_EMAILS production
```

Then deploy:

```powershell
vercel --prod
```

To download the Vercel environment into a local file for development:

```powershell
vercel env pull .env.local
```

## Question bank import

After Firebase Admin variables are configured, sign in to the administrator dashboard and select **Import 105 questions**. The import is safe to repeat because every question uses a stable ID.

The CLI alternative is available locally after `.env.local` is configured:

```powershell
npm run questions:import
```

## Verification commands

Run these before pushing to GitHub or deploying:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Data protection notes

- Student passwords are managed by Firebase Authentication and are never stored in Firestore.
- Question answer keys are server-side only.
- Attempts and results are protected by authenticated Route Handlers and Firestore rules.
- Webcam and microphone streams are used for browser-side permission and connection checks; they are not uploaded as media files.
