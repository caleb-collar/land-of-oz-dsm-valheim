/**
 * Unit tests for CLI argument parser
 */

import { describe, expect, it } from "vitest";
import { getHelpText, parseArgs } from "./args.js";

describe("parseArgs", () => {
  describe("basic flag parsing", () => {
    it("--version returns version command", () => {
      const result = parseArgs(["--version"]);

      expect(result.command).toBe("version");
      expect(result.version).toBe(true);
    });

    it("-v returns version command", () => {
      const result = parseArgs(["-v"]);

      expect(result.command).toBe("version");
      expect(result.version).toBe(true);
    });

    it("--help returns help command", () => {
      const result = parseArgs(["--help"]);

      expect(result.command).toBe("help");
      expect(result.help).toBe(true);
    });

    it("-h returns help command", () => {
      const result = parseArgs(["-h"]);

      expect(result.command).toBe("help");
      expect(result.help).toBe(true);
    });

    it("--debug sets debug flag", () => {
      const result = parseArgs(["--debug", "start"]);

      expect(result.debug).toBe(true);
      expect(result.command).toBe("start");
    });

    it("no args returns null command", () => {
      const result = parseArgs([]);

      expect(result.command).toBeNull();
    });
  });

  describe("start command", () => {
    it("basic", () => {
      const result = parseArgs(["start"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.name).toBeUndefined();
        expect(result.port).toBeUndefined();
        expect(result.world).toBeUndefined();
      }
    });

    it("with --name flag", () => {
      const result = parseArgs(["start", "--name", "My Server"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.name).toBe("My Server");
      }
    });

    it("with -n short flag", () => {
      const result = parseArgs(["start", "-n", "Test Server"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.name).toBe("Test Server");
      }
    });

    it("with --port flag", () => {
      const result = parseArgs(["start", "--port", "2457"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.port).toBe(2457);
      }
    });

    it("with -p short flag", () => {
      const result = parseArgs(["start", "-p", "2458"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.port).toBe(2458);
      }
    });

    it("rejects invalid port", () => {
      // Port too low
      const result1 = parseArgs(["start", "--port", "80"]);
      if (result1.command === "start") {
        expect(result1.port).toBeUndefined();
      }

      // Port too high
      const result2 = parseArgs(["start", "--port", "70000"]);
      if (result2.command === "start") {
        expect(result2.port).toBeUndefined();
      }

      // Invalid number
      const result3 = parseArgs(["start", "--port", "abc"]);
      if (result3.command === "start") {
        expect(result3.port).toBeUndefined();
      }
    });

    it("with --world flag", () => {
      const result = parseArgs(["start", "--world", "MyWorld"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.world).toBe("MyWorld");
      }
    });

    it("with --public flag", () => {
      const result = parseArgs(["start", "--public"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.public).toBe(true);
      }
    });

    it("with --crossplay flag", () => {
      const result = parseArgs(["start", "--crossplay"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.crossplay).toBe(true);
      }
    });

    it("with --background flag", () => {
      const result = parseArgs(["start", "--background"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.background).toBe(true);
      }
    });

    it("with -b short flag", () => {
      const result = parseArgs(["start", "-b"]);

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.background).toBe(true);
      }
    });

    it("with multiple flags", () => {
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

      expect(result.command).toBe("start");
      if (result.command === "start") {
        expect(result.name).toBe("Viking Server");
        expect(result.port).toBe(2460);
        expect(result.world).toBe("Midgard");
        expect(result.public).toBe(true);
        expect(result.crossplay).toBe(true);
      }
    });
  });

  describe("stop command", () => {
    it("basic", () => {
      const result = parseArgs(["stop"]);

      expect(result.command).toBe("stop");
      if (result.command === "stop") {
        expect(result.force).toBe(false);
        expect(result.timeout).toBeUndefined();
      }
    });

    it("with --force flag", () => {
      const result = parseArgs(["stop", "--force"]);

      expect(result.command).toBe("stop");
      if (result.command === "stop") {
        expect(result.force).toBe(true);
      }
    });

    it("with -f short flag", () => {
      const result = parseArgs(["stop", "-f"]);

      expect(result.command).toBe("stop");
      if (result.command === "stop") {
        expect(result.force).toBe(true);
      }
    });

    it("with --timeout flag", () => {
      const result = parseArgs(["stop", "--timeout", "60000"]);

      expect(result.command).toBe("stop");
      if (result.command === "stop") {
        expect(result.timeout).toBe(60000);
      }
    });
  });

  describe("install command", () => {
    it("basic", () => {
      const result = parseArgs(["install"]);

      expect(result.command).toBe("install");
      if (result.command === "install") {
        expect(result.dryRun).toBe(false);
        expect(result.validate).toBe(false);
        expect(result.force).toBe(false);
      }
    });

    it("with --dry-run flag", () => {
      const result = parseArgs(["install", "--dry-run"]);

      expect(result.command).toBe("install");
      if (result.command === "install") {
        expect(result.dryRun).toBe(true);
      }
    });

    it("with --validate flag", () => {
      const result = parseArgs(["install", "--validate"]);

      expect(result.command).toBe("install");
      if (result.command === "install") {
        expect(result.validate).toBe(true);
      }
    });

    it("with --force flag", () => {
      const result = parseArgs(["install", "--force"]);

      expect(result.command).toBe("install");
      if (result.command === "install") {
        expect(result.force).toBe(true);
      }
    });
  });

  describe("config command", () => {
    it("defaults to list", () => {
      const result = parseArgs(["config"]);

      expect(result.command).toBe("config");
      if (result.command === "config") {
        expect(result.subcommand).toBe("list");
      }
    });

    it("list subcommand", () => {
      const result = parseArgs(["config", "list"]);

      expect(result.command).toBe("config");
      if (result.command === "config") {
        expect(result.subcommand).toBe("list");
      }
    });

    it("get subcommand with key", () => {
      const result = parseArgs(["config", "get", "server.name"]);

      expect(result.command).toBe("config");
      if (result.command === "config") {
        expect(result.subcommand).toBe("get");
        expect(result.key).toBe("server.name");
      }
    });

    it("set subcommand with key and value", () => {
      const result = parseArgs(["config", "set", "server.port", "2457"]);

      expect(result.command).toBe("config");
      if (result.command === "config") {
        expect(result.subcommand).toBe("set");
        expect(result.key).toBe("server.port");
        expect(result.value).toBe("2457");
      }
    });

    it("reset subcommand", () => {
      const result = parseArgs(["config", "reset"]);

      expect(result.command).toBe("config");
      if (result.command === "config") {
        expect(result.subcommand).toBe("reset");
      }
    });
  });

  describe("worlds command", () => {
    it("defaults to list", () => {
      const result = parseArgs(["worlds"]);

      expect(result.command).toBe("worlds");
      if (result.command === "worlds") {
        expect(result.subcommand).toBe("list");
      }
    });

    it("list subcommand", () => {
      const result = parseArgs(["worlds", "list"]);

      expect(result.command).toBe("worlds");
      if (result.command === "worlds") {
        expect(result.subcommand).toBe("list");
      }
    });

    it("info subcommand with name", () => {
      const result = parseArgs(["worlds", "info", "MyWorld"]);

      expect(result.command).toBe("worlds");
      if (result.command === "worlds") {
        expect(result.subcommand).toBe("info");
        expect(result.name).toBe("MyWorld");
      }
    });

    it("import with path", () => {
      const result = parseArgs([
        "worlds",
        "import",
        "NewWorld",
        "--path",
        "./backup",
      ]);

      expect(result.command).toBe("worlds");
      if (result.command === "worlds") {
        expect(result.subcommand).toBe("import");
        expect(result.name).toBe("NewWorld");
        expect(result.path).toBe("./backup");
      }
    });

    it("export with path", () => {
      const result = parseArgs([
        "worlds",
        "export",
        "MyWorld",
        "--path",
        "./export",
      ]);

      expect(result.command).toBe("worlds");
      if (result.command === "worlds") {
        expect(result.subcommand).toBe("export");
        expect(result.name).toBe("MyWorld");
        expect(result.path).toBe("./export");
      }
    });

    it("delete with force", () => {
      const result = parseArgs(["worlds", "delete", "OldWorld", "--force"]);

      expect(result.command).toBe("worlds");
      if (result.command === "worlds") {
        expect(result.subcommand).toBe("delete");
        expect(result.name).toBe("OldWorld");
        expect(result.force).toBe(true);
      }
    });
  });

  describe("tui command", () => {
    it("basic", () => {
      const result = parseArgs(["tui"]);

      expect(result.command).toBe("tui");
    });
  });

  describe("help command", () => {
    it("basic", () => {
      const result = parseArgs(["help"]);

      expect(result.command).toBe("help");
      if (result.command === "help") {
        expect(result.topic).toBeUndefined();
      }
    });

    it("with topic", () => {
      const result = parseArgs(["help", "start"]);

      expect(result.command).toBe("help");
      if (result.command === "help") {
        expect(result.topic).toBe("start");
      }
    });
  });

  describe("version command", () => {
    it("basic", () => {
      const result = parseArgs(["version"]);

      expect(result.command).toBe("version");
    });
  });
});

