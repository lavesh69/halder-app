# E2E Test Infra: HALDER Real-Time Chat & 5-Language i18n

## Test Philosophy
- Opaque-box, requirement-driven testing validating server APIs, WebSocket live messaging, zero-trust IDOR isolation, and 5-language dictionary parity.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing across 4 Tiers.

## Feature Inventory & Test Mapping
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | Conversation Creation & Fetching | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ | ✓ |
| 2 | REST Message Transmission & DB Storage | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ | ✓ |
| 3 | WebSocket Real-Time Message Broadcast | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ | ✓ |
| 4 | WebSocket Typing Indicators & Read Receipts | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ | ✓ |
| 5 | Zero-Trust IDOR Isolation (403 Forbidden) | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ | ✓ |
| 6 | 5-Language Dictionary Completeness & Key Parity | ORIGINAL_REQUEST §2 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner: Node.js TSX execution (`node --import tsx server/tests/chat_i18n.test.ts`)
- Port Allocation: Dedicated port `5096` to avoid conflicts with existing regression suites (ports 5055, 5097, 5098, 5099)
- Assertion Engine: Native Node.js `node:assert` with colorized reporting and exit code 0 on 100% pass.

## 4-Tier Test Specifications

### Tier 1 — Feature Coverage (Happy Path)
1. `test_conversation_create_and_fetch`: Create conversation between verified customer and farmer, fetch conversation list.
2. `test_rest_message_send`: Send message via REST API `/api/v1/chat/conversations/:id/messages` and verify response.
3. `test_db_persistence`: Query SQLite `messages` table directly to verify content, timestamps, and foreign keys.
4. `test_websocket_connection_and_auth`: Establish WebSocket handshake with valid JWT.
5. `test_5_language_dictionaries_exist`: Verify all 5 dictionaries (`en`, `hi`, `pa`, `mr`, `bn`) load and contain valid objects.

### Tier 2 — Boundary & Security Isolation
6. `test_idor_unauthorized_customer_read`: Verify Customer B receives `403 Forbidden` reading Conversation A.
7. `test_idor_unauthorized_customer_send`: Verify Customer B receives `403 Forbidden` sending message to Conversation A.
8. `test_idor_unauthorized_farmer_read`: Verify Farmer B receives `403 Forbidden` reading Conversation A.
9. `test_idor_unauthorized_farmer_send`: Verify Farmer B receives `403 Forbidden` sending message to Conversation A.
10. `test_unauthenticated_requests`: Verify `401 Unauthorized` when JWT is missing or invalid.
11. `test_empty_or_oversized_messages`: Verify rejection of blank/whitespace or excessive character length messages.

### Tier 3 — Real-Time WebSocket & State Synchronization
12. `test_websocket_live_message_delivery`: Customer sends via WS -> Farmer receives instant `chat:message` event in real time.
13. `test_rest_to_websocket_sync`: Customer sends via REST API -> Farmer receives real-time WS `chat:message` broadcast.
14. `test_typing_indicator_broadcast`: Customer emits `chat:typing` (true/false) -> Farmer receives `chat:typing` event.
15. `test_read_receipt_update`: Mark conversation read -> Verify `read_at` updated in DB and `chat:read` broadcast emitted.
16. `test_unread_badge_counting`: Send 3 unread messages -> Verify unread count = 3; mark read -> verify unread count = 0.

### Tier 4 — Real-World Application & i18n Dictionary Parity
17. `test_dictionary_key_parity_5_languages`: Check all keys present in `en` exist in `hi`, `pa`, `mr`, `bn` with 0 missing keys.
18. `test_dictionary_domain_coverage`: Verify dictionary contains translations for nav, search, 300km geo filter, catalog, Mandi badges, checkout, Kisan Direct Delivery guarantee, tracking, earnings, KYC.
19. `test_e2e_customer_farmer_order_inquiry_flow`: Full end-to-end conversation creation, bidirectional negotiation, typing, read receipts, and state persistence.
