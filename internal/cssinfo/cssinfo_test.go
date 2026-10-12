package cssinfo

import (
	"reflect"
	"testing"
)

func TestClasses(t *testing.T) {
	css := `
/* .comment-class { } */
.btn { padding: .25rem .625rem; }
.btn--primary:hover, .card > .card__footer { color: red; }
.show\@md { display: none; }
.icon--x { --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E"); }
::view-transition-new(.auto-animation) { animation: none; }
:where(.accordion) { details { &:not(:last-child) { opacity: .5; } } }
`
	got := Classes(css)
	want := map[string]bool{"btn": true, "btn--primary": true, "card": true, "card__footer": true, "show@md": true, "icon--x": true, "accordion": true}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Classes() = %v, want %v", got, want)
	}
}

func TestProperties(t *testing.T) {
	css := `.btn { --btn-color: red; color: var(--btn-color, var(--color-text)); --btn-pad:1px; }`
	if got, want := Properties(css), []string{"--btn-color", "--btn-pad"}; !reflect.DeepEqual(got, want) {
		t.Errorf("Properties() = %v, want %v", got, want)
	}
}

func TestHTMLClasses(t *testing.T) {
	html := `<div class="flex  gap"><span data-class="nope" class="icon icon--x"></span></div>`
	if got, want := HTMLClasses(html), []string{"flex", "gap", "icon", "icon--x"}; !reflect.DeepEqual(got, want) {
		t.Errorf("HTMLClasses() = %v, want %v", got, want)
	}
}
