# -*- coding: utf-8 -*-
"""Generate ZeevCode architecture flow diagram."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.font_manager as fm

# CJK-safe font
for f in ["Segoe UI", "Microsoft YaHei", "DejaVu Sans"]:
    try:
        fm.findfont(f, fallback_to_default=False)
        plt.rcParams["font.family"] = f
        break
    except Exception:
        continue
plt.rcParams["axes.unicode_minus"] = False

FIG_W, FIG_H = 16, 20
fig, ax = plt.subplots(figsize=(FIG_W, FIG_H), dpi=150)
ax.set_xlim(0, 100)
ax.set_ylim(0, 125)
ax.axis("off")
fig.patch.set_facecolor("#0d1117")

C = {
    "client":   ("#1f6feb", "#0d419d"),
    "edge":     ("#8957e5", "#5a32a3"),
    "core":     ("#238636", "#14531f"),
    "exec":     ("#d29922", "#8a6116"),
    "data":     ("#db61a2", "#963d6d"),
    "ext":      ("#6e7681", "#3d444d"),
}

def box(x, y, w, h, title, lines, color, title_fs=11, fs=8.6, title_color="white"):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle="round,pad=0.35,rounding_size=1.2",
        linewidth=1.4, edgecolor=color[0], facecolor=color[1], alpha=0.96, zorder=2))
    cy = y + h - 2.4
    ax.text(x + w/2, cy, title, ha="center", va="center",
            fontsize=title_fs, fontweight="bold", color=title_color, zorder=3)
    if lines:
        ax.text(x + w/2, cy - (h/2 - 1.6), "\n".join(lines), ha="center", va="center",
                fontsize=fs, color="#e6edf3", zorder=3, linespacing=1.55)

def zone(x, y, w, h, label, ec):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle="round,pad=0.3,rounding_size=1.5",
        linewidth=1.0, edgecolor=ec, facecolor="none", linestyle=(0,(4,3)), alpha=0.55, zorder=1))
    ax.text(x + 1.2, y + h - 1.3, label, fontsize=9.5, color=ec, fontweight="bold", va="center")

def arrow(x1, y1, x2, y2, label="", color="#8b949e", style="-", lx=0, ly=0.9, fs=7.6):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2),
        arrowstyle="-|>", mutation_scale=16, linewidth=1.8,
        color=color, linestyle=style, zorder=4))
    if label:
        ax.text((x1+x2)/2 + lx, (y1+y2)/2 + ly, label, fontsize=fs, color=color,
                ha="center", va="center", zorder=5,
                bbox=dict(boxstyle="round,pad=0.18", fc="#0d1117", ec="none", alpha=0.9))

# Title
ax.text(50, 123.2, "ZeevCode — System Architecture Flow", ha="center",
        fontsize=20, fontweight="bold", color="#e6edf3")
ax.text(50, 120.9, "Competitive coding platform · Spring Boot 3 + React + PostgreSQL", ha="center",
        fontsize=10.5, color="#8b949e")

# ---------- Client ----------
box(30, 112, 40, 6.5, "React + Vite SPA (judge-frontend)", 
    ["Pages: Duel · Problems · Fundamentals · Profile/Dashboard", "TailwindCSS  ·  hosted on Vercel"], C["client"], 12)

# ---------- Edge ----------
box(2, 97, 29, 9, "Vercel Edge", 
    ["Static hosting + CDN", "vercel.json rewrites:", "/api/* → AWS ALB", "/ws → WebSocket endpoint"], C["edge"], 10.5)
box(71, 97, 27, 9, "Firebase Auth", 
    ["OAuth + email/password", "ID token (JWT)", "verified by Admin SDK", "on every request"], C["ext"], 10.5)

# ---------- AWS zone ----------
zone(1, 55, 45, 38, "AWS ap-south-1 (ECS Fargate)", "#8957e5")
box(3, 88, 41, 4.6, "Application Load Balancer", ["HTTP :80 → target group · health check /health"], C["edge"], 10)
box(3, 79, 19, 7, "ECS Cluster", ["zeevcode-cluster", "Task def :3", "512 CPU / 1 GB"], C["edge"], 10)
box(24, 79, 20, 7, "ECR + CloudWatch + SSM", ["zeevcode-backend image", "logs: /ecs/zeevcode-backend", "secrets in Parameter Store"], C["edge"], 9.5)

# ---------- Spring Boot core ----------
zone(2, 10, 98, 66, "Spring Boot 3 Backend (Java 17)", "#238636")

box(4, 62, 44, 12, "Controller Layer (REST)",
    ["SubmissionController  ·  ProblemController", "MatchmakingController · MatchController",
     "UserController  ·  StatsController", "DsaProgressController · FundamentalsController",
     "AdminController · HealthController"], C["core"], 10.5)

box(52, 62, 46, 12, "WebSocket Layer (1v1 Duels)",
    ["MatchWebSocketController (/ws)", "MatchmakingService → lobby / queue",
     "MatchService → live match state", "STOMP messages: code sync,",
     "test progress, win/lose events"], C["core"], 10.5)

box(4, 45, 44, 14, "Service Layer",
    ["SubmissionService · ProblemService · UserService", "StatsService · UserProblemProgressService",
     "FundamentalsService · GitHubRepoSyncService", "MarkdownRenderService · YouTubeService",
     "NeetCodeSeederService · scheduled refresh"], C["core"], 10.5)

box(52, 45, 46, 14, "Code Execution Engine",
    ["ExecutionProvider (interface)", "|- NativeExecutionProvider: ProcessBuilder",
     "|   sandbox with time / memory limits", "|- PistonExecutionProvider: remote API",
     "Compile phase → run per test case → verdict", "Legacy: Judge0 / Local (retired)"], C["exec"], 10.5)

box(4, 28, 44, 14, "Repository + Entities (JPA)",
    ["Repository layer (Spring Data JPA)", "Entities: User · Problem · Submission",
     "Match · TestCase · Progress", "HikariCP pool (max 5 in prod)", "Flyway migrations on startup"], C["data"], 10.5)

box(52, 28, 46, 14, "External Integrations",
    ["Firebase Admin SDK → token verify", "YouTube Data API → solution videos",
     "GitHub webhook → fundamentals sync", "Markdown render for problem statements"], C["ext"], 10.5)

# ---------- Data ----------
box(22, 2, 26, 11, "Supabase PostgreSQL",
    ["Problems · TestCases", "Users · Submissions", "Matches · Progress", "(Flyway-managed schema)"], C["data"], 11)
box(56, 2, 22, 11, "GitHub Repo",
    ["fundamentals content", "webhook → /api/fundamentals/webhook"], C["ext"], 11)

# ---------- Flow arrows ----------
arrow(50, 112, 50, 107.4, "HTTPS /api/*", "#58a6ff", lx=8)
arrow(50, 112, 84.5, 106.4, "sign-in", "#58a6ff", lx=3)
arrow(16.5, 106.4, 16.5, 93, "", "#bc8cff")
arrow(50, 96.5, 24, 93.4, "proxied requests", "#bc8cff", lx=-4)
arrow(24, 88, 12.5, 86.2, "", "#bc8cff")
arrow(12.5, 79, 12.5, 74.4, "", "#bc8cff")

arrow(26, 74, 26, 62.2, "route", "#3fb950", lx=3.4)
arrow(26, 62, 26, 59.4, "", "#3fb950")
arrow(75, 74, 75, 62.2, "duel channel", "#3fb950", lx=5.6)
arrow(75, 62, 75, 59.4, "", "#3fb950")

arrow(20, 45, 20, 42.4, "", "#3fb950")
arrow(28, 45, 28, 42.4, "", "#3fb950")
arrow(26, 59.4, 26, 45.2, "business logic", "#3fb950", lx=8)

arrow(75, 45, 75, 42.4, "judge call", "#d29922", lx=4.6)
arrow(48, 52, 52, 52, "", "#d29922")
arrow(48, 38, 52, 38, "", "#d29922")

arrow(36, 28, 42, 13.4, "JDBC (SSL)", "#db61a2", lx=4.5, ly=1.1)
arrow(64, 28, 66, 13.4, "", "#db61a2")
arrow(20, 52, 60, 38, "", "#6e7681")

# Legend
ax.text(4, 67.5, "", fontsize=8)

plt.tight_layout()
out = r"C:\Users\DELL\OneDrive\Desktop\spring projects\zeevCode\docs\architecture-flow.png"
plt.savefig(out, facecolor=fig.get_facecolor(), bbox_inches="tight")
print("saved:", out)
