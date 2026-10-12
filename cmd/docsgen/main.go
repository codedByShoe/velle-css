// Command docsgen builds the dist/ bundles and the docs/ site from the registry.
//
//	go run ./cmd/docsgen
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	velle "github.com/codedbyshoe/velle-css"
	"github.com/codedbyshoe/velle-css/internal/build"
	"github.com/codedbyshoe/velle-css/internal/docs"
	"github.com/codedbyshoe/velle-css/internal/registry"
)

func main() {
	root := flag.String("root", ".", "repository root; dist/ and docs/ are written here")
	flag.Parse()

	if err := run(*root); err != nil {
		fmt.Fprintf(os.Stderr, "docsgen: %v\n", err)
		os.Exit(1)
	}
}

func run(root string) error {
	fsys := velle.Registry()
	reg, err := registry.Load(fsys)
	if err != nil {
		return err
	}

	if err := build.Dist(fsys, reg, filepath.Join(root, "dist"), velle.Version); err != nil {
		return fmt.Errorf("dist: %w", err)
	}

	css, err := build.CSS(fsys, reg, velle.Version)
	if err != nil {
		return err
	}
	js, err := build.JS(fsys, reg, velle.Version)
	if err != nil {
		return err
	}
	if err := docs.Build(fsys, reg, filepath.Join(root, "docs"), velle.Version, css, js); err != nil {
		return fmt.Errorf("docs: %w", err)
	}

	fmt.Printf("Built dist/ and docs/ (%d components)\n", len(reg.Components))
	return nil
}
