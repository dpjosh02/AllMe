import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

type SliceCommand =
  | "start"
  | "status"
  | "commit-plan"
  | "merge-plan"
  | "commit-impl"
  | "verify"
  | "close"
  | "cleanup"
  | "plan-ready"
  | "specialist-ready"
  | "impl-ready"
  | "qa-ready";

type ParsedArgs = {
  all: boolean;
  allowUnmergedPlan: boolean;
  build: boolean;
  command: SliceCommand;
  deleteRemote: boolean;
  description?: string;
  force: boolean;
  from?: string;
  guided: boolean;
  linkEnv: boolean;
  message?: string;
  migrate: boolean;
  skipVerify: boolean;
  slug: string;
};

type SliceMetadata = {
  baseBranch: string;
  createdAt: string;
  description: string;
  implBranch: string;
  implPath: string;
  lastValidation?: {
    command: string;
    passed: boolean;
    recordedAt: string;
  };
  planBranch: string;
  planPath: string;
  slug: string;
};

const commands = new Set<SliceCommand>([
  "start",
  "status",
  "commit-plan",
  "merge-plan",
  "commit-impl",
  "verify",
  "close",
  "cleanup",
  "plan-ready",
  "specialist-ready",
  "impl-ready",
  "qa-ready",
]);

function usage(): never {
  console.error(`Usage: tsx scripts/slice-workflow.ts [guide] <command> <slice-slug> [options]

Commands:
  start          Create plan and implementation worktrees.
  status         Show worktree, branch, and merge status.
  commit-plan    Commit docs-only planning changes in the plan worktree.
  merge-plan     Merge the plan branch into the implementation branch.
  commit-impl    Commit implementation changes in the implementation worktree.
  verify         Run slice validation in the implementation worktree.
  close          Verify and merge the implementation branch into main.
  cleanup        Remove worktrees and delete local slice branches.

Guided commands:
  guide start <slug> --description "<description>"
                 Create plan/impl worktrees and print the PM/Architect prompt.
  guide plan-ready <slug>
                 Commit docs-only planning work and optionally merge it to impl.
  guide specialist-ready <slug>
                 Commit specialist plan updates and optionally merge them to impl.
  guide impl-ready <slug>
                 Commit implementation work and print the QA/release prompt.
  guide qa-ready <slug>
                 Commit QA updates, prompt validation, and optionally merge to main.
  guide cleanup <slug>
                 Remove slice worktrees and local branches after approval.
  guide status <slug>
                 Show detailed lifecycle status and the next recommended command.

Options:
  --from <branch>             Base branch for start.
  --description <text>        Human slice description for guided prompts.
  --link-env                  Symlink .env.local into the implementation worktree.
  --message, -m <message>     Commit message.
  --all                       Stage all implementation changes before commit.
  --build                     Include npm run build during verify.
  --migrate                   Include npm run db:migrate during verify.
  --skip-verify               Skip verify during close.
  --allow-unmerged-plan       Allow close when plan is not merged into impl.
  --delete-remote             Delete origin branches during cleanup.
  --force                     Force cleanup of unmerged branches or dirty worktrees.`);
  process.exit(1);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [first, ...remaining] = argv;
  const guided = first === "guide";
  const [rawCommand, ...rest] = guided ? remaining : argv;

  if (!commands.has(rawCommand as SliceCommand)) {
    usage();
  }

  const positionals: string[] = [];
  const parsed: Omit<ParsedArgs, "slug"> = {
    all: false,
    allowUnmergedPlan: false,
    build: false,
    command: rawCommand as SliceCommand,
    deleteRemote: false,
    force: false,
    guided,
    linkEnv: false,
    migrate: false,
    skipVerify: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--from") {
      parsed.from = requireValue(rest, (index += 1), arg);
    } else if (arg === "--description") {
      parsed.description = requireValue(rest, (index += 1), arg);
    } else if (arg === "--message" || arg === "-m") {
      parsed.message = requireValue(rest, (index += 1), arg);
    } else if (arg === "--link-env") {
      parsed.linkEnv = true;
    } else if (arg === "--all") {
      parsed.all = true;
    } else if (arg === "--build") {
      parsed.build = true;
    } else if (arg === "--migrate") {
      parsed.migrate = true;
    } else if (arg === "--skip-verify") {
      parsed.skipVerify = true;
    } else if (arg === "--allow-unmerged-plan") {
      parsed.allowUnmergedPlan = true;
    } else if (arg === "--delete-remote") {
      parsed.deleteRemote = true;
    } else if (arg === "--force") {
      parsed.force = true;
    } else if (arg.startsWith("-")) {
      fail(`Unknown option: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }

  const [slug, ...messageParts] = positionals;

  if (!slug) {
    usage();
  }

  validateSlug(slug);

  if (!parsed.message && messageParts.length > 0) {
    parsed.message = messageParts.join(" ");
  }

  return { ...parsed, slug };
}

function requireValue(values: string[], index: number, option: string): string {
  const value = values[index];

  if (!value || value.startsWith("-")) {
    fail(`Missing value for ${option}.`);
  }

  return value;
}

function validateSlug(slug: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    fail(
      "Slice slug must be lowercase kebab-case, for example notes-capture-detail.",
    );
  }
}

function fail(message: string): never {
  throw new Error(message);
}

function run(
  command: string,
  args: string[],
  cwd: string,
  mode: "capture" | "inherit" = "capture",
): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });

  if (result.error) {
    fail(`${command} ${args.join(" ")} failed: ${result.error.message}`);
  }

  if (mode === "inherit") {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    fail(`${command} ${args.join(" ")} failed${detail ? `:\n${detail}` : "."}`);
  }

  return result.stdout.trim();
}

function git(
  args: string[],
  cwd: string,
  mode?: "capture" | "inherit",
): string {
  return run("git", args, cwd, mode);
}

function npmRun(script: string, cwd: string): void {
  run("npm", ["run", script], cwd, "inherit");
}

function repoRoot(cwd = process.cwd()): string {
  return git(["rev-parse", "--show-toplevel"], cwd);
}

function currentBranch(cwd: string): string {
  return git(["branch", "--show-current"], cwd);
}

function requireClean(cwd: string, label: string): void {
  const status = git(["status", "--porcelain"], cwd);

  if (status) {
    fail(`${label} must be clean before continuing.`);
  }
}

function isLinkedWorktree(cwd: string): boolean {
  const gitDir = git(["rev-parse", "--git-dir"], cwd);
  return resolve(cwd, gitDir).includes("/.git/worktrees/");
}

function branchExists(branch: string, cwd: string): boolean {
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", `refs/heads/${branch}`],
    {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
  return result.status === 0;
}

function remoteBranchExists(branch: string, cwd: string): boolean {
  const result = spawnSync(
    "git",
    ["ls-remote", "--exit-code", "--heads", "origin", branch],
    {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
  return result.status === 0;
}

function isAncestor(
  ancestor: string,
  descendant: string,
  cwd: string,
): boolean {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, descendant],
    {
      cwd,
      stdio: "ignore",
    },
  );
  return result.status === 0;
}

function pathsFor(root: string, slug: string) {
  const parent = dirname(root);

  return {
    implBranch: `codex/impl-${slug}`,
    implPath: resolve(parent, `allme-${slug}-impl`),
    planBranch: `codex/plan-${slug}`,
    planPath: resolve(parent, `allme-${slug}-plan`),
  };
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function gitCommonDir(cwd: string): string {
  const commonDir = git(["rev-parse", "--git-common-dir"], cwd);
  return resolve(cwd, commonDir);
}

function metadataPath(root: string, slug: string): string {
  return resolve(gitCommonDir(root), "allme-slices", `${slug}.json`);
}

function loadMetadata(root: string, slug: string): SliceMetadata | undefined {
  const path = metadataPath(root, slug);

  if (!existsSync(path)) {
    return undefined;
  }

  return JSON.parse(readFileSync(path, "utf8")) as SliceMetadata;
}

function saveMetadata(root: string, metadata: SliceMetadata): void {
  const path = metadataPath(root, metadata.slug);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(metadata, null, 2)}\n`);
}

function metadataFor(root: string, args: ParsedArgs): SliceMetadata {
  const slice = pathsFor(root, args.slug);
  const loaded = loadMetadata(root, args.slug);

  return {
    baseBranch: loaded?.baseBranch ?? args.from ?? "main",
    createdAt: loaded?.createdAt ?? new Date().toISOString(),
    description:
      args.description ??
      loaded?.description ??
      "No slice description recorded.",
    implBranch: slice.implBranch,
    implPath: slice.implPath,
    lastValidation: loaded?.lastValidation,
    planBranch: slice.planBranch,
    planPath: slice.planPath,
    slug: args.slug,
  };
}

async function confirm(question: string): Promise<boolean> {
  const prompt = `${question}\nType "yes" to continue: `;
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await readline.question(prompt);
    return answer.trim().toLowerCase() === "yes";
  } finally {
    readline.close();
  }
}

