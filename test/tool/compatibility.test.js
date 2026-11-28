import assert from "node:assert/strict"
import { execFile, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { after, before, test } from "node:test"
import { promisify } from "node:util"

const repo = fileURLToPath(new URL("../..", import.meta.url))
const scratch = mkdtempSync(join(tmpdir(), "velle-tool-"))
const feed = join(scratch, "feed")
const consumer = join(scratch, "consumer")
const localDotnet = join(repo, ".dotnet", process.platform === "win32" ? "dotnet.exe" : "dotnet")
const dotnet = existsSync(localDotnet) ? localDotnet : "dotnet"
const exec = promisify(execFile)

function isolatedDotnet(name) {
  return {
    ...process.env,
    DOTNET_CLI_HOME: join(scratch, name, "home"),
    NUGET_PACKAGES: join(scratch, name, "packages"),
    DOTNET_NOLOGO: "1",
    DOTNET_CLI_TELEMETRY_OPTOUT: "1",
  }
}

const installed = isolatedDotnet("installed")
const restored = isolatedDotnet("restored")

function run(command, args, cwd, env = restored, expectedStatus = 0) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8" })
  if (result.error) throw result.error
  assert.equal(result.status, expectedStatus, [command, ...args, result.stdout, result.stderr].join("\n"))
  return result
}

function velle(cwd, args, status = 0) {
  return run(dotnet, ["tool", "run", "velle", "--", ...args], cwd, restored, status)
}

function project(parent, name) {
  const directory = join(parent, name)
  mkdirSync(directory, { recursive: true })
  return directory
}

function contents(directory, name) {
  return readFileSync(join(directory, name), "utf8")
}

function exercise(name, commands, setup = () => {}) {
  const root = project(consumer, name)
  setup(root)
  return { root, results: commands.map(args => velle(root, args)) }
}

before(() => {
  run(dotnet, ["pack", "src/Velle.Tool", "-o", feed], repo, installed)
  mkdirSync(consumer)
  run(dotnet, ["new", "tool-manifest"], consumer, installed)
  run(dotnet, ["tool", "install", "Velle.Tool", "--source", feed], consumer, installed)
  const nugetConfig = join(scratch, "NuGet.Config")
  const escapedFeed = feed.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")
  writeFileSync(nugetConfig, `<configuration><packageSources><clear/><add key="local" value="${escapedFeed}"/></packageSources></configuration>`)
  run(dotnet, ["tool", "restore", "--configfile", nugetConfig], consumer, restored)
})

after(() => rmSync(scratch, { recursive: true, force: true }))

test("local tool restores from its manifest and exposes the original commands", () => {
  const manifestName = existsSync(join(consumer, "dotnet-tools.json")) ? "dotnet-tools.json" : ".config/dotnet-tools.json"
  const manifest = JSON.parse(contents(consumer, manifestName))
  assert.deepEqual(manifest.tools["velle.tool"].commands, ["velle"])
  const { stdout } = velle(consumer, ["version"])
  assert.equal(stdout.trim(), "velle " + manifest.tools["velle.tool"].version)
  const list = velle(consumer, ["list"]).stdout.replaceAll("\r\n", "\n")
  assert.match(list, /Elements\n/)
  assert.match(list, /chart\s+[^\n]+\(needs chart\.js\)/)
  assert.match(velle(consumer, ["frobnicate"], 2).stderr, /unknown command/)
  assert.match(velle(consumer, ["add", "--help"]).stderr, /Usage: velle add/)
})

