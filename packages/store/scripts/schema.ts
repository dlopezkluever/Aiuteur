import { readFileSync, writeFileSync } from "node:fs";
import { schemaCatalogue } from "@aiuteur/store";
import { z } from "zod";

const snapshot = new URL("../schema.json", import.meta.url);
const rows = new URL("../src/rows.generated.ts", import.meta.url);
const check = process.argv.includes("--check");
const connectionString = process.env["MIGRATION_DATABASE_URL"];
if (!connectionString) throw new Error("MIGRATION_DATABASE_URL required");
const catalogue = await schemaCatalogue(connectionString);
const json = `${JSON.stringify(catalogue, null, 2)}\n`;
if (check) {
  if (readFileSync(snapshot, "utf8") !== json) throw new Error("D1: schema snapshot differs");
} else writeFileSync(snapshot, json);

const { tables } = z.object({ tables: z.array(z.object({ schema: z.string(), name: z.string(), columns: z.array(z.object({ name: z.string(), type: z.string(), nullable: z.boolean() })) })) }).parse(JSON.parse(readFileSync(snapshot, "utf8")));
const types: Record<string, string> = { uuid: "string", text: "string", "timestamp with time zone": "Date", boolean: "boolean", integer: "number", jsonb: "unknown" };
const generated = "// Generated from schema.json by scripts/schema.ts; adapter-private. Do not edit.\n" + tables.filter((table) => table.schema === "accounts").map((table) =>
  `export interface ${table.schema}_${table.name} {\n${table.columns.map((column) => {
    const type = types[column.type];
    if (!type) throw new Error(`unmapped Postgres type: ${column.type}`);
    return `  ${JSON.stringify(column.name)}: ${type}${column.nullable ? " | null" : ""};`;
  }).join("\n")}\n}\n`).join("\n");
if (check) {
  if (readFileSync(rows, "utf8") !== generated) throw new Error("generated row types differ");
} else writeFileSync(rows, generated);
