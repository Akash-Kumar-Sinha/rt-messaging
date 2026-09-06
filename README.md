# Real-Time Messaging Platform

A high-performance, secure real-time messaging application built with **Next.js 16 (App Router)**, **React 19**, **Bun**, **WebSockets**, **PostgreSQL (Prisma ORM)**, and **Redis**.

---

## Setup Instructions

### Prerequisites

- **[Bun](https://bun.sh)** (v1.3+ recommended)
- **PostgreSQL** (v15+)
- **Redis** (v7+)

### 1. Clone & Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

#### Complete Environment Variables Reference

```env
# ── Authoritative Database & Cache (Required) ─────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/rt_messaging"
REDIS_URL="redis://127.0.0.1:6379"

# ── Authentication & Security (Required) ──────────────────────────────
# Cryptographically strong secret key for JWT signing (generate via: openssl rand -hex 32)
JWT_SECRET="your-32-byte-hex-jwt-secret"

# ── Server Ports & Client WebSocket (Optional Defaults) ───────────────
PORT=3000
WS_PORT=3001
NEXT_PUBLIC_WS_PORT=3001
NEXT_PUBLIC_WS_URL="ws://localhost:3001"

# ── External Media Integrations (Optional) ────────────────────────────
# Giphy API key for animated GIF and Sticker search
GIPHY_API_KEY="your-giphy-api-key"

# ── Message Rate Limiting Policy (Optional) ───────────────────────────
MESSAGE_RATE_LIMIT=100
MESSAGE_RATE_WINDOW_SECONDS=60
MESSAGE_RATE_LIMIT_ENABLED=true

# ── Server-Side Image Moderation (Optional) ───────────────────────────
NSFW_MODEL="onnx-community/nsfw_image_detection-ONNX"
NSFW_THRESHOLD=0.80
NSFW_MODERATION_TIMEOUT_MS=10000
```

### 3. Initialize Database

Generate the Prisma client and initialize schema tables:

```bash
bun prisma contract emit
bun prisma db init --yes
```

### 4. Run Application

```bash
# Start both Next.js app & WebSocket gateway concurrently
bun dev

# Run automated test suite (43 tests)
bun test

# Production build & start
bun run build
bun start
```

Open **`http://localhost:3000`** in your browser.

---

## Architecture Notes

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                 Browser Client (React 19)                   │
  │     - Split-pane Responsive UI                              │
  │     - useWebSocket hook with auto-reconnect & backoff       │
  │     - BroadcastChannel API for multi-tab synchronization    │
  └──────────────┬───────────────────────────────┬──────────────┘
                 │ HTTPS / REST                  │ WebSocket (/ws)
                 ▼                               ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                  Next.js & WebSocket Gateway                │
  │  ┌───────────────────────────────────────────────────────┐  │
  │  │         Centralized Message Processing Pipeline       │  │
  │  │  1. Authentication & Token Verification               │  │
  │  │  2. Conversation Membership Authorization             │  │
  │  │  3. Sliding-Window Rate Limiting (Redis + Fallback)   │  │
  │  │  4. Text Normalization & Profanity Filtering          │  │
  │  │  5. Hugging Face Nudes / NSFW Image Detection         │  │
  │  │  6. Idempotency Check (clientMessageId)               │  │
  │  │  7. Transactional DB Persistence & Receipt Creation   │  │
  │  │  8. Real-Time Broadcast to Active Members             │  │
  │  └───────────────────────────────────────────────────────┘  │
  └──────────────┬───────────────────────────────┬──────────────┘
                 │                               │
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌────────────────────────────┐
  │      PostgreSQL (Prisma)     │ │        Redis Engine        │
  │  - Authoritative data store  │ │  - Ephemeral presence      │
  │  - Users, Chats, Receipts    │ │  - Typing indicators      │
  │  - Composite indexes for     │ │  - Sliding rate limits     │
  │    sub-ms cursor pagination  │ │  - Pub/Sub broadcasting    │
  └──────────────────────────────┘ └────────────────────────────┘
```

- **Unified Processing Pipeline:** Message validation, moderation, and persistence logic are centralized in a single pipeline service shared across HTTP REST endpoints and WebSocket events.
- **Bi-directional Real-Time Layer:** The custom WebSocket gateway handles authenticated socket communication, room subscriptions, delivery state sync (`SENT` / `DELIVERED` / `READ`), and typing indicators.
- **State & Storage Separation:** PostgreSQL is the authoritative source of truth for persistent records; Redis handles transient high-velocity state (typing states, active presence heartbeats, and rate limiting).

---

## Key Technical Decisions

| Decision Area                | Technical Choice                               | Rationale                                                                                                                                                                                                                                                                          |
| :--------------------------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime & Tooling**        | **Bun**                                        | Fast startup, native TypeScript execution, and unified package management and test runner.                                                                                                                                                                                         |
| **Nudes Image Detection**    | **Hugging Face (`@huggingface/transformers`)** | Performs local server-side NSFW/nudes image classification using quantized ONNX models (`Falconsai/nsfw_image_detection` via `onnx-community/nsfw_image_detection-ONNX`). Features configurable confidence thresholds, concurrency limits, timeout guards, and fail-closed safety. |
| **Multi-Session Sync**       | **WebSocket + `BroadcastChannel`**             | Combines server-side multi-device broadcasts with browser `BroadcastChannel` to update unread counts and read receipts across tabs instantly without duplicate fetches.                                                                                                            |
| **High-Volume Pagination**   | **Cursor-based Indexed Queries**               | Uses `(conversationId, createdAt DESC, id DESC)` composite indexing to guarantee sub-millisecond pagination over 10,000+ messages without `OFFSET` performance degradation.                                                                                                        |
| **Rate Limiting Resilience** | **Redis Sliding Window + In-Memory Fallback**  | Enforces burst and steady-state thresholds using Redis atomic sorted sets, falling back automatically to an in-memory window during Redis connection loss.                                                                                                                         |

### Demo Link

- [Demo](https://drive.google.com/file/d/17elqjHg7q0kpxxMpgL7GG1zgm8nPgY5_/view?usp=sharing)
