import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, sep } from "node:path"
import { after, before, test } from "node:test"
import { fileURLToPath } from "node:url"

const repo = fileURLToPath(new URL("../..", import.meta.url))
const scratch = mkdtempSync(join(tmpdir(), "velle-docs-"))
const generated = join(scratch, "dotnet")
const retired = ["dist/extensions/htmx.js", "dist/js/htmx.js", "docs/htmx.html", "docs/htmx.md"]
const source = (...paths) => readFileSync(join(repo, ...paths), "utf8")
const docs = name => readFileSync(join(generated, "docs", name), "utf8")

function files(root) {
  return readdirSync(root, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort()
}

function compareTrees(actual, expected) {
  const names = files(actual)
  assert.deepEqual(names, files(expected))
  for (const name of names) {
    const got = readFileSync(join(actual, name))
    const want = readFileSync(join(expected, name))
    assert.ok(got.equals(want), name + " differs")
  }
}

before(() => {
  for (const path of ["dist/extensions", "dist/js", "docs"])
    mkdirSync(join(generated, path), { recursive: true })
  for (const path of retired) writeFileSync(join(generated, path), "old generated htmx output")

  execFileSync("dotnet", ["run", "--project", "src/Velle.Docs", "--", "--root", generated],
    { cwd: repo, encoding: "utf8" })
})
after(() => rmSync(scratch, { recursive: true, force: true }))

test("the .NET generator reproduces the committed distribution", () => {
  compareTrees(join(generated, "dist"), join(repo, "dist"))
})

test("the documentation publishes every registry page, asset and LLM reference", () => {
  const names = ["guide", "tokens", "utilities", ...readdirSync(join(repo, "registry", "components"), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(({ name }) => name)]

  const llms = docs("llms.txt")
  const full = docs("llms-full.txt")
  assert.match(llms, /^# velle-css\n\n> /)
  for (const name of names) {
    assert.ok(llms.includes(`https://codedbyshoe.github.io/velle-css/${name}.md)`), name)
    assert.ok(full.includes(docs(name + ".md")), name)
  }
  for (const page of ["index", "javascript", ...names.filter(name => name !== "guide")]) {
    const html = docs(page + ".html")
    assert.ok(html.includes(`href="${page}.html" aria-current="page"`), page)
  }

  for (const file of ["velle.css", "velle.js"]) {
    assert.equal(docs("assets/" + file), readFileSync(join(generated, "dist", file), "utf8"))
  }
  assert.equal(docs(".nojekyll"), "")
  assert.equal(docs("assets/docs.css"), source("src/Velle.Docs/Assets/docs.css"))
  assert.equal(docs("assets/images/avatar.svg"), source("registry/components/avatar/avatar.svg"))
  assert.match(docs("button.html"), /<div class="docs-preview">[\s\S]*class="btn btn--primary"/)
  assert.match(docs("layouts.html"), /<iframe class="docs-frame-preview" srcdoc="&lt;!doctype html&gt;/)
  assert.match(docs("datepicker.html"), /assets\/adapters\/datepicker\.js/)
  assert.match(docs("assets/adapters/datepicker.js"), /from "\.\.\/velle\.js"/)
})

test("regeneration removes retired htmx files and documentation links", () => {
  for (const path of retired) assert.equal(existsSync(join(generated, path)), false, path)
  assert.equal(existsSync(join(generated, "dist/extensions")), false)
  for (const path of ["index.html", "javascript.html", "guide.md", "llms.txt", "llms-full.txt"]) {
    assert.doesNotMatch(docs(path), /\b(?:htmx|Extensions)\b/, path)
  }
})

test("the generated installation instructions use the versioned NuGet package", () => {
  const version = source("src/VelleVersion.props").match(/<Version>([^<]+)<\/Version>/)[1]
  const install = `dotnet tool install Velle.Tool --version ${version}`
  const packageUrl = `https://www.nuget.org/packages/Velle.Tool/${version}`
  for (const path of ["index.html", "guide.md", "llms-full.txt"]) {
    const content = docs(path)
    assert.ok(content.includes(install + "\n"), path)
    assert.ok(content.includes(packageUrl), path)
    assert.doesNotMatch(content, /bin\/nuget/, path)
  }
  assert.ok(docs("button.html").includes('value="dotnet tool run velle add button"'))
  assert.ok(docs("button.md").includes("`dotnet tool run velle add button`"))
})
