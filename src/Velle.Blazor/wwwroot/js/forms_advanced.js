export function dualRange() {
  function getInputs(root) {
    return [
      root.querySelector("[data-velle-dual-range-min]"),
      root.querySelector("[data-velle-dual-range-max]"),
    ]
  }

  function update(root, round) {
    const [minInput, maxInput] = getInputs(root)
    if (!minInput || !maxInput) return

    const precision = Number(root.dataset.velleDualRangePrecision ?? 3)
    const fixed = n => n.toFixed(precision)
    const thumb = "var(--dual-range-thumb-size)"
    const min = parseFloat(minInput.min)
    const max = parseFloat(maxInput.max)
    const step = parseFloat(minInput.step) || 1
    const minValue = parseFloat(minInput.value)
    const maxValue = parseFloat(maxInput.value)
    const mid = minValue + Math[round]((maxValue - minValue) / 2 / step) * step
    const range = max - min
    if (range <= 0) return

    minInput.style.flexBasis = `calc(${fixed((mid - min) / range * 100)}% + ${thumb})`
    maxInput.style.flexBasis = `calc(${fixed((max - mid) / range * 100)}% + ${thumb})`
    minInput.max = fixed(mid)
    maxInput.min = fixed(mid)

    const minFill = (minValue - min) / (mid - min) || 0
    const maxFill = (maxValue - mid) / (max - mid) || 0
    minInput.style.setProperty("--dual-range-position", `calc(${fixed(minFill * 100)}% + (${fixed(0.5 - minFill)} * ${thumb}))`)
    maxInput.style.setProperty("--dual-range-position", `calc(${fixed(maxFill * 100)}% + (${fixed(0.5 - maxFill)} * ${thumb}))`)
  }

  return {
    init() {
      this.refresh()
    },

    refresh() {
      const [minInput, maxInput] = getInputs(this.$root)
      if (!minInput || !maxInput) return
      update(this.$root, "ceil")
      minInput.setAttribute("data-ready", "")
      maxInput.setAttribute("data-ready", "")
    },

    updateMin() {
      update(this.$root, "ceil")
    },

    updateMax() {
      update(this.$root, "floor")
    },
  }
}

