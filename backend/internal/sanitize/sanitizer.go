package sanitize

import (
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

type Sanitizer struct {
	policy *bluemonday.Policy
}

var remoteImgRegex = regexp.MustCompile(`(?i)<img([^>]+)src=["'](https?://[^"']+)["']([^>]*)>`)

func New() *Sanitizer {
	p := bluemonday.UGCPolicy()
	p.AllowAttrs("style", "class", "id").Globally()
	p.AllowElements("table", "thead", "tbody", "tfoot", "tr", "td", "th", "div", "span", "p", "a", "hr", "br", "h1", "h2", "h3", "h4", "h5", "h6", "b", "strong", "i", "em", "u", "s", "strike", "blockquote", "pre", "code", "ul", "ol", "li", "img")
	p.AllowAttrs("href", "target").OnElements("a")
	p.AllowAttrs("src", "alt", "width", "height", "data-blocked-src").OnElements("img")
	p.RequireNoReferrerOnLinks(true)

	return &Sanitizer{policy: p}
}

// SanitizeEmailBody cleans HTML and blocks external tracking images by default (Roundcube style)
func (s *Sanitizer) SanitizeEmailBody(html string, allowRemoteImages bool) (cleaned string, hasBlockedImages bool) {
	if html == "" {
		return "", false
	}

	rawCleaned := s.policy.Sanitize(html)

	if !allowRemoteImages {
		if remoteImgRegex.MatchString(rawCleaned) {
			hasBlockedImages = true
			// Replace src with data-blocked-src and add placeholder style
			rawCleaned = remoteImgRegex.ReplaceAllString(rawCleaned, `<img$1data-blocked-src="$2" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='100%' height='100%' fill='%23eee'/></svg>" class="remote-blocked-img"$3>`)
		}
	}

	return strings.TrimSpace(rawCleaned), hasBlockedImages
}
