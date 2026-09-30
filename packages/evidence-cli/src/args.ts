import { AgentProofError } from "@agentproof/evidence-core";

export type ParsedCliCommand =
  | {
      readonly command: "analyze";
      readonly workspacePath: string;
      readonly metadataPath: string;
      readonly outputPath: string;
    }
  | {
      readonly command: "evaluate";
      readonly evidencePath: string;
      readonly policyPath: string;
      readonly dispositionsPath: string;
      readonly outputPath: string;
    }
  | {
      readonly command: "assemble";
      readonly fragmentPaths: readonly string[];
      readonly outputPath: string;
    }
  | { readonly command: "help" };

function argumentError(message: string): never {
  throw new AgentProofError("AP_CLI_ARGUMENT_INVALID", message);
}

function parseNamedOptions(
  args: readonly string[],
  allowed: readonly string[],
): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (
      flag === undefined ||
      value === undefined ||
      !flag.startsWith("--") ||
      value.startsWith("--")
    ) {
      argumentError("Every command option must be a --flag value pair.");
    }
    if (!allowed.includes(flag)) {
      argumentError(`Unknown option: ${flag}`);
    }
    if (values.has(flag)) {
      argumentError(`Duplicate option: ${flag}`);
    }
    values.set(flag, value);
  }
  for (const required of allowed) {
    if (!values.has(required)) {
      argumentError(`Missing required option: ${required}`);
    }
  }
  return values;
}

function required(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key);
  if (value === undefined) {
    argumentError(`Missing required option: ${key}`);
  }
  return value;
}

function parseAssemble(args: readonly string[]): ParsedCliCommand {
  const fragmentFlag = args.indexOf("--fragments");
  const outputFlag = args.indexOf("--output");
  if (fragmentFlag < 0 || outputFlag < 0) {
    argumentError("Assemble requires --fragments and --output.");
  }
  if (
    args.filter((value) => value === "--fragments").length !== 1 ||
    args.filter((value) => value === "--output").length !== 1
  ) {
    argumentError("Assemble options cannot be repeated.");
  }
  if (outputFlag + 1 >= args.length || outputFlag + 2 !== args.length) {
    argumentError("--output must be the final flag/value pair.");
  }
  if (fragmentFlag !== 0 || outputFlag <= 2) {
    argumentError("Use assemble --fragments <evidence> <reviews...> --output <json>.");
  }
  const fragmentPaths = args.slice(fragmentFlag + 1, outputFlag);
  if (fragmentPaths.some((path) => path.startsWith("--"))) {
    argumentError("Unknown assemble option.");
  }
  if (fragmentPaths.length < 2) {
    argumentError("Assemble needs final evidence and at least one review fragment.");
  }
  const outputPath = args[outputFlag + 1];
  if (outputPath === undefined || outputPath.startsWith("--")) {
    argumentError("Assemble output path is missing.");
  }
  return { command: "assemble", fragmentPaths, outputPath };
}

export function parseCliArgs(argv: readonly string[]): ParsedCliCommand {
  const [command, ...args] = argv;
  if (command === undefined || command === "--help" || command === "-h" || command === "help") {
    return { command: "help" };
  }
  if (command === "analyze") {
    const values = parseNamedOptions(args, ["--workspace", "--metadata", "--output"]);
    return {
      command,
      workspacePath: required(values, "--workspace"),
      metadataPath: required(values, "--metadata"),
      outputPath: required(values, "--output"),
    };
  }
  if (command === "evaluate") {
    const values = parseNamedOptions(args, [
      "--evidence",
      "--policy",
      "--dispositions",
      "--output",
    ]);
    return {
      command,
      evidencePath: required(values, "--evidence"),
      policyPath: required(values, "--policy"),
      dispositionsPath: required(values, "--dispositions"),
      outputPath: required(values, "--output"),
    };
  }
  if (command === "assemble") {
    return parseAssemble(args);
  }
  argumentError(`Unknown command: ${command}`);
}
