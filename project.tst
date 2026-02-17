./public/assets/shaders/default.frag
#version 300 es
precision mediump float;

in vec3 vNormal;
in float vV;

out vec4 FragColor;

void main() {
  vec3 norm = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.5, 1.0, -0.5));

  float diff = max(dot(norm, lightDir), 0.2);

  float pattern = step(0.5, fract(vV * 10.0));

  vec3 colorA = vec3(1.0, 0.5, 0.0); // Orange
  vec3 colorB = vec3(0.2, 0.2, 0.2); // Dark Grey

  vec3 finalColor = mix(colorA, colorB, pattern);

  FragColor = vec4(finalColor * diff, 1.0);
}./public/assets/shaders/default.vert
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

out vec3 vNormal;
out float vV;

void main() {
  gl_Position = uProj * uView * uModel * vec4(aPosition, 1.0);

  vNormal = mat3(uModel) * aNormal;

  vV = aV;
}./public/assets/shaders/fibSphere.vert
#version 300 es

uniform int uResolution;
uniform float uPhi;
uniform float uRadius;

out vec3 vOutPos;
out vec3 vOutNormal;

precision highp float;

const float PI = 3.14159265359;

void main() {
  float i = float(gl_VertexID);

  float y = 1.0 - i / (float(uResolution) - 1.0) * 2.0;
  float r = sqrt(1.0 - y * y);

  float theta = uPhi * PI * 2.0 * i;
  float x = cos(theta) * r;
  float z = sin(theta) * r;

  vOutNormal = vec3(x, y, z);
  vOutPos = vOutNormal * uRadius;

  // Dummy position (required by GLSL)
  gl_Position = vec4(0.0);
}./public/assets/shaders/lathe.frag
#version 300 es

precision highp float;

out vec4 oColor;

void main() { oColor = vec4(1.0, 0.0, 0.0, 1.0); }
./public/assets/shaders/lathe.vert
#version 300 es

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aV;

uniform int uTotalSlices;

out vec3 vOutPos;
out vec3 vOutNormal;
out vec2 vOutUV;

const float PI = 3.14159265359;

void main() {
  float fraction = float(gl_InstanceID) / float(uTotalSlices - 1);
  float angle = fraction * PI * 2.0;

  float c = cos(angle);
  float s = sin(angle);

  mat3 rot = mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);

  vOutPos = rot * aPosition;

  vOutNormal = normalize(rot * aNormal);

  vOutUV = vec2(fraction, aV);

  // Dummy position (required by GLSL)
  gl_Position = vec4(0.0);
}./public/assets/shaders/test.frag
#version 300 es

precision highp float;

out vec4 FragColor;

in vec3 vFragPos;
in vec3 vNormal;
in float vNoise; // This comes from the Vertex Shader displacement

vec3 lightPos = vec3(100.0, 100.0, 100.0); // e.g., vec3(100.0, 100.0, 100.0)
uniform vec3 viewPos;

void main() {
  // // 1. Setup Colors
  // vec3 ocean = vec3(0.0, 0.2, 0.8);
  // vec3 land = vec3(0.1, 0.6, 0.2);
  // vec3 mountain = vec3(0.4, 0.3, 0.2);
  // vec3 snow = vec3(1.0, 1.0, 1.0);

  // // 2. Determine Surface Color based on Height
  // // (Adjust these thresholds based on your 'terrainScale')
  // // vec3 objectColor;
  // // if (vHeight < 0.05) {
  // //   objectColor = ocean;
  // // } else if (vHeight < 0.3) {
  // //   objectColor = mix(land, mountain, (vHeight - 0.05) / 0.25);
  // // } else {
  // //   objectColor = mix(mountain, snow, (vHeight - 0.3) / 0.4);
  // // }

  // // 3. Simple Diffuse Lighting (Lambartian)
  // // This proves if your analytical normals (from the noised function) are
  // // correct!
  // vec3 norm = normalize(vNormal);
  // vec3 lightDir = normalize(lightPos - vFragPos);
  // float diff = max(dot(norm, lightDir), 0.0);
  // vec3 diffuse = diff * vec3(1.0); // White light

  // // 4. Ambient Light (so shadows aren't pitch black)
  // vec3 ambient = 0.2 * vec3(1.0);

  // // 5. Combine
  // vec3 finalColor = (ambient + diffuse) * objectColor;
  FragColor = vec4(vNoise, vNoise, vNoise, 1.0);
  // FragColor = vec4(finalColor, 1.0);
}./public/assets/shaders/test.vert
#version 300 es

precision highp float;

layout(location = 0) in vec3 aPos;    // Your sphere vertex position
layout(location = 1) in vec3 aNormal; // Your sphere vertex normal

// Uniforms (Variables you send from C++/CPU)
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

float planetRadius = 6371.0; // e.g., 6371.0
float terrainScale = 1.5;    // Height multiplier (how tall mountains are)
float frequency = 1.5;
int octaves = 12;            // Try 6
float lacunarity = 2.0;      // Try 2.0
float persistence = 0.2;     // Try 0.5
float erosionStrength = 1.0; // Try 1.0 (multiplier for the dot product)

// Outputs to the Fragment Shader
out vec3 vFragPos;
out vec3 vNormal;
out float vHeight; // Useful for coloring (snow on peaks, grass in valleys)

// --- Helper Functions for GPU Hashing ---

// Modulo 289 without a division (faster on some GPUs)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

// Permutation Polynomial: (34x^2 + x) mod 289
// This replaces the "p[]" array lookup from the PDF
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }

// Taylor Expansion approximation of 1/sqrt(x) for normalization
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

