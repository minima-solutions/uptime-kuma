#!/usr/bin/env node
/**
 * Applies the MINIMA branding to a clean Uptime Kuma checkout.
 *
 *   node branding/apply.mjs <path-to-uptime-kuma-checkout>
 *
 * Upstream code is never edited in git: the release workflow checks out an
 * upstream release tag, runs this script, and builds the image from the
 * result. That way an upstream update can never conflict with the branding.
 *
 * Every rule must find what it is looking for. When upstream renames or moves
 * something this script relies on, it stops with a clear message instead of
 * producing a half-branded build. Fix the rule, then run the workflow again.
 *
 * Scope: what people see (page title, app name, header, setup, about and 404
 * pages, the product name in the translations, icons and the accent colour).
 * Server-side defaults such as the sender name of a notification are left as
 * upstream ships them.
 */
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "MINIMA Status";
const DESCRIPTION = "Status monitoring voor alle MINIMA diensten";
const COLOR = "#8aaba9";
const UPSTREAM_GREEN = /#5cdd8b/i;

const target = process.argv[2];
if (!target || !existsSync(join(target, "package.json"))) {
    console.error("Usage: node branding/apply.mjs <path-to-uptime-kuma-checkout>");
    process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const problems = [];

/** Replace in one file; every pattern must match at least once. */
function edit(file, replacements) {
    const path = join(target, file);
    if (!existsSync(path)) {
        problems.push(`${file}: file not found`);
        return;
    }
    let text = readFileSync(path, "utf8");
    for (const [pattern, replacement] of replacements) {
        const regex = pattern instanceof RegExp
            ? new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g")
            : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        const matches = text.match(regex);
        if (!matches) {
            problems.push(`${file}: did not find ${pattern}`);
            continue;
        }
        text = text.replace(regex, replacement);
    }
    writeFileSync(path, text);
}

// 1. Icons: same file names as upstream, so every reference keeps working.
const publicDir = join(here, "public");
for (const file of readdirSync(publicDir)) {
    cpSync(join(publicDir, file), join(target, "public", file));
}

// 2. Page title and app manifest.
edit("index.html", [
    ["<title>Uptime Kuma</title>", `<title>${NAME}</title>`],
    ["Uptime Kuma monitoring tool", `${NAME} monitoring tool`],
]);
{
    const file = "public/manifest.json";
    const manifest = JSON.parse(readFileSync(join(target, file), "utf8"));
    for (const key of ["name", "short_name", "description", "theme_color"]) {
        if (!(key in manifest)) {
            problems.push(`${file}: no "${key}"`);
        }
    }
    Object.assign(manifest, {
        name: NAME,
        short_name: NAME,
        description: DESCRIPTION,
        theme_color: COLOR,
    });
    writeFileSync(join(target, file), JSON.stringify(manifest, null, 4) + "\n");
}

// 3. Accent colour.
edit("src/assets/vars.scss", [
    [/\$primary:\s*#5cdd8b;/i, `$primary: ${COLOR};`],
    [/\$highlight:\s*#7ce8a4;/i, `$highlight: ${COLOR};`],
]);
edit("src/assets/vue-datepicker.scss", [[UPSTREAM_GREEN, COLOR]]);
edit("src/mixins/theme.js", [[UPSTREAM_GREEN, COLOR]]);

// 4. The product name where it is written into a page.
for (const file of [
    "src/layouts/Layout.vue",
    "src/pages/NotFound.vue",
    "src/pages/Setup.vue",
    "src/pages/SetupDatabase.vue",
    "src/components/settings/About.vue",
]) {
    edit(file, [[">Uptime Kuma<", `>${NAME}<`]]);
}

// 5. The product name in every translation (values only; keys stay as they are).
{
    const langDir = join(target, "src/lang");
    let english = 0;
    for (const file of readdirSync(langDir).filter((f) => f.endsWith(".json"))) {
        const path = join(langDir, file);
        const messages = JSON.parse(readFileSync(path, "utf8"));
        let changed = 0;
        for (const [key, value] of Object.entries(messages)) {
            if (typeof value === "string" && value.includes("Uptime Kuma")) {
                messages[key] = value.replaceAll("Uptime Kuma", NAME);
                changed++;
            }
        }
        if (file === "en.json") {
            english = changed;
        }
        if (changed) {
            writeFileSync(path, JSON.stringify(messages, null, 4) + "\n");
        }
    }
    if (english === 0) {
        problems.push("src/lang/en.json: no \"Uptime Kuma\" in any message");
    }
}

if (problems.length) {
    console.error("Branding could not be applied. Upstream changed something this script relies on:");
    for (const problem of problems) {
        console.error(`  - ${problem}`);
    }
    process.exit(1);
}
console.log(`Applied ${NAME} branding to ${target}`);