export function dropzone() {
  let files = []
  let rejected = []
  const urls = new Map()
  const errors = new WeakMap()

  function getInput(root) {
    return root.querySelector("input[type='file']")
  }

  function formatSize(bytes) {
    const units = ["B", "KB", "MB", "GB"]
    let size = bytes
    let unit = 0
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024
      unit++
    }
    return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`
  }

  function forget(file) {
    if (!file) return
    const url = urls.get(file)
    if (url) URL.revokeObjectURL(url)
    urls.delete(file)
  }

  function accepts(input, file) {
    const accept = (input.accept || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
    if (accept.length === 0) return true
    const name = file.name.toLowerCase()
    const type = file.type.toLowerCase()
    return accept.some(rule => {
      if (rule.startsWith(".")) return name.endsWith(rule)
      if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1))
      return type === rule
    })
  }

  function validate(root, input, file) {
    const maxFileSize = Number(root.dataset.velleMaxFileSize || Infinity)
    const maxFiles = Number(root.dataset.velleMaxFiles || Infinity)
    if (!accepts(input, file)) return root.dataset.velleTypeMessage || "This file type is not accepted."
    if (file.size > maxFileSize * 1024 * 1024) return root.dataset.velleSizeMessage || "This file is too large."
    if (files.length >= maxFiles) return root.dataset.velleCountMessage || "Too many files."
    return null
  }

  function previewItem(file, index, error) {
    const item = document.createElement("li")
    item.className = "dropzone__file"
    item.dataset.index = String(index)
    if (error) item.setAttribute("data-error", "")

    let thumbnail
    if (file.type.startsWith("image/") && !error) {
      thumbnail = document.createElement("img")
      thumbnail.alt = ""
      if (!urls.has(file)) urls.set(file, URL.createObjectURL(file))
      thumbnail.src = urls.get(file)
    } else {
      thumbnail = document.createElement("span")
      thumbnail.className = "text-xs font-medium"
      thumbnail.textContent = (file.name.split(".").pop() || "file").slice(0, 4).toUpperCase()
    }
    thumbnail.classList.add("dropzone__thumbnail")

    const details = document.createElement("span")
    details.className = "dropzone__details"
    const name = document.createElement("span")
    name.className = "dropzone__name"
    name.textContent = file.name
    const meta = document.createElement("span")
    meta.className = "dropzone__meta"
    meta.textContent = error ?? formatSize(file.size)
    details.append(name, meta)

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "btn btn--plain"
    remove.setAttribute("data-velle-dropzone-remove", "")
    remove.innerHTML = '<span class="icon icon--x" aria-hidden="true"></span><span class="sr-only"></span>'
    remove.lastChild.textContent = `Remove ${file.name}`

    item.append(thumbnail, details, remove)
    return item
  }

  function sync(root) {
    const input = getInput(root)
    if (input && typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer()
      files.forEach(file => transfer.items.add(file))
      input.files = transfer.files
    }

    const list = root.querySelector(".dropzone__files")
    if (list) {
      list.replaceChildren(
        ...files.map((file, i) => previewItem(file, i, null)),
        ...rejected.map((file, i) => previewItem(file, i, errors.get(file)))
      )
    }

    root.dispatchEvent(new CustomEvent("velle:dropzone:change", {
      bubbles: true,
      detail: { files: [...files], rejected: [...rejected] },
    }))
  }

  function addFiles(root, incoming) {
    const input = getInput(root)
    if (!input) return

    rejected.forEach(forget)
    rejected = []

    for (const file of incoming) {
      const error = validate(root, input, file)
      if (error) {
        errors.set(file, error)
        rejected.push(file)
      } else {
        files.push(file)
      }
    }

    if (!input.multiple && files.length > 1) {
      files.slice(0, -1).forEach(forget)
      files = files.slice(-1)
    }

    sync(root)
  }

  return {
    init() {
      const input = getInput(this.$root)
      if (input?.form) {
        input.form.addEventListener("reset", () => {
          [...files, ...rejected].forEach(forget)
          files = []
          rejected = []
          setTimeout(() => sync(this.$root))
        })
      }
    },

    destroy() {
      urls.forEach(url => URL.revokeObjectURL(url))
      urls.clear()
    },

    onDragOver(event) {
      const input = getInput(this.$root)
      if (!event.dataTransfer?.types.includes("Files") || input?.disabled) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      this.$root.setAttribute("data-dragover", "")
    },

    onDragLeave(event) {
      if (!this.$root.contains(event.relatedTarget)) {
        this.$root.removeAttribute("data-dragover")
      }
    },

    onDrop(event) {
      const input = getInput(this.$root)
      if (!event.dataTransfer?.types.includes("Files") || input?.disabled) return
      event.preventDefault()
      this.$root.removeAttribute("data-dragover")
      addFiles(this.$root, [...event.dataTransfer.files])
    },

    onPick() {
      const input = getInput(this.$root)
      const picked = [...(input?.files || [])]
      if (picked.length) addFiles(this.$root, picked)
    },

    onListClick(event) {
      const btn = event.target instanceof Element ? event.target.closest("[data-velle-dropzone-remove]") : null
      if (!btn) return
      const li = btn.closest("[data-index]")
      if (!li) return
      const index = Number(li.dataset.index)
      const list = li.hasAttribute("data-error") ? rejected : files
      forget(list.splice(index, 1)[0])
      sync(this.$root)
    },
  }
}

export function checkAll() {
  function syncDependee(root) {
    const dependee = root.querySelector("[data-velle-check-all-dependee]")
    const dependants = [...root.querySelectorAll("[data-velle-check-all-dependant]")]
    if (!dependee) return

    const allChecked = dependants.length > 0 && dependants.every(it => it.checked)
    const someChecked = dependants.some(it => it.checked)
    dependee.checked = allChecked
    dependee.indeterminate = someChecked && !allChecked
  }

  return {
    init() {
      syncDependee(this.$root)
    },

    onChange(event) {
      const root = this.$root
      const dependee = root.querySelector("[data-velle-check-all-dependee]")
      if (!dependee) return

      if (event.target === dependee) {
        root.querySelectorAll("[data-velle-check-all-dependant]").forEach(it => {
          it.checked = dependee.checked
        })
        dependee.indeterminate = false
      } else if (event.target instanceof Element && event.target.matches("[data-velle-check-all-dependant]")) {
        syncDependee(root)
      }
    },
  }
}

class TimeAgoFormat extends Intl.RelativeTimeFormat {
  format(date) {
    const seconds = (Date.now() - date.getTime()) / 1000
    const minutes = seconds / 60
    const hours = minutes / 60
    const days = hours / 24
    const weeks = days / 7
    const months = days / 30.4
    const years = days / 365

    if (years >= 1) return super.format(-Math.floor(years), "years")
    if (months >= 1) return super.format(-Math.floor(months), "months")
    if (weeks >= 1) return super.format(-Math.floor(weeks), "weeks")
    if (days >= 1) return super.format(-Math.floor(days), "days")
    if (hours >= 1) return super.format(-Math.floor(hours), "hours")
    if (minutes >= 1) return super.format(-Math.floor(minutes), "minutes")
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date)
  }
}

const TIME_FORMATTERS = {
  time: new Intl.DateTimeFormat(undefined, { timeStyle: "short" }),
  date: new Intl.DateTimeFormat(undefined, { dateStyle: "long" }),
  shortdate: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  datetime: new Intl.DateTimeFormat(undefined, { timeStyle: "short", dateStyle: "short" }),
  ago: new TimeAgoFormat(undefined, { numeric: "always" }),
}

export function localTime() {
  let intervalId = null

  function format(el) {
    const mode = el.dataset.velleLocalTime || "datetime"
    const formatter = TIME_FORMATTERS[mode]
    const raw = el.getAttribute("datetime")
    if (!formatter || !raw) return

    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return
    el.textContent = formatter.format(date)
    el.title = TIME_FORMATTERS.datetime.format(date)
  }

  return {
    init() {
      this.refresh()
      if (this.$root.dataset.velleLocalTime === "ago") {
        intervalId = setInterval(() => format(this.$root), 30_000)
      }
    },

    refresh() {
      format(this.$root)
    },

    destroy() {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    },
  }
}

export function timezoneCookie() {
  return {
    init() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (!tz) return
        const name = this.$root.dataset.velleCookieName || "timezone"
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(tz)}; path=/; samesite=lax`
      } catch {}
    },
  }
}
