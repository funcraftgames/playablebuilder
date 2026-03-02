/**
 * Returns the device safe-area insets in pixels.
 * Requires `viewport-fit=cover` in the HTML meta viewport tag.
 */
export function getSafeArea() {
  const div = document.createElement('div');
  div.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;' +
    'padding-top:env(safe-area-inset-top,0px);' +
    'padding-right:env(safe-area-inset-right,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);' +
    'padding-left:env(safe-area-inset-left,0px);';
  document.body.appendChild(div);
  const cs = getComputedStyle(div);
  const safe = {
    top:    parseInt(cs.paddingTop)    || 0,
    right:  parseInt(cs.paddingRight)  || 0,
    bottom: parseInt(cs.paddingBottom) || 0,
    left:   parseInt(cs.paddingLeft)   || 0,
  };
  document.body.removeChild(div);
  return safe;
}
