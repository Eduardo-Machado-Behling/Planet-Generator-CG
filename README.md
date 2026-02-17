# 🪐 Procedural Planet Generator — Computer Graphics Assignment

**Procedural Planet** is a WebGL2-based 3D engine developed for a University Computer Graphics course.
The objective was to implement a complete graphics pipeline from scratch, featuring procedural geometry generation, multi-pass rendering for shadows, custom shader-based terrain noise, and interactive scene editing.

---

## 🔗 Live Preview

👉 **Try the simulation here:**
[https://eduardo-machado-behling.github.io/Planet-Generator-CG/]()

> *Note: The project requires a WebGL2-compatible browser.*

---

## 🚀 How to Run Locally

This project uses **Node.js** for dependency management and local serving.

1. **Install Dependencies:**
```bash
npm install

```


2. **Start the Local Server:**
```bash
npm start

```


This will launch the application at `http://localhost:8080` (or the port defined in your package.json).

---

## 🌍 Geometry & Topology

The planet geometry is generated using a **Fibonacci Sphere** algorithm.

* **Vertex Generation:** Points are distributed evenly across the sphere surface using the Golden Ratio (), preventing the "pole pinching" artifacts common in UV spheres.
* **Triangulation:** The mesh topology is computed dynamically using **Delaunay Triangulation**, projecting 3D points to a 2D plane to calculate connectivity before wrapping them back into a spherical manifold.

---

## 🏔️ Procedural Terrain

Terrain generation is powered by a custom **Stackable Noise System** implemented directly in GLSL shaders.

* **Layering:** The engine supports multiple noise layers (Simplex, FBM, Rigid) that can be blended together.
* **Masking:** Layers can mask each other using blending modes (Add, Max, Multiply).
* **Domain Warping:** High-frequency detail is achieved by warping the coordinate domain of the noise functions.

---

## 💫 Animation System (Orbits)

The engine features a hierarchical **Orbit System** that manages the motion of celestial bodies and atmospheric elements.

* **Scene Graph:** Objects like the Sun and Cloud Layers are attached to anchor nodes that rotate independently around the planet's axis.
* **Delta Time:** All animations are scaled by `deltaTime` to ensure smooth, frame-rate independent movement.
* **Cloud Layers:** The atmosphere mesh rotates at a slightly different offset to the planet surface, creating a parallax effect that adds depth to the scene.

---

## 🖱️ Interaction & Picking (AABB / FBO)

The engine implements a pixel-perfect object picking system using an **FBO ID Texture** combined with **AABB (Axis-Aligned Bounding Box)** logic.

Instead of casting rays from the CPU, the scene is rendered to an off-screen framebuffer (FBO) where every object is drawn as a unique color (ID).

* **Spawn (Left Click):** The engine reads the depth/position from the FBO at the mouse coordinates and instantiates a tree aligned to the surface normal.
* **Delete (Right Click):** The engine reads the **Object ID** from the FBO. If an object exists at that pixel, it is identified and removed from the scene.

---

## 🌑 Lighting & Shadows

The scene implements a multi-pass rendering pipeline to support dynamic shadows:

1. **Shadow Pass:** The scene is rendered from the light's perspective (Orthographic Projection) into a high-precision depth texture.
2. **Render Pass:** The scene is rendered to the screen, sampling the shadow map to calculate occlusion.
3. **Displacement Sync:** The shadow pass strictly respects the vertex displacement of the terrain, ensuring mountains cast correct shadows onto valleys.

---

## 🎛️ Parameters

The simulation is fully tweakable via a dynamic UI:

| Parameter | Description |
| --- | --- |
| **General** | General simulation configuration |
| **Sphere** | Main planet configuration |
| **Atmosphere** | Controls for Rayleigh scattering color and intensity |
| **Layers** | Add/Remove noise layers and change their blend modes |

---

## 🛠️ Tech Stack

* **Language:** TypeScript
* **Graphics API:** WebGL 2.0 (Raw API, no Three.js/Babylon)
* **Math:** Custom Linear Algebra Library (Matrices, Vectors, Quaternions)
* **Shaders:** GLSL ES 3.00
