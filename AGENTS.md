<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Load the `/home/aks/vs_stuff/Development/ui_devs/rt-messaging/.agents/**` folder to see the skills and capabilities of the agents available in this project. 

Readt the requirements in `requirements.md`

Read the `package.json` file to understand the dependencies and scripts available for managing agents. You can also install other library if required with my permission.

Use `bun` runtime

Update the `.gitignore` file to exclude any sensitive files and don't remove any existing entries. If you need to add new entries, please do so carefully and ensure they are necessary.

git command are prohibited. Ask permission before running any git commands.

## What must to be followed

1. **Real-Time Behavior:** Low-latency delivery, typing/read states and sensible
   reconnection behavior

2. **Backend & Database:** Message model, pagination, indexing, authorization and clear
   APIs

3. **Moderation:** Lightweight image moderation, server-side profanity blocking
   and resistance to simple bypasses

4. **Reliability:** Duplicate prevention, retries, idempotency and multi-session
   behavior

5. **UI / UX:** Usable responsive chat layout, media picker behavior and clear
   message states
