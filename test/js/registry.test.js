import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const registry = fileURLToPath(new URL("../../registry/", import.meta.url))
const categories = ["Elements", "Forms", "Overlays", "Layout", "Behaviors"]
const read = path => readFileSync(join(registry, path), "utf8")
const components = new Map()
for (const name of readdirSync(join(registry, "components"))) {
  const directory = "components/" + name
  const metadata = JSON.parse(read(directory + "/component.json"))
  assert.equal(metadata.name, name, directory)
  components.set(name, { ...metadata, directory })
}

const scripts = component => component.files.filter(file => file.endsWith(".js"))
  .map(file => read(component.directory + "/" + file))
const styles = component => component.files.filter(file => file.endsWith(".css"))
  .map(file => read(component.directory + "/" + file)).join("\n")
const files = readdirSync(registry, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile())
  .map(entry => relative(registry, join(entry.parentPath, entry.name)).split(sep).join("/"))
const exampleSource = (component, example) => read(component.directory + "/examples/" + example.file)

function resolve(name, chain = [], installed = new Set()) {
  assert.ok(components.has(name), "missing dependency " + [...chain, name].join(" -> "))
  assert.ok(!chain.includes(name), "dependency cycle " + [...chain, name].join(" -> "))
  if (!installed.has(name)) {
    for (const dependency of components.get(name).dependencies ?? []) {
      resolve(dependency, [...chain, name], installed)
    }
    installed.add(name)
  }
  return installed
}

function stripCss(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/::view-transition-[a-z-]+\([^)]*\)/g, "")
    .replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g, "url()")
    .replace(/"[^"]*"|'[^']*'/g, '""')
}

function cssClasses(css) {
  return [...stripCss(css).matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*(?:\\[@:/][_a-zA-Z0-9-]*)*)/g)]
    .map(match => match[1].replaceAll("\\", ""))
}

const controllerName = /define\("([a-z-]+)"/g
const behaviorRoot = /\[data-([a-z-]+)\]/g

test("registry lists every file and resolves its dependencies without collisions", () => {
  assert.ok(components.size > 0)
  const reserved = new Set(["main.css", "main.js", "velle.js", "velle.d.ts",
    ...files.filter(file => file.startsWith("core/")).map(file => file.split("/").at(-1))])

  for (const component of components.values()) {
    const { directory, name, files: declared, dependencies = [], examples, library } = component
    assert.ok(component.title && component.description && categories.includes(component.category), name)
    assert.ok(examples.length > 0 && (declared.length > 0 || dependencies.length > 0), name)
    const expected = ["component.json", ...declared, ...examples.map(example => "examples/" + example.file)].sort()
    const actual = files.filter(file => file.startsWith(directory + "/")).map(file => file.slice(directory.length + 1)).sort()
    assert.deepEqual(actual, expected, name)
    for (const file of declared) {
      assert.ok(!reserved.has(file), name + " has a duplicate file " + file)
      reserved.add(file)
    }

    const installed = [...resolve(name)]
    assert.equal(installed.at(-1), name)
    for (const dependency of installed) {
      const metadata = components.get(dependency)
      if (!library) assert.ok(!metadata.library, name + " requires adapter " + dependency)
      for (const required of metadata.dependencies ?? [])
        assert.ok(installed.indexOf(required) < installed.indexOf(dependency), required)
    }
  }
})

test("documented CSS and example markup match assets that Velle installs", () => {
  const coreClasses = new Set(cssClasses(files.filter(file => file.startsWith("core/") && file.endsWith(".css")).map(read).join("\n")))
  const documentedClasses = new Set([...components.values()].flatMap(component => (component.classes ?? []).map(item => item.name)))
  const roots = new Map()
  for (const component of components.values()) {
    for (const script of scripts(component)) {
      for (const [, name] of [...script.matchAll(controllerName), ...script.matchAll(behaviorRoot)])
        roots.set(name, component.name)
    }
  }

  for (const component of components.values()) {
    const { name, examples } = component
    const css = [...resolve(name)].map(dependency => styles(components.get(dependency))).join("\n")
    const allowed = new Set(cssClasses(css))
    for (const { name: cssClass } of component.classes ?? [])
      assert.ok(allowed.has(cssClass), name + " documents undefined class " + cssClass)
    for (const { name: variable } of component.variables ?? [])
      assert.ok(stripCss(css).includes(variable), name + " documents undefined variable " + variable)
    if (!component.library) {
      for (const cssClass of cssClasses(styles(component)))
        assert.ok(documentedClasses.has(cssClass), name + " is missing documentation for " + cssClass)
    }

    const ids = new Set(["header", "sidebar", "main"])
    for (const example of examples) {
      const label = name + "/" + example.file
      const html = exampleSource(component, example)
      const installed = new Set([name, ...(example.requires ?? [])].flatMap(required => [...resolve(required)]))
      const classes = new Set(cssClasses([...installed].map(dependency => styles(components.get(dependency))).join("\n")))
      for (const [, value] of html.matchAll(/\sclass="([^"]*)"/g)) {
        for (const cssClass of value.split(/\s+/).filter(Boolean))
          assert.ok(classes.has(cssClass) || coreClasses.has(cssClass), label + " needs class " + cssClass)
      }
      for (const [, attribute] of html.matchAll(/\sdata-([a-z-]+)/g)) {
        const owner = roots.get(attribute)
        assert.ok(!owner || installed.has(owner), label + " uses data-" + attribute + " from " + owner)
      }
      if (!example.frame) {
        for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
          assert.ok(!ids.has(id), label + " reuses id " + id)
          ids.add(id)
        }
      }
    }
  }
})

