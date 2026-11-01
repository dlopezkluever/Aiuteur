import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import register from "./index.ts";

test("verifier smoke attempts only one Orb, even when a launch or response fails", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aiuteur-smoke-test-"));
  const oldPath = process.env.PATH;
  const oldModels = process.env.AIUTEUR_TEST_MODELS;
  try {
    await writeFile(join(dir, "amp"), '#!/bin/sh\nprintf "%s" "$AIUTEUR_TEST_MODELS"\n', { mode: 0o755 });
    process.env.PATH = `${dir}:${oldPath}`;

    for (const scenario of ["success", "create", "append", "response", "fallback"]) {
      const models = scenario === "fallback" ? ["openai/gpt-6.1-sol"] : ["openai/gpt-6-astra", "openai/gpt-6.1-sol"];
      process.env.AIUTEUR_TEST_MODELS = JSON.stringify({ models: models.map((id) => ({ id })) });
      const commands = new Map();
      const launches = [];
      const notices = [];
      let prompt = "";
      register({
        system: { cacheDirectory: dir },
        logger: { log() {} },
        createAgent({ model }) {
          return {
            definition: {},
            async createThread(options) {
              launches.push({ model, options });
              if (scenario === "create") throw new Error("creation failed");
              return {
                id: "smoke-thread",
                async appendUserMessage(message) {
                  prompt = message.content;
                  if (scenario === "append") throw new Error("append failed");
                },
                async waitForResponse() {
                  if (scenario === "response") throw new Error("response failed");
                  return { content: [{ text: prompt.match(/SMOKE-[a-z0-9]+/)[0] }] };
                },
              };
            },
          };
        },
        registerAgentMode() {},
        registerCommand(name, _options, handler) { commands.set(name, handler); },
      });
      await commands.get("smoke-verifier")({ ui: { async notify(message) { notices.push(message); } } });

      assert.equal(launches.length, 1, scenario);
      assert.equal(launches[0].model, models[0], scenario);
      assert.equal(launches[0].options.executor, "orb", scenario);
      assert.equal(notices.length, 1, scenario);
      if (scenario === "success" || scenario === "fallback") {
        assert.match(notices[0], /verifier smoke OK; thread smoke-thread/);
        assert.doesNotMatch(prompt, /#\d|\/implement|pull|PR |[0-9a-f]{40}/i);
      } else {
        assert.match(notices[0], /no retry/);
        assert.match(notices[0], scenario === "create" ? /thread creation outcome unknown/ : /thread smoke-thread/);
      }
    }
  } finally {
    if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
    if (oldModels === undefined) delete process.env.AIUTEUR_TEST_MODELS; else process.env.AIUTEUR_TEST_MODELS = oldModels;
    await rm(dir, { recursive: true, force: true });
  }
});