test("the tool installs dependencies, prints adapter instructions and scaffolds a controller", () => {
  const { root, results } = exercise("components", [
    ["init"],
    ["add", "dropdown", "tabs", "avatar", "datepicker", "editor"],
    ["new", "controller", "store_cart", "--overwrite"],
    ["add", "dialog"],
    ["init"],
  ])
  assert.match(results[1].stdout, /npm install flatpickr@4\.6\.13/)
  assert.match(results[1].stdout, /<script type="importmap">/)
  assert.match(contents(root, "assets/js/velle/main.js"), /import "\.\/interest\.js"/)
  assert.match(contents(root, "assets/js/velle/main.js"), /velle:end[\s\S]*import "\.\/store_cart\.js"/)
  const imports = [...contents(root, "assets/css/velle/main.css").matchAll(/@import url\("([^"]+)"\);/g)]
    .map(match => match[1])
  assert.deepEqual(imports.slice(0, 3), ["reset.css", "variables.css", "base.css"])
  assert.equal(imports.at(-1), "utilities.css")
  assert.deepEqual(imports.slice(3, -1), imports.slice(3, -1).sort())
  assert.equal(contents(root, "assets/css/velle/tokens/colors.css"), contents(repo, "registry/core/tokens/colors.css"))
  assert.equal(contents(root, "assets/js/velle/velle.js"), contents(repo, "registry/js/velle.js"))
  assert.equal(contents(root, "assets/images/velle/avatar.svg"), contents(repo, "registry/components/avatar/avatar.svg"))
  assert.match(contents(root, "assets/js/velle/store_cart.js"), /define\("store-cart"/)
})

test("C# reads older configurations and preserves custom files and disabled entries", () => {
  const legacy = '{ "cssDir": "assets/css/velle", "jsDir": "assets/js/velle", "imagesDir": "assets/images/velle" }\n'
  const { root } = exercise("older-config", [["add", "tabs"], ["add", "tabs"], ["new", "controller", "cart"]], directory => {
    writeFileSync(join(directory, "velle.json"), legacy)
    mkdirSync(join(directory, "assets", "css", "velle"), { recursive: true })
    writeFileSync(join(directory, "assets", "css", "velle", "main.css"), "@charset \"UTF-8\";\nbody { color: red; }\n")
    writeFileSync(join(directory, "assets", "css", "velle", "tabs.css"), "/* local tabs */\n")
  })
  assert.equal(contents(root, "velle.json"), legacy)
  assert.equal(contents(root, "assets/css/velle/tabs.css"), "/* local tabs */\n")
  assert.match(contents(root, "assets/css/velle/main.css"), /^@charset "UTF-8";\n\/\* velle:begin/)
  velle(root, ["add", "--overwrite", "tabs"])
  assert.deepEqual(readFileSync(join(root, "assets/css/velle/tabs.css")),
    readFileSync(join(repo, "registry/components/tabs/tabs.css")))

  const { root: disabled, results } = exercise("disabled-entries", [
    ["init", "--css-entry", "none", "--js-entry", "none"], ["add", "tabs"], ["new", "controller", "cart"],
  ])
  assert.equal(existsSync(join(disabled, "assets/js/velle/main.js")), false)
  assert.match(results[1].stdout, /src="\/assets\/js\/velle\/tabs\.js"/)
})

test("JavaScript-only installs reject the retired htmx component", () => {
  const { root } = exercise("headless", [
    ["init", "--js"],
    ["add", "--all"],
    ["new", "controller", "cart"],
  ])
  assert.equal(existsSync(join(root, "assets/css")), false)
  assert.equal(existsSync(join(root, "assets/js/velle/htmx.js")), false)
  assert.match(velle(root, ["add", "htmx"], 1).stderr, /unknown component "htmx"/)
  assert.doesNotMatch(velle(root, ["list"]).stdout, /\b(?:Extensions|htmx)\b/)
  assert.equal(existsSync(join(root, "assets/js/velle/htmx.js")), false)
})

test("new Blazor projects use wwwroot and print matching browser URLs", () => {
  const root = project(consumer, "blazor")
  writeFileSync(join(root, "Sample.csproj"), '<Project Sdk="Microsoft.NET.Sdk.Web" />')
  const { stdout } = velle(root, ["init"])
  assert.deepEqual(JSON.parse(contents(root, "velle.json")), {
    cssDir: "wwwroot/velle/css",
    jsDir: "wwwroot/velle/js",
    imagesDir: "wwwroot/velle/images",
    cssEntry: "wwwroot/velle/css/main.css",
    jsEntry: "wwwroot/velle/js/main.js",
  })
  assert.match(stdout, /href="\/velle\/css\/main.css"/)
  assert.match(stdout, /src="\/velle\/js\/main.js"/)
  velle(root, ["add", "avatar", "dialog"])
  assert.ok(existsSync(join(root, "wwwroot/velle/images/avatar.svg")))

  const legacy = project(consumer, "existing-blazor")
  mkdirSync(join(legacy, "wwwroot"))
  const legacyConfig = '{"cssDir":"old/css","jsDir":"old/js","imagesDir":"old/images"}'
  writeFileSync(join(legacy, "velle.json"), legacyConfig)
  velle(legacy, ["init"])
  velle(legacy, ["add", "tabs"])
  assert.equal(contents(legacy, "velle.json"), legacyConfig)
  assert.ok(existsSync(join(legacy, "old/js/tabs.js")))
  assert.equal(existsSync(join(legacy, "wwwroot/velle")), false)
})

test("concurrent adds keep both imports and preserve CRLF user content", async () => {
  const root = project(consumer, "concurrent")
  velle(root, ["init"])
  const entry = join(root, "assets/css/velle/main.css")
  const existing = readFileSync(entry, "utf8").replaceAll("\n", "\r\n")
  const custom = "\r\n.example { color: red; }\r\n"
  writeFileSync(entry, existing + custom)

  const add = name => exec(dotnet, ["tool", "run", "velle", "--", "add", name], { cwd: root, env: restored })
  await Promise.all([add("tabs"), add("dialog")])
  const content = readFileSync(entry, "utf8")
  assert.match(content, /@import url\("dialog\.css"\);\r\n@import url\("icons\.css"\);\r\n@import url\("tabs\.css"\);\r\n/)
  assert.ok(content.endsWith(custom))
})

test("paths outside the project are rejected before writing there", () => {
  const root = project(consumer, "paths")
  assert.match(velle(root, ["init", "--css-dir", "../outside"], 1).stderr, /path inside the project/)
  assert.equal(existsSync(join(root, "velle.json")), false)
  if (process.platform === "win32") return

  const outside = project(scratch, "outside")
  symlinkSync(outside, join(root, "static"))
  assert.match(velle(root, ["init", "--css-dir", "static/css"], 1).stderr, /path inside the project/)
  assert.equal(existsSync(join(root, "velle.json")), false)
  assert.deepEqual(readdirSync(outside), [])
})
