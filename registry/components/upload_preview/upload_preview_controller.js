import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "input", "image", "removeInput" ]
  static values = { defaultImage: String }

  previewImage() {
    const selectedFile = this.inputTarget.files[0]

    if (selectedFile) {
      const image = this.imageTarget
      image.src = URL.createObjectURL(selectedFile)
      image.onload = () => { URL.revokeObjectURL(image.src) }
      this.removeInputTarget.value = false
    }
  }

  clear() {
    this.imageTarget.src = this.defaultImageValue
    this.removeInputTarget.value = true
  }
}
