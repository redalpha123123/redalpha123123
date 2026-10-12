# Shooting Star — Procedural Sun

A real-time, GPU-rendered sun built with shader math, inspired by the cinematic look of
*The Shooting Star (Demo)* Minecraft mod. It renders a churning, fiery sun from real NASA
imagery (or pure procedural noise), with HDR bloom and a billowing-fireball explosion.

Everything here is original work except the NASA/ESO/Solar System Scope source photos,
which are public-domain or CC BY 4.0 (see **Credits** below).

---

## What's in this folder

```
sun-forge.html            The whole thing — open in any browser. Self-contained demo.
textures/
  nasa_sdo_171_4096.jpg   NASA SDO AIA 171 Å, 4096×4096 (public domain)
  nasa_sdo_304_4096.jpg   NASA SDO AIA 304 Å, 4096×4096 (public domain)
  solarsystemscope_sun_2k.jpg  Solar System Scope 2K sun surface map (CC BY 4.0)
  web_sun_171.jpg         2048² web-sized copy used by the demo
  web_sun_304.jpg         2048² web-sized copy used by the demo
  web_sun_surface.jpg     2048×1024 web-sized copy used by the demo
shaders/                  The GLSL extracted from the demo (for porting to a mod)
  sun.frag                The sun: ray-sphere, fBm fire surface, prominences, explosion
  fullscreen.vert         Fullscreen-triangle vertex shader (shared by all passes)
  bloom_bright.frag       Bloom pass 1 — bright-pass + downsample
  bloom_blur.frag         Bloom pass 2 — separable Gaussian blur
  composite.frag          Bloom pass 3 — scene + bloom, tonemap, flash, shake, vignette
LOG.md                    Full build log — every step and every version
```

## How to run it

Open `sun-forge.html` in a browser. It needs WebGL (any modern phone or computer).
The demo references the three `web_sun_*.jpg` textures — if you open the file directly
from disk some browsers block the textures (cross-origin), so either:

- serve the folder over a tiny local server, e.g. `python3 -m http.server` then open
  `http://localhost:8000/sun-forge.html`, **or**
- just use the live published version (same thing, hosted): the artifact link in the chat.

## Controls

- **Texture source**: Procedural noise · NASA 171 Å · NASA 304 Å · Surface map
- **Turbulence** – how violently the surface boils
- **Churn speed** – how fast the plasma flows/rotates
- **Size** – apparent radius
- **Temperature** – warm orange → white-hot
- **Edge flames** – solar prominences licking off the limb
- **Noise blend** – (photo modes) stir live fire motion into the still photo
- **Bloom** – HDR glow strength
- Buttons: **▲ Replay rise** · **💥 Explode** · **Reset dials** · **Pause**

## How it works (the technique)

1. **Ray-sphere** — every pixel shoots a ray and analytically intersects a sphere (no 3D model).
2. **fBm noise** — fractal noise drives the churning fire surface with dark lanes = flame structure.
3. **Photo blend** — optionally wrap a real NASA photo on the sphere and modulate its brightness
   with the noise so it moves without going pale.
4. **Prominences** — sparse flame tongues erupt at the limb.
5. **HDR + Bloom** — the sun renders to a half-float buffer; a bright-pass + Gaussian blur +
   composite makes the hot parts glow (the same `bloom_down`/`bloom_up`/`composite` chain the
   mod uses).
6. **Explosion** — on detonation the sun is consumed and a billowing fireball of rolling fire
   clouds (fBm) grows, roils, and cools to smoke, with a flash and screen shake.

This is the same family of techniques (SDF/ray-based rendering, not meshes) that the demo mod
uses for its sun, planets, and the accelerator ring.

## Porting to Minecraft

The GLSL in `shaders/` is portable. To run it in a mod you change three things:
1. Build the camera ray from the engine's camera basis (`CamFwd/CamUp/CamRight`) instead of the
   fixed demo camera.
2. Set the sun's world position relative to the camera; drive its rise/explosion from a
   client-side cutscene timeline.
3. Render to an `RGBA16F` target and run the bloom passes, then composite to the screen.

The Java glue (camera lock via Mixin, the cutscene director) differs by Minecraft version
(1.20.1 vs 1.21.x) and loader (Fabric/NeoForge).

## Credits

- **NASA / SDO (AIA 171 Å, 304 Å)** — Solar Dynamics Observatory, public domain.
  https://sdo.gsfc.nasa.gov/
- **Solar System Scope** — "2K Sun" surface texture, licensed **CC BY 4.0**. You must keep this
  credit if you ship that texture. https://www.solarsystemscope.com/textures/
- All shader code, the procedural sun, prominences, bloom, and explosion are original.
