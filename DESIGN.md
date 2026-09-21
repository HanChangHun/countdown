# Countdown desktop design

## 1. Atmosphere & Identity
Preserve the existing quiet violet glass timer and warm coral-to-gold title.
The user's screenshot sets the width goal (roughly 280–300 logical pixels),
not a request to copy Claude Usage's colors or content.

## 2. Color
Existing palette: background #1a1545; gradient #0f0c29 / #302b63 / #24243e;
white text; coral #f7797d to gold #FBD786 heading; lavender #c084fc accent.
Translucent white surfaces and borders retain their existing opacity levels.

## 3. Typography
Segoe UI with system fallbacks; tabular timer numbers. Existing rem scale is
preserved at 360px and above. Below that, the root size scales continuously
from 16px down to 12.8px. Titlebar text has a 10px floor, sidebar text stays at 11–13px, and compact
controls have a 10px floor. Preset padding shrinks to 0.55rem per side. Editable titles wrap long words inside their container.

## 4. Spacing & Layout
Native minimum width: 280px; minimum height: 240px. Default size stays 760×640
and saved window geometry is preserved. Rem-based spacing follows the root
scale. Four timer units stay on one row; controls and preset pills may wrap.
The existing 440px height breakpoint retains the glance layout. Main content
owns scrolling when a long title needs more height.

## 5. Components
Existing shared primitives: `.unit` number/label glass tiles; primary, ghost
and preset buttons; native date/select controls; `.timer-item` list rows;
fixed titlebar; sliding sidebar. Keep hover/focus and selected states.
Exercise unset, running, elapsed, long-title, sidebar-open and glance states
at 280px, 300px, 360px and the default width. No new component layer is needed.

## 6. Motion & Interaction
Keep existing timer, sidebar and Pomodoro behavior. Resizing is immediate,
without a scale animation. Keyboard focus must remain visible on controls.

## 7. Depth & Surface
Retain the gradient backdrop, translucent surfaces, thin white borders and
existing blur. Scaling must preserve crisp live text and native hit testing.

## 8. Accessibility Constraints & Existing Debt
Do not scale the whole window using a transform: it disconnects layout bounds
from painted size. Retain native controls, keyboard operation and scrolling.
Existing low-contrast secondary labels and decorative particles are outside
this focused sizing change; this is not a full accessibility certification.
