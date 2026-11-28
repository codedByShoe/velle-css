// Documentation helpers for the Velle docs site. Not part of Velle.Blazor.
(() => {
  const demoArea = ".docs-preview, .docs-frame"

  // Shows a short message using the flash component (works with or without legacy velle.js).
  function toast(message) {
    const flash = document.createElement("div")
    flash.setAttribute("popover", "manual")
    flash.setAttribute("role", "status")
    flash.className = "flash"
    flash.addEventListener("animationend", () => {
      try { flash.hidePopover() } catch {}
      flash.remove()
    })
    flash.addEventListener("toggle", event => event.newState === "closed" && flash.remove())

    const content = document.createElement("div")
    content.className = "flash__content font-medium"
    content.textContent = message

    flash.append(content)
    document.body.append(flash)
    try { flash.showPopover() } catch {}
  }

  // Docs shell chrome helpers (sidebar toggle, header theme menu, mobile drawer backdrop)
  // so Blazor component pages do not need to load legacy velle.js alongside Alpine.js.
  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return

    if (event.target.closest("[data-toggle-class-action='toggle']")) {
      if (!document.querySelector("script[src='assets/velle.js']")) {
        document.body.classList.toggle("closed")
      }
    }

    const schemeBtn = event.target.closest("[data-color-scheme-action]")
    if (schemeBtn && !document.querySelector("script[src='assets/velle.js']")) {
      const action = schemeBtn.getAttribute("data-color-scheme-action")
      const value = action === "setLight" ? "light" : action === "setDark" ? "dark" : "system"
      try { localStorage.setItem("color_scheme", value) } catch {}
      document.documentElement.dataset.colorScheme = value
      document.dispatchEvent(new CustomEvent("velle:color-scheme:change", { detail: { colorScheme: value } }))
    }

    const navDialog = event.target === document.getElementById("docs_nav") ? event.target : null
    if (navDialog && navDialog.open && !document.querySelector("script[src='assets/velle.js']")) {
      navDialog.close()
    }

    const flashTrigger = event.target.closest("[data-demo-flash]")
    if (flashTrigger) {
      const template = document.getElementById(flashTrigger.dataset.demoFlash)
      document.body.append(template.content.cloneNode(true))
    }

    const toastTrigger = event.target.closest("[data-demo-toast]")
    if (toastTrigger) toast(toastTrigger.dataset.demoToast)

    const copyBtn = event.target.closest("[data-copy-button]")
    if (copyBtn) {
      const codeBox = copyBtn.closest(".docs-code")
      const hiddenInput = codeBox?.querySelector("textarea[data-input-copyable-target='input']")
      if (hiddenInput && navigator.clipboard && !document.querySelector("script[src='assets/velle.js']")) {
        navigator.clipboard.writeText(hiddenInput.value).catch(() => {})
      }
      const label = copyBtn.querySelector("span:not(.icon):not(.sr-only)")
      if (label) {
        const original = label.dataset.originalText || label.textContent
        label.dataset.originalText = original
        label.textContent = "Copied"
        clearTimeout(Number(copyBtn.dataset.copyTimer))
        copyBtn.dataset.copyTimer = String(setTimeout(() => {
          label.textContent = original
        }, 1500))
      }
    }

    const tokenSwatch = event.target.closest("[data-copy-token]")
    if (tokenSwatch && navigator.clipboard) {
      const token = tokenSwatch.dataset.copyToken
      navigator.clipboard.writeText(token).then(() => toast(`Copied ${token}`)).catch(() => {})
    }

    // Keep placeholder links in examples from jumping to the top of the page.
    const placeholderLink = event.target.closest('a[href="#"]')
    if (placeholderLink && placeholderLink.closest(demoArea)) event.preventDefault()
  })

  // Example forms have no server to post to: show what would have happened instead.
  document.addEventListener("submit", event => {
    const form = event.target
    const method = event.submitter?.getAttribute("formmethod") || form.getAttribute("method")

    if (!form.closest(demoArea) || method === "dialog") return

    event.preventDefault()
    toast(`Submitted ${form.getAttribute("action") || "the form"} (demo: nothing was sent)`)
  })

  // Keep framed examples in the same color scheme as the page.
  document.addEventListener("velle:color-scheme:change", event => {
    document.querySelectorAll("iframe.docs-frame-preview").forEach(frame => {
      const root = frame.contentDocument?.documentElement
      if (root) root.dataset.colorScheme = event.detail.colorScheme
    })
  })

  // Sidebar live search filter.
  document.querySelectorAll("[data-docs-nav]").forEach(nav => {
    const input = nav.querySelector("[data-docs-search]")
    const groups = [...nav.querySelectorAll("[data-docs-nav-group]")]
    const empty = nav.querySelector("[data-docs-search-empty]")
    if (!input) return

    function filter() {
      const query = input.value.trim().toLowerCase()
      let visibleCount = 0
      for (const group of groups) {
        let groupVisible = 0
        for (const item of group.querySelectorAll("[data-docs-nav-item]")) {
          const text = (item.dataset.searchText || item.textContent || "").toLowerCase()
          const match = !query || text.includes(query)
          item.hidden = !match
          if (match) groupVisible++
        }
        group.hidden = groupVisible === 0
        visibleCount += groupVisible
      }
      if (empty) empty.hidden = visibleCount > 0
    }

    input.addEventListener("input", filter)
    input.addEventListener("keydown", event => {
      if (event.key === "Escape" && input.value) {
        input.value = ""
        filter()
      }
    })
  })

  // Focus sidebar search on "/" or Cmd/Ctrl+K.
  document.addEventListener("keydown", event => {
    const active = document.activeElement
    const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)
    const isSlash = event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey
    const isCmdK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)
    if (!isSlash && !isCmdK) return

    const desktopInput = document.querySelector("#sidebar [data-docs-search]")
    if (!desktopInput) return
    event.preventDefault()
    desktopInput.focus()
    desktopInput.select()
  })

  // Build "On this page" table of contents with scroll-spy.
  const toc = document.querySelector("[data-docs-toc]")
  const tocList = document.querySelector("[data-docs-toc-list]")
  const article = document.querySelector(".docs-content")
  if (toc && tocList && article) {
    const headings = [...article.querySelectorAll("h2[id], h3[id]")]
      .filter(heading => !heading.closest("details"))

    if (headings.length >= 2) {
      const links = new Map()
      for (const heading of headings) {
        const li = document.createElement("li")
        const link = document.createElement("a")
        link.href = `#${heading.id}`
        link.textContent = heading.textContent.replace(/\s+/g, " ").trim()
        link.className = heading.tagName === "H3" ? "docs-toc__link docs-toc__link--sub" : "docs-toc__link"
        li.append(link)
        tocList.append(li)
        links.set(heading.id, link)
      }
      toc.hidden = false

      const setActive = id => {
        for (const [key, link] of links) {
          if (key === id) link.setAttribute("aria-current", "true")
          else link.removeAttribute("aria-current")
        }
      }

      if (headings[0]) setActive(headings[0].id)

      const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting)
        if (visible.length > 0) setActive(visible[0].target.id)
      }, { rootMargin: "-80px 0px -70% 0px" })

      for (const heading of headings) observer.observe(heading)
    }
  }

  // Lightweight zero-dependency syntax highlighting for razor, html, js, and sh.
  function escapeHtml(text) {
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
  }

  function span(type, text) {
    return `<span class="tok-${type}">${escapeHtml(text)}</span>`
  }

  function highlightPattern(source, pattern, classify) {
    let out = ""
    let last = 0
    for (const match of source.matchAll(pattern)) {
      if (match.index > last) out += escapeHtml(source.slice(last, match.index))
      out += classify(match)
      last = match.index + match[0].length
    }
    if (last < source.length) out += escapeHtml(source.slice(last))
    return out
  }

  function highlightTag(tagText, isRazor) {
    const match = tagText.match(/^(<\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?>)$/)
    if (!match) return escapeHtml(tagText)
    const [, open, name, attrs, close] = match
    const nameClass = isRazor && /^[A-Z]/.test(name) ? "component" : "tag"
    const highlightedAttrs = highlightPattern(
      attrs,
      /(@?[a-zA-Z_:][\w:.-]*)(=)("[^"]*"|'[^']*')|(@?[a-zA-Z_:][\w:.-]+)/g,
      m => {
        if (m[2]) {
          const attrName = m[1].startsWith("@") ? span("keyword", m[1]) : span("attr", m[1])
          return attrName + span("punct", m[2]) + span("string", m[3])
        }
        return m[4].startsWith("@") ? span("keyword", m[4]) : span("attr", m[4])
      }
    )
    return span("punct", open) + span(nameClass, name) + highlightedAttrs + span("punct", close)
  }

  function highlightHtml(source, isRazor = false) {
    const pattern = isRazor
      ? /(@\*[\s\S]*?\*@|<!--[\s\S]*?-->)|(<!doctype[^>]*>)|(<\/?[a-zA-Z][\w:-]*(?:[^>"']|"[^"]*"|'[^']*')*\/?>)|(@(?:using|code|page|namespace|inject|inherits|if|else|for|foreach|await)\b)|(@[a-zA-Z_][\w.!?[\]]*)/gi
      : /(<!--[\s\S]*?-->)|(<!doctype[^>]*>)|(<\/?[a-zA-Z][\w:-]*(?:[^>"']|"[^"]*"|'[^']*')*\/?>)/gi

    return highlightPattern(source, pattern, m => {
      if (m[1]) return span("comment", m[1])
      if (m[2]) return span("punct", m[2])
      if (m[3]) return highlightTag(m[3], isRazor)
      if (m[4]) return span("keyword", m[4])
      if (m[5]) return span("attr", m[5])
      return escapeHtml(m[0])
    })
  }

  function highlightCSharp(source) {
    const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(\$@?"(?:\\.|[^"\\])*"|"(?:\\.|[^"\\])*")|(@<[\s\S]*?(?=\n\s*\)|,\s*\n|;\s*$))|\b(private|public|protected|internal|static|readonly|sealed|class|record|struct|enum|new|return|void|var|string|bool|int|null|true|false|override|get|set|async|await|nameof|using)\b|\b([A-Z][a-zA-Z0-9_]*)\b|\b(\d+(?:\.\d+)?)\b/gm
    return highlightPattern(source, pattern, m => {
      if (m[1]) return span("comment", m[1])
      if (m[2]) return span("string", m[2])
      if (m[3]) return span("keyword", "@") + highlightHtml(m[3].slice(1), true)
      if (m[4]) return span("keyword", m[4])
      if (m[5]) return span("component", m[5])
      if (m[6]) return span("number", m[6])
      return escapeHtml(m[0])
    })
  }

  function highlightRazor(source) {
    const codeIndex = source.search(/^@code\b/m)
    if (codeIndex === -1) return highlightHtml(source, true)
    const markup = source.slice(0, codeIndex)
    const codeBlock = source.slice(codeIndex)
    const header = codeBlock.match(/^@code\b/)
    return highlightHtml(markup, true) + span("keyword", header[0]) + highlightCSharp(codeBlock.slice(header[0].length))
  }

  function highlightJs(source) {
    const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(import|export|from|const|let|var|function|class|extends|return|if|else|for|of|in|switch|case|default|break|try|catch|throw|async|await|new|typeof|this|true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b|\b([a-zA-Z_$][\w$]*)(?=\s*\()/g
    return highlightPattern(source, pattern, m => {
      if (m[1]) return span("comment", m[1])
      if (m[2]) return span("string", m[2])
      if (m[3]) return span("keyword", m[3])
      if (m[4]) return span("number", m[4])
      if (m[5]) return span("fn", m[5])
      return escapeHtml(m[0])
    })
  }

  function highlightShell(source) {
    return source.split("\n").map(line =>
      highlightPattern(
        line,
        /(#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(^\s*(?:dotnet|npm|npx|git|python3)\b)|(\s--?[a-zA-Z0-9-]+)/g,
        m => {
          if (m[1]) return span("comment", m[1])
          if (m[2]) return span("string", m[2])
          if (m[3]) return span("keyword", m[3])
          if (m[4]) return span("attr", m[4])
          return escapeHtml(m[0])
        }
      )
    ).join("\n")
  }

  const highlighters = {
    razor: highlightRazor,
    html: source => highlightHtml(source, false),
    js: highlightJs,
    javascript: highlightJs,
    sh: highlightShell,
    bash: highlightShell,
  }

  document.querySelectorAll(".docs-code, pre.docs-pre[data-lang]").forEach(container => {
    const isCodeWrapper = container.classList.contains("docs-code")
    const lang = (isCodeWrapper
      ? container.querySelector(".docs-code__lang")?.textContent
      : container.dataset.lang || ""
    ).trim().toLowerCase()
    const highlighter = highlighters[lang]
    if (!highlighter) return

    const code = isCodeWrapper ? container.querySelector("pre > code") : container.querySelector("code")
    if (!code) return
    code.innerHTML = highlighter(code.textContent || "")
  })
})()
