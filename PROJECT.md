# Project: HALDER Direct-Farm Marketplace — Real-Time Chat & 5-Language i18n

## Architecture
The HALDER direct-farm marketplace is a full-stack platform consisting of:
- **Backend**: Express + Node.js HTTP server wrapped with real-time WebSocket (`ws` / `socket.io`), SQLite (`node:sqlite` in WAL mode) relational database, JWT authentication, and zero-trust IDOR middleware.
- **Frontend**: React 19 + TypeScript + Vite 8 SPA, Tailwind CSS, Lucide icons, centralized React Context, and mobile integration via Capacitor Android.
- **i18n**: Type-safe 5-language translation dictionary architecture (`en`, `hi`, `pa`, `mr`, `bn`) with zero-overhead React context and localStorage persistence.
- **Security**: Strict zero-trust authorization where participants must be verified against SQLite `conversations` records (JWT `user.id` or `user.farmerProfileId`), blocking IDOR attempts with `403 Forbidden`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | HTTP Server WebSocket Attachment | Refactor `server.ts` to `http.createServer(app)` and bind real-time WebSocket server | M1 | ORIGINAL_REQUEST §1 |
| 2 | WebSocket Event Protocol & Auth | JWT handshake authentication, room subscription (`join_conversation`), typing broadcast, read receipts | M1 | ORIGINAL_REQUEST §1 |
| 3 | Chat REST API & Fallback | `/api/v1/chat/conversations` (list/create), `/:id/messages` (history/send), `/:id/read` (mark read) with WS sync | M1 | ORIGINAL_REQUEST §1 |
| 4 | Zero-Trust IDOR Security | Strict participant validation in middleware and WS handlers rejecting unauthorized parties with 403 | M1 | ORIGINAL_REQUEST §1 |
| 5 | Database Indexes & Query Optimization | Optimized queries and indexing on `messages` (`conversation_id`, `created_at`, `read_at`) | M1 | ORIGINAL_REQUEST §1 |
| 6 | 5-Language Translation Dictionaries | Complete typed dictionaries for English (`en`), Hindi (`hi`), Punjabi (`pa`), Marathi (`mr`), Bengali (`bn`) | M2 | ORIGINAL_REQUEST §2 |
| 7 | Global Persistent Language Switcher | Language dropdown selector in top navigation bar (`Header.tsx`) and profile settings (`localStorage` sync) | M2 | ORIGINAL_REQUEST §2 |
| 8 | Multilingual UI Integration | Complete translation for nav, search, 300km geo filter, catalog, Mandi badges, checkout, guarantee, tracking, earnings, KYC | M2 | ORIGINAL_REQUEST §2 |
| 9 | Frontend Chat UI & Typing Indicators | Message bubbles, conversation list, live typing indicator, read receipt timestamps, unread counter badges | M3 | ORIGINAL_REQUEST §1 |
| 10 | Frontend WebSocket Client Hook | React hook managing WebSocket connection, heartbeat, auto-reconnect backoff, and REST API fallback | M3 | ORIGINAL_REQUEST §1 |
| 11 | Automated Test Suite (`chat_i18n.test.ts`) | 19-point test validating conversations, REST/WS messages, DB persistence, IDOR 403 isolation, 0 missing keys | E2E / M4 | ORIGINAL_REQUEST §3 |
| 12 | Regression Suite Verification | `server:security`, `server:geo`, `server:earnings`, `server:kyc-push` 100% pass | M4 | ORIGINAL_REQUEST §3 |
| 13 | Production Build & Capacitor Sync | `npm run build` (0 TypeScript errors) and `npm run cap:sync` (Android assets updated) | M4 | ORIGINAL_REQUEST §3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend WebSocket & Chat Services | HTTP server wrapper, WebSocket server, JWT auth handshake, room management, typing/read receipt events, REST fallback routes, IDOR security | none | PLANNED |
| M2 | 5-Language Multilingual System | 5 typed dictionaries (en, hi, pa, mr, bn), i18n Context & hook, persistent language switcher in Header and Profile settings, full UI translation | none | PLANNED |
| M3 | Frontend Real-Time Chat UI & WS Client | Real-time chat modal/drawer, live typing indicators, read receipts, unread badge counters, WebSocket client hook with auto-reconnect & REST fallback | M1 | PLANNED |
| M4 | E2E & Regression Verification | Pass 100% of `server/tests/chat_i18n.test.ts`, run all 4 regression suites, verify `npm run build`, and execute `npm run cap:sync` | M1, M2, M3 | PLANNED |

## Interface Contracts

### Backend WebSocket Protocol (`ws://<host>:<port>/ws` or Socket.IO)
- **Client -> Server Events**:
  - `chat:join` / `join_conversation`: `{ conversationId: string, token: string }`
  - `chat:send` / `send_message`: `{ conversationId: string, message: string }`
  - `chat:typing` / `typing`: `{ conversationId: string, isTyping: boolean }`
  - `chat:read` / `mark_read`: `{ conversationId: string }`
- **Server -> Client Events**:
  - `chat:message` / `new_message`: `{ id: string, conversationId: string, senderId: string, senderRole: string, message: string, createdAt: string, readAt: string | null }`
  - `chat:typing` / `user_typing`: `{ conversationId: string, userId: string, isTyping: boolean }`
  - `chat:read` / `messages_read`: `{ conversationId: string, readAt: string }`
  - `chat:error` / `error`: `{ message: string, code: string }`

### Chat REST API Endpoints (`/api/v1/chat`)
- `POST /conversations`: Body `{ farmerId?: string, customerId?: string, productId?: string }` -> `200/201 { id, customerId, farmerId, productId, createdAt }`
- `GET /conversations`: Returns list of user's conversations with participant details, last message, and unread count.
- `GET /conversations/:id/messages`: Returns `{ messages: Message[] }` (403 Forbidden if not participant).
- `POST /conversations/:id/messages`: Body `{ message: string }` -> `201 { message: Message }` (403 Forbidden if not participant).
- `PATCH /conversations/:id/read`: Marks messages as read -> `200 { success: true, count: number }`.

### i18n Interface Contract (`src/i18n/`)
- `SupportedLanguage = 'en' | 'hi' | 'pa' | 'mr' | 'bn'`
- `useTranslation()` returns `{ t: (key: string, params?: Record<string, string>) => string, language: SupportedLanguage, setLanguage: (lang: SupportedLanguage) => void }`
- Storage Key: `localStorage.getItem('halder-language')` (default `'en'`).

## Code Layout
- `server/src/server.ts` — HTTP & WebSocket server initialization
- `server/src/websocket/chatSocket.ts` — WebSocket event handler & auth
- `server/src/routes/chatRoutes.ts` — Chat REST routes with IDOR protection
- `server/src/middleware/idor.ts` — Conversation participant authorization
- `src/i18n/` — Translation dictionaries (`en.ts`, `hi.ts`, `pa.ts`, `mr.ts`, `bn.ts`), context, and types
- `src/components/common/Header.tsx` — Top nav with persistent Language Switcher and unread chat badge
- `src/components/customer/CustomerProfileView.tsx` — Customer profile language settings
- `src/components/farmer/FarmerProfileView.tsx` — Farmer profile language settings
- `src/components/customer/MarketplaceChatModal.tsx` — Live chat UI with WS hook
- `src/hooks/useChatSocket.ts` — Frontend WebSocket client hook with reconnect & REST fallback
- `server/tests/chat_i18n.test.ts` — Comprehensive automated test suite
