import { define, Controller } from "./velle.js"

define("upload-preview", class extends Controller {
  previewImage() {
    const selectedFile = this.target("input").files[0]

    if (selectedFile) {
      const image = this.target("image")
      image.src = URL.createObjectURL(selectedFile)
      image.onload = () => { URL.revokeObjectURL(image.src) }
      this.target("removeInput").value = false
    }
  }

  clear() {
    this.target("image").src = this.data("default-image")
    this.target("removeInput").value = true
  }
})