// --- Main Simplex Noise Function ---
// Returns a value between -1.0 and 1.0
float snoise(vec3 v) {
  // 1. CONSTANTS (From PDF)
  // F3 = 1/3 (Skew factor)
  // G3 = 1/6 (Unskew factor)
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // 2. SKEWING (Coordinate transformation)
  // s = (x + y + z) * F3
  // i,j,k = floor(v + s)
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // 3. SIMPLEX TRAVERSAL (Find which tetrahedron we are in)
  // The PDF uses if/else checks. Here we use 'step' for branchless GPU
  // performance. if (x0 >= y0) ...
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  //   x0 = unskewed relative to corner 0
  //   x1 = x0 - i1 + G3
  //   x2 = x0 - i2 + 2.0*G3
  //   x3 = x0 - 1.0 + 3.0*G3
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0*C.x = -0.5 = -D.y

  // 4. PERMUTATION (Hashing)
  // Calculate the hashed indices for the 4 corners
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y +
                           vec4(0.0, i1.y, i2.y, 1.0)) +
                   i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // 5. GRADIENTS (Picking directions)
  // The PDF picks from 12 edges. Here we generate gradients on a diamond.
  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); // mod(p, 7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_); // mod(j, 7)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  // vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  // vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm =
      taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // 6. SUMMATION (Mixing contribution from 4 corners)
  // t = 0.6 - r^2 (Attenuation)
  // If t < 0, contribution is 0
  vec4 m =
      max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;

  // Final Result = 42.0 * sum( t^4 * dot(grad, dist) )
  // The PDF suggests scaling by 32.0, but 42.0 is often used in GLSL
  // to perfectly normalize to [-1, 1].
  return 42.0 *
         dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 x, int octaves, float lacunarity, float persistence) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;

  // Loop through the layers
  for (int i = 0; i < octaves; i++) {
    value += amplitude * snoise(x * frequency);
    frequency *= lacunarity;  // Increase detail density
    amplitude *= persistence; // Decrease detail strength
  }
  return value;
}

out float vNoise;

void main() {
  // 1. Calculate Noise based on vertex position
  // We add 1.0 to mapped range [-1,1] to make it [0, 2] for height
  // Tuning Parameters
  float uScale = 1.0;       // Base zoom
  float uHeight = 0.1;      // Base height
  int uOctaves = 8;         // Number of layers
  float uLacunarity = 5.0;  // Detail scale
  float uPersistence = 0.6; // Detail roughness
  float uTime = 200.0;

  // Get complex noise value
  float noiseVal =
      fbm(aPos * uScale + vec3(uTime), uOctaves, uLacunarity, uPersistence);

  // 2. Displace the vertex along its normal
  // Mountains stick out, valleys dip in
  vec3 newPos = aPos + (aNormal * noiseVal * uHeight);
  vNoise = 1.0 - (noiseVal + 1.0) / 2.0;

  gl_Position = uProj * uView * uModel * vec4(newPos, 1.0);
}./src/app.ts
import {Engine} from './engine/Engine.js';
import {Quaternion, SquaredMatrix, Vector} from './engine/Math.js';
import {Camera} from './engine/objects/Camera.js';
import {GameObject} from './engine/objects/GameObject.js';
import {Orbit} from './engine/objects/Orbit.js';
import {Planet} from './engine/objects/Planet.js';
import {Scene} from './engine/Scene.js';

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, multiplier = 1) {
  multiplier = multiplier || 1;
  const width = canvas.clientWidth * multiplier | 0;
  const height = canvas.clientHeight * multiplier | 0;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}


async function main() {
  const engine = Engine.get();
  const gl = engine.gl;

  engine.scene = new Scene();
  let planetOrbit = new Orbit();
  planetOrbit.setParent(engine.scene);

  let planet = new Planet();
  planet.scale = new Vector(3).fill(0.5);
  planet.setParent(planetOrbit)

  let moonOrbit = new Orbit();
  moonOrbit.translation = Vector.Vec([0, 1, 0])
  moonOrbit.setParent(engine.scene);

  let moon = new Planet();
  moon.scale = new Vector(3).fill(0.1);
  moon.setParent(moonOrbit);
  moon.translation = Vector.Vec([0, 0, 0])

  const fov = 60 * (Math.PI / 180);
  let cameraAspect = gl.canvas.width / gl.canvas.height;
  const near = 0.1;
  const far = 100.0;
  engine.camera =
      new Camera(SquaredMatrix.MakePerspective(fov, cameraAspect, near, far));

  engine.camera.target = planet;
  engine.camera.translation = Vector.Vec([0, 0, 3]);

  engine.camera.setParent(engine.scene);

  let then = 0
  let cameraAngle = 0;
  let moonAngle = 0;
  let planetAngle = 0;
  let orbitAngle = 0;

  async function render(now: number) {
    now *= 0.001;
    let dt = now - then;
    then = now;

    if (resizeCanvasToDisplaySize(engine.canvas)) {
      const aspect = gl.canvas.width / gl.canvas.height;
      if (aspect != cameraAspect) {
        cameraAspect = aspect;
        if (engine.camera)
          engine.camera.proj =
              SquaredMatrix.MakePerspective(fov, cameraAspect, near, far);
      }
    }


    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // if (engine.camera) {
    //   cameraAngle += dt * 2;
    //   engine.camera.rotation = Quaternion.FromAxisAngle(Vector.up,
    //   cameraAngle);
    // }

    moonAngle += dt * 4;
    moon.rotation = Quaternion.FromAxisAngle(Vector.up, moonAngle)

    orbitAngle += dt * 2;
    moonOrbit.rotation = Quaternion.FromAxisAngle(Vector.forward, orbitAngle)

    planetAngle += dt * 0.5;
    planet.rotation = Quaternion.FromAxisAngle(Vector.up, planetAngle)


    if (engine.scene) {
      engine.scene.computeWorldMatrix(new SquaredMatrix(4).Identity());

      await engine.scene.mainloop(gl);
    }


    requestAnimationFrame(render);
  }

  render(0)
}


(window as any).main = main;

main();./src/engine/Engine.ts
import {SquaredMatrix} from './Math.js';
import {Camera} from './objects/Camera.js';
import {Scene} from './Scene.js';

export class Engine {
  private context: WebGL2RenderingContext;
  private prog: WebGLProgram|null = null;
  private _canvas: HTMLCanvasElement;

  camera: Camera|null = null;
  scene: Scene|null = null;

