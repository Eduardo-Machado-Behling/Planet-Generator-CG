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
      axis.vec[0] * s,
      axis.vec[1] * s,
      axis.vec[2] * s,
      Math.cos(halfAngle),
    );
  }

  static Multiply(q0: Quaternion, q1: Quaternion): Quaternion {
    return new Quaternion(
      q0.w * q1.x + q0.x * q1.w + q0.y * q1.z - q0.z * q1.y,
      q0.w * q1.y - q0.x * q1.z + q0.y * q1.w + q0.z * q1.x,
      q0.w * q1.z + q0.x * q1.y - q0.y * q1.x + q0.z * q1.w,
      q0.w * q1.w - q0.x * q1.x - q0.y * q1.y - q0.z * q1.z,
    );
  }

  static FromToRotation(from: Vector, to: Vector): Quaternion {
    const dot = from.dot(to);

    if (dot > 0.999999) return new Quaternion();
    if (dot < -0.999999) {
      let axis = Vector.cross(Vector.right, from);
      if (axis.length() < 0.000001) axis = Vector.cross(Vector.up, from);
      return Quaternion.FromAxisAngle(axis.normalize(), Math.PI);
    }

    const axis = Vector.cross(from, to).normalize();
    const angle = Math.acos(dot);

    return Quaternion.FromAxisAngle(axis, angle);
  }

  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let ax = a.x,
      ay = a.y,
      az = a.z,
      aw = a.w;
    let bx = b.x,
      by = b.y,
      bz = b.z,
      bw = b.w;

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
        ax + (bx - ax) * t,
        ay + (by - ay) * t,
        az + (bz - az) * t,
        aw + (bw - aw) * t,
      ).normalize();
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion(
      ax * ratioA + bx * ratioB,
      ay * ratioA + by * ratioB,
      az * ratioA + bz * ratioB,
      aw * ratioA + bw * ratioB,
    );
  }

  normalize(): Quaternion {
    let len = Math.sqrt(
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w,
    );
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

  noise(min: number, max: number) {
    for (let i = 0; i < this.dim; i++) {
      const r = Math.random() * (max - min) + min;
      this.data[i] += r;
    }
    return this;
  }

  static Vec(vals: number[]): Vector {
    let vec = new Vector(vals.length);
    vec.data.set(vals);
    return vec;
  }

  static Vec3(v: { x: number; y: number; z: number }) {
    return this.Vec([v.x, v.y, v.z]);
  }

  dot(b: Vector): number {
    if (this.dim !== b.dim)
      throw new Error("Dimension mismatch in dot product");
    let sum = 0;
    for (let i = 0; i < this.dim; i++) {
      sum += this.data[i] * b.data[i];
    }
    return sum;
  }

  static cross(a: Vector, b: Vector): Vector {
    if (a.dim !== 3 || b.dim !== 3)
      throw new Error("Cross product requires 3D vectors");

    const ax = a.data[0],
      ay = a.data[1],
      az = a.data[2];
    const bx = b.data[0],
      by = b.data[1],
      bz = b.data[2];

    return Vector.Vec([
      ay * bz - az * by,
      az * bx - ax * bz,
      ax * by - ay * bx,
    ]);
  }

  cross(b: Vector): Vector {
    return Vector.cross(this, b);
  }

  magSqr() {
    let sum = 0;
    for (let idx = 0; idx < this.dim; idx++) {
      sum += this.data[idx] * this.data[idx];
    }
    return sum;
  }

  mag() {
    return Math.sqrt(this.magSqr());
  }

  length() {
    return this.mag();
  }

  normalize() {
    const mag = this.mag();
    if (mag === 0) return this;
    for (let idx = 0; idx < this.dim; idx++) {
      this.data[idx] /= mag;
    }
    return this;
  }

  normalized() {
    let vec = new Vector(this.dim);
    const mag = this.mag();
    if (mag === 0) return vec;
    for (let idx = 0; idx < this.dim; idx++) {
      vec.data[idx] = this.data[idx] / mag;
    }
    return vec;
  }

  fill(value: number): Vector {
    for (let idx = 0; idx < this.dim; idx++) {
      this.data[idx] = value;
    }
    return this;
  }

  toVec3(): { x: number; y: number; z: number } {
    return { x: this.data[0], y: this.data[1], z: this.data[2] };
  }

  minus(b: Vector) {
    for (let i = 0; i < this.dim; i++) {
      this.data[i] -= b.data[i];
    }
    return this;
  }

  sub(b: Vector): Vector {
    const res = new Vector(this.dim);
    for (let i = 0; i < this.dim; i++) {
      res.data[i] = this.data[i] - b.data[i];
    }
    return res;
  }

  add(b: Vector): Vector {
    for (let i = 0; i < this.dim; i++) {
      this.data[i] += b.data[i];
    }
    return this;
  }

  scale(scalar: number): Vector {
    for (let i = 0; i < this.dim; i++) {
      this.data[i] *= scalar;
    }
    return this;
  }

  static distance(a: Vector, b: Vector): number {
    const dx = a.data[0] - b.data[0];
    const dy = a.data[1] - b.data[1];
    const dz = a.data[2] - b.data[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  static distanceSquared(a: Vector, b: Vector): number {
    const dx = a.data[0] - b.data[0];
    const dy = a.data[1] - b.data[1];
    const dz = a.data[2] - b.data[2];
    return dx * dx + dy * dy + dz * dz;
  }
}

export class SquaredMatrix {
  private data: Float32Array;
  private size: number;
  private rows: number;

  get mat(): Float32Array {
    return this.data;
  }

  set mat(data) {
    this.data = data;
  }

  constructor(rows: number) {
    this.rows = rows;
    this.size = rows * rows;
    this.data = new Float32Array(this.size);
  }

  multiplyVector(v: Vector): Vector {
    const x = v.vec[0];
    const y = v.vec[1];
    const z = v.vec[2];
    const w = 1.0;

    const d = this.data;

    const resX = d[0] * x + d[4] * y + d[8] * z + d[12] * w;
    const resY = d[1] * x + d[5] * y + d[9] * z + d[13] * w;
    const resZ = d[2] * x + d[6] * y + d[10] * z + d[14] * w;

    return Vector.Vec([resX, resY, resZ]);
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
    fovRad: number,
    aspect: number,
    near: number,
    far: number,
  ): SquaredMatrix {
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

    const x = q.x,
      y = q.y,
      z = q.z,
      w = q.w;
    const x2 = x + x,
      y2 = y + y,
      z2 = z + z;
    const xx = x * x2,
      xy = x * y2,
      xz = x * z2;
    const yy = y * y2,
      yz = y * z2,
      zz = z * z2;
    const wx = w * x2,
      wy = w * y2,
      wz = w * z2;

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

    const right = { x: r.mat[0], y: r.mat[1], z: r.mat[2] };
    const up = { x: r.mat[4], y: r.mat[5], z: r.mat[6] };
    const fwd = { x: r.mat[8], y: r.mat[9], z: r.mat[10] };

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

    const px = pos.vec[0],
      py = pos.vec[1],
      pz = pos.vec[2];

    result.data[12] = -(right.x * px + right.y * py + right.z * pz);
    result.data[13] = -(up.x * px + up.y * py + up.z * pz);
    result.data[14] = -(fwd.x * px + fwd.y * py + fwd.z * pz);
    result.data[15] = 1;

    return result;
  }

  static MakeLookAt(eye: Vector, target: Vector, up: Vector): SquaredMatrix {
    let zx = eye.vec[0] - target.vec[0];
    let zy = eye.vec[1] - target.vec[1];
    let zz = eye.vec[2] - target.vec[2];

    let len = zx * zx + zy * zy + zz * zz;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      zx *= len;
      zy *= len;
      zz *= len;
    }

    let xx = up.vec[1] * zz - up.vec[2] * zy;
    let xy = up.vec[2] * zx - up.vec[0] * zz;
    let xz = up.vec[0] * zy - up.vec[1] * zx;

    len = xx * xx + xy * xy + xz * xz;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      xx *= len;
      xy *= len;
      xz *= len;
    }

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    const m = new SquaredMatrix(4);
    const out = m.mat;

    out[0] = xx;
    out[4] = xy;
    out[8] = xz;
    out[12] = -(xx * eye.vec[0] + xy * eye.vec[1] + xz * eye.vec[2]);

    out[1] = yx;
    out[5] = yy;
    out[9] = yz;
    out[13] = -(yx * eye.vec[0] + yy * eye.vec[1] + yz * eye.vec[2]);

    out[2] = zx;
    out[6] = zy;
    out[10] = zz;
    out[14] = -(zx * eye.vec[0] + zy * eye.vec[1] + zz * eye.vec[2]);

    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;

    return m;
  }

  transpose(): SquaredMatrix {
    const n = this.rows;
    const temp = new Float32Array(this.size);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        temp[c * n + r] = this.data[r * n + c];
      }
    }

    this.data.set(temp);
    return this;
  }

  invert(): SquaredMatrix {
    if (this.rows !== 4) {
      throw Error("Only 4x4 matrix inversion is supported");
    }

    const m = this.data;
    const inv = new Float32Array(16);

    inv[0] =
      m[5] * m[10] * m[15] -
      m[5] * m[11] * m[14] -
      m[9] * m[6] * m[15] +
      m[9] * m[7] * m[14] +
      m[13] * m[6] * m[11] -
      m[13] * m[7] * m[10];

    inv[4] =
      -m[4] * m[10] * m[15] +
      m[4] * m[11] * m[14] +
      m[8] * m[6] * m[15] -
      m[8] * m[7] * m[14] -
      m[12] * m[6] * m[11] +
      m[12] * m[7] * m[10];

    inv[8] =
      m[4] * m[9] * m[15] -
      m[4] * m[11] * m[13] -
      m[8] * m[5] * m[15] +
      m[8] * m[7] * m[13] +
      m[12] * m[5] * m[11] -
      m[12] * m[7] * m[9];

    inv[12] =
      -m[4] * m[9] * m[14] +
      m[4] * m[10] * m[13] +
      m[8] * m[5] * m[14] -
      m[8] * m[6] * m[13] -
      m[12] * m[5] * m[10] +
      m[12] * m[6] * m[9];

    inv[1] =
      -m[1] * m[10] * m[15] +
      m[1] * m[11] * m[14] +
      m[9] * m[2] * m[15] -
      m[9] * m[3] * m[14] -
      m[13] * m[2] * m[11] +
      m[13] * m[3] * m[10];

    inv[5] =
      m[0] * m[10] * m[15] -
      m[0] * m[11] * m[14] -
      m[8] * m[2] * m[15] +
      m[8] * m[3] * m[14] +
      m[12] * m[2] * m[11] -
      m[12] * m[3] * m[10];

    inv[9] =
      -m[0] * m[9] * m[15] +
      m[0] * m[11] * m[13] +
      m[8] * m[1] * m[15] -
      m[8] * m[3] * m[13] -
      m[12] * m[1] * m[11] +
      m[12] * m[3] * m[9];

    inv[13] =
      m[0] * m[9] * m[14] -
      m[0] * m[10] * m[13] -
      m[8] * m[1] * m[14] +
      m[8] * m[2] * m[13] +
      m[12] * m[1] * m[10] -
      m[12] * m[2] * m[9];

    inv[2] =
      m[1] * m[6] * m[15] -
      m[1] * m[7] * m[14] -
      m[5] * m[2] * m[15] +
      m[5] * m[3] * m[14] +
      m[13] * m[2] * m[7] -
      m[13] * m[3] * m[6];

    inv[6] =
      -m[0] * m[6] * m[15] +
      m[0] * m[7] * m[14] +
      m[4] * m[2] * m[15] -
      m[4] * m[3] * m[14] -
      m[12] * m[2] * m[7] +
      m[12] * m[3] * m[6];

    inv[10] =
      m[0] * m[5] * m[15] -
      m[0] * m[7] * m[13] -
      m[4] * m[1] * m[15] +
      m[4] * m[3] * m[13] +
      m[12] * m[1] * m[7] -
      m[12] * m[3] * m[5];

    inv[14] =
      -m[0] * m[5] * m[14] +
      m[0] * m[6] * m[13] +
      m[4] * m[1] * m[14] -
      m[4] * m[2] * m[13] -
      m[12] * m[1] * m[6] +
      m[12] * m[2] * m[5];

    inv[3] =
      -m[1] * m[6] * m[11] +
      m[1] * m[7] * m[10] +
      m[5] * m[2] * m[11] -
      m[5] * m[3] * m[10] -
      m[9] * m[2] * m[7] +
      m[9] * m[3] * m[6];

    inv[7] =
      m[0] * m[6] * m[11] -
      m[0] * m[7] * m[10] -
      m[4] * m[2] * m[11] +
      m[4] * m[3] * m[10] +
      m[8] * m[2] * m[7] -
      m[8] * m[3] * m[6];

    inv[11] =
      -m[0] * m[5] * m[11] +
      m[0] * m[7] * m[9] +
      m[4] * m[1] * m[11] -
      m[4] * m[3] * m[9] -
      m[8] * m[1] * m[7] +
      m[8] * m[3] * m[5];

    inv[15] =
      m[0] * m[5] * m[10] -
      m[0] * m[6] * m[9] -
      m[4] * m[1] * m[10] +
      m[4] * m[2] * m[9] +
      m[8] * m[1] * m[6] -
      m[8] * m[2] * m[5];

    let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    if (det === 0) {
      throw Error("Matrix not invertible");
    }

    det = 1.0 / det;
    for (let i = 0; i < 16; i++) inv[i] *= det;

    this.data.set(inv);
    return this;
  }

  static makeNormalMatrix(model: SquaredMatrix): Float32Array {
    const invModel = new SquaredMatrix(4);
    invModel.mat.set(model.mat);

    invModel.invert().transpose();

    return new Float32Array([
      invModel.mat[0],
      invModel.mat[1],
      invModel.mat[2],
      invModel.mat[4],
      invModel.mat[5],
      invModel.mat[6],
      invModel.mat[8],
      invModel.mat[9],
      invModel.mat[10],
    ]);
  }

  static MakeOrtho(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
  ): SquaredMatrix {
    const m = new SquaredMatrix(4);
    const out = m.mat;

    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;

    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;

    return m;
  }
}
