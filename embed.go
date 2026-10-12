// Package velle embeds the velle-css registry: core styles, components, the JavaScript
// runtime and icons. The velle CLI copies files out of this filesystem.
package velle

import (
	"embed"
	"io/fs"
)

// Version is the library version reported by the CLI and printed in the docs.
const Version = "0.1.0"

//go:embed all:registry
var embedded embed.FS

// Registry returns the registry directory as a filesystem rooted at "registry".
func Registry() fs.FS {
	sub, err := fs.Sub(embedded, "registry")
	if err != nil {
		panic(err)
	}
	return sub
}
