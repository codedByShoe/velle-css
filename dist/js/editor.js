import { define, Controller } from "./velle.js"
import { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { Placeholder } from "@tiptap/extensions"

// Adapter for Tiptap (https://tiptap.dev). Install the @tiptap packages yourself; see the docs.
define("editor", class extends Controller {
  async connect() {
    const extensions = [
      StarterKit.configure({ link: { openOnClick: false } }),
      Placeholder.configure({ placeholder: this.data("placeholder") ?? "" })
    ]

    if (this.#markdown) {
      // Loaded only when needed, so HTML-only pages can leave @tiptap/markdown out.
      const { Markdown } = await import("@tiptap/markdown")
      extensions.push(Markdown)
    }

    if (!this.element.isConnected) return

    this.initialValue = this.#input?.value ?? ""
    this.editor = new Editor({
      element: this.target("content") ?? this.element,
      extensions,
      content: this.initialValue,
      contentType: this.#markdown ? "markdown" : "html",
      editable: this.data("editable") != "false",
      onUpdate: this.#updated,
      onTransaction: this.#refresh
    })

    this.form = this.element.closest("form")
    this.form?.addEventListener("reset", this.#reset)

    this.#refresh()
    this.dispatch("ready", { editor: this.editor })
  }

  disconnect() {
    this.form?.removeEventListener("reset", this.#reset)
    this.editor?.destroy()
    this.editor = null
  }

  bold() { this.#run("bold") }
  italic() { this.#run("italic") }
  underline() { this.#run("underline") }
  strike() { this.#run("strike") }
  code() { this.#run("code") }
  bulletList() { this.#run("bulletList") }
  orderedList() { this.#run("orderedList") }
  blockquote() { this.#run("blockquote") }
  codeBlock() { this.#run("codeBlock") }
  horizontalRule() { this.#run("horizontalRule") }
  undo() { this.#run("undo") }
  redo() { this.#run("redo") }

  heading({ params }) {
    this.#run("heading", { level: Number(params.level ?? 2) })
  }

  link() {
    if (!this.editor) return

    const current = this.editor.getAttributes("link").href ?? ""
    const href = prompt("Link URL", current)
    if (href === null) return

    const chain = this.editor.chain().focus().extendMarkRange("link")
    if (href.trim() === "") {
      chain.unsetLink().run()
    } else {
      chain.setLink({ href: href.trim() }).run()
    }
  }

  // Each toolbar action: the command it runs, and how to tell it is active (if it can be).
  static commands = {
    bold: { run: chain => chain.toggleBold(), active: "bold" },
    italic: { run: chain => chain.toggleItalic(), active: "italic" },
    underline: { run: chain => chain.toggleUnderline(), active: "underline" },
    strike: { run: chain => chain.toggleStrike(), active: "strike" },
    code: { run: chain => chain.toggleCode(), active: "code" },
    heading: { run: (chain, { level }) => chain.toggleHeading({ level }), active: "heading" },
    bulletList: { run: chain => chain.toggleBulletList(), active: "bulletList" },
    orderedList: { run: chain => chain.toggleOrderedList(), active: "orderedList" },
    blockquote: { run: chain => chain.toggleBlockquote(), active: "blockquote" },
    codeBlock: { run: chain => chain.toggleCodeBlock(), active: "codeBlock" },
    horizontalRule: { run: chain => chain.setHorizontalRule() },
    link: { active: "link" },
    undo: { run: chain => chain.undo() },
    redo: { run: chain => chain.redo() }
  }

  #run(name, attributes = {}) {
    if (!this.editor) return
    this.constructor.commands[name].run(this.editor.chain().focus(), attributes).run()
  }

  #updated = () => {
    const input = this.#input
    if (input) {
      input.value = this.#value
      input.dispatchEvent(new Event("input", { bubbles: true }))
    }
    this.dispatch("change", { editor: this.editor, value: this.#value })
  }

  // Marks toolbar buttons pressed when their format applies to the selection, and
  // disables the ones that cannot run there.
  #refresh = () => {
    if (!this.editor) return

    for (const button of this.element.querySelectorAll("[data-editor-action]")) {
      const name = button.getAttribute("data-editor-action").split("->").pop().split(":")[0]
      const command = this.constructor.commands[name]
      if (!command) continue

      const attributes = name == "heading" ? { level: Number(button.getAttribute("data-editor-level-param") ?? 2) } : {}

      if (command.active) {
        button.setAttribute("aria-pressed", this.editor.isActive(command.active, attributes))
      }
      if (command.run) {
        button.disabled = !this.editor.isEditable || !command.run(this.editor.can().chain().focus(), attributes).run()
      } else {
        button.disabled = !this.editor.isEditable
      }
    }
  }

  #reset = () => {
    // The form resets the hidden input after this event, so restore the editor after it.
    setTimeout(() => {
      this.editor?.commands.setContent(this.initialValue, { contentType: this.#markdown ? "markdown" : "html" })
      this.#refresh()
    })
  }

  get #value() {
    return this.#markdown ? this.editor.getMarkdown() : this.editor.getHTML()
  }

  get #input() {
    return this.target("input")
  }

  get #markdown() {
    return this.data("format") == "markdown"
  }
})
