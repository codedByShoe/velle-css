// Package cssinfo extracts class names and custom properties from CSS and HTML so tests
// and the docs generator can cross-check them.
package cssinfo

import (
	"regexp"
	"strings"
)

var (
	commentPattern  = regexp.MustCompile(`(?s)/\*.*?\*/`)
	transitionGroup = regexp.MustCompile(`::view-transition-[a-z-]+\([^)]*\)`)
	urlPattern      = regexp.MustCompile(`url\((?:"[^"]*"|'[^']*'|[^)]*)\)`)
	stringPattern   = regexp.MustCompile(`"[^"]*"|'[^']*'`)
	classPattern    = regexp.MustCompile(`\.(-?[_a-zA-Z][_a-zA-Z0-9-]*(?:\\[@:/][_a-zA-Z0-9-]*)*)`)
	propertyPattern = regexp.MustCompile(`(--[_a-zA-Z0-9-]+)\s*:`)
	attrClass       = regexp.MustCompile(`\sclass="([^"]*)"`)
)

// Strip removes comments, url() values, strings and view-transition pseudo-element
// arguments, which may contain dots that are not class selectors.
func Strip(css string) string {
	css = commentPattern.ReplaceAllString(css, "")
	css = transitionGroup.ReplaceAllString(css, "")
	css = urlPattern.ReplaceAllString(css, "url()")
	return stringPattern.ReplaceAllString(css, `""`)
}

// Classes returns every class name used in a selector of the stylesheet.
func Classes(css string) map[string]bool {
	classes := map[string]bool{}
	for _, m := range classPattern.FindAllStringSubmatch(Strip(css), -1) {
		classes[strings.ReplaceAll(m[1], `\`, "")] = true
	}
	return classes
}

// Properties returns every custom property declared in the stylesheet, in order.
func Properties(css string) []string {
	var properties []string
	seen := map[string]bool{}
	for _, m := range propertyPattern.FindAllStringSubmatch(Strip(css), -1) {
		if !seen[m[1]] {
			seen[m[1]] = true
			properties = append(properties, m[1])
		}
	}
	return properties
}

// HTMLClasses returns every class listed in a class="" attribute of an HTML snippet.
func HTMLClasses(html string) []string {
	var classes []string
	for _, m := range attrClass.FindAllStringSubmatch(html, -1) {
		classes = append(classes, strings.Fields(m[1])...)
	}
	return classes
}
