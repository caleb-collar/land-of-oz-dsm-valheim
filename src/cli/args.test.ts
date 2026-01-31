/**
 * Unit tests for CLI argument parser
 */

import { assertEquals } from "@std/assert";
import { getHelpText, parseArgs } from "./args.ts";

// Basic flag parsing tests
Deno.test("parseArgs with --version returns version command", () => {
  const result = parseArgs(["--version"]);

  assertEquals(result.command, "version");
  assertEquals(result.version, true);
});

Deno.test("parseArgs with -v returns version command", () => {
  const result = parseArgs(["-v"]);

  assertEquals(result.command, "version");
  assertEquals(result.version, true);
});

Deno.test("parseArgs with --help returns help command", () => {
  const result = parseArgs(["--help"]);

  assertEquals(result.command, "help");
  assertEquals(result.help, true);
});

Deno.test("parseArgs with -h returns help command", () => {
  const result = parseArgs(["-h"]);

  assertEquals(result.command, "help");
  assertEquals(result.help, true);
});

Deno.test("parseArgs with --debug sets debug flag", () => {
  const result = parseArgs(["--debug", "start"]);

  assertEquals(result.debug, true);
  assertEquals(result.command, "start");
});

Deno.test("parseArgs with no args returns null command", () => {
  const result = parseArgs([]);

  assertEquals(result.command, null);
});

// Start command tests
Deno.test("parseArgs start command basic", () => {
  const result = parseArgs(["start"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.name, undefined);
    assertEquals(result.port, undefined);
    assertEquals(result.world, undefined);
  }
});

Deno.test("parseArgs start with --name flag", () => {
  const result = parseArgs(["start", "--name", "My Server"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.name, "My Server");
  }
});

Deno.test("parseArgs start with -n short flag", () => {
  const result = parseArgs(["start", "-n", "Test Server"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.name, "Test Server");
  }
});

Deno.test("parseArgs start with --port flag", () => {
  const result = parseArgs(["start", "--port", "2457"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.port, 2457);
  }
});

Deno.test("parseArgs start with -p short flag", () => {
  const result = parseArgs(["start", "-p", "2458"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.port, 2458);
  }
});

Deno.test("parseArgs start rejects invalid port", () => {
  // Port too low
  const result1 = parseArgs(["start", "--port", "80"]);
  if (result1.command === "start") {
    assertEquals(result1.port, undefined);
  }

  // Port too high
  const result2 = parseArgs(["start", "--port", "70000"]);
  if (result2.command === "start") {
    assertEquals(result2.port, undefined);
  }

  // Invalid number
  const result3 = parseArgs(["start", "--port", "abc"]);
  if (result3.command === "start") {
    assertEquals(result3.port, undefined);
  }
});

Deno.test("parseArgs start with --world flag", () => {
  const result = parseArgs(["start", "--world", "MyWorld"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.world, "MyWorld");
  }
});

Deno.test("parseArgs start with --public flag", () => {
  const result = parseArgs(["start", "--public"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.public, true);
  }
});

Deno.test("parseArgs start with --crossplay flag", () => {
  const result = parseArgs(["start", "--crossplay"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.crossplay, true);
  }
});

Deno.test("parseArgs start with --background flag", () => {
  const result = parseArgs(["start", "--background"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.background, true);
  }
});

Deno.test("parseArgs start with -b short flag", () => {
  const result = parseArgs(["start", "-b"]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.background, true);
  }
});

Deno.test("parseArgs start with multiple flags", () => {
  const result = parseArgs([
    "start",
    "--name",
    "Viking Server",
    "-p",
    "2460",
    "--world",
    "Midgard",
    "--public",
    "--crossplay",
  ]);

  assertEquals(result.command, "start");
  if (result.command === "start") {
    assertEquals(result.name, "Viking Server");
    assertEquals(result.port, 2460);
    assertEquals(result.world, "Midgard");
    assertEquals(result.public, true);
    assertEquals(result.crossplay, true);
  }
});

// Stop command tests
Deno.test("parseArgs stop command basic", () => {
  const result = parseArgs(["stop"]);

  assertEquals(result.command, "stop");
  if (result.command === "stop") {
    assertEquals(result.force, false);
    assertEquals(result.timeout, undefined);
  }
});