  get program(): WebGLProgram|null {
    return this.prog;
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  set program(prog: WebGLProgram) {
    this.prog = prog;
    this.gl.useProgram(prog);

    if (this.camera) this.camera.setup(this.gl, prog);
  }



  get gl(): WebGL2RenderingContext {
    return this.context;
  }

  private static instance: Engine;

  private constructor() {
    const id = '#WebGLCanvas'
    let canvas = document.querySelector<HTMLCanvasElement>(id)
    if (!canvas) {
      throw Error(`Couldn't find canvas ${id}`);
    }

    this._canvas = canvas;
    let gl = canvas.getContext('webgl2');

    if (!gl) {
      throw Error('Couldn\'t create WebGL2 context');
    }

    this.context = gl;
  }

  public static get(): Engine {
    if (!Engine.instance) {
      Engine.instance = new Engine();
    }
    return Engine.instance;
  }
}./src/engine/Math.ts
export class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  apply(translation: Vector): Vector {
    const x = translation.vec[0];
    const y = translation.vec[1];
    const z = translation.vec[2];

    const qx = this.x;
    const qy = this.y;
    const qz = this.z;
    const qw = this.w;

    const tx = 2 * (qy * z - qz * y);
    const ty = 2 * (qz * x - qx * z);
    const tz = 2 * (qx * y - qy * x);

    const resX = x + qw * tx + (qy * tz - qz * ty);
    const resY = y + qw * ty + (qz * tx - qx * tz);
    const resZ = z + qw * tz + (qx * ty - qy * tx);

    let vec = new Vector(3);
    vec.vec[0] = resX;
    vec.vec[1] = resY;
    vec.vec[2] = resZ;

    return vec;
  }

  static FromAxisAngle(axis: Vector, angleRad: number): Quaternion {
    const halfAngle = angleRad * 0.5;
    const s = Math.sin(halfAngle);

    return new Quaternion(
        axis.vec[0] * s, axis.vec[1] * s, axis.vec[2] * s, Math.cos(halfAngle));
  }


  static Multiply(q0: Quaternion, q1: Quaternion): Quaternion {
    return new Quaternion(
        q0.w * q1.x + q0.x * q1.w + q0.y * q1.z - q0.z * q1.y,
        q0.w * q1.y - q0.x * q1.z + q0.y * q1.w + q0.z * q1.x,
        q0.w * q1.z + q0.x * q1.y - q0.y * q1.x + q0.z * q1.w,
        q0.w * q1.w - q0.x * q1.x - q0.y * q1.y - q0.z * q1.z);
  }

  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let ax = a.x, ay = a.y, az = a.z, aw = a.w;
    let bx = b.x, by = b.y, bz = b.z, bw = b.w;

    let cosHalfTheta = ax * bx + ay * by + az * bz + aw * bw;

    if (cosHalfTheta < 0) {
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
      cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 0.99) {
      return new Quaternion(
                 ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t,
                 aw + (bw - aw) * t)
          .normalize();
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion(
        ax * ratioA + bx * ratioB, ay * ratioA + by * ratioB,
        az * ratioA + bz * ratioB, aw * ratioA + bw * ratioB);
  }

  normalize(): Quaternion {
    let len = Math.sqrt(
        this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (len === 0) return new Quaternion(0, 0, 0, 1);
    len = 1 / len;
    this.x *= len;
    this.y *= len;
    this.z *= len;
    this.w *= len;
    return this;
  }
}



export class Vector {
  private data: Float32Array;
  private dim: number;

  static up = Vector.Vec([0, 1, 0]);
  static down = Vector.Vec([0, -1, 0]);
  static left = Vector.Vec([-1, 0, 0]);
  static right = Vector.Vec([1, 0, 0]);
  static forward = Vector.Vec([0, 0, 1]);
  static backward = Vector.Vec([0, 0, -1]);

  get vec(): Float32Array {
    return this.data;
  }

  get dimension(): number {
    return this.dim;
  }

  constructor(dim: number) {
    this.dim = dim;
    this.data = new Float32Array(dim);
  }

  static Vec(vals: number[]): Vector {
    let vec = new Vector(vals.length);
    vec.data.set(vals);

    return vec;
  }

  fill(value: number): Vector {
    for (let idx = 0; idx < this.dim; idx++) {
      this.data[idx] = value;
    }

    return this;
  }
}

export class SquaredMatrix {
  private data: Float32Array;
  private size: number;
  private rows: number;

  get mat(): Float32Array {
    return this.data;
  }

  constructor(rows: number) {
    this.rows = rows;
    this.size = rows * rows;
    this.data = new Float32Array(this.size);
  }

  Identity(): SquaredMatrix {
    for (let i = 0; i < this.size; i++) {
      if (i % this.rows == Math.floor(i / this.rows)) {
        this.data[i] = 1.0;
      } else {
        this.data[i] = 0.0;
      }
    }

    return this;
  }

  // will be equivalent to `b * this`;
  transform(b: SquaredMatrix): SquaredMatrix {
    if (this.rows !== b.rows) {
      throw Error(`Dimension mismatch: ${this.rows} vs ${b.rows}`);
    }

    const n = this.rows;
    const temp = new Float32Array(this.size);

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        let sum = 0;

        for (let k = 0; k < n; k++) {
          const valA = this.data[row * n + k];
          const valB = b.data[k * n + col];
          sum += valA * valB;
        }

        temp[row * n + col] = sum;
      }
    }

    this.data.set(temp);

