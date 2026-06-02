# Execution Architecture

This document describes the code execution architecture of ZeevCode, centering around the `ExecutionProvider` pattern.

## Current Architecture

The active execution flow utilizes the Piston engine for secure, sandboxed code execution.

```text
[ Frontend ] (React)
    │
    │ POST /api/submissions
    ▼
[ Backend ] (Spring Boot)
    │
    │ SubmissionController
    │  ├─ SubmissionService (Saves to DB)
    │  └─ ExecutionProvider.executeSubmission() (Interface)
    │
    │ PistonExecutionProvider (Active Implementation)
    │  └─ POST /api/v2/execute
    ▼
[ Piston Engine ] (Docker / Isolate)
    │
    │ Compiles & Runs Code in Sandbox
    │ Returns JSON with stdout/stderr/exit codes
    ▼
[ Backend ]
    │
    │ Compares Output against Test Cases
    │ Updates Submission Status in DB
    │ MatchWebSocketController.sendMatchUpdate()
    ▼
[ Frontend ]
    │ Updates UI in real-time
```

## Legacy Architecture

Before the integration of Piston, ZeevCode used a local `ProcessBuilder` approach. This has been disabled but preserved in the `com.project.zeevCode.service.legacy` package for documentation and interview discussion.

```text
[ Frontend ]
    │
    │ POST /api/submissions
    ▼
[ Backend ]
    │
    │ LegacyLocalCodeExecutionService
    │  ├─ Writes Temp Files to Host OS
    │  ├─ ProcessBuilder("javac", ...)
    │  └─ ProcessBuilder("java", ...)
    ▼
[ Local JVM / Host OS ]
    │ Executes directly on the host server
    │ (High security risk, no resource isolation)
```

## Configuration Guide

The active execution engine is determined by the `execution.provider` property in `application.properties`.

**Available Providers:**
- `piston`: The current production standard. Requires a running Piston instance.
- `legacy-processbuilder`: The original local execution (disabled by default).
- `judge0`: A stubbed placeholder for a potential Judge0 integration (disabled).

**Piston Settings:**
```properties
execution.provider=piston
piston.api.url=http://localhost:2000
piston.timeout.run=5000
piston.timeout.compile=10000
piston.memory.run=256000000
```
