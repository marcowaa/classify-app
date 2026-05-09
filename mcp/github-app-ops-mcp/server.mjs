import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

function isTextFile(mimeLike) {
    if (!mimeLike) return true;
    const s = String(mimeLike).toLowerCase();
    return s.startsWith("text/") || s.includes("json") || s.includes("yaml") || s.includes("xml");
}

function findRepoRoot(startDir) {
    let dir = startDir;
    for (let i = 0; i < 8; i++) {
        const candidate = path.join(dir, "package.json");
        if (fs.existsSync(candidate)) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return startDir;
}

function normalizeAndResolveInsideRoot(rootDir, userPath) {
    const trimmed = String(userPath ?? "").trim().replace(/^\/+/, "");
    // Prevent weird things like null bytes
    if (trimmed.includes("\u0000")) {
        throw new Error("Invalid path");
    }
    const resolved = path.resolve(rootDir, trimmed);
    const rel = path.relative(rootDir, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error("Path escapes repository root");
    }
    return resolved;
}

function shouldBlockPath(absPath) {
    const blockedNames = new Set([
        ".env",
        ".env.local",
        ".env.production",
        ".env.example",
        "deploy_key",
        "deploy_key.pub",
        "id_rsa",
        "id_rsa.pub",
    ]);

    const parts = absPath.split(path.sep).map((p) => p.toLowerCase());
    // Block node_modules, dist, android build artifacts
    if (parts.includes("node_modules".toLowerCase())) return true;
    if (parts.includes("dist".toLowerCase())) return true;
    if (parts.includes("android".toLowerCase())) return true;

    const base = path.basename(absPath);
    if (blockedNames.has(base)) return true;

    // Block common secret files
    if (absPath.toLowerCase().includes("key") && (absPath.toLowerCase().includes("pem") || absPath.toLowerCase().includes("secret"))) {
        return true;
    }

    return false;
}

function readTextFileSafe(absPath) {
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) throw new Error("Not a file");

    if (shouldBlockPath(absPath)) {
        throw new Error("Blocked path for safety reasons");
    }

    const sizeMb = stat.size / (1024 * 1024);
    if (sizeMb > 2.5) {
        throw new Error("File too large to read safely (max ~2.5MB)");
    }

    // Read as UTF-8; for binary files this will likely corrupt but we try to guard by extension.
    const ext = path.extname(absPath).toLowerCase();
    const binaryLike = new Set([
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".ico",
        ".pdf",
        ".zip",
        ".gz",
        ".tar",
        ".7z",
        ".mp4",
        ".mp3",
    ]);
    if (binaryLike.has(ext)) {
        throw new Error("Binary file types are blocked");
    }

    return fs.readFileSync(absPath, "utf8");
}

function listDirSafe(absPath) {
    if (shouldBlockPath(absPath)) throw new Error("Blocked path for safety reasons");
    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    return entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "directory" : e.isFile() ? "file" : "other",
    }));
}

function countOccurrences(str, needle) {
    let count = 0;
    let idx = 0;
    while (true) {
        const found = str.indexOf(needle, idx);
        if (found === -1) break;
        count++;
        idx = found + needle.length;
    }
    return count;
}