Deno.test("parseArgs stop with --force flag", () => {
  const result = parseArgs(["stop", "--force"]);

  assertEquals(result.command, "stop");
  if (result.command === "stop") {
    assertEquals(result.force, true);
  }
});

Deno.test("parseArgs stop with -f short flag", () => {
  const result = parseArgs(["stop", "-f"]);

  assertEquals(result.command, "stop");
  if (result.command === "stop") {
    assertEquals(result.force, true);
  }
});

Deno.test("parseArgs stop with --timeout flag", () => {
  const result = parseArgs(["stop", "--timeout", "60000"]);

  assertEquals(result.command, "stop");
  if (result.command === "stop") {
    assertEquals(result.timeout, 60000);
  }
});

// Install command tests
Deno.test("parseArgs install command basic", () => {
  const result = parseArgs(["install"]);

  assertEquals(result.command, "install");
  if (result.command === "install") {
    assertEquals(result.dryRun, false);
    assertEquals(result.validate, false);
    assertEquals(result.force, false);
  }
});

Deno.test("parseArgs install with --dry-run flag", () => {
  const result = parseArgs(["install", "--dry-run"]);

  assertEquals(result.command, "install");
  if (result.command === "install") {
    assertEquals(result.dryRun, true);
  }
});

Deno.test("parseArgs install with --validate flag", () => {
  const result = parseArgs(["install", "--validate"]);

  assertEquals(result.command, "install");
  if (result.command === "install") {
    assertEquals(result.validate, true);
  }
});

Deno.test("parseArgs install with --force flag", () => {
  const result = parseArgs(["install", "--force"]);

  assertEquals(result.command, "install");
  if (result.command === "install") {
    assertEquals(result.force, true);
  }
});

// Config command tests
Deno.test("parseArgs config command defaults to list", () => {
  const result = parseArgs(["config"]);

  assertEquals(result.command, "config");
  if (result.command === "config") {
    assertEquals(result.subcommand, "list");
  }
});

Deno.test("parseArgs config list subcommand", () => {
  const result = parseArgs(["config", "list"]);

  assertEquals(result.command, "config");
  if (result.command === "config") {
    assertEquals(result.subcommand, "list");
  }
});

Deno.test("parseArgs config get subcommand with key", () => {
  const result = parseArgs(["config", "get", "server.name"]);

  assertEquals(result.command, "config");
  if (result.command === "config") {
    assertEquals(result.subcommand, "get");
    assertEquals(result.key, "server.name");
  }
});

Deno.test("parseArgs config set subcommand with key and value", () => {
  const result = parseArgs(["config", "set", "server.port", "2457"]);

  assertEquals(result.command, "config");
  if (result.command === "config") {
    assertEquals(result.subcommand, "set");
    assertEquals(result.key, "server.port");
    assertEquals(result.value, "2457");
  }
});

Deno.test("parseArgs config reset subcommand", () => {
  const result = parseArgs(["config", "reset"]);

  assertEquals(result.command, "config");
  if (result.command === "config") {
    assertEquals(result.subcommand, "reset");
  }
});

// Worlds command tests
Deno.test("parseArgs worlds command defaults to list", () => {
  const result = parseArgs(["worlds"]);

  assertEquals(result.command, "worlds");
  if (result.command === "worlds") {
    assertEquals(result.subcommand, "list");
  }
});

Deno.test("parseArgs worlds list subcommand", () => {
  const result = parseArgs(["worlds", "list"]);

  assertEquals(result.command, "worlds");
  if (result.command === "worlds") {
    assertEquals(result.subcommand, "list");
  }
});

Deno.test("parseArgs worlds info subcommand with name", () => {
  const result = parseArgs(["worlds", "info", "MyWorld"]);

  assertEquals(result.command, "worlds");
  if (result.command === "worlds") {
    assertEquals(result.subcommand, "info");
    assertEquals(result.name, "MyWorld");
  }
});

Deno.test("parseArgs worlds import with path", () => {
  const result = parseArgs([
    "worlds",
    "import",
    "NewWorld",
    "--path",
    "./backup",
  ]);

  assertEquals(result.command, "worlds");
  if (result.command === "worlds") {
    assertEquals(result.subcommand, "import");
    assertEquals(result.name, "NewWorld");
    assertEquals(result.path, "./backup");
  }
});

