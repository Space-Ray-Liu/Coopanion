/** Floating chip chambers with corner contacts and geometric cores. */
const chamber = core => `<path d="M-16-23H16L23-16V16L16 23H-16L-23 16V-16Z" fill="#42bd98" fill-opacity=".16" stroke="#56caa2" stroke-width="2"/>
  <path d="M-17-8V-17H-8M8-17H17V-8M17 8V17H8M-8 17H-17V8" fill="none" stroke="#c3ffe5" stroke-width="2"/>
  <g data-module-core="" fill="#79e4bc" fill-opacity=".4" stroke="#69caa4" stroke-width="2.2" stroke-linejoin="miter"><path d="${core}"/></g>
  <g fill="#afffdc" stroke="none"><rect x="-20" y="-3" width="3" height="3"/><rect x="17" y="0" width="3" height="3"/><rect x="-1.5" y="-20" width="3" height="3"/><rect x="-1.5" y="17" width="3" height="3"/></g>`;
export const MODULES = {
  victory: chamber('M-9-7L0 10L9-7L0-1Z'),
  salute: chamber('M0-11L10 0L0 11L-10 0ZM0-5V5'),
  approval: chamber('M-10 4L0-9L10 4L0 0Z'),
  thinking: chamber('M0-10L9-5V5L0 10L-9 5V-5ZM0-3L3 0L0 3L-3 0Z'),
  laughter: chamber('M0-11L10-5V7L0 13L-10 7V-5ZM0 1V13M0 1L-10-5M0 1L10-5'),
};