function summarizeWorkflowYml(yamlText) {
    const jobsCount = countOccurrences(yamlText, "\n  jobs:") + countOccurrences(yamlText, "\njobs:");
    const stepsCount = countOccurrences(yamlText, "\n    - ") + countOccurrences(yamlText, "\n- name:");
    const usesCount = countOccurrences(yamlText, "uses:");
    const runCount = countOccurrences(yamlText, "run:");

    const triggers = [];
    const onIndex = yamlText.indexOf("\non:");
    if (onIndex !== -1) {
        const snippet = yamlText.slice(onIndex, onIndex + 800);
        // crude extraction
        const m = snippet.match(/(?:push|pull_request|workflow_dispatch)\s*:\s*(?:\{|\[)?/g);
        if (m) triggers.push(...m.map((x) => x.replace(":", "").trim()));
    }

    return {
        jobsCount,
        stepsCount,
        usesCount,
        runCount,
        triggers: Array.from(new Set(triggers)),
    };
}

function analyzeFailureLog(logText) {
    const t = String(logText || "");
    const lower = t.toLowerCase();

    const candidates = [];

    const add = (title, match, action) => {
        if (!match) return;
        candidates.push({ title, evidence: match, action });
    };

    add(
        "Missing secret / env var",
        /secret|secrets|env|missing|not set|no value|undefined|process\.env/i.test(lower) ? "Keywords: secret/env/missing" : null,
        "Check GitHub Actions job environment variables and that required repository/org secrets exist. Also verify names match exactly."
    );

    add(
        "Gradle / Android build failure",
        /gradle|./.test(lower) ? null : null,
        null
    );

    // Special handling Gradle
    if (/(gradle|assemble|bundle|signing|keystore|zipalign|apksigner)/i.test(t)) {
        candidates.push({
            title: "Android build/signing issue likely",
            evidence: "Found Gradle/signing keywords",
            action: "Verify keystore/signing configs + signing env/secrets (KEYSTORE_B64/FILE/ALIAS/PASSWORD) and that targetSdk/minSdk align with Play requirements.",
        });
    }

    if (/(eacces|permission denied|epm permission|chmod|chown)/i.test(t)) {
        candidates.push({
            title: "Permissions issue",
            evidence: "Found EACCES/permission keywords",
            action: "Ensure checkout/build steps have correct file permissions; if using scripts, add chmod +x where needed."
        });
    }

    if (/(401|403)/i.test(t) || /unauthorized|forbidden|token/i.test(t)) {
        candidates.push({
            title: "Auth/permissions to external service",
            evidence: "Found 401/403 or unauthorized keywords",
            action: "Confirm GitHub token scope and any API keys. For deploy steps, verify credentials and that the target service allows the integration."
        });
    }

    if (/cannot find module|module not found|ts(?!-)(?!server)|error ts/i.test(lower)) {
        candidates.push({
            title: "Node/TypeScript module resolution",
            evidence: "Found module not found keywords",
            action: "Verify package.json deps/lock, Node version, and that workflow runs npm ci (not npm install) in correct working directory."
        });
    }

    if (/out of memory|oom|heap|killed/i.test(lower)) {
        candidates.push({
            title: "Resource exhaustion (OOM/timeout)",
            evidence: "Found OOM/heap/killed keywords",
            action: "Reduce build parallelism, increase runner resources if possible, or enable caching to shorten build time."
        });
    }

    // Fallback
    if (candidates.length === 0) {
        candidates.push({
            title: "Generic failure (needs more evidence)",
            evidence: "No known keywords matched",
            action: "Share the full failing step logs and the workflow YAML file; then re-run with targeted parsing."
        });
    }

    // Prioritize: return top 6
    return candidates.slice(0, 6);
}

function buildUnifiedReport({ workflowSummaries, failures }) {
    const parts = [];

    parts.push("# Unified GitHub Ops Report");
    parts.push("");
    if (workflowSummaries?.length) {
        parts.push("## Workflow inventory (high level)");
        for (const wf of workflowSummaries) {
            parts.push(`- **${wf.file}**: jobs=${wf.summary.jobsCount}, steps=${wf.summary.stepsCount}, uses=${wf.summary.usesCount}, run=${wf.summary.runCount} ${wf.summary.triggers?.length ? `(triggers: ${wf.summary.triggers.join(", ")})` : ""}`);
        }
        parts.push("");
    }

    if (failures?.length) {
        parts.push("## Likely failure causes & next actions");
        for (const f of failures) {
            parts.push(`- **${f.title}**`);
            if (f.evidence) parts.push(`  - evidence: ${f.evidence}`);
            if (f.action) parts.push(`  - next: ${f.action}`);
        }
        parts.push("");
    }

    parts.push("## Recommended verification checklist");
    parts.push("- Confirm failing job name/step and copy exact log snippet");
    parts.push("- Verify Node/Java/Gradle versions in workflow match project requirements");
    parts.push("- Verify artifacts paths and that upload/download names match");
    parts.push("- Re-run workflow after each small change (avoid batching unrelated edits)");

    return parts.join("\n");
}

const repoRoot = findRepoRoot(process.cwd());

const server = new McpServer(
    { name: "github-app-ops-mcp", version: "1.0.0" },
    { capabilities: { logging: {} } }
);

server.registerTool(
    "read_file",
    {
        description: "Safely read a text file from the repository (blocks secrets/large/binary). Path must be relative to repo root.",
        inputSchema: {
            path: z.string().describe("Relative path from repository root, e.g. .github/workflows/ci.yml"),
        },
    },
    async ({ path: userPath }, extra) => {
        await server.sendLoggingMessage({ level: "info", data: `[read_file] path=${userPath}` }, extra?.sessionId);
        try {
            const abs = normalizeAndResolveInsideRoot(repoRoot, userPath);
            const text = readTextFileSafe(abs);
            return {
                content: [{ type: "text", text }],
                structuredContent: { ok: true, repoRoot, absPath: abs, bytes: Buffer.byteLength(text, "utf8") },
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error reading file: ${message}` }],
                isError: true,
                structuredContent: { ok: false, error: message, repoRoot },
            };
        }
    }
);

server.registerTool(
    "list_directory",
    {
        description: "Safely list entries in a directory within the repository root.",
        inputSchema: {
            path: z.string().describe("Relative directory path from repo root, e.g. .github/workflows"),
        },
    },
    async ({ path: userPath }, extra) => {
        await server.sendLoggingMessage({ level: "info", data: `[list_directory] path=${userPath}` }, extra?.sessionId);
        try {
            const abs = normalizeAndResolveInsideRoot(repoRoot, userPath);
            const entries = listDirSafe(abs);
            return {
                content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
                structuredContent: { ok: true, repoRoot, absPath: abs, entries },
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error listing directory: ${message}` }],
                isError: true,
                structuredContent: { ok: false, error: message, repoRoot },
            };
        }
    }
);

