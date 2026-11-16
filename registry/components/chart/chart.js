import { define, Controller } from "./velle.js"
import { Chart, registerables } from "chart.js"

// Adapter for Chart.js (https://www.chartjs.org). Install chart.js yourself; see the docs.
let configured = false

// Takes fonts and colors from the page so charts match velle-css.
function configure() {
  if (configured) return
  configured = true

  const style = getComputedStyle(document.body)
  Chart.register(...registerables)
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

define("chart", class extends Controller {
  connect() {
    configure()
    this.chart = new Chart(this.element, this.#settings)
  }

  disconnect() {
    this.chart.destroy()
  }

  get #settings() {
    return {
      type: this.data("type") ?? "line",
      data: JSON.parse(this.data("data") ?? "{}"),
      options: JSON.parse(this.data("options") ?? "{}")
    }
  }
})
