<div align="center">

# ⚡ ZeevCode

**A competitive coding platform with real-time 1v1 duels, solo practice, and a custom-built sandboxed code execution engine.**

[![Java](https://img.shields.io/badge/Java-17+-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Live](https://img.shields.io/badge/Live-zeevcode.vercel.app-brightgreen?style=flat-square)](https://zeevcode.vercel.app/)

**[🚀 Live Demo](https://zeevcode.vercel.app/) · [Report Bug](https://github.com/sarzeev/zeevcode/issues) · [Request Feature](https://github.com/sarzeev/zeevcode/issues)**

</div>

---

## Overview

ZeevCode is a full-stack competitive coding platform built from the ground up — no third-party judge, no borrowed execution engine. The core is a **custom Java ProcessBuilder sandbox** that compiles and runs user-submitted code in an isolated, resource-constrained environment, evaluating it against hidden and visible test cases in real time.

Beyond solo practice, ZeevCode supports **real-time 1v1 duels** where two users race to solve the same problem — the first to pass all test cases wins. This makes it meaningfully different from standard interview-prep clones.

> Try it live: **[zeevcode.vercel.app](https://zeevcode.vercel.app/)**

---

## Features

### 🥊 1v1 Duel Mode
- Real-time competitive matches between two users
- Live match state sync over WebSockets
- First to pass all test cases wins
- Matchmaking and lobby system

### 💻 Solo Practice
- Problems across Easy, Medium, and Hard difficulty
- Detailed problem statements with constraints and examples
- Custom test case execution before final submission
- Submission history and per-problem solve tracking

### ⚙️ Custom Code Execution Engine
- Built with Java `ProcessBuilder` — zero third-party sandbox dependency
- Enforced CPU time limits, memory limits, and process isolation
- Separate compilation and execution phases with structured error output
- Hidden + visible test case evaluation pipeline

### 🔐 Auth & User Management
- Firebase Authentication (OAuth + email/password)
- Protected routes and JWT-secured API endpoints
- User-specific dashboards and submission history

### 📊 Progress Tracking
- Problem solve counts with difficulty breakdown
- Full submission history with verdict, runtime, and memory
- Performance trends over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, TailwindCSS |
| **Backend** | Java 17, Spring Boot 3.x |
| **Database** | PostgreSQL |
| **Auth** | Firebase Authentication |
| **Code Execution** | Custom Java ProcessBuilder sandbox |
| **Real-time** | WebSockets (Spring) |
| **Hosting** | Vercel (frontend), AWS EC2 + SQS (backend) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React + Vite (Frontend)               │
│           REST API calls  ◄──►  WebSocket (duels)       │
└───────────────────┬─────────────────────┬───────────────┘
                    │                     │
                    ▼                     ▼
        ┌───────────────────┐   ┌──────────────────┐
        │  Spring Boot API  │   │  WebSocket Server │
        │  (REST Endpoints) │   │  (Duel State Sync)│
        └─────────┬─────────┘   └──────────────────┘
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
  ┌──────────────┐  ┌──────────────────────────┐
  │  PostgreSQL  │  │   Code Execution Service  │
  │  (Problems,  │  │  ┌────────────────────┐   │
  │  Users,      │  │  │  ProcessBuilder    │   │
  │  Submissions)│  │  │  Sandbox           │   │
  └──────────────┘  │  │  - Compile phase   │   │
                    │  │  - Execute phase   │   │
                    │  │  - Time/mem limits │   │
                    │  └────────────────────┘   │
                    │  Test Case Evaluator       │
                    └──────────────────────────┘
```

> **AWS:** API layer on EC2 (t3.medium), execution workers on c6i instances, SQS as the job queue decoupling API from execution.

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL 15+
- Firebase project (for auth)

### Backend

```bash
git clone https://github.com/sarzeev/zeevcode.git
cd zeevcode/backend

# Configure environment
cp src/main/resources/application.example.yml src/main/resources/application.yml
# Fill in: DB credentials, Firebase service account path, execution limits

./mvnw spring-boot:run
```

### Frontend

```bash
cd zeevcode/frontend
npm install

# Configure environment
cp .env.example .env
# Fill in: VITE_API_URL, Firebase config keys

npm run dev
```

App runs at `http://localhost:5173`.

---

## Roadmap

- [x] Custom ProcessBuilder sandbox
- [x] Solo practice mode with test case evaluation
- [x] Firebase authentication
- [x] 1v1 duel mode (WebSocket matchmaking)
- [x] Progress tracking and submission history
- [x] Deployed to production — [zeevcode.vercel.app](https://zeevcode.vercel.app/)
- [ ] Contest mode — time-boxed multi-problem sets
- [ ] Leaderboards and rating system
- [ ] Language support expansion (Python, C++, Go)

---

## Contributing

Issues and PRs are welcome. For significant changes, open an issue first to discuss the approach.

---

## License

MIT — see [LICENSE](LICENSE) for details.
