import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, symlinkSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

type SliceCommand =
  | "start"
  | "status"
  | "commit-plan"
  | "merge-plan"
  | "commit-impl"
  | "verify"
  | "close"
  | "cleanup";

type ParsedArgs = {
  all: boolean;
  allowUnmergedPlan: boolean;
  build: boolean;
  command: SliceCommand;
  deleteRemote: boolean;
  force: boolean;
  from?: string;
  linkEnv: boolean;
  message?: string;
  migrate: boolean;
  skipVerify: boolean;
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
]);

function usage(): never {
  console.error(`Usage: tsx scripts/slice-workflow.ts <command> <slice-slug> [options]

Commands:
  start          Create plan and implementation worktrees.
  status         Show worktree, branch, and merge status.
  commit-plan    Commit docs-only planning changes in the plan worktree.
  merge-plan     Merge the plan branch into the implementation branch.
  commit-impl    Commit implementation changes in the implementation worktree.
  verify         Run slice validation in the implementation worktree.
  close          Verify and merge the implementation branch into main.
  cleanup        Remove worktrees and delete local slice branches.

Options:
  --from <branch>             Base branch for start.
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
  const [rawCommand, ...rest] = argv;

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
    linkEnv: false,
    migrate: false,
    skipVerify: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--from") {
      parsed.from = requireValue(rest, (index += 1), arg);
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

function startSlice(args: ParsedArgs): void {
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

  const workflowChanged = files.some((file) => file.startsWith("docs/ai/"));
  const blocked = files.filter(
    (file) => !isAllowedPlanningFile(file, workflowChanged),
  );

  if (blocked.length > 0) {
    fail(
      `Planning commits may only contain approved docs paths:\n${blocked.join("\n")}`,
    );
  }

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

function warnHighRisk(files: string[]): void {
  const risky = files.filter(isHighRiskFile);

  if (risky.length === 0) {
    return;
  }

  console.warn("");
  console.warn(
    "High-risk files changed; confirm ownership and validation before commit:",
  );
  console.warn(risky.join("\n"));
  console.warn("");
}

function isHighRiskFile(file: string): boolean {
  return (
    file.startsWith("db/migrations/") ||
    file === "src/server/db/schema.ts" ||
    file.startsWith("src/server/auth/") ||
    file.startsWith("src/features/calendar/provider-write") ||
    file === "src/features/calendar/actions.ts" ||
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

const handlers: Record<SliceCommand, (args: ParsedArgs) => void> = {
  cleanup: cleanupSlice,
  close: closeSlice,
  "commit-impl": commitImpl,
  "commit-plan": commitPlan,
  "merge-plan": mergePlan,
  start: startSlice,
  status: statusSlice,
  verify: verifySlice,
};

try {
  const args = parseArgs(process.argv.slice(2));
  const destination = pathsFor(repoRoot(), args.slug).implPath;

  if (args.linkEnv) {
    assertNoSymlinkCollision(resolve(destination, ".env.local"));
  }

  handlers[args.command](args);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
