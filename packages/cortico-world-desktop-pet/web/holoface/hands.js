/** Floating square modules: gestures use position and display glyphs, with no fingers or wrists. */
const block = glyph => `<path d="M-17-23H17L23-17V17L17 23H-17L-23 17V-17Z"/>
  <path d="M-17-16H17M-17 16H17" stroke="#d6fff0" stroke-width="1.5" opacity=".5"/>
  <path d="${glyph}" fill="none" stroke="#d5ffef" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter" opacity=".8"/>`;
export const HANDS = {
  peace: block('M-11-7L0 9L11-7'),
  salute: block('M-10 9L9-10M-5-10H9V4'),
  thumb: block('M-10 0L0-10L10 0M0-10V12'),
  think: block('M-9-8H5L9-4V1L0 6V10M0 15V16'),
  fist: block('M-10-5H10M-10 5H10'),
};
