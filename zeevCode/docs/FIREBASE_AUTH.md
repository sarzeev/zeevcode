# Firebase Authentication & Secret Management

## Credential Storage (Local Development)
The Firebase Admin SDK requires a service account JSON file to interact securely with Firebase services.
- **Location:** Place the file at `../secrets/firebase-service-account.json` (relative to the `zeevCode` Spring Boot module).
- **Security:** The `secrets/` directory and `*.json` files in the root are explicitly ignored in `.gitignore`. This file **must never** be committed to version control.

## Backend Configuration Strategy
The backend will load the credentials using a configuration class (`FirebaseConfig.java`).

### Local Development Flow
The application attempts to read `firebase-service-account.json` from the `secrets/` directory using an absolute or relative path lookup. If found, it initializes the `FirebaseApp` using `GoogleCredentials.fromStream()`.

### Future Deployment Flow
In a production environment (e.g., Docker, Kubernetes, AWS, GCP), the JSON file will not exist on the filesystem. Instead:
1. **Environment Variables:** The credentials will be injected via an environment variable containing the base64-encoded JSON or the raw JSON string. 
2. **Fallback Logic:** `FirebaseConfig` will check if the file exists. If it does not, it will fall back to reading the `FIREBASE_SERVICE_ACCOUNT` environment variable.
3. **Alternatively:** Cloud providers like GCP natively support Application Default Credentials (ADC), where `GoogleCredentials.getApplicationDefault()` automatically provisions the SDK without any manual keys.

## Authentication Architecture
1. **Frontend:** Uses the Firebase Client SDK to handle login (Email/Google) and manages session persistence.
2. **Backend:** Uses `spring-boot-starter-oauth2-resource-server` to automatically intercept the `Authorization: Bearer <token>` header and validate the JWT signature against Google's public JWKS.
3. **Auto-Provisioning:** A custom `FirebaseAutoProvisioningFilter` runs after the security context is established. It extracts the `uid` from the JWT, checks PostgreSQL, and creates a `User` entity automatically if one does not exist, linking the `firebase_uid`.
