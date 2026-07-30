import fs from "node:fs/promises";
import path from "node:path";

/**
 * Best-effort tech-stack detection. Reads a project's manifest files
 * (package.json, go.mod, Cargo.toml, requirements.txt, composer.json, …) and
 * returns a short human-readable summary of the languages, frameworks, and
 * tools in use. Fed into the plan + recipe prompts so Adeptly's suggestions
 * tailor to what you actually build with. Never throws.
 */

export interface StackInfo {
  languages: string[];
  frameworks: string[];
  tools: string[];
  packageManager?: string;
  /** One-liner for prompts + UI, e.g. "TypeScript · Next.js, React · Prisma, Tailwind". Empty if nothing detected. */
  summary: string;
}

async function read(projectRoot: string, file: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(projectRoot, file), "utf-8");
  } catch {
    return null;
  }
}

async function exists(projectRoot: string, file: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectRoot, file));
    return true;
  } catch {
    return false;
  }
}

// npm dependency name -> label + bucket
const DEP_MAP: Array<{ match: RegExp; label: string; bucket: "frameworks" | "tools" }> = [
  { match: /^next$/, label: "Next.js", bucket: "frameworks" },
  { match: /^nuxt$/, label: "Nuxt", bucket: "frameworks" },
  { match: /^@remix-run\//, label: "Remix", bucket: "frameworks" },
  { match: /^astro$/, label: "Astro", bucket: "frameworks" },
  { match: /^@angular\/core$/, label: "Angular", bucket: "frameworks" },
  { match: /^@sveltejs\/kit$/, label: "SvelteKit", bucket: "frameworks" },
  { match: /^svelte$/, label: "Svelte", bucket: "frameworks" },
  { match: /^vue$/, label: "Vue", bucket: "frameworks" },
  { match: /^react-native$/, label: "React Native", bucket: "frameworks" },
  { match: /^react$/, label: "React", bucket: "frameworks" },
  { match: /^solid-js$/, label: "SolidJS", bucket: "frameworks" },
  { match: /^@nestjs\/core$/, label: "NestJS", bucket: "frameworks" },
  { match: /^express$/, label: "Express", bucket: "frameworks" },
  { match: /^fastify$/, label: "Fastify", bucket: "frameworks" },
  { match: /^koa$/, label: "Koa", bucket: "frameworks" },
  { match: /^@hono\/|^hono$/, label: "Hono", bucket: "frameworks" },
  { match: /^electron$/, label: "Electron", bucket: "frameworks" },
  { match: /^@prisma\/client$|^prisma$/, label: "Prisma", bucket: "tools" },
  { match: /^drizzle-orm$/, label: "Drizzle", bucket: "tools" },
  { match: /^mongoose$/, label: "Mongoose", bucket: "tools" },
  { match: /^typeorm$/, label: "TypeORM", bucket: "tools" },
  { match: /^sequelize$/, label: "Sequelize", bucket: "tools" },
  { match: /^@trpc\//, label: "tRPC", bucket: "tools" },
  { match: /^graphql$/, label: "GraphQL", bucket: "tools" },
  { match: /^tailwindcss$/, label: "Tailwind", bucket: "tools" },
  { match: /^@reduxjs\/toolkit$|^redux$/, label: "Redux", bucket: "tools" },
  { match: /^zustand$/, label: "Zustand", bucket: "tools" },
  { match: /^vitest$/, label: "Vitest", bucket: "tools" },
  { match: /^jest$/, label: "Jest", bucket: "tools" },
  { match: /^@playwright\/test$|^playwright$/, label: "Playwright", bucket: "tools" },
  { match: /^cypress$/, label: "Cypress", bucket: "tools" },
  { match: /^vite$/, label: "Vite", bucket: "tools" },
];

function uniq(arr: string[]): string[] {
  return [...new Set(arr)];
}

export async function detectStack(projectRoot: string): Promise<StackInfo> {
  const languages: string[] = [];
  const frameworks: string[] = [];
  const tools: string[] = [];
  let packageManager: string | undefined;

  // --- JavaScript / TypeScript ---
  const pkgRaw = await read(projectRoot, "package.json");
  if (pkgRaw) {
    languages.push("JavaScript");
    try {
      const pkg = JSON.parse(pkgRaw);
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const names = Object.keys(deps);
      if (names.includes("typescript") || (await exists(projectRoot, "tsconfig.json"))) {
        languages[languages.indexOf("JavaScript")] = "TypeScript";
      }
      for (const name of names) {
        for (const d of DEP_MAP) {
          if (d.match.test(name)) (d.bucket === "frameworks" ? frameworks : tools).push(d.label);
        }
      }
    } catch {
      /* malformed package.json — still know it's a JS project */
    }
    if (await exists(projectRoot, "pnpm-lock.yaml")) packageManager = "pnpm";
    else if (await exists(projectRoot, "yarn.lock")) packageManager = "yarn";
    else if (await exists(projectRoot, "bun.lockb")) packageManager = "bun";
    else if (await exists(projectRoot, "package-lock.json")) packageManager = "npm";
  }

  // --- Go ---
  const goMod = await read(projectRoot, "go.mod");
  if (goMod) {
    languages.push("Go");
    if (/gin-gonic\/gin/.test(goMod)) frameworks.push("Gin");
    if (/gofiber\/fiber/.test(goMod)) frameworks.push("Fiber");
    if (/labstack\/echo/.test(goMod)) frameworks.push("Echo");
  }

  // --- Rust ---
  const cargo = await read(projectRoot, "Cargo.toml");
  if (cargo) {
    languages.push("Rust");
    if (/\baxum\b/.test(cargo)) frameworks.push("Axum");
    if (/\bactix-web\b/.test(cargo)) frameworks.push("Actix");
    if (/\brocket\b/.test(cargo)) frameworks.push("Rocket");
  }

  // --- Python ---
  const py = (await read(projectRoot, "requirements.txt")) || (await read(projectRoot, "pyproject.toml")) || (await read(projectRoot, "Pipfile"));
  if (py) {
    languages.push("Python");
    if (/django/i.test(py)) frameworks.push("Django");
    if (/flask/i.test(py)) frameworks.push("Flask");
    if (/fastapi/i.test(py)) frameworks.push("FastAPI");
  }

  // --- PHP ---
  const composer = await read(projectRoot, "composer.json");
  if (composer) {
    languages.push("PHP");
    if (/laravel\/framework/.test(composer)) frameworks.push("Laravel");
    if (/symfony\//.test(composer)) frameworks.push("Symfony");
  }

  // --- Ruby ---
  const gemfile = await read(projectRoot, "Gemfile");
  if (gemfile) {
    languages.push("Ruby");
    if (/['"]rails['"]/.test(gemfile) || /\brails\b/.test(gemfile)) frameworks.push("Rails");
  }

  // --- JVM ---
  if (await exists(projectRoot, "pom.xml")) languages.push("Java");
  if ((await exists(projectRoot, "build.gradle")) || (await exists(projectRoot, "build.gradle.kts"))) languages.push("Java/Kotlin");

  // --- infra ---
  if (await exists(projectRoot, "Dockerfile")) tools.push("Docker");

  const langs = uniq(languages);
  const fws = uniq(frameworks);
  const tls = uniq(tools);

  const parts: string[] = [];
  if (langs.length) parts.push(langs.join("/"));
  if (fws.length) parts.push(fws.join(", "));
  if (tls.length) parts.push(tls.join(", "));
  const summary = parts.join(" · ") + (packageManager && parts.length ? ` · ${packageManager}` : "");

  return { languages: langs, frameworks: fws, tools: tls, packageManager, summary: summary.trim() };
}

/** Prompt block naming the detected stack, or "" when nothing was found. */
export function stackPromptSection(stack: StackInfo): string {
  if (!stack.summary) return "";
  return `DETECTED TECH STACK (tailor every recommendation to this — features, file paths, commands, libraries):\n${stack.summary}\n\n`;
}