    return this;
  }

  static MakePerspective(
      fovRad: number, aspect: number, near: number,
      far: number): SquaredMatrix {
    const f = 1.0 / Math.tan(fovRad / 2);
    const rangeInv = 1.0 / (near - far);

    const m = new SquaredMatrix(4);

    m.data[0] = f / aspect;

    m.data[5] = f;

    m.data[10] = (near + far) * rangeInv;
    m.data[11] = -1;

    m.data[14] = near * far * rangeInv * 2;
    m.data[15] = 0;

    return m;
  }

  static multiply(a: SquaredMatrix, b: SquaredMatrix): SquaredMatrix {
    if (a.rows !== b.rows) {
      throw Error(`Dimension mismatch: a(${a.rows}) vs b(${b.rows})`);
    }

    const n = a.rows;
    const result = new SquaredMatrix(n);

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          const valA = a.data[row * n + k];
          const valB = b.data[k * n + col];
          sum += valA * valB;
        }

        result.data[row * n + col] = sum;
      }
    }

    return result;
  }


  static translation(translation: Vector): SquaredMatrix {
    let result = new SquaredMatrix(4).Identity();

    for (let i = 0; i < translation.dimension; i++) {
      const value = translation.vec[i];
      const idx = 12 + i;

      result.data[idx] = value;
    }

    return result;
  }

  static scaling(scale: Vector): SquaredMatrix {
    let result = new SquaredMatrix(4).Identity();

    for (let i = 0; i < scale.dimension; i++) {
      const value = scale.vec[i];
      const idx = i + i * result.rows;

      result.data[idx] = value;
    }

    return result;
  }

  static rotation(q: Quaternion): SquaredMatrix {
    let result = new SquaredMatrix(4).Identity();

    const x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    result.data[0] = 1 - (yy + zz);
    result.data[1] = xy + wz;
    result.data[2] = xz - wy;

    result.data[4] = xy - wz;
    result.data[5] = 1 - (xx + zz);
    result.data[6] = yz + wx;

    result.data[8] = xz + wy;
    result.data[9] = yz - wx;
    result.data[10] = 1 - (xx + yy);

    return result;
  }

  static view(pos: Vector, rot: Quaternion): SquaredMatrix {
    const result = new SquaredMatrix(4);

    const r = SquaredMatrix.rotation(rot);

    const right = {x: r.mat[0], y: r.mat[1], z: r.mat[2]};
    const up = {x: r.mat[4], y: r.mat[5], z: r.mat[6]};
    const fwd = {x: r.mat[8], y: r.mat[9], z: r.mat[10]};

    result.data[0] = right.x;
    result.data[1] = up.x;
    result.data[2] = fwd.x;
    result.data[3] = 0;

    result.data[4] = right.y;
    result.data[5] = up.y;
    result.data[6] = fwd.y;
    result.data[7] = 0;

    result.data[8] = right.z;
    result.data[9] = up.z;
    result.data[10] = fwd.z;
    result.data[11] = 0;

    const px = pos.vec[0], py = pos.vec[1], pz = pos.vec[2];

    result.data[12] = -(right.x * px + right.y * py + right.z * pz);
    result.data[13] = -(up.x * px + up.y * py + up.z * pz);
    result.data[14] = -(fwd.x * px + fwd.y * py + fwd.z * pz);
    result.data[15] = 1;

    return result;
  }

  static MakeLookAt(eye: Vector, target: Vector, up: Vector): SquaredMatrix {
    let zx = eye.vec[0] - target.vec[0];
    let zy = eye.vec[1] - target.vec[1];
    let zz = eye.vec[2] -
        target.vec[2]

        let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (len > 0) {
      zx /= len;
      zy /= len;
      zz /= len;
    }

    let xx = up.vec[1] * zz - up.vec[2] * zy;
    let xy = up.vec[2] * zx - up.vec[0] * zz;
    let xz = up.vec[0] * zy - up.vec[1] * zx;

    len = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (len > 0) {
      xx /= len;
      xy /= len;
      xz /= len;
    }

    let yx = zy * xz - zz * xy;
    let yy = zz * xx - zx * xz;
    let yz = zx * xy - zy * xx;

    const m = new SquaredMatrix(4);

    m.data[0] = xx;
    m.data[4] = xy;
    m.data[8] = xz;
    m.data[12] = -(xx * eye.vec[0] + xy * eye.vec[1] + xz * eye.vec[2]);

    m.data[1] = yx;
    m.data[5] = yy;
    m.data[9] = yz;
    m.data[13] = -(yx * eye.vec[0] + yy * eye.vec[1] + yz * eye.vec[2]);

    m.data[2] = zx;
    m.data[6] = zy;
    m.data[10] = zz;
    m.data[14] = -(zx * eye.vec[0] + zy * eye.vec[1] + zz * eye.vec[2]);

    m.data[3] = 0;
    m.data[7] = 0;
    m.data[11] = 0;
    m.data[15] = 1;

    return m;
  }
}./src/engine/objects/Camera.ts
import {Engine} from '../Engine.js';
import {Quaternion, SquaredMatrix, Vector} from '../Math.js';

import {GameObject} from './GameObject.js'

export class Camera extends GameObject {
  target: GameObject|null = null;

  up = new Vector(3);

  view = new SquaredMatrix(4);
  proj: SquaredMatrix;

  updateView = false;

  constructor(proj: SquaredMatrix) {
    super();

    this.up.fill(0);
    this.up.vec[1] = 1;

    this.proj = proj;
    this.view.Identity();
  }

  setup(gl: WebGL2RenderingContext, program: WebGLProgram) {
    if (this.target) {
      let pos = this.rotation.apply(this.translation);
      this.view =
          SquaredMatrix.MakeLookAt(pos, this.target.translation, this.up);
    } else {
      this.view = SquaredMatrix.view(this.translation, this.rotation);
    }

    if (program) {
      gl.uniformMatrix4fv(
          gl.getUniformLocation(program, 'uView'), false, this.view.mat);

      gl.uniform3fv(
          gl.getUniformLocation(program, 'viewPos'), this.translation.vec);

      gl.uniformMatrix4fv(
          gl.getUniformLocation(program, 'uProj'), false, this.proj.mat);
    }
  }
};./src/engine/objects/GameObject.ts
import {Engine} from '../Engine.js';
import {Quaternion, SquaredMatrix, Vector} from '../Math.js';



export class GameObject {
  _translation: Vector;
  _scale: Vector;
  _rotation: Quaternion;

  dirty: boolean = false;

  get translation(): Vector {
    return this._translation;
  }
  get scale(): Vector {
    return this._scale;
  }
  get rotation(): Quaternion {
    return this._rotation;
  }

  set translation(trans: Vector) {
    this._translation = trans;
    this.dirty = true;
  }
  set scale(scale: Vector) {
    this._scale = scale;
    this.dirty = true;
  }
  set rotation(q: Quaternion) {
    this._rotation = q;
    this.dirty = true;
  }

  localMatrix: SquaredMatrix;
  worldMatrix: SquaredMatrix;
  children: Array<GameObject>;

  constructor() {
    this._translation = new Vector(3).fill(0);
    this._scale = new Vector(3).fill(1);
    this._rotation = new Quaternion();

    this.localMatrix = new SquaredMatrix(4).Identity();
    this.worldMatrix = new SquaredMatrix(4).Identity();
    this.children = new Array<GameObject>();

    this.start(Engine.get().gl);
  }



