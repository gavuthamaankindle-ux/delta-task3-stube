# MagicStream Backend Documentation

This repository houses the backend services for **MagicStream**, a full-stack video streaming and content distribution web application built with Go, the Gin web framework, and MongoDB.

---

##  System Architecture

The service uses a decoupled, controller-runtime route architecture optimized for high-throughput HTTP networking and concurrent request processing via Go routines.

```
       [ Client Request ]
               │
               ▼
       [ Gin Engine Router ]
               │
       ┌───────┴───────┐
       ▼               ▼
[ Unprotected ]   [ Protected ]
       │               │
       │               ▼
       │       [ Auth Middleware ] (JWT Extraction & Validation)
       │               │
       └───────┬───────┘
               ▼
     [ Route Handlers / Controllers ]
               │
               ▼
     [ MongoDB Database Layer ]

```

### Core Architecture Layers:

* **Routing Engine (`/routes`):** Splits incoming request trees into public utility domains and explicit security-isolated zones.
* **Middleware Pipeline (`/middleware`):** Manages Cross-Origin Resource Sharing (CORS) configurations, intercepts inbound contextual chains, enforces session parsing, and stops unauthorized executions before they hit lower layers.
* **Business Logic Controllers (`/controllers`):** Processes incoming request data transfer objects (DTOs), implements business logic, coordinates transaction lifecycles, and executes queries against the data persistence layer.
* **Database Component (`/database`):** Configures resource pools and exposes execution contexts for individual atomic operations.

---

## 🗃️ Database Schema (User Model)

The storage backend uses MongoDB collections. The primary target structure mapped out within the internal user storage tier follows this structure:

### `users` Collection Schema

| JSON Field Name | BSON Field Name | Data Type | Validation / Key Constraints |
| --- | --- | --- | --- |
| `_id` | `_id` | `ObjectID` | Primary Key (Auto-Generated) |
| `user_id` | `user_id` | `String` | Unique Reference UUID / Hex String |
| `first_name` | `first_name` | `String` | Required (Validation limit defined by model) |
| `last_name` | `last_name` | `String` | Required |
| `email` | `email` | `String` | Unique Index, String Validation (RFC 5322) |
| `password` | `password` | `String` | Hashed via `bcrypt` (Empty for pure OAuth consumers) |
| `role` | `role` | `String` | Default: `"USER"`. Options: `"USER"`, `"ADMIN"`, `"BANNED"` |
| `token` | `token` | `String` | Active short-lived JSON Web Token string |
| `refresh_token` | `refresh_token` | `String` | Long-lived session renewal token |
| `view_video` | `view_video` | `Array [String]` | Array storing video playback reference history |
| `subscribed` | `subscribed` | `Array [String]` | Array storing unique Channel IDs subscribed to |
| `forgot_password_token` | `forgot_password_token` | `String` | Optional cryptographically secure random token |
| `token_expires_at` | `token_expires_at` | `DateTime` | Expiration benchmark for credential renewal |
| `created_at` | `created_at` | `DateTime` | ISODate timestamp of account creation |
| `updated_at` | `updated_at` | `DateTime` | ISODate timestamp of latest state update |

---

##  Authentication Flows

The service uses a hybrid approach for identity verification, supporting both traditional standard credentials and external Google OAuth2 federation pipelines.

### 1. Traditional JWT Lifecycle

* **Token Generation:** Upon authenticating credentials through `bcrypt.CompareHashAndPassword`, the system generates an asymmetric pair of HMAC-SHA256 signature payloads via `golang-jwt/jwt/v5`.
* **Access Token:** Expired after **24 hours**. Encodes state variables: `Email`, `FirstName`, `LastName`, `Role`, and `UserId`.
* **Refresh Token:** Expired after **7 days**. Used to update the active access pair within database states.


* **Token Storage & Transport:** Tokens are distributed back to customers across two communication channels simultaneously:
1. **Secure Cookies:** Extracted natively using an `HttpOnly`, `SameSite=Lax` constraint pipeline to neutralize cross-site scripting vulnerabilities.
2. **JSON Payload DTO:** Passed inside a standard user response payload structure for manual client caching strategies.



### 2. Google OAuth2 Integration Flow

```
[ Client Click ] ──► /auth/google/login ──► Redirects to Google Authorization Server
                                                          │
                                                          ▼
[ React Application ] ◄── Redirect (302) ◄── /auth/google/callback (Exchanges Code)
(Reads token, user_id, first_name via URL parameters)

```

1. Inbound requests hits `/auth/google/login`, initializing configuration variables through `golang.org/x/oauth2` before redirecting the browser client to the official Google login form.
2. After user consent, Google returns an authentication handshake authorization token code directly to `/auth/google/callback`.
3. The system captures the token code and executes an implicit background server-side post exchange transaction to retrieve the Google User profile endpoint.
4. The system executes a high-speed upsert operation: creating a unique `user_id` and setting base tracking metrics if the account is new, or updating profile tracking details if the account already exists.
5. Finally, parameters are securely handled via URL Query Escaped fragments, forwarding processing control smoothly back over to the frontend application context.

---

##  Local Setup Instructions

### Prerequisites

* Go (Version 1.21 or higher recommended)
* MongoDB Instance (Local Community Server or Atlas Cluster connection string)

### 1. Environment Configuration

Create a `.env` file inside the root repository location: (Refer .env.example)



### 2. Install Project Dependencies

Run the module mirror tool to fetch all package configurations:

```bash
go mod download

```

### 3. Execution

Compile and launch the backend application loop:

```bash
go run main.go

```

The router engine will spin up on port `:8081` by default, handling cross-origin requests coming from `http://localhost:5173`.
