import { spawn, type ChildProcess } from "node:child_process";

export interface CommandResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly error: string | null;
}

export interface RunCommandOptions {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly maximumOutputBytes?: number;
  readonly environment?: Readonly<Record<string, string>>;
}

function sanitizedEnvironment(overrides: Readonly<Record<string, string>> = {}): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    CI: "true",
    NO_COLOR: "1",
  };
  for (const name of [
    "PATH",
    "Path",
    "PATHEXT",
    "SystemRoot",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "TEMP",
    "TMP",
  ]) {
    const value = process.env[name];
    if (value !== undefined) {
      environment[name] = value;
    }
  }
  for (const [name, value] of Object.entries(overrides)) {
    environment[name] = value;
  }
  return environment;
}

export async function runBoundedCommand(options: RunCommandOptions): Promise<CommandResult> {
  const maximumOutputBytes = options.maximumOutputBytes ?? 10 * 1024 * 1024;
  return new Promise((resolveResult) => {
    let settled = false;
    let outputBytes = 0;
    const chunks: Buffer[] = [];
    let child: ChildProcess;
    try {
      child = spawn(options.command, [...options.args], {
        cwd: options.cwd,
        env: sanitizedEnvironment(options.environment),
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch {
      resolveResult({
        exitCode: null,
        stdout: "",
        error: "Command could not be started.",
      });
      return;
    }

    const finish = (result: CommandResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolveResult(result);
    };
    const terminateForOutput = (): void => {
      child.kill("SIGKILL");
      finish({
        exitCode: null,
        stdout: "",
        error: "Command output exceeded the configured limit.",
      });
    };

    child.stdout?.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      outputBytes += buffer.length;
      if (outputBytes > maximumOutputBytes) {
        terminateForOutput();
      } else {
        chunks.push(buffer);
      }
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      const length = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      outputBytes += length;
      if (outputBytes > maximumOutputBytes) {
        terminateForOutput();
      }
    });
    child.once("error", () => {
      finish({
        exitCode: null,
        stdout: "",
        error: "Command could not be started.",
      });
    });
    child.once("close", (code, signal) => {
      finish({
        exitCode: code,
        stdout: Buffer.concat(chunks).toString("utf8"),
        error:
          code === null
            ? `Command ended without an exit code${signal === null ? "." : ` (${signal}).`}`
            : null,
      });
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        exitCode: null,
        stdout: "",
        error: "Command exceeded its time limit.",
      });
    }, options.timeoutMs);
    timer.unref();
  });
}