  setParent(parent: GameObject) {
    parent.children.push(this);
  }

  computeWorldMatrix(parentWorldMatrix: SquaredMatrix) {
    if (this.dirty) {
      this.computeLocalMatrix();
      this.dirty = false;
    }

    let worldMatrix =
        SquaredMatrix.multiply(this.localMatrix, parentWorldMatrix);

    this.children.forEach(function(child) {
      child.computeWorldMatrix(worldMatrix);
    });

    this.worldMatrix = worldMatrix;
  }

  computeLocalMatrix() {
    this.localMatrix = SquaredMatrix.scaling(this.scale);
    this.localMatrix.transform(SquaredMatrix.rotation(this.rotation));
    this.localMatrix.transform(SquaredMatrix.translation(this.translation));
  }


  start(gl: WebGL2RenderingContext) {}
  update(deltaTime: number) {}
  async draw(gl: WebGL2RenderingContext) {}

  async mainloop(gl: WebGL2RenderingContext) {
    await this.draw(gl);

    for (const child of this.children) {
      await child.mainloop(gl);
    }
  }
}
./src/engine/objects/Orbit.ts
import {SquaredMatrix} from '../Math.js';

import {GameObject} from './GameObject.js';

export class Orbit extends GameObject {
  computeLocalMatrix(): void {
    this.localMatrix = SquaredMatrix.scaling(this.scale);
    this.localMatrix.transform(SquaredMatrix.translation(this.translation));
    this.localMatrix.transform(SquaredMatrix.rotation(this.rotation));
  }
}./src/engine/objects/Planet.ts
import {SimpleDelaunay} from '../../geometry/delaunay.js';
import {Engine} from '../Engine.js';
import {ShaderManager} from '../ShaderManager.js';

import {GameObject} from './GameObject.js';

class SphereMesh {
  vao: WebGLVertexArrayObject;
  indices: Uint16Array;

  constructor(vao: WebGLVertexArrayObject, indices: Uint16Array) {
    this.vao = vao;
    this.indices = indices;
  }
}

export class Planet extends GameObject {
  radius: number = 1.0;
  pointsAmount: number = 1000;

  program: WebGLProgram|null = null;
  sphereMesh: SphereMesh|null = null;
  ready: boolean = false;
  vertices: Float32Array;

  constructor() {
    super();
    this.vertices = new Float32Array(this.pointsAmount * 3);
  }


  start(gl: WebGL2RenderingContext) {
    this.loadModel(gl).then(() => {this.ready = true})
  }

