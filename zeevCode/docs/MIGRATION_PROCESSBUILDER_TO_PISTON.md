# ProcessBuilder to Piston Migration

## 1. Old Architecture
Historically, ZeevCode executed code directly on the host JVM using standard Java `ProcessBuilder`.
- User submitted code to the backend.
- The `LocalCodeExecutionService` saved the code to a temporary directory (`Files.createTempDirectory`).
- It invoked native compilers (`javac`, `g++`) and runtimes (`java`, `python`) directly on the host system.
- Execution timeout was enforced via `process.waitFor(5, TimeUnit.SECONDS)`.
- **Status:** Deprecated and disabled for security reasons, but preserved in `LegacyLocalCodeExecutionService` for learning and documentation purposes.

## 2. New Architecture
ZeevCode now uses [Piston](https://github.com/engineer-man/piston), a high-performance code execution engine built on Docker and Isolate.
- The new `ExecutionProvider` pattern abstracts the execution logic.
- `PistonExecutionProvider` makes a synchronous REST API call to the Piston engine (typically hosted at `localhost:2000`).
- No local files are created; code is sent via JSON payload.
- Piston handles sandboxing, compiling, and running the code inside ephemeral Docker containers.

## 3. Reasons for Migration
The primary motivation was moving from an unsafe, unmanaged local execution environment to a robust, containerized, API-driven sandbox.

## 4. Security Improvements
- **True Sandboxing:** User code now runs in isolated Docker containers with Isolate.
- **Resource Constraints:** Piston enforces strict CPU and memory limits. The host JVM is no longer at risk of OutOfMemory errors caused by malicious code.
- **Network Isolation:** Executed code cannot access the local network or the host file system.

## 5. Scalability Improvements
- **Decoupled Architecture:** The execution engine (Piston) can now be hosted on a separate server or scaled horizontally independently of the Spring Boot backend.
- **Stateless Execution:** The backend no longer manages temporary files or native processes, drastically reducing its resource footprint during execution.
- **Simplified Runtimes:** Adding new languages only requires installing a Piston package (`ppman install language`), rather than configuring host-level compilers and updating `ProcessBuilder` switch statements.

## 6. Future Roadmap
- Deploy Piston to a dedicated cloud instance with network isolation.
- Add support for advanced execution features (e.g., streaming stdout for long-running processes).
- Expand supported languages (Node.js, Rust, Go) by leveraging Piston's extensive package repository.