Deno.test("parseArgs worlds export with path", () => {
  const result = parseArgs([
    "worlds",
    "export",
    "MyWorld",
    "--path",
    "./export",
  ]);

  assertEquals(result.command, "worlds");
  if (result.command === "worlds") {
    assertEquals(result.subcommand, "export");
    assertEquals(result.name, "MyWorld");
    assertEquals(result.path, "./export");
  }
});

Deno.test("parseArgs worlds delete with force", () => {
  const result = parseArgs(["worlds", "delete", "OldWorld", "--force"]);

  assertEquals(result.command, "worlds");
  if (result.command === "worlds") {
    assertEquals(result.subcommand, "delete");
    assertEquals(result.name, "OldWorld");
    assertEquals(result.force, true);
  }
});

// TUI command tests
Deno.test("parseArgs tui command", () => {
  const result = parseArgs(["tui"]);

  assertEquals(result.command, "tui");
});

// Help command tests
Deno.test("parseArgs help command basic", () => {
  const result = parseArgs(["help"]);

  assertEquals(result.command, "help");
  if (result.command === "help") {
    assertEquals(result.topic, undefined);
  }
});

Deno.test("parseArgs help command with topic", () => {
  const result = parseArgs(["help", "start"]);

  assertEquals(result.command, "help");
  if (result.command === "help") {
    assertEquals(result.topic, "start");
  }
});

// Version command tests
Deno.test("parseArgs version command", () => {
  const result = parseArgs(["version"]);

  assertEquals(result.command, "version");
});

// Help text tests
Deno.test("getHelpText returns main help without args", () => {
  const help = getHelpText();

  assertEquals(typeof help, "string");
  assertEquals(help.includes("USAGE:"), true);
  assertEquals(help.includes("COMMANDS:"), true);
  assertEquals(help.includes("start"), true);
  assertEquals(help.includes("stop"), true);
  assertEquals(help.includes("install"), true);
  assertEquals(help.includes("config"), true);
  assertEquals(help.includes("worlds"), true);
  assertEquals(help.includes("tui"), true);
});

Deno.test("getHelpText returns start command help", () => {
  const help = getHelpText("start");

  assertEquals(typeof help, "string");
  assertEquals(help.includes("Start the Valheim"), true);
  assertEquals(help.includes("--name"), true);
  assertEquals(help.includes("--port"), true);
  assertEquals(help.includes("--world"), true);
  assertEquals(help.includes("--public"), true);
  assertEquals(help.includes("--crossplay"), true);
});

Deno.test("getHelpText returns stop command help", () => {
  const help = getHelpText("stop");

  assertEquals(typeof help, "string");
  assertEquals(help.includes("Stop the running"), true);
  assertEquals(help.includes("--force"), true);
  assertEquals(help.includes("--timeout"), true);
});

Deno.test("getHelpText returns install command help", () => {
  const help = getHelpText("install");

  assertEquals(typeof help, "string");
  assertEquals(help.includes("Install or update"), true);
  assertEquals(help.includes("--dry-run"), true);
  assertEquals(help.includes("--validate"), true);
  assertEquals(help.includes("--force"), true);
});

Deno.test("getHelpText returns config command help", () => {
  const help = getHelpText("config");

  assertEquals(typeof help, "string");
  assertEquals(help.includes("Manage server configuration"), true);
  assertEquals(help.includes("list"), true);
  assertEquals(help.includes("get"), true);
  assertEquals(help.includes("set"), true);
  assertEquals(help.includes("reset"), true);
});

Deno.test("getHelpText returns worlds command help", () => {
  const help = getHelpText("worlds");

  assertEquals(typeof help, "string");
  assertEquals(help.includes("Manage Valheim world"), true);
  assertEquals(help.includes("list"), true);
  assertEquals(help.includes("info"), true);
  assertEquals(help.includes("import"), true);
  assertEquals(help.includes("export"), true);
  assertEquals(help.includes("delete"), true);
});

Deno.test("getHelpText returns tui command help", () => {
  const help = getHelpText("tui");

  assertEquals(typeof help, "string");
  assertEquals(help.includes("Terminal User Interface"), true);
  assertEquals(help.includes("KEYBOARD SHORTCUTS"), true);
});

Deno.test("getHelpText returns unknown command message", () => {
  const help = getHelpText("nonexistent");

  assertEquals(typeof help, "string");
  assertEquals(help.includes("Unknown command"), true);
  assertEquals(help.includes("nonexistent"), true);
});