  async draw(gl: WebGL2RenderingContext) {
    if (!this.ready || !this.sphereMesh) {
      return;
    }

    this.program = await ShaderManager.load(gl, 'test', 'test');
    Engine.get().program = this.program;

    gl.uniformMatrix4fv(
        gl.getUniformLocation(this.program, 'uModel'), false,
        this.worldMatrix.mat);
    gl.bindVertexArray(this.sphereMesh.vao);
    gl.drawElements(
        gl.TRIANGLES, this.sphereMesh.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  async loadModel(gl: WebGL2RenderingContext) {
    this.program =
        await ShaderManager.load(gl, 'fibSphere', 'lathe', (program) => {
          gl.transformFeedbackVaryings(
              program, ['vOutPos', 'vOutNormal'], gl.SEPARATE_ATTRIBS);
        });
    const slices = this.pointsAmount;

    this.sphereMesh = this.createLathedMesh(gl, this.program, slices);
  }


  private generateCircleProfile(radius: number, segments: number) {
    const positions: number[] = [];
    const normals: number[] = [];
    const vs: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const theta = Math.PI * (i / segments);

      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      const z = 0;

      positions.push(x, y, z);

      normals.push(x / radius, y / radius, 0);

      vs.push(i / segments);
    }

    return {
      pos: new Float32Array(positions),
      norm: new Float32Array(normals),
      v: new Float32Array(vs)
    };
  }

  private createLathedMesh(
      gl: WebGL2RenderingContext, program: WebGLProgram,
      slices: number): SphereMesh {
    const totalVertices = slices;

    const stride = 3 * 4;
    const posBuffer = gl.createBuffer();
    const normBuffer = gl.createBuffer();

    const computeVAO = gl.createVertexArray();

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, totalVertices * stride, gl.STATIC_READ);

    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, totalVertices * stride, gl.STATIC_READ);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(computeVAO);
    const tf = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posBuffer);  // vOutPos
    gl.bindBufferBase(
        gl.TRANSFORM_FEEDBACK_BUFFER, 1, normBuffer);  // vOutNormal

    gl.useProgram(program);

    const phi = (1.0 + Math.sqrt(5)) / 2.0;
    gl.uniform1i(gl.getUniformLocation(program, 'uResolution'), slices);
    gl.uniform1f(gl.getUniformLocation(program, 'uRadius'), this.radius);
    gl.uniform1f(gl.getUniformLocation(program, 'uPhi'), phi);


    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, slices);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.deleteTransformFeedback(tf);

    // Setting up VAO
    const renderVAO = gl.createVertexArray();
    gl.bindVertexArray(renderVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.COPY_READ_BUFFER, posBuffer);
    gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, this.vertices);
    gl.bindBuffer(gl.COPY_READ_BUFFER, null);

    console.log('vertices: ', this.vertices)

    // const indices = this.createMeshIndices(this.vertices);
    const indices = this.generateTopology();

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    downloadOBJ(this.vertices, indices, 'fibonacci_sphere.obj');

    return new SphereMesh(renderVAO, indices);
  }

  private generateTopology(): Uint16Array {
    if (!this.vertices) throw Error('Vertices == null');
    // 1. Identify the "South Pole" candidate
    // For Fibonacci lattice, the last point is naturally the lowest.
    const poleIndex = this.pointsAmount - 1;

    // 2. Rotate the sphere so 'poleIndex' is EXACTLY at (0, -R, 0)
    // We store the inverse rotation to put them back later.
    const undoRotation = this.alignSphereToPole(poleIndex);

    // 3. Project ALL points EXCEPT the poleIndex
    // The poleIndex point is now mathematically at "Infinity" in stereographic
    // projection.
    const coords = new Float32Array((this.pointsAmount - 1) * 2);

    // Map from "Projected Index" -> "Original Vertex Index"
    const projectedToOriginalId = new Int32Array(this.pointsAmount - 1);

    let p = 0;
    for (let i = 0; i < this.pointsAmount; i++) {
      if (i === poleIndex) continue;  // Skip the pole

      const x = this.vertices[i * 3 + 0];
      const y = this.vertices[i * 3 + 1];
      const z = this.vertices[i * 3 + 2];

      const ny = y / this.radius;

      // Handle precision issues if point is exactly at North Pole (unlikely in
      // Fib)
      const safeDenom = (1.0 + ny) < 1e-6 ? 1e-6 : (1.0 + ny);

      coords[p * 2 + 0] = x / safeDenom;
      coords[p * 2 + 1] = z / safeDenom;

      projectedToOriginalId[p] = i;
      p++;
    }

    // 4. Run Delaunay on the N-1 points
    // Use your SimpleDelaunay or Delaunator library
    const delaunay = new SimpleDelaunay(coords);

    // 5. Build Indices
    // We will combine the Delaunay triangles + The "Fan" triangles for the hole
    const indices: number[] = [];

    // A. Add standard Delaunay triangles
    for (let i = 0; i < delaunay.triangles.length; i++) {
      const projectedId = delaunay.triangles[i];
      indices.push(projectedToOriginalId[projectedId]);
    }

    // B. Stitch the Hole (The Convex Hull) to the South Pole Point
    const hull = delaunay.hull;  // Array of indices on the boundary
    for (let i = 0; i < hull.length; i++) {
      // Create a triangle: HullVertex -> NextHullVertex -> PoleVertex
      const p1 = projectedToOriginalId[hull[i]];
      const p2 =
          projectedToOriginalId[hull[(i + 1) % hull.length]];  // Wrap around

      // Winding order matters here. If your mesh looks inside-out, swap p1/p2
      indices.push(p1, p2, poleIndex);
    }

    this.applyRotation(undoRotation);
    return new Uint16Array(indices);
  }

  // Rotates all vertices so vertices[idx] points to (0, -radius, 0)
  // Returns the Quaternion/Matrix to undo the rotation
  private alignSphereToPole(idx: number): Float32Array {
    // 1. Get current normalized direction of the target point
    const i3 = idx * 3;
    let ux = this.vertices[i3 + 0];
    let uy = this.vertices[i3 + 1];
    let uz = this.vertices[i3 + 2];

    // Normalize (u)
    const len = Math.sqrt(ux * ux + uy * uy + uz * uz);
    ux /= len;
    uy /= len;
    uz /= len;

    // Target direction (v) is South Pole: (0, -1, 0)
    // Dot product (cosine of angle): u . v
    // dot = ux*0 + uy*-1 + uz*0 = -uy
    const dot = -uy;

    // 2. Prepare the Rotation Matrix
    // We use a Float32Array for the 4x4 matrix (Column-Major order for WebGL
    // compatibility)
    const mat =
        new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    // Check edge cases to avoid division by zero
    if (dot > 0.99999) {
      // Already at South Pole. No rotation needed.
      // Return Identity matrix.
      return mat;
    } else if (dot < -0.99999) {
      // Point is at North Pole (opposite). Rotate 180 degrees around X-axis.
      // Cos(180) = -1, Sin(180) = 0
      // Matrix:
      // 1  0  0
      // 0 -1  0
      // 0  0 -1
      mat[5] = -1;
      mat[10] = -1;
    } else {
      // Standard Case: Calculate Axis-Angle Rotation
      // Axis = Cross Product (u x v)
      // v is (0, -1, 0), so cross product simplifies:
      // x = uy*0 - uz*-1 = uz
      // y = uz*0 - ux*0  = 0
      // z = ux*-1 - uy*0 = -ux
      let ax = uz;
      let ay = 0;
      let az = -ux;

      // Normalize Axis
      const axisLen = Math.sqrt(ax * ax + ay * ay + az * az);
      ax /= axisLen;
      // ay is 0, so no need to divide
      az /= axisLen;

      // Build Matrix from Axis (x,y,z) and Angle (acos(dot))
      // Math shortcuts: c = cos(theta) = dot, s = sin(theta) = sqrt(1 - dot^2)
      const c = dot;
      const s = Math.sqrt(1 - c * c);
      const t = 1 - c;

      // Rotation Matrix Formula (Rodrigues)
      // [ t*x*x + c,   t*x*y - s*z, t*x*z + s*y ]
      // [ t*x*y + s*z, t*y*y + c,   t*y*z - s*x ]
      // [ t*x*z - s*y, t*y*z + s*x, t*z*z + c   ]
      // Note: ay is 0, which simplifies terms significantly

      // Col 0
      mat[0] = t * ax * ax + c;
      mat[1] = s * az;       // t*x*y + s*z -> 0 + s*z
      mat[2] = t * ax * az;  // t*x*z - s*y -> t*x*z - 0

      // Col 1
      mat[4] = -s * az;  // t*x*y - s*z -> 0 - s*z
      mat[5] = c;        // t*y*y + c   -> 0 + c
      mat[6] = s * ax;   // t*y*z + s*x -> 0 + s*x

      // Col 2
      mat[8] = t * ax * az;  // t*x*z + s*y -> t*x*z + 0
      mat[9] = -s * ax;      // t*y*z - s*x -> 0 - s*x
      mat[10] = t * az * az + c;
    }

    // 3. Apply Rotation to ALL vertices
    // We perform the matrix multiplication manually: v' = M * v
    for (let i = 0; i < this.vertices.length; i += 3) {
      const x = this.vertices[i];
      const y = this.vertices[i + 1];
      const z = this.vertices[i + 2];

      // x' = m0*x + m4*y + m8*z + m12(0)
      this.vertices[i] = mat[0] * x + mat[4] * y + mat[8] * z;
      this.vertices[i + 1] = mat[1] * x + mat[5] * y + mat[9] * z;
      this.vertices[i + 2] = mat[2] * x + mat[6] * y + mat[10] * z;
    }

    // 4. Compute Inverse (Transpose) for undoing
    // Since it is a pure rotation matrix, the Inverse is simply the Transpose.
    // We swap (1,4), (2,8), (6,9)
    const tmp1 = mat[1];
    mat[1] = mat[4];
    mat[4] = tmp1;
    const tmp2 = mat[2];
    mat[2] = mat[8];
    mat[8] = tmp2;
    const tmp6 = mat[6];
    mat[6] = mat[9];
    mat[9] = tmp6;

    return mat;
  }

  private applyRotation(mat: Float32Array) {
    // Manually multiply every vertex by the 4x4 matrix
    for (let i = 0; i < this.vertices.length; i += 3) {
      const x = this.vertices[i];
      const y = this.vertices[i + 1];
      const z = this.vertices[i + 2];

      // Matrix mul: v' = M * v
      // Note: Indices 12, 13, 14 are translation (usually 0 for rotation
      // matrices, but included here for full 4x4 correctness)
      this.vertices[i] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
      this.vertices[i + 1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
      this.vertices[i + 2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
    }
  }

  createMeshIndices(vertices: Float32Array): Uint16Array {
    const coords = new Float32Array(this.pointsAmount * 2);

    for (let i = 0; i < this.pointsAmount; i++) {
      // Read vector from flat array
      const x = vertices[i * 3 + 0];
      const y = vertices[i * 3 + 1];
      const z = vertices[i * 3 + 2];

      // Normalize (divide by radius)
      const nx = x / this.radius;
      const ny = y / this.radius;
      const nz = z / this.radius;

      // Singularity Avoidance (Stereographic Projection logic)
      // Note: In JS Math.cos is native, no Mathf
      const angle = -0.1;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const yRot = ny * cosA - nz * sinA;
      const zRot = ny * sinA + nz * cosA;

      const denominator = 1 - yRot;
      const u = nx / denominator;
      const v = zRot / denominator;

      coords[i * 2 + 0] = u;
      coords[i * 2 + 1] = v;
    }

    const delaunay = new SimpleDelaunay(coords);

    const indices = delaunay.triangles;

    return new Uint16Array(indices);
  }
}

function downloadOBJ(
    vertices: Float32Array, indices: Uint16Array|null, filename = 'mesh.obj') {
  // 1. Use an array buffer to build string (faster than string concatenation)
  const lines = [];
  lines.push('# Exported from WebGL');
  lines.push('o Mesh');

  // 2. Write Vertices (v x y z)
  // Note: OBJ usually expects Y-up. If your world is Z-up, swap Y and Z here.
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    lines.push(`v ${x} ${y} ${z}`);
  }

  // 3. Write Faces (f v1 v2 v3)
  // CRITICAL: OBJ indices are 1-based, WebGL is 0-based. We must add +1.
  if (indices && indices.length > 0) {
    // Standard Indexed Mesh
    for (let i = 0; i < indices.length; i += 3) {
      const v1 = indices[i] + 1;
      const v2 = indices[i + 1] + 1;
      const v3 = indices[i + 2] + 1;
      lines.push(`f ${v1} ${v2} ${v3}`);
    }
  } else {
    // Non-Indexed / Exploded Mesh (Polymode)
    // We assume every 3 vertices form a triangle
    const numVerts = vertices.length / 3;
    for (let i = 0; i < numVerts; i += 3) {
      const v1 = (i + 0) + 1;
      const v2 = (i + 1) + 1;
      const v3 = (i + 2) + 1;
      lines.push(`f ${v1} ${v2} ${v3}`);
    }
  }

  // 4. Create Blob and Trigger Download
  const objContent = lines.join('\n');
  const blob = new Blob([objContent], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}./src/engine/Scene.ts
import {Camera} from './objects/Camera.js';
import {GameObject} from './objects/GameObject.js';

export class Scene extends GameObject {
  currCamera: Camera|null = null;

  constructor() {
    super();

    this.dirty = false;
  }
}./src/engine/ShaderManager.ts
export class ShaderManager {
  static programs = new Map<string, WebGLProgram>();

  static async load(
      gl: WebGL2RenderingContext, vertex: string = 'default',
      fragment: string = 'default',
      beforeLink?: (program: WebGLProgram) => void): Promise<WebGLProgram> {
    const name = `${vertex}/${fragment}`;
    const cache = this.programs.get(name);
    if (cache) {
      return cache;
    }

    const [vertSource, fragSource] = await Promise.all([
      loadShaderSource(`./assets/shaders/${vertex}.vert`),
      loadShaderSource(`./assets/shaders/${fragment}.frag`)
    ]);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSource);

    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragShader);

    if (beforeLink) beforeLink(program);

    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      throw Error(`Link failed:\n${gl.getProgramInfoLog(program)}`);
    }

    this.programs.set(name, program);
    return program;
  }
}