describe("getHelpText", () => {
  it("returns main help without args", () => {
    const help = getHelpText();

    expect(typeof help).toBe("string");
    expect(help.includes("USAGE:")).toBe(true);
    expect(help.includes("COMMANDS:")).toBe(true);
    expect(help.includes("start")).toBe(true);
    expect(help.includes("stop")).toBe(true);
    expect(help.includes("install")).toBe(true);
    expect(help.includes("config")).toBe(true);
    expect(help.includes("worlds")).toBe(true);
    expect(help.includes("tui")).toBe(true);
  });

  it("returns start command help", () => {
    const help = getHelpText("start");

    expect(typeof help).toBe("string");
    expect(help.includes("Start the Valheim")).toBe(true);
    expect(help.includes("--name")).toBe(true);
    expect(help.includes("--port")).toBe(true);
    expect(help.includes("--world")).toBe(true);
    expect(help.includes("--public")).toBe(true);
    expect(help.includes("--crossplay")).toBe(true);
  });

  it("returns stop command help", () => {
    const help = getHelpText("stop");

    expect(typeof help).toBe("string");
    expect(help.includes("Stop the running")).toBe(true);
    expect(help.includes("--force")).toBe(true);
    expect(help.includes("--timeout")).toBe(true);
  });

  it("returns install command help", () => {
    const help = getHelpText("install");

    expect(typeof help).toBe("string");
    expect(help.includes("Install or update")).toBe(true);
    expect(help.includes("--dry-run")).toBe(true);
    expect(help.includes("--validate")).toBe(true);
    expect(help.includes("--force")).toBe(true);
  });

  it("returns config command help", () => {
    const help = getHelpText("config");

    expect(typeof help).toBe("string");
    expect(help.includes("Manage server configuration")).toBe(true);
    expect(help.includes("list")).toBe(true);
    expect(help.includes("get")).toBe(true);
    expect(help.includes("set")).toBe(true);
    expect(help.includes("reset")).toBe(true);
  });

  it("returns worlds command help", () => {
    const help = getHelpText("worlds");

    expect(typeof help).toBe("string");
    expect(help.includes("Manage Valheim world")).toBe(true);
    expect(help.includes("list")).toBe(true);
    expect(help.includes("info")).toBe(true);
    expect(help.includes("import")).toBe(true);
    expect(help.includes("export")).toBe(true);
    expect(help.includes("delete")).toBe(true);
  });

  it("returns tui command help", () => {
    const help = getHelpText("tui");

    expect(typeof help).toBe("string");
    expect(help.includes("Terminal User Interface")).toBe(true);
    expect(help.includes("KEYBOARD SHORTCUTS")).toBe(true);
  });

  it("returns unknown command message", () => {
    const help = getHelpText("nonexistent");

    expect(typeof help).toBe("string");
    expect(help.includes("Unknown command")).toBe(true);
    expect(help.includes("nonexistent")).toBe(true);
  });
});