server.registerTool(
    "summarize_workflows",
    {
        description: "Summarize GitHub workflow YAML files under .github/workflows (fast, heuristic).",
        inputSchema: {
            limit: z.number().int().min(1).max(30).optional().describe("Max number of workflow files to analyze."),
        },
    },
    async ({ limit }, extra) => {
        await server.sendLoggingMessage({ level: "info", data: `[summarize_workflows] limit=${limit ?? "default"}` }, extra?.sessionId);

        try {
            const workflowsDir = normalizeAndResolveInsideRoot(repoRoot, ".github/workflows");
            const max = limit ?? 15;

            if (!fs.existsSync(workflowsDir)) {
                return {
                    content: [{ type: "text", text: "No .github/workflows directory found in repo root." }],
                    structuredContent: { ok: true, workflows: [] },
                };
            }

            const files = fs
                .readdirSync(workflowsDir)
                .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
                .slice(0, max);

            const workflowSummaries = files.map((file) => {
                const abs = path.join(workflowsDir, file);
                const yamlText = readTextFileSafe(abs);
                const summary = summarizeWorkflowYml(yamlText);
                return {
                    file,
                    summary,
                };
            });

            const reportLines = [
                "## Workflow summaries",
                "",
                ...workflowSummaries.flatMap((wf) => [
                    `- **${wf.file}**`,
                    `  - jobs: ${wf.summary.jobsCount}`,
                    `  - steps: ${wf.summary.stepsCount}`,
                    `  - uses: ${wf.summary.usesCount}`,
                    `  - run: ${wf.summary.runCount}`,
                    wf.summary.triggers?.length ? `  - triggers: ${wf.summary.triggers.join(", ")}` : `  - triggers: (not detected)`,
                ]),
            ];

            return {
                content: [{ type: "text", text: reportLines.join("\n") }],
                structuredContent: { ok: true, repoRoot, workflows: workflowSummaries },
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error summarizing workflows: ${message}` }],
                isError: true,
                structuredContent: { ok: false, error: message, repoRoot },
            };
        }
    }
);

server.registerTool(
    "analyze_workflow_failure",
    {
        description: "Analyze failing workflow logs and propose likely root causes + next actions (heuristic keywords).",
        inputSchema: {
            logText: z.string().describe("Copy/paste of the failing step/job log snippet."),
            workflowFile: z.string().optional().describe("Workflow filename, e.g. ci.yml (optional for context)."),
            jobName: z.string().optional().describe("Failing job name (optional)."),
        },
    },
    async ({ logText, workflowFile, jobName }, extra) => {
        await server.sendLoggingMessage({ level: "info", data: `[analyze_workflow_failure] workflowFile=${workflowFile ?? ""} jobName=${jobName ?? ""}` }, extra?.sessionId);

        try {
            const failures = analyzeFailureLog(logText);

            const header = [
                "# Workflow Failure Analysis (Heuristic)",
                "",
                workflowFile ? `- workflow file: ${workflowFile}` : "- workflow file: (not provided)",
                jobName ? `- job name: ${jobName}` : "- job name: (not provided)",
                "",
                "## Likely causes & next actions",
                "",
            ];

            const body = failures
                .map((f) => `- **${f.title}**\n  - evidence: ${f.evidence ?? "n/a"}\n  - next: ${f.action ?? "n/a"}`)
                .join("\n");

            const recommendations = [
                "",
                "## Verification checklist (do this before changing code again)",
                "- Confirm the failing step is the first error in the log (not a downstream symptom).",
                "- Compare runner Node/Java/Gradle versions to local project expectations.",
                "- Verify artifact upload/download names and paths match exactly.",
                "- Re-run workflow after each targeted fix.",
            ].join("\n");

            return {
                content: [{ type: "text", text: header.join("\n") + body + recommendations }],
                structuredContent: { ok: true, workflowFile, jobName, failures },
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error analyzing failure: ${message}` }],
                isError: true,
                structuredContent: { ok: false, error: message },
            };
        }
    }
);

server.registerTool(
    "unified_report",
    {
        description: "Create a unified report from workflow summaries and failure analysis outputs.",
        inputSchema: {
            workflowSummariesJson: z.string().optional().describe("JSON string of workflow summaries (from summarize_workflows)."),
            failureAnalysisJson: z.string().optional().describe("JSON string of failure analysis (from analyze_workflow_failure)."),
        },
    },
    async ({ workflowSummariesJson, failureAnalysisJson }, extra) => {
        await server.sendLoggingMessage({ level: "info", data: `[unified_report]` }, extra?.sessionId);

        try {
            const workflowSummaries = workflowSummariesJson ? JSON.parse(workflowSummariesJson) : [];
            const failureAnalysis = failureAnalysisJson ? JSON.parse(failureAnalysisJson) : [];

            const report = buildUnifiedReport({
                workflowSummaries,
                failures: Array.isArray(failureAnalysis)
                    ? failureAnalysis
                    : failureAnalysis?.failures ?? [],
            });

            return {
                content: [{ type: "text", text: report }],
                structuredContent: { ok: true, report },
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error building unified report: ${message}` }],
                isError: true,
                structuredContent: { ok: false, error: message },
            };
        }
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
