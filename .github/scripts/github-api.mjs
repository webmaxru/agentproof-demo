import { appendFile, readFile } from "node:fs/promises";

const API_VERSION = "2026-03-10";
const DEFAULT_MAX_ITEMS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

export class GitHubApiError extends Error {
  constructor({ method, path, status, detail }) {
    const boundedDetail = String(detail).replaceAll("\r", " ").replaceAll("\n", " ").slice(0, 2000);
    super(
      `GitHub API ${method} ${path} failed (${status})${
        boundedDetail.length === 0 ? "" : `: ${boundedDetail}`
      }`,
    );
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export function assertRepositoryFullName(value, label = "repository") {
  if (
    typeof value !== "string" ||
    value.length > 201 ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/u.test(value)
  ) {
    throw new Error(`${label} must be exactly OWNER/REPO`);
  }
  return value;
}

export function repositoryFromEnvironment() {
  const value = process.env.GITHUB_REPOSITORY;
  assertRepositoryFullName(value, "GITHUB_REPOSITORY");
  const [owner, repo] = value.split("/");

  return { owner, repo, fullName: value };
}

export function requireToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required");
  }
  return token;
}

export async function githubRequest(path, options = {}) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.includes("\r") ||
    path.includes("\n")
  ) {
    throw new Error("GitHub API path must be a safe absolute API path");
  }
  const token = options.token ?? requireToken();
  const method = options.method ?? "GET";
  const headers = {
    ...options.headers,
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "agentproof-workflow",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "error",
    signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new GitHubApiError({ method, path, status: response.status, detail });
  }

  if (response.status === 204 || response.status === 205) {
    return undefined;
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`GitHub API ${method} ${path} returned malformed JSON`);
  }
}

export async function githubPaginate(path, options = {}) {
  const { maxItems = DEFAULT_MAX_ITEMS, ...requestOptions } = options;
  if (!Number.isSafeInteger(maxItems) || maxItems <= 0) {
    throw new Error("maxItems must be a positive integer");
  }
  const separator = path.includes("?") ? "&" : "?";
  const items = [];

  for (let page = 1; ; page += 1) {
    const response = await githubRequest(
      `${path}${separator}per_page=100&page=${page}`,
      requestOptions,
    );
    if (!Array.isArray(response)) {
      throw new Error(`Expected a paginated array from ${path}`);
    }
    items.push(...response);
    if (items.length > maxItems) {
      throw new Error(`GitHub pagination from ${path} exceeded ${maxItems} items`);
    }
    if (response.length < 100) {
      return items;
    }
  }
}

export async function readEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH is required");
  }
  return JSON.parse(await readFile(eventPath, "utf8"));
}

export function assertSha(value, label = "SHA") {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error(`${label} must be a full 40-character Git SHA`);
  }
  return value.toLowerCase();
}

export function assertPositiveInteger(value, label) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[1-9]\d*$/u.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

export async function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  const normalized = String(value);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
    throw new Error("GitHub output name is invalid");
  }
  if (/[\0\r\n]/u.test(normalized)) {
    throw new Error(`GitHub output ${name} must be a single line`);
  }
  await appendFile(outputPath, `${name}=${normalized}\n`, "utf8");
}

export function permissionRank(permission) {
  return (
    {
      none: 0,
      read: 1,
      triage: 2,
      write: 3,
      maintain: 4,
      admin: 5,
    }[permission] ?? 0
  );
}

export async function collaboratorPermission({ owner, repo, username }) {
  if (
    typeof username !== "string" ||
    username.length > 100 ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9-]*(?:\[bot\])?)?$/u.test(username)
  ) {
    return "none";
  }
  try {
    const result = await githubRequest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}/permission`,
    );
    return permissionRank(result?.permission) > 0 ? result.permission : "none";
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return "none";
    }
    throw error;
  }
}