test("controllers, runtime types, adapter imports and documented actions agree", () => {
  const exported = (path, declaration) => [...read(path).matchAll(
    new RegExp("^export " + declaration + "(?:function|class) (\\w+)", "gm"))].map(match => match[1]).sort()
  const runtime = exported("js/velle.js", "")
  assert.ok(runtime.length > 0)
  assert.deepEqual(exported("js/velle.d.ts", "declare "), runtime)

  const knownControllers = new Set()
  const validActions = new Map()
  for (const component of components.values()) {
    const { name, library } = component
    const dependencies = new Set(["./velle.js"])
    const sources = scripts(component)
    if (library) {
      assert.ok(library.package && library.version && library.homepage && library.license && library.esm, name)
      for (const { package: pkg, esm } of [library, ...(library.modules ?? [])]) {
        assert.ok(pkg && esm.includes(pkg + "@" + library.version), name + " has an unpinned adapter import")
        dependencies.add(pkg)
      }
      assert.ok(sources.some(source => source.includes(`from "${library.package}"`)), name + " must import its library")
    }

    for (const script of sources) {
      if (/classList\.\w+\("|className = "/.test(script))
        assert.ok(component.headless, name + " needs a headless note")
      for (const [line] of script.matchAll(/^\s*import\b.*$/gm))
        assert.ok([...dependencies].some(dependency => line.trim().endsWith(`from "${dependency}"`)), name + " imports " + line)
      for (const [, controller] of script.matchAll(controllerName)) {
        assert.ok(!knownControllers.has(controller), controller + " is defined twice")
        knownControllers.add(controller)
      }
    }
    validActions.set(name.replaceAll("_", "-"), new Set((component.actions ?? []).map(action => action.name)))
  }

  for (const component of components.values()) {
    for (const example of component.examples) {
      const label = component.name + "/" + example.file
      for (const [, controller, value] of exampleSource(component, example).matchAll(/\sdata-([a-z-]+)-action="([^"]*)"/g)) {
        for (const descriptor of value.split(/\s+/).filter(Boolean)) {
          const action = /^(?:[^.@\s]+?(?:\.([^@\s]+?))?(?:@(window|document))?->)?(\w+)((?::\w+)*)$/.exec(descriptor)
          assert.ok(action && validActions.get(controller)?.has(action[3]), label + " has an invalid action " + descriptor)
          assert.ok(action[4].split(":").every(option => ["", "prevent", "stop", "self"].includes(option)), label + " has an unknown action option")
          if (action[1]) {
            for (const key of action[1].split("+"))
              assert.match(key, /^(?:[a-z0-9]|enter|tab|esc|space|up|down|left|right|home|end|page_up|page_down|ctrl|meta|alt|shift)$/, label)
          }
        }
      }
    }
  }
})

test("registry styles and behaviors work with framework-agnostic installs", () => {
  const forbidden = /turbo|stimulus|hotwired|data-controller|data-action=|lexxy|field_with_errors|esm\.sh|authenticity_token|data-turbo/i
  const explainTurbo = new Set(["confirm", "form", "input"].map(name => `components/${name}/component.json`))
  const allowEsmSh = new Set()
  for (const { library, directory } of components.values()) {
    if (library && [library, ...(library.modules ?? [])].some(module => module.esm.startsWith("https://esm.sh/")))
      allowEsmSh.add(directory + "/component.json")
  }

  for (const file of files) {
    if (file.endsWith(".svg") || explainTurbo.has(file)) continue
    const text = read(file)
    assert.doesNotMatch(allowEsmSh.has(file) ? text.replaceAll("esm.sh", "") : text, forbidden, file)
    if (file.endsWith(".css"))
      assert.doesNotMatch(text, /url\(\s*["']?(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:svg|png|jpg|webp)/, file)
  }
})
