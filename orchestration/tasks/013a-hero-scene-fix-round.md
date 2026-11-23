Fix round 1 for task 013 — only edit src/components/landing/hero-scene.tsx (and the hero rules in
src/app/globals.css only if strictly needed for the canvas box). I already fixed type/lint errors and
moved HeroFallback into hero-scene-fallback.tsx and added hero-scene-loader.tsx — keep those changes.

Reviewed in the browser at 1440x900. Problems and the required fixes:

1. PERFORMANCE: setDeductibleSoFarCents() is called every animation frame, re-rendering React at 60 fps.
   Only call it when the value actually changes (keep the last value in a local variable).

2. THE SCAN BEAM reads as a flat thick yellow bar lying across the whole scene. Replace the
   choreography so the scan is the hero moment:
   - A receipt enters from back-left/back-right, floating UPRIGHT (facing the camera, slight tilt and
     paper sway), and glides to a "scan spot" centre-front where it is the largest object in view
     (about 45% of the canvas height).
   - It pauses ~0.9 s while a SHORT scanner line (only as wide as the receipt + 10%, not 6.6 units)
     sweeps top→bottom across it: a thin bright yellow line plus a soft vertical-fade glow trailing above
     it (use a small canvas gradient texture, additive blending, depthWrite false). The scanned part of
     the receipt brightens progressively as the line passes: put the scanned texture on a second plane
     just in front (z +0.002) and reveal it from the top with material clipping planes or by scaling a
     plane anchored at the top edge and offsetting UVs — no full-texture swap pop.
   - When the line reaches the bottom, the category chip on the receipt pops (scale 0→1.08→1 over
     ~250 ms), then the receipt tilts back and flies on a smooth arc (cubic bezier, ease-in-out) down
     to its category stack, rotating to lie flat, with a small settle bounce.
   - Overlap: the next receipt starts entering while the previous one flies to its stack, so the loop
     feels continuous. Total loop ~10 s; after all four land, the stacks gently fade/slide away
     and the cycle restarts without a hard jump (fade receipts out over 0.6 s).
   - The scanner is hidden (opacity 0) when no receipt is at the scan spot.

3. CAMERA / COMPOSITION: stacks are tiny flat slivers. Raise the camera to look down ~30° so the desk
   stacks read as stacks; position the scan spot in the upper-middle of the frame and the four stacks
   along the lower third. Each stack must show its label clearly (bigger label text on its base
   texture, ≥ 36px on a 512px canvas) and grow visibly (each landed receipt adds ~0.02 units height,
   plus 2–3 pre-existing slips so stacks are never empty). Add a very subtle ground: a large plane with
   a radial-alpha canvas texture in the --sunk colour so the stacks sit on something; no hard edges.

4. DARK THEME: receipts must stay light paper (--paper) with --ink text in both themes, and slightly
   emissive (emissiveIntensity ~0.15 using the paper colour) in dark mode so they don't look grey.

5. REDUCED MOTION: if the preference turns off later, restart the loop (currently the rAF loop is
   never restarted after renderStillFrame). The still frame should show one receipt at the scan spot
   fully scanned with the chip visible, and the four stacks with receipts.

6. Mobile (container < 560px wide): use a narrower FOV-adjusted framing so the scan spot and all four
   stacks remain inside the canvas.

Keep: the HTML ledger overlay, aria labels, pause when off-screen/hidden, DPR cap, disposal on
unmount, theme token reading. Keep code typed (no `any`), and make sure there are no React lint
errors (no synchronous setState inside useEffect bodies).

Do not run any commands; only edit files. Do not ask questions. List the files you changed.
