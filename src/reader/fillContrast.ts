// Runs inside the reader page (native WebView and web iframe), so these are ES5 source strings, not TypeScript.
// Editors colour-code cells with inline backgrounds (Periodic table categories, legends); in Night atlas the text
// on them inherits light ink, which vanishes on a pastel fill. Each filled element gets whichever ink reads better.

export interface ReaderInks {
  /** Paper's ink, for light fills. */
  dark: string;
  /** Night atlas ink, for dark fills. */
  light: string;
}

/**
 * `(fill, inks) → ink | null`: the ink with more contrast against a computed `background-color`, by WCAG relative
 * luminance. Null for a fill it can't read or one mostly see-through, which shows the page behind it.
 */
export const PICK_INK_FUNCTION = `function (fill, inks) {
  var MOSTLY_SEE_THROUGH = 0.5;
  function channels(color) {
    var rgb = /^rgba?\\((\\d+), (\\d+), (\\d+)(?:, ([\\d.]+))?\\)$/.exec(color);
    if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: rgb[4] === undefined ? 1 : +rgb[4] };
    var hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
    if (hex) return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1 };
    return null;
  }
  function linear(channel) {
    var c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function luminance(c) {
    return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
  }
  function contrast(a, b) {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  var fillChannels = channels(fill || '');
  if (!fillChannels || fillChannels.a < MOSTLY_SEE_THROUGH) return null;
  var fillLuminance = luminance(fillChannels);
  var darkContrast = contrast(fillLuminance, luminance(channels(inks.dark)));
  var lightContrast = contrast(fillLuminance, luminance(channels(inks.light)));
  return darkContrast > lightContrast ? inks.dark : inks.light;
}`;

/**
 * `(root, inks)`: inks every element under `root` that has an inline fill, and its links (the reader forces link
 * colour). An editor's own text colour wins. Elements are visited in document order, so a nested fill re-inks its
 * own content after its parent.
 */
export const APPLY_FILL_CONTRAST_FUNCTION = `function (root, inks) {
  var pickInk = ${PICK_INK_FUNCTION};
  var filled = root.querySelectorAll('[style*="background"], [bgcolor]');
  for (var i = 0; i < filled.length; i++) {
    var element = filled[i];
    var ownInk = element.style.color;
    var ink = ownInk || pickInk(getComputedStyle(element).backgroundColor, inks);
    if (!ink) continue;
    if (!ownInk) element.style.setProperty('color', ink, 'important');
    var links = element.querySelectorAll('a');
    for (var j = 0; j < links.length; j++) links[j].style.setProperty('color', ink, 'important');
  }
}`;

/** The page script: runs the contrast pass over the article once the document is parsed. */
export function fillContrastScript(inks: ReaderInks): string {
  return `<script id="tangent-fill-contrast">document.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('pcs') || document.body;
  (${APPLY_FILL_CONTRAST_FUNCTION})(root, ${JSON.stringify(inks)});
});</script>`;
}
