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

  // will be equivalent to b * this;
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
}