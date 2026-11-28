let lexxyPromise = null

function loadLexxy() {
  if (typeof customElements !== "undefined" && customElements.get("lexxy-editor")) {
    return Promise.resolve()
  }

  lexxyPromise ??= import("../lib/lexxy/lexxy.min.js")
  return lexxyPromise
}

function getAntiforgeryToken(root) {
  const form = root.closest("form")
  const input = form?.querySelector("input[name='__RequestVerificationToken']")
  return input?.value || null
}

function uploadAttachment(root, editorEl, file) {
  const uploadUrl = root.dataset.velleEditorUploadUrl
  if (!uploadUrl || !editorEl?.contents?.insertPendingAttachment) return

  const handle = editorEl.contents.insertPendingAttachment(file)
  if (!handle) return

  const fieldName = root.dataset.velleEditorUploadField || "file"
  const formData = new FormData()
  formData.append(fieldName, file)

  const xhr = new XMLHttpRequest()
  xhr.open("POST", uploadUrl, true)
  xhr.withCredentials = true
  xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")

  const token = getAntiforgeryToken(root)
  if (token) xhr.setRequestHeader("RequestVerificationToken", token)

  xhr.upload.addEventListener("progress", event => {
    if (!event.lengthComputable) return
    const pct = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)))
    handle.setUploadProgress?.(pct)
  })

  xhr.addEventListener("load", () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const payload = JSON.parse(xhr.responseText)
        const url = payload.url || payload.href || ""
        handle.setAttributes({
          url,
          filename: payload.filename || payload.fileName || file.name,
          content_type: payload.contentType || payload.content_type || file.type || "application/octet-stream",
          byte_size: payload.byteSize ?? payload.byte_size ?? file.size,
          previewable: payload.previewable ?? file.type.startsWith("image/"),
          attachable_sgid: payload.signedId || payload.attachable_sgid || url,
        })
        root.dispatchEvent(new CustomEvent("velle:editor:upload", {
          bubbles: true,
          detail: { file, response: payload },
        }))
        return
      } catch {}
    }

    root.dispatchEvent(new CustomEvent("velle:editor:upload-error", {
      bubbles: true,
      detail: { file, status: xhr.status },
    }))
  })

  xhr.addEventListener("error", () => {
    root.dispatchEvent(new CustomEvent("velle:editor:upload-error", {
      bubbles: true,
      detail: { file, status: xhr.status },
    }))
  })

  xhr.send(formData)
}

export function editor() {
  let disposed = false
  let lastSyncedServerValue = null
  let cleanupFns = []

  function getEditor(root) {
    return root.querySelector("lexxy-editor")
  }

  function getHiddenInput(root) {
    return root.querySelector("[data-velle-editor-input]")
  }

  function readNormalizedValue(editorEl) {
    if (!editorEl) return ""
    if (editorEl.isEmpty) return ""
    const raw = editorEl.value ?? ""
    return raw.trim() === "<p><br></p>" || raw.trim() === "<p></p>" ? "" : raw
  }

  function syncToInput(root) {
    const editorEl = getEditor(root)
    const input = getHiddenInput(root)
    if (!editorEl || !input) return

    const next = readNormalizedValue(editorEl)
    if (input.value !== next) {
      input.value = next
      input.dispatchEvent(new Event("input", { bubbles: true }))
    }

    root.dispatchEvent(new CustomEvent("velle:editor:change", {
      bubbles: true,
      detail: { value: next, editor: editorEl },
    }))
  }

  function wireEvents(root) {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []

    const editorEl = getEditor(root)
    if (!editorEl) return

    const onChange = () => syncToInput(root)
    const onInit = () => {
      syncToInput(root)
      root.dispatchEvent(new CustomEvent("velle:editor:ready", {
        bubbles: true,
        detail: { editor: editorEl },
      }))
    }
    const onFileAccept = event => {
      const uploadUrl = root.dataset.velleEditorUploadUrl
      if (!uploadUrl) return
      const file = event.detail?.file
      if (!file) return
      // Intercept Lexxy's Rails Active Storage pipeline and route through Velle's .NET endpoint bridge.
      event.preventDefault()
      uploadAttachment(root, editorEl, file)
    }

    editorEl.addEventListener("lexxy:change", onChange)
    editorEl.addEventListener("lexxy:initialize", onInit)
    editorEl.addEventListener("lexxy:file-accept", onFileAccept)
    cleanupFns.push(
      () => editorEl.removeEventListener("lexxy:change", onChange),
      () => editorEl.removeEventListener("lexxy:initialize", onInit),
      () => editorEl.removeEventListener("lexxy:file-accept", onFileAccept),
    )

    const form = root.closest("form")
    if (form) {
      const onSubmit = () => syncToInput(root)
      const onReset = () => {
        setTimeout(() => {
          const input = getHiddenInput(root)
          if (input && editorEl) {
            editorEl.value = input.defaultValue || ""
            syncToInput(root)
          }
        })
      }
      form.addEventListener("submit", onSubmit, true)
      form.addEventListener("reset", onReset)
      cleanupFns.push(
        () => form.removeEventListener("submit", onSubmit, true),
        () => form.removeEventListener("reset", onReset),
      )
    }
  }

  return {
    async init() {
      const root = this.$root
      const input = getHiddenInput(root)
      lastSyncedServerValue = input?.defaultValue ?? ""

      await loadLexxy()
      if (disposed || !root.isConnected) return

      wireEvents(root)
      syncToInput(root)
    },

    async refresh() {
      const root = this.$root
      await loadLexxy()
      if (disposed || !root.isConnected) return

      wireEvents(root)
      const input = getHiddenInput(root)
      const editorEl = getEditor(root)
      if (!input || !editorEl) return

      const serverValue = input.defaultValue ?? ""
      if (serverValue !== lastSyncedServerValue) {
        lastSyncedServerValue = serverValue
        if (readNormalizedValue(editorEl) !== serverValue) {
          editorEl.value = serverValue
        }
      }
      syncToInput(root)
    },

    destroy() {
      disposed = true
      cleanupFns.forEach(fn => fn())
      cleanupFns = []
    },
  }
}
