let chartPromise = null

function loadChartJs() {
  if (typeof window !== "undefined" && window.Chart) {
    return Promise.resolve(window.Chart)
  }

  chartPromise ??= import("../lib/chartjs/chart.umd.min.js").then(() => window.Chart)
  return chartPromise
}

function applyVelleTheme(Chart) {
  const style = getComputedStyle(document.body)
  Chart.defaults.color = style.color
  Chart.defaults.datasets.line.tension = 0.35
  Chart.defaults.datasets.radar.tension = 0
  Chart.defaults.elements.arc.borderRadius = 12
  Chart.defaults.elements.bar.borderRadius = 12
  Chart.defaults.elements.point.radius = 0
  Chart.defaults.font.family = style.fontFamily
  Chart.defaults.font.size = 12
  Chart.defaults.interaction.intersect = false
  Chart.defaults.plugins.legend.display = false
  Chart.defaults.plugins.legend.labels.usePointStyle = true
  Chart.defaults.plugins.legend.position = "bottom"
  Chart.defaults.plugins.tooltip.backgroundColor = style.backgroundColor
  Chart.defaults.plugins.tooltip.bodyColor = style.color
  Chart.defaults.plugins.tooltip.borderColor = style.borderColor
  Chart.defaults.plugins.tooltip.borderWidth = 1
  Chart.defaults.plugins.tooltip.boxPadding = 4
  Chart.defaults.plugins.tooltip.caretSize = 0
  Chart.defaults.plugins.tooltip.titleColor = style.color
  Chart.defaults.plugins.tooltip.usePointStyle = true
  Chart.defaults.scale.grid.color = style.borderColor
}

function parseJson(raw, fallback) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function chart() {
  let instance = null
  let disposed = false
  let lastSignature = null
  let schemeHandler = null

  function release() {
    if (instance) {
      instance.destroy()
      instance = null
    }
  }

  async function render(root, force = false) {
    const Chart = await loadChartJs()
    if (disposed || !root.isConnected || !Chart) return

    const canvas = root.matches("canvas") ? root : root.querySelector("canvas")
    if (!canvas) return

    const type = root.dataset.velleChartType || "line"
    const rawData = root.dataset.velleChartData || "{}"
    const rawOptions = root.dataset.velleChartOptions || "{}"
    const signature = `${type}|${rawData}|${rawOptions}`

    if (!force && instance && signature === lastSignature) return
    lastSignature = signature

    applyVelleTheme(Chart)
    release()

    instance = new Chart(canvas, {
      type,
      data: parseJson(rawData, {}),
      options: parseJson(rawOptions, {}),
    })

    root.dispatchEvent(new CustomEvent("velle:chart:ready", {
      bubbles: true,
      detail: { chart: instance },
    }))
  }

  return {
    init() {
      schemeHandler = () => {
        if (!disposed && this.$root.isConnected) {
          render(this.$root, true)
        }
      }
      document.addEventListener("velle:color-scheme:change", schemeHandler)
      return render(this.$root, true)
    },

    refresh() {
      return render(this.$root, false)
    },

    destroy() {
      disposed = true
      if (schemeHandler) {
        document.removeEventListener("velle:color-scheme:change", schemeHandler)
        schemeHandler = null
      }
      release()
    },
  }
}