function changedFiles(cwd: string): string[] {
  const tracked = git(["diff", "--name-only", "HEAD"], cwd);
  const untracked = git(["ls-files", "--others", "--exclude-standard"], cwd);
  return [...new Set([...lines(tracked), ...lines(untracked)])].sort();
}

function stagedFiles(cwd: string): string[] {
  return lines(git(["diff", "--cached", "--name-only"], cwd));
}

function lines(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function printFileList(files: string[]): void {
  console.info(files.length > 0 ? files.join("\n") : "No changed files.");
}

function gitOutputOrEmpty(args: string[], cwd: string): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    return "";
  }

  return result.stdout.trim();
}

function branchFile(root: string, branch: string, file: string): string {
  return gitOutputOrEmpty(["show", `${branch}:${file}`], root);
}

function branchFiles(root: string, branch: string, path: string): string[] {
  return lines(
    gitOutputOrEmpty(["ls-tree", "-r", "--name-only", branch, path], root),
  );
}

function fileTextFromWorktreeOrBranch(
  root: string,
  worktreePath: string,
  branch: string,
  file: string,
): string {
  const diskPath = resolve(worktreePath, file);

  if (existsSync(diskPath)) {
    return readFileSync(diskPath, "utf8");
  }

  return branchFile(root, branch, file);
}

function requireBranch(cwd: string, expected: string, label: string): void {
  const actual = currentBranch(cwd);

  if (actual !== expected) {
    fail(
      `${label} must be on ${expected}; current branch is ${actual || "detached"}.`,
    );
  }
}

