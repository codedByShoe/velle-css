// Command velle installs velle-css styles and components into a project.
//
//	go install github.com/codedbyshoe/velle-css/cmd/velle@latest
//	velle init
//	velle add button dialog tabs
package main

import (
	"os"

	velle "github.com/codedbyshoe/velle-css"
	"github.com/codedbyshoe/velle-css/internal/cli"
)

func main() {
	dir, err := os.Getwd()
	if err != nil {
		os.Stderr.WriteString("velle: " + err.Error() + "\n")
		os.Exit(1)
	}

	app := &cli.App{FS: velle.Registry(), Dir: dir, Version: velle.Version, Stdout: os.Stdout, Stderr: os.Stderr}
	os.Exit(app.Run(os.Args[1:]))
}