async function loadShaderSource(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
        `Failed to load shader from ${url}: ${response.statusText}`);
  }
  return await response.text();
}

export function createShader(
    gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  let shader = gl.createShader(type);

  if (shader) {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (!success) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw Error(`Error compilation: ${info}`);
    }
  } else {
    throw Error(`Error shader creation`);
  }

  return shader;
}./src/geometry/delaunay.ts
export class SimpleDelaunay {
  public triangles: Uint32Array;
  public halfedges: Int32Array;
  public hull: Uint32Array;

  // Internal use
  private coords: Float32Array;

  constructor(coords: Float32Array) {
    this.coords = coords;
    const n = coords.length / 2;

    // 1. Initial Triangulation (Bowyer-Watson)
    // Returns a flat array of indices [a, b, c, a, b, c...]
    const rawTriangles = this.bowyerWatson(n);

    this.triangles = new Uint32Array(rawTriangles);

    // 2. Generate Half-edges (Adjacency Graph)
    // Required for Voronoi generation
    this.halfedges = new Int32Array(this.triangles.length).fill(-1);
    this.computeHalfEdges();

    // 3. Generate Hull (Boundary)
    this.hull = this.computeHull();
  }

  private bowyerWatson(n: number): number[] {
    // Find Bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < n; i++) {
      const x = this.coords[2 * i];
      const y = this.coords[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    const dx = maxX - minX;
    const dy = maxY - minY;
    const deltaMax = Math.max(dx, dy);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Create Super-Triangle (must be large enough to contain all points)
    // We use indices n, n+1, n+2 for these temporary vertices
    const p1 = n;
    const p2 = n + 1;
    const p3 = n + 2;

    // Add super-triangle vertices to coords (conceptually)
    // In practice we handle them by ID check, but for calculations we need
    // values
    const superCoords = [
      midX - 20 * deltaMax, midY - deltaMax,  // p1
      midX, midY + 20 * deltaMax,             // p2
      midX + 20 * deltaMax, midY - deltaMax   // p3
    ];

    let triangles: number[] = [p1, p2, p3];

    // Helper to get coordinates
    const getX = (i: number) =>
        i < n ? this.coords[2 * i] : superCoords[(i - n) * 2];
    const getY = (i: number) =>
        i < n ? this.coords[2 * i + 1] : superCoords[(i - n) * 2 + 1];

    // Iterate points
    for (let i = 0; i < n; i++) {
      const px = this.coords[2 * i];
      const py = this.coords[2 * i + 1];

      const badTriangles: number[] =
          [];  // Indices in 'triangles' array (0, 3, 6...)

      // Find bad triangles (circumcircle contains point)
      for (let t = 0; t < triangles.length; t += 3) {
        const a = triangles[t];
        const b = triangles[t + 1];
        const c = triangles[t + 2];

        if (this.inCircumcircle(
                px, py, getX(a), getY(a), getX(b), getY(b), getX(c), getY(c))) {
          badTriangles.push(t);
        }
      }

      // Find boundary of polygon hole
      const polygon: {a: number, b: number}[] = [];
      for (const tIdx of badTriangles) {
        const tri = [triangles[tIdx], triangles[tIdx + 1], triangles[tIdx + 2]];
        for (let j = 0; j < 3; j++) {
          const edgeA = tri[j];
          const edgeB = tri[(j + 1) % 3];

          // Check if this edge is shared with another bad triangle
          let shared = false;
          for (const otherTIdx of badTriangles) {
            if (tIdx === otherTIdx) continue;
            const otherTri = [
              triangles[otherTIdx], triangles[otherTIdx + 1],
              triangles[otherTIdx + 2]
            ];
            // Does otherTri have edgeB -> edgeA?
            if (otherTri.includes(edgeA) && otherTri.includes(edgeB)) {
              shared = true;
              break;
            }
          }
          if (!shared) {
            polygon.push({a: edgeA, b: edgeB});
          }
        }
      }

      // Remove bad triangles (filter them out)
      // We rebuild the array for simplicity (performance cost O(N^2))
      const newTriangles: number[] = [];
      for (let t = 0; t < triangles.length; t += 3) {
        let isBad = false;
        for (const bad of badTriangles) {
          if (t === bad) {
            isBad = true;
            break;
          }
        }
        if (!isBad) {
          newTriangles.push(triangles[t], triangles[t + 1], triangles[t + 2]);
        }
      }
      triangles = newTriangles;

      // Re-triangulate hole
      for (const edge of polygon) {
        triangles.push(edge.a, edge.b, i);
      }
    }

    // Cleanup: Remove triangles connected to super-triangle
    const finalTriangles: number[] = [];
    for (let t = 0; t < triangles.length; t += 3) {
      const a = triangles[t];
      const b = triangles[t + 1];
      const c = triangles[t + 2];
      if (a < n && b < n && c < n) {
        finalTriangles.push(a, b, c);
      }
    }

    return finalTriangles;
  }

  private inCircumcircle(
      px: number, py: number, ax: number, ay: number, bx: number, by: number,
      cx: number, cy: number): boolean {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux =
        ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) +
         (cx * cx + cy * cy) * (ay - by)) /
        d;
    const uy =
        ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) +
         (cx * cx + cy * cy) * (bx - ax)) /
        d;
    const rSq = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
    const dSq = (px - ux) * (px - ux) + (py - uy) * (py - uy);
    return dSq < rSq;  // epsilon checks omitted for brevity
  }

  private computeHalfEdges() {
    // Map "small_large" index key to edge ID
    const edgeMap = new Map<string, number>();

    for (let i = 0; i < this.triangles.length; i++) {
      const start = this.triangles[i];
      const end = this.triangles[i % 3 === 2 ? i - 2 : i + 1];

      // Generate stable key (min_max)
      const key = start < end ? `${start}_${end}` : `${end}_${start}`;

      if (edgeMap.has(key)) {
        const otherEdge = edgeMap.get(key)!;
        this.halfedges[i] = otherEdge;
        this.halfedges[otherEdge] = i;
      } else {
        edgeMap.set(key, i);
      }
    }
  }

  private computeHull(): Uint32Array {
    const hull: number[] = [];
    // Find *any* boundary edge (halfedge == -1)
    let startEdge = -1;
    for (let i = 0; i < this.halfedges.length; i++) {
      if (this.halfedges[i] === -1) {
        startEdge = i;
        break;
      }
    }

    if (startEdge === -1)
      return new Uint32Array(0);  // Should not happen on open mesh

    // Walk the boundary
    let e = startEdge;
    do {
      hull.push(this.triangles[e]);
      // Logic to find next boundary edge:
      // The edge e goes A -> B. We want the edge starting at B that is also on
      // boundary. In a triangle [A, B, C], edge e is A->B. Next in tri is B->C.
      // We check B->C. If internal, cross opposite, continue.

      // Standard approach for convex hull walk on Delaunay:
      // Just find the edge starting with 'triangles[next(e)]' that has -1
      const tip = this.triangles[e % 3 === 2 ? e - 2 : e + 1];

      // Brute force search for next boundary edge starting at 'tip'
      // (Optimization possible but slow map needed)
      let foundNext = false;
      for (let k = 0; k < this.halfedges.length; k++) {
        if (this.halfedges[k] === -1 && this.triangles[k] === tip) {
          e = k;
          foundNext = true;
          break;
        }
      }
      if (!foundNext) break;  // Mesh topology error or finished
    } while (e !== startEdge && hull.length < this.triangles.length);

    return new Uint32Array(hull);
  }
}