function commandTarget(
  root: string,
  slug: string,
  kind: "plan" | "impl",
): string {
  const currentRoot = repoRoot();
  const current = pathsFor(root, slug);

  if (
    (kind === "plan" && currentBranch(currentRoot) === current.planBranch) ||
    (kind === "impl" && currentBranch(currentRoot) === current.implBranch)
  ) {
    return currentRoot;
  }

  return kind === "plan" ? current.planPath : current.implPath;
}

function findMainRoot(): string {
  const root = repoRoot();
  const worktrees = git(["worktree", "list", "--porcelain"], root).split(
    "\n\n",
  );
  const main = worktrees.find((entry) =>
    entry.split("\n").includes("branch refs/heads/main"),
  );
  const line = main?.split("\n").find((entry) => entry.startsWith("worktree "));
  return line?.slice("worktree ".length) ?? root;
}

function createSliceWorktrees(args: ParsedArgs): {
  base: string;
  root: string;
  slice: ReturnType<typeof pathsFor>;
} {
  const root = repoRoot();
  const branch = currentBranch(root);

  if (isLinkedWorktree(root)) {
    fail(
      "slice:start must run from the main repository worktree, not a linked worktree.",
    );
  }

  if (!args.from && branch !== "main") {
    fail("slice:start must run on main unless --from is provided.");
  }

  requireClean(root, "Main worktree");

  const base = args.from ?? branch;
  git(["rev-parse", "--verify", base], root);

  const slice = pathsFor(root, args.slug);

  for (const branchName of [slice.planBranch, slice.implBranch]) {
    if (branchExists(branchName, root)) {
      fail(`Branch already exists: ${branchName}`);
    }
  }

  for (const worktreePath of [slice.planPath, slice.implPath]) {
    if (existsSync(worktreePath) || safeLstat(worktreePath)) {
      fail(`Worktree path already exists: ${worktreePath}`);
    }
  }

  git(
    ["worktree", "add", "-b", slice.planBranch, slice.planPath, base],
    root,
    "inherit",
  );
  git(
    ["worktree", "add", "-b", slice.implBranch, slice.implPath, base],
    root,
    "inherit",
  );

  if (args.linkEnv) {
    const source = resolve(root, ".env.local");
    const destination = resolve(slice.implPath, ".env.local");

    if (existsSync(source)) {
      symlinkSync(source, destination);
      console.info(`Linked ${destination} -> ${source}`);
    } else {
      console.info(
        "Skipped .env.local link because the main repo file does not exist.",
      );
    }
  }

  return { base, root, slice };
}

function startSlice(args: ParsedArgs): void {
  const { root, slice } = createSliceWorktrees(args);
  printNextSteps(root, args.slug, slice);
}

function printNextSteps(
  root: string,
  slug: string,
  slice: ReturnType<typeof pathsFor>,
): void {
  console.info("");
  console.info("Slice worktrees created.");
  console.info(`Plan branch: ${slice.planBranch}`);
  console.info(`Impl branch: ${slice.implBranch}`);
  console.info(`Plan worktree: ${slice.planPath}`);
  console.info(`Impl worktree: ${slice.implPath}`);
  console.info("");
  console.info("Next steps:");
  console.info(`1. Plan: cd ${slice.planPath}`);
  console.info(`   npm run slice:commit-plan -- ${slug}`);
  console.info(`2. Implement: cd ${slice.implPath}`);
  console.info(`   npm run slice:merge-plan -- ${slug}`);
  console.info(
    `   npm run slice:commit-impl -- ${slug} --all --message "type(scope): summary"`,
  );
  console.info(`   npm run slice:verify -- ${slug}`);
  console.info(`3. Integrate: cd ${root}`);
  console.info(`   npm run slice:close -- ${slug}`);
  console.info(`   npm run slice:cleanup -- ${slug}`);
}

function statusSlice(args: ParsedArgs): void {
  const root = findMainRoot();
  const slice = pathsFor(root, args.slug);

  console.info("Worktrees:");
  console.info(git(["worktree", "list"], root));
  console.info("");
  printWorktreeStatus("Plan", slice.planPath);
  printWorktreeStatus("Impl", slice.implPath);
  console.info(
    `Plan merged into impl: ${isAncestor(slice.planBranch, slice.implBranch, root) ? "yes" : "no"}`,
  );
  console.info(
    `Impl merged into main: ${isAncestor(slice.implBranch, "main", root) ? "yes" : "no"}`,
  );
}

function printWorktreeStatus(label: string, cwd: string): void {
  console.info(`${label} status (${cwd}):`);

  if (!existsSync(cwd)) {
    console.info("  missing");
    return;
  }

  console.info(git(["status", "--short", "--branch"], cwd) || "  clean");
  console.info("");
}

function commitPlan(args: ParsedArgs): void {
  const root = findMainRoot();
  const slice = pathsFor(root, args.slug);
  const plan = commandTarget(root, args.slug, "plan");
  requireBranch(plan, slice.planBranch, "Plan worktree");

  const files = changedFiles(plan);

  if (files.length === 0) {
    fail("No planning changes to commit.");
  }

  requirePlanningOnly(files);

  git(["add", "--", ...files], plan);
  git(
    ["commit", "-m", args.message ?? `docs(ai): plan ${args.slug} slice`],
    plan,
    "inherit",
  );
}

function isAllowedPlanningFile(
  file: string,
  workflowChanged: boolean,
): boolean {
  return (
    file.startsWith("docs/ai/") ||
    file === "docs/DEVELOPMENT_STATUS.md" ||
    (file === "AGENTS.md" && workflowChanged)
  );
}

