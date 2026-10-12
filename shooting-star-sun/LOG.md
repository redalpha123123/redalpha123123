# Build Log — Shooting Star Procedural Sun

A chronological log of the whole session: what we investigated, decided, and built.
Live demo: https://claude.ai/artifact/4mpPYsiN2EeWCz3ttwvExd

---

## Phase 1 — Reverse-engineering the mod

**Goal:** figure out how *The Shooting Star (Demo)* makes its textures and cutscenes.

- Downloaded the mod jar from CurseForge (ForgeCDN), ~49 MB.
- It's a jar-in-jar multiloader wrapper; the real mod is a nested jar per MC version.
- Findings from the assets/code:
  - **No 3D model files at all** (no `.obj/.gltf/.bbmodel`). Blocks/items are trivial cube JSON.
  - **Space imagery is real photos** — NASA (Blue Marble, Black Marble, LRO Moon), ESO (Milky
    Way), Solar System Scope (planets), documented in `CREDITS.txt`. Loaded as 2K–4K JPEGs.
  - **Everything is drawn in ~30 custom GLSL shaders** (`shaders/fx/*.fsh`), using `#include`
    (so a hand-rolled shader loader, not vanilla core shaders), RGBA16F targets, and
    `bloom_up`/`bloom_down` ping-pong for bloom.
  - **The rocket "needle" and the ring around Jupiter are pure shader math** (SDF/raymarching):
    `ringDistance()` is a torus distance field; the needle is a ray-vs-line test driven by
    uniforms (`NeedleJ`, `BreechJ`, `Heading`). No meshes.
  - Cutscenes are rendered **in real time** by the shaders + a Java camera director
    (`client/cinematic`), not pre-rendered video.
- **Conclusion:** the space photos are downloaded; the *look* (sun, planets, ring, beams,
  explosions, bloom, camera) is all original shader + code work.

## Phase 2 — Teaching the technique

- Explained the cutscene architecture: a client-side timeline driving (1) a camera takeover
  (Mixin), (2) what's drawn each frame, (3) post FX.
- Explained the sun recipe: ray-sphere intersection + fBm noise + limb darkening + corona,
  output as HDR so bloom can catch it.

## Phase 3 — Building the live sun ("Sun Forge" artifact)

Built an interactive WebGL demo and iterated on it heavily based on live feedback.

| Ver | Change |
|-----|--------|
| 1   | First procedural sun: ray-sphere, fBm surface, corona, rise animation, sliders. |
| 2   | Added real NASA SDO 171/304 photos + Solar System Scope surface map; texture switcher; citations; published images alongside the page. |
| 3   | Added animated flame tongues (prominences) at the limb. |
| 4   | Surface "fire on the disc" in all modes; tightened flames; flip to photo+noise blend. |
| 5   | **Fixed "no fire on the sun":** added dark lanes to the color ramp (dark maroon→red→orange→yellow→white) so the surface reads as fire, not a smooth glowing moon. |
| 6   | Softened the edge rim glow. |
| 7   | Added granulation relief (height-map emboss) + redder limb (planet-grade detail). |
| 8   | Made the lava **move** by warping the photo's UVs with animated noise (churn in place). |
| 9   | Softened the edge further; broadened corona. |
| 10–11 | Chased a persistent "shield" rim: tightened corona, darkened space, fade-to-black limb. |
| 12  | Sampled the photo *inside* its bright limb to kill the mip-blur pale rim. Verified by rendering locally (set up a headless-Chromium render harness to see exactly what the user sees). |
| 13  | **Anti-aliased the silhouette** (feathered coverage mask) so no hard pixel edge. |
| 14  | Removed the halo entirely (user wanted nothing around the sun); flames gated behind the slider. |
| 15  | Fireball/flames off by default → clean sphere on black. |
| 16  | **Fixed "shield at any blend":** blend now modulates *brightness only*, keeping the photo saturated (no pale clouds). |
| 17  | Removed the procedural-swap band at the edge + turned off mipmaps so surface detail is continuous to the rim. |
| 18  | Removed background stars → pure black. |
| 19  | **GPU-proof rim fade** (screen-space ~7px fade to black) so the "shield" can't appear on any GPU; re-enabled mipmaps. |
| 20  | Blend keeps saturation → no "white clouds moving" on the surface. |
| 21  | Sparse solar prominences (a few flares, not a ring). |
| 22  | **Angry fire:** dense flame tongues all around the limb for the "coming out of the black hole" look. |
| 23  | **Real HDR bloom** added: HDR scene buffer → bright-pass → Gaussian blur ×2 → composite (the mod's chain). Biggest visual jump. |
| 24  | First explosion: swelling fireball + flash + shockwave ring + screen shake. |
| 25  | Reworked explosion toward a supernova (flash, radiating rays, shell). |
| 26  | Anime-style pass: flash-to-white, cross/star flare, bold expanding ring, speed lines. |
| 27  | Matched reference #1 (magical-splash-flare): white bow flare + jagged gear-edged ring. |
| 28  | **Matched reference #2 (billowing fireball):** detonation now erupts into a growing ball of rolling fBm fire clouds with a blazing core that cools to smoke — the look the user wanted. |

## Techniques proven here (ready to port to Minecraft)

- Ray-sphere sun with fBm fire surface and dark-lane color ramp.
- Real NASA photo wrapping + brightness-only noise blend for live motion.
- Screen-space anti-aliased limb (no mesh, no rim artifacts, GPU-independent).
- Solar prominences at the limb.
- Multi-pass HDR bloom (bright-pass → blur → composite).
- Cutscene hooks: a rise animation and a billowing-fireball explosion driven by a single
  0→1 progress uniform — exactly how the in-game cutscene clock will drive it.

## What's left to match a full cutscene like his

- The black hole the sun rises from + a moving camera (makes it a film, not a demo).
- Sound (rumble → roar → boom).
- Porting the shaders into an actual Minecraft mod (camera lock via Mixin + the cutscene
  director), which needs the target MC version + loader.