function requirePlanningOnly(files: string[]): void {
  const workflowChanged = files.some((file) => file.startsWith("docs/ai/"));
  const blocked = files.filter(
    (file) => !isAllowedPlanningFile(file, workflowChanged),
  );

  if (blocked.length > 0) {
    fail(
      `Plan worktree may only contain approved planning docs:\n${blocked.join(
        "\n",
      )}`,
    );
  }
}

function findDecisionPacket(
  root: string,
  slug: string,
  worktreePath: string,
  branch: string,
): string | undefined {
  const changedPackets = existsSync(worktreePath)
    ? changedFiles(worktreePath).filter(isDecisionPacket)
    : [];

  if (changedPackets.length > 0) {
    return changedPackets[0];
  }

  const branchPackets = branchExists(branch, root)
    ? branchFiles(root, branch, "docs/ai/decisions").filter(isDecisionPacket)
    : [];

  const matching = branchPackets.filter((file) => file.includes(slug));

  if (matching.length > 0) {
    return matching.sort().at(-1);
  }

  const diffPackets = branchExists(branch, root)
    ? lines(
        gitOutputOrEmpty(
          ["diff", "--name-only", `main...${branch}`, "--", "docs/ai"],
          root,
        ),
      ).filter(isDecisionPacket)
    : [];

  return diffPackets.sort().at(-1);
}

function isDecisionPacket(file: string): boolean {
  return file.startsWith("docs/ai/decisions/") && file.endsWith(".md");
}

function requiredSpecialistsFromPacket(
  root: string,
  packetPath: string | undefined,
  planPath: string,
  planBranch: string,
): Array<"UI/UX" | "Data/DB"> {
  if (!packetPath) {
    return [];
  }

  const packet = fileTextFromWorktreeOrBranch(
    root,
    planPath,
    planBranch,
    packetPath,
  );
  const requiredText = requiredRolesText(packet);

  return [
    requiredText.includes("UI/UX") ? "UI/UX" : undefined,
    requiredText.includes("Data/DB") ? "Data/DB" : undefined,
  ].filter((role): role is "UI/UX" | "Data/DB" => Boolean(role));
}

function requiredRolesText(packet: string): string {
  const requiredAgents = sectionText(packet, "Required Agents");

  if (requiredAgents) {
    return requiredAgents.split(/\nNot required:/i)[0] ?? requiredAgents;
  }

  const requiredRoles = packet.match(/Required roles:\s*([^\n]+)/i);

  if (requiredRoles?.[1]) {
    return requiredRoles[1];
  }

  return "";
}

function sectionText(markdown: string, heading: string): string {
  const pattern = new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, "im");
  const match = pattern.exec(markdown);

  if (!match) {
    return "";
  }

  const start = match.index + match[0].length;
  const next = markdown.slice(start).search(/^## /m);

  return next === -1
    ? markdown.slice(start).trim()
    : markdown.slice(start, start + next).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function printPrompt(title: string, prompt: string): void {
  console.info("");
  console.info(`--- ${title} prompt ---`);
  console.info(prompt.trim());
  console.info("--- end prompt ---");
}

function promptContext(
  metadata: SliceMetadata,
  branch: string,
  worktreePath: string,
  packetPath: string | undefined,
): string {
  return `Worktree path: ${worktreePath}
Branch: ${branch}
Slice slug: ${metadata.slug}
Slice description: ${metadata.description}
Active decision packet: ${packetPath ?? "none detected"}`;
}

function printPlannerPrompt(metadata: SliceMetadata): void {
  printPrompt(
    "Product Manager / Architect",
    `You are the Product Manager / Architect for AllMe. Follow AGENTS.md and docs/ai/WORKFLOW.md.

${promptContext(metadata, metadata.planBranch, metadata.planPath, undefined)}

Open the worktree above. Read docs/ai/roles/PRODUCT_MANAGER.md, docs/ai/roles/ARCHITECT.md, docs/ai/NEXT_SLICES.md, docs/ai/TASK_TEMPLATE.md, docs/ROADMAP.md, docs/PROJECT_BLUEPRINT.md, and docs/DEVELOPMENT_STATUS.md.

Plan only. Do not edit product source code. Allowed planning files are docs/ai/**, docs/DEVELOPMENT_STATUS.md, and AGENTS.md only when workflow docs changed. Create or update the active decision packet, define acceptance criteria, non-goals, required specialist roles, protected files, and validation expectations.

When the plan is ready, stop and tell the user to run:
npm run slice:guide -- plan-ready ${metadata.slug}`,
  );
}

function printSpecialistPrompt(
  role: "UI/UX" | "Data/DB",
  metadata: SliceMetadata,
  packetPath: string | undefined,
): void {
  const roleDoc =
    role === "UI/UX" ? "docs/ai/roles/UI_UX.md" : "docs/ai/roles/DATA_DB.md";
  const roleFocus =
    role === "UI/UX"
      ? "layout, interaction states, copy, design-system fit, and UI validation"
      : "schema/query/import/persistence risks, migration ownership, idempotency, and data validation";

  printPrompt(
    role,
    `You are the ${role} role for AllMe. Follow AGENTS.md, docs/ai/WORKFLOW.md, and ${roleDoc}.

${promptContext(metadata, metadata.planBranch, metadata.planPath, packetPath)}

Open the plan worktree above. This is a planning update only unless the user explicitly assigns implementation. Focus on ${roleFocus}. Update the decision packet or planning docs with required guidance, owned/protected files, risks, and validation expectations.

Do not edit product source code in the plan worktree. Allowed planning files are docs/ai/**, docs/DEVELOPMENT_STATUS.md, and AGENTS.md only when workflow docs changed.

When specialist planning is ready, stop and tell the user to run:
npm run slice:guide -- specialist-ready ${metadata.slug}`,
  );
}

function printPrincipalEngineerPrompt(
  metadata: SliceMetadata,
  packetPath: string | undefined,
): void {
  printPrompt(
    "Principal Engineer",
    `You are the Principal Engineer for AllMe. Follow AGENTS.md, docs/ai/WORKFLOW.md, and docs/ai/roles/PRINCIPAL_ENGINEER.md.

${promptContext(metadata, metadata.implBranch, metadata.implPath, packetPath)}

Open the implementation worktree above. Implement the smallest coherent slice described by the active decision packet. Keep product code in the implementation branch, preserve existing user/worktree changes, do not install dependencies, and escalate before crossing unassigned schema, auth, provider-write, finance import, package, or migration boundaries.

Use focused validation for the changed behavior and report commands run or skipped. When implementation is ready, stop and tell the user to run:
npm run slice:guide -- impl-ready ${metadata.slug}`,
  );
}

function printQaReleasePrompt(
  metadata: SliceMetadata,
  packetPath: string | undefined,
): void {
  printPrompt(
    "QA Reviewer / Release Integrator",
    `You are the QA Reviewer / Release Integrator for AllMe. Follow AGENTS.md, docs/ai/WORKFLOW.md, docs/ai/roles/QA_REVIEWER.md, and docs/ai/roles/RELEASE_INTEGRATOR.md.

${promptContext(metadata, metadata.implBranch, metadata.implPath, packetPath)}

Open the implementation worktree above. Review for regressions, unsafe scope expansion, missing tests, broken invariants, migration/order risk, and release readiness. Keep findings concrete with file/line references when reviewing code. Only make QA/release fixes that are assigned and focused.

Expected validation starts with npm run lint:minimal, npm run typecheck, npm run test, and npm run verify. Add npm run build or npm run db:migrate only when the slice requires them.

When QA/release work is ready, stop and tell the user to run:
npm run slice:guide -- qa-ready ${metadata.slug}`,
  );
}

function mergePlan(args: ParsedArgs): void {
  const root = findMainRoot();
  const slice = pathsFor(root, args.slug);
  const impl = commandTarget(root, args.slug, "impl");
  requireBranch(impl, slice.implBranch, "Impl worktree");
  requireClean(impl, "Impl worktree");
  git(["merge", "--no-ff", slice.planBranch], impl, "inherit");
}

function commitImpl(args: ParsedArgs): void {
  const root = findMainRoot();
  const slice = pathsFor(root, args.slug);
  const impl = commandTarget(root, args.slug, "impl");
  requireBranch(impl, slice.implBranch, "Impl worktree");

  const files = changedFiles(impl);
  console.info(
    files.length > 0 ? files.join("\n") : "No unstaged or untracked changes.",
  );
  warnHighRisk(files);

  const message = args.message;

  if (!message) {
    fail(
      "slice:commit-impl requires --message or a positional commit message.",
    );
  }

  if (args.all && files.length > 0) {
    git(["add", "--", ...files], impl);
  }

  const staged = stagedFiles(impl);

  if (staged.length === 0) {
    fail(
      "No staged implementation changes to commit. Use --all or stage files first.",
    );
  }

  git(["commit", "-m", message], impl, "inherit");
}

function warnHighRisk(files: string[]): string[] {
  const risky = files.filter(isHighRiskFile);

  if (risky.length === 0) {
    return [];
  }

  console.warn("");
  console.warn(
    "High-risk files changed; confirm ownership and validation before commit:",
  );
  console.warn(risky.join("\n"));
  console.warn("");
  return risky;
}

function isHighRiskFile(file: string): boolean {
  return (
    file.startsWith("db/migrations/") ||
    file === "src/server/db/schema.ts" ||
    file.startsWith("src/server/auth/") ||
    file === "proxy.ts" ||
    file.startsWith("src/app/api/") ||
    file.startsWith("src/features/calendar/provider-write") ||
    file === "src/features/calendar/actions.ts" ||
    file.startsWith("src/features/calendar/integrations/") ||
    file.startsWith("src/features/calendar/sync/") ||
    file.startsWith("src/features/finance/imports/") ||
    file === "package.json" ||
    basename(file) === "package-lock.json" ||
    basename(file) === "npm-shrinkwrap.json" ||
    basename(file) === "pnpm-lock.yaml" ||
    basename(file) === "yarn.lock" ||
    basename(file) === "bun.lockb"
  );
}

function verifySlice(args: ParsedArgs): void {
  const root = findMainRoot();
  const slice = pathsFor(root, args.slug);
  const impl = commandTarget(root, args.slug, "impl");
  requireBranch(impl, slice.implBranch, "Impl worktree");

  for (const script of ["lint:minimal", "typecheck", "test"]) {
    npmRun(script, impl);
  }

  if (args.build) {
    npmRun("build", impl);
  }

  if (args.migrate) {
    npmRun("db:migrate", impl);
  }
}

function closeSlice(args: ParsedArgs): void {
  const root = repoRoot();
  const slice = pathsFor(root, args.slug);

  if (currentBranch(root) !== "main") {
    fail("slice:close must run from the main worktree on branch main.");
  }

  requireClean(root, "Main worktree");
  requireBranch(slice.implPath, slice.implBranch, "Impl worktree");
  requireClean(slice.implPath, "Impl worktree");

  if (!isAncestor(slice.planBranch, slice.implBranch, root)) {
    if (!args.allowUnmergedPlan) {
      fail(
        "Plan branch is not merged into impl. Use --allow-unmerged-plan to override.",
      );
    }

    console.warn("Warning: closing with an unmerged plan branch.");
  }

  if (!args.skipVerify) {
    verifySlice(args);
  }

  git(["merge", "--no-ff", slice.implBranch], root, "inherit");
  console.info("");
  console.info("Impl branch merged into main.");
  console.info("Push with:");
  console.info("git push origin main");
}

function cleanupSlice(args: ParsedArgs): void {
  const root = findMainRoot();
  const slice = pathsFor(root, args.slug);

  if (!args.force && !isAncestor(slice.implBranch, "main", root)) {
    fail(
      "Impl branch is not merged into main. Use --force to clean up anyway.",
    );
  }

  for (const worktreePath of [slice.planPath, slice.implPath]) {
    if (!existsSync(worktreePath)) {
      continue;
    }

    if (!args.force && git(["status", "--porcelain"], worktreePath)) {
      fail(`Refusing to remove dirty worktree: ${worktreePath}`);
    }

    git(
      ["worktree", "remove", ...(args.force ? ["--force"] : []), worktreePath],
      root,
      "inherit",
    );
  }

  for (const branchName of [slice.planBranch, slice.implBranch]) {
    if (branchExists(branchName, root)) {
      git(["branch", args.force ? "-D" : "-d", branchName], root, "inherit");
    }

    if (args.deleteRemote && remoteBranchExists(branchName, root)) {
      git(["push", "origin", "--delete", branchName], root, "inherit");
    }
  }
}

async function guideStart(args: ParsedArgs): Promise<void> {
  if (!args.description) {
    fail('guide start requires --description "<slice description>".');
  }

  const { base, root, slice } = createSliceWorktrees(args);
  const metadata: SliceMetadata = {
    baseBranch: base,
    createdAt: new Date().toISOString(),
    description: args.description,
    implBranch: slice.implBranch,
    implPath: slice.implPath,
    planBranch: slice.planBranch,
    planPath: slice.planPath,
    slug: args.slug,
  };

  saveMetadata(root, metadata);

  console.info("");
  console.info("Guided slice worktrees created.");
  console.info(`Plan worktree: ${slice.planPath}`);
  console.info(`Implementation worktree: ${slice.implPath}`);
  printPlannerPrompt(metadata);
}

async function guidePlanReady(args: ParsedArgs): Promise<void> {
  const root = findMainRoot();
  const metadata = metadataFor(root, args);
  const plan = commandTarget(root, args.slug, "plan");
  requireBranch(plan, metadata.planBranch, "Plan worktree");

  const files = changedFiles(plan);
  console.info(`Plan worktree: ${plan}`);
  printFileList(files);

  if (files.length === 0) {
    fail("No planning changes to commit.");
  }

  requirePlanningOnly(files);

  const commitApproved = await confirm(
    `Commit planning docs with message "Plan ${humanizeSlug(args.slug)}"?`,
  );

  if (!commitApproved) {
    console.info("Plan commit skipped.");
    return;
  }

  git(["add", "--", ...files], plan);
  git(["commit", "-m", `Plan ${humanizeSlug(args.slug)}`], plan, "inherit");

  const packetPath = findDecisionPacket(
    root,
    args.slug,
    metadata.planPath,
    metadata.planBranch,
  );
  const mergeApproved = await confirm(
    `Merge ${metadata.planBranch} into ${metadata.implBranch} with --no-ff?`,
  );

  if (mergeApproved) {
    mergePlanBranchIntoImpl(metadata, root);
  } else {
    console.info(
      `Plan merge skipped. Run npm run slice:guide -- plan-ready ${args.slug} when ready.`,
    );
    return;
  }

  const specialists = requiredSpecialistsFromPacket(
    root,
    packetPath,
    metadata.planPath,
    metadata.planBranch,
  );

  console.info(`Implementation worktree: ${metadata.implPath}`);

  if (specialists.length > 0) {
    for (const role of specialists) {
      printSpecialistPrompt(role, metadata, packetPath);
    }
  } else {
    printPrincipalEngineerPrompt(metadata, packetPath);
  }
}

async function guideSpecialistReady(args: ParsedArgs): Promise<void> {
  const root = findMainRoot();
  const metadata = metadataFor(root, args);
  const plan = commandTarget(root, args.slug, "plan");
  requireBranch(plan, metadata.planBranch, "Plan worktree");

  const files = changedFiles(plan);
  console.info(`Plan worktree: ${plan}`);
  printFileList(files);

  if (files.length === 0) {
    fail("No specialist planning changes to commit.");
  }

  requirePlanningOnly(files);

  const commitApproved = await confirm(
    `Commit specialist planning updates with message "Update ${humanizeSlug(
      args.slug,
    )} plan"?`,
  );

  if (!commitApproved) {
    console.info("Specialist plan commit skipped.");
    return;
  }

  git(["add", "--", ...files], plan);
  git(
    ["commit", "-m", `Update ${humanizeSlug(args.slug)} plan`],
    plan,
    "inherit",
  );

  const mergeApproved = await confirm(
    `Merge updated ${metadata.planBranch} into ${metadata.implBranch} with --no-ff?`,
  );

  if (mergeApproved) {
    mergePlanBranchIntoImpl(metadata, root);
  } else {
    console.info(
      `Updated plan merge skipped. Run npm run slice:guide -- specialist-ready ${args.slug} when ready.`,
    );
    return;
  }

  const packetPath = findDecisionPacket(
    root,
    args.slug,
    metadata.planPath,
    metadata.planBranch,
  );
  printPrincipalEngineerPrompt(metadata, packetPath);
}

async function guideImplReady(args: ParsedArgs): Promise<void> {
  const root = findMainRoot();
  const metadata = metadataFor(root, args);
  const impl = commandTarget(root, args.slug, "impl");
  requireBranch(impl, metadata.implBranch, "Impl worktree");

  const files = changedFiles(impl);
  console.info(`Implementation worktree: ${impl}`);
  printFileList(files);

  if (files.length === 0) {
    fail("No implementation changes to commit.");
  }

  const risky = warnHighRisk(files);
  const question =
    risky.length > 0
      ? `High-risk files changed. Commit implementation with message "Implement ${humanizeSlug(
          args.slug,
        )}"?`
      : `Commit implementation with message "Implement ${humanizeSlug(
          args.slug,
        )}"?`;
  const commitApproved = await confirm(question);

  if (!commitApproved) {
    console.info("Implementation commit skipped.");
    return;
  }

  git(["add", "--", ...files], impl);
  git(
    ["commit", "-m", `Implement ${humanizeSlug(args.slug)}`],
    impl,
    "inherit",
  );

  const qaApproved = await confirm("Ready to hand off for QA/release?");

  if (!qaApproved) {
    console.info(
      `QA/release handoff skipped. Run npm run slice:guide -- impl-ready ${args.slug} when ready.`,
    );
    return;
  }

  const packetPath = findDecisionPacket(
    root,
    args.slug,
    metadata.implPath,
    metadata.implBranch,
  );
  printQaReleasePrompt(metadata, packetPath);
}

async function guideQaReady(args: ParsedArgs): Promise<void> {
  const root = findMainRoot();
  const metadata = metadataFor(root, args);
  const impl = commandTarget(root, args.slug, "impl");
  requireBranch(impl, metadata.implBranch, "Impl worktree");

  const files = changedFiles(impl);
  console.info(`Implementation worktree: ${impl}`);
  printFileList(files);

  if (files.length > 0) {
    const commitApproved = await confirm(
      `Commit QA/release updates with message "Review ${humanizeSlug(
        args.slug,
      )}"?`,
    );

    if (!commitApproved) {
      console.info("QA/release commit skipped.");
      return;
    }

    git(["add", "--", ...files], impl);
    git(["commit", "-m", `Review ${humanizeSlug(args.slug)}`], impl, "inherit");
  }

  await promptAndRunValidation(args, metadata, root, impl);

  const mergeApproved = await confirm(
    `Merge ${metadata.implBranch} into main with --no-ff?`,
  );

  if (mergeApproved) {
    mergeImplIntoMain(metadata, root);
  } else {
    console.info(
      `Main merge skipped. Run npm run slice:guide -- qa-ready ${args.slug} when ready.`,
    );
    return;
  }

  const cleanupApproved = await confirm("Ready to clean up slice worktrees?");

  if (cleanupApproved) {
    cleanupSlice(args);
  } else {
    console.info(
      `Cleanup skipped. Run npm run slice:guide -- cleanup ${args.slug}`,
    );
  }
}

async function guideCleanup(args: ParsedArgs): Promise<void> {
  const approved = await confirm(
    `Remove worktrees and local branches for ${args.slug}?`,
  );

  if (!approved) {
    console.info("Cleanup skipped.");
    return;
  }

  cleanupSlice(args);
  console.info("");
  console.info("Cleanup complete.");
  statusSlice(args);
}

async function guideClose(args: ParsedArgs): Promise<void> {
  const approved = await confirm(
    `Run close flow and merge codex/impl-${args.slug} into main?`,
  );

  if (!approved) {
    console.info("Close skipped.");
    return;
  }

  closeSlice(args);
}

function guideStatus(args: ParsedArgs): void {
  const root = findMainRoot();
  const metadata = metadataFor(root, args);
  const planMerged = branchExists(metadata.planBranch, root)
    ? isAncestor(metadata.planBranch, metadata.implBranch, root)
    : false;
  const implMerged = branchExists(metadata.implBranch, root)
    ? isAncestor(metadata.implBranch, "main", root)
    : false;

  console.info(`Main worktree: ${root}`);
  console.info(git(["status", "--short", "--branch"], root) || "clean");
  console.info("");
  printDetailedWorktreeStatus("Plan", metadata.planPath, metadata.planBranch);
  printDetailedWorktreeStatus("Impl", metadata.implPath, metadata.implBranch);
  console.info(`Plan merged into impl: ${planMerged ? "yes" : "no"}`);
  console.info(`Impl merged into main: ${implMerged ? "yes" : "no"}`);
  console.info("");
  console.info(
    `Next recommended command: ${nextGuidedCommand(metadata, root)}`,
  );
}

function mergePlanBranchIntoImpl(metadata: SliceMetadata, root: string): void {
  requireBranch(metadata.implPath, metadata.implBranch, "Impl worktree");
  requireClean(metadata.implPath, "Impl worktree");
  git(["merge", "--no-ff", metadata.planBranch], metadata.implPath, "inherit");
}

function mergeImplIntoMain(metadata: SliceMetadata, root: string): void {
  requireBranch(root, "main", "Main worktree");
  requireClean(root, "Main worktree");
  requireBranch(metadata.implPath, metadata.implBranch, "Impl worktree");
  requireClean(metadata.implPath, "Impl worktree");
  git(["merge", "--no-ff", metadata.implBranch], root, "inherit");
  console.info("");
  console.info("Impl branch merged into main.");
  console.info("Push with:");
  console.info("git push origin main");
}

async function promptAndRunValidation(
  args: ParsedArgs,
  metadata: SliceMetadata,
  root: string,
  impl: string,
): Promise<void> {
  const scripts = ["lint:minimal", "typecheck", "test", "verify"];

  if (args.build) {
    scripts.push("build");
  }

  if (args.migrate) {
    scripts.push("db:migrate");
  }

  const approved = await confirm(`Run validation now: ${scripts.join(", ")}?`);

  if (!approved) {
    console.info("Validation skipped. Run these before merging if needed:");
    for (const script of scripts) {
      console.info(`npm run ${script}`);
    }
    saveMetadata(root, {
      ...metadata,
      lastValidation: {
        command: scripts.join(", "),
        passed: false,
        recordedAt: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    for (const script of scripts) {
      npmRun(script, impl);
    }

    console.info("Validation passed.");
    saveMetadata(root, {
      ...metadata,
      lastValidation: {
        command: scripts.join(", "),
        passed: true,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    saveMetadata(root, {
      ...metadata,
      lastValidation: {
        command: scripts.join(", "),
        passed: false,
        recordedAt: new Date().toISOString(),
      },
    });
    throw error;
  }
}

function printDetailedWorktreeStatus(
  label: string,
  worktreePath: string,
  branch: string,
): void {
  console.info(`${label} worktree: ${worktreePath}`);

  if (!existsSync(worktreePath)) {
    console.info("missing");
    console.info("");
    return;
  }

  console.info(`Branch: ${currentBranch(worktreePath) || "detached"}`);
  console.info(git(["status", "--short", "--branch"], worktreePath) || "clean");
  console.info("Changed files:");
  printFileList(changedFiles(worktreePath));
  console.info(`Expected branch: ${branch}`);
  console.info("");
}

function nextGuidedCommand(metadata: SliceMetadata, root: string): string {
  if (
    !branchExists(metadata.planBranch, root) ||
    !branchExists(metadata.implBranch, root)
  ) {
    return `npm run slice:guide -- start ${metadata.slug} --description "<slice description>"`;
  }

  if (
    existsSync(metadata.planPath) &&
    changedFiles(metadata.planPath).length > 0
  ) {
    return `npm run slice:guide -- plan-ready ${metadata.slug}`;
  }

  if (!isAncestor(metadata.planBranch, metadata.implBranch, root)) {
    return `npm run slice:guide -- plan-ready ${metadata.slug}`;
  }

  if (
    existsSync(metadata.implPath) &&
    changedFiles(metadata.implPath).length > 0
  ) {
    return `npm run slice:guide -- impl-ready ${metadata.slug}`;
  }

  if (!isAncestor(metadata.implBranch, "main", root)) {
    return `npm run slice:guide -- qa-ready ${metadata.slug}`;
  }

  return `npm run slice:guide -- cleanup ${metadata.slug}`;
}

function assertNoSymlinkCollision(path: string): void {
  if (existsSync(path) || safeLstat(path)) {
    fail(`Path already exists: ${path}`);
  }
}

function safeLstat(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

const legacyHandlers: Record<
  Exclude<
    SliceCommand,
    "plan-ready" | "specialist-ready" | "impl-ready" | "qa-ready"
  >,
  (args: ParsedArgs) => void
> = {
  cleanup: cleanupSlice,
  close: closeSlice,
  "commit-impl": commitImpl,
  "commit-plan": commitPlan,
  "merge-plan": mergePlan,
  start: startSlice,
  status: statusSlice,
  verify: verifySlice,
};

const guideHandlers: Record<
  SliceCommand,
  (args: ParsedArgs) => Promise<void> | void
> = {
  cleanup: guideCleanup,
  close: guideClose,
  "commit-impl": commitImpl,
  "commit-plan": commitPlan,
  "impl-ready": guideImplReady,
  "merge-plan": mergePlan,
  "plan-ready": guidePlanReady,
  "qa-ready": guideQaReady,
  "specialist-ready": guideSpecialistReady,
  start: guideStart,
  status: guideStatus,
  verify: verifySlice,
};

try {
  const args = parseArgs(process.argv.slice(2));
  const destination = pathsFor(repoRoot(), args.slug).implPath;

  if (args.linkEnv) {
    assertNoSymlinkCollision(resolve(destination, ".env.local"));
  }

  if (args.guided) {
    await guideHandlers[args.command](args);
  } else if (args.command in legacyHandlers) {
    legacyHandlers[args.command as keyof typeof legacyHandlers](args);
  } else {
    fail(`Command ${args.command} is only available through slice:guide.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
