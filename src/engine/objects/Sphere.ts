import { ConfigManager } from "../../ui/ConfigManager.js";
import { HextoVec3 } from "../../ui/Elements/VisualColor.js";
import { Engine } from "../Engine.js";
import { ShaderManager } from "../ShaderManager.js";

import { GameObject } from "./GameObject.js";

class SphereMesh {
  vao: WebGLVertexArrayObject;
  outBuffer: WebGLBuffer;
  indices: Uint16Array;

  constructor(
    vao: WebGLVertexArrayObject,
    outBuffer: WebGLBuffer,
    indices: Uint16Array,
  ) {
    this.vao = vao;

    this.outBuffer = outBuffer;
    this.indices = indices;
  }
}

export class Sphere extends GameObject {
  radius: number = 1.0;
  rimResolution: number = 50;
  latheResolution: number = 30;

  program: WebGLProgram | null = null;
  sphereMesh: SphereMesh | null = null;
  ready: boolean = false;

  start(gl: WebGL2RenderingContext) {
    this.loadModel(gl).then(() => {
      this.ready = true;
    });
  }

  async lightPass(gl: WebGL2RenderingContext, program: WebGLProgram) {
    super.lightPass(gl, program);
  }

  async draw(gl: WebGL2RenderingContext) {
    if (!this.ready || !this.sphereMesh) {
      return;
    }

    this.program = await ShaderManager.load(gl, "mesh");
    const state = ConfigManager.get().getSystemState();
    Engine.get().program = this.program;

    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "uModel"),
      false,
      this.worldMatrix.mat,
    );
    gl.uniform3fv(
      gl.getUniformLocation(this.program, "uColor"),
      HextoVec3(state.global.sunColor.value),
    );

    gl.bindVertexArray(this.sphereMesh.vao);
    gl.drawElements(
      gl.TRIANGLES,
      this.sphereMesh.indices.length,
      gl.UNSIGNED_SHORT,
      0,
    );
  }

  async loadModel(gl: WebGL2RenderingContext) {
    this.program = await ShaderManager.load(gl, "lathe", "lathe", (program) => {
      gl.transformFeedbackVaryings(
        program,
        ["vOutPos", "vOutNormal", "vOutUV"],
        gl.INTERLEAVED_ATTRIBS,
      );
    });
    const circleData = this.generateCircleProfile(
      this.radius,
      this.rimResolution,
    );

    const slices = this.latheResolution;

    this.sphereMesh = this.createLathedMesh(
      gl,
      this.program,
      circleData.pos,
      circleData.norm,
      circleData.v,
      slices,
    );
  }

  private createLatheIndices(
    slices: number,
    pointsPerSlice: number,
  ): Uint16Array {
    const indices: number[] = [];

    for (let s = 1; s <= slices; s++) {
      for (let p = 0; p < pointsPerSlice - 1; p++) {
        const currentSlice = s - 1;
        const nextSlice = s;

        const p0 = currentSlice * pointsPerSlice + p;
        const p1 = nextSlice * pointsPerSlice + p;
        const p2 = currentSlice * pointsPerSlice + (p + 1);
        const p3 = nextSlice * pointsPerSlice + (p + 1);

        indices.push(p0, p1, p2);

        indices.push(p2, p1, p3);
      }
    }
    return new Uint16Array(indices);
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
      v: new Float32Array(vs),
    };
  }

  private createLathedMesh(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    circlePos: Float32Array,
    circleNormals: Float32Array,
    circleVs: Float32Array,
    slices: number,
  ): SphereMesh {
    const pointsInCircle = circlePos.length / 3;
    const totalVertices = pointsInCircle * (slices + 1);

    const stride = (3 + 3 + 2) * 4;
    const outputBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, totalVertices * stride, gl.STATIC_DRAW);

    const posBuffer = createBuffer(gl, circlePos);
    const normBuffer = createBuffer(gl, circleNormals);
    const vBuffer = createBuffer(gl, circleVs);

    const computeVAO = gl.createVertexArray();
    gl.bindVertexArray(computeVAO);
    bindAttrib(gl, 0, posBuffer, 3);
    bindAttrib(gl, 1, normBuffer, 3);
    bindAttrib(gl, 2, vBuffer, 1);

    const tf = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputBuffer);

    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "uTotalSlices"), slices + 1);

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArraysInstanced(gl.POINTS, 0, pointsInCircle, slices + 1);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.deleteTransformFeedback(tf);

    const renderVAO = gl.createVertexArray();
    gl.bindVertexArray(renderVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 24);

    const indices = this.createLatheIndices(slices, pointsInCircle);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return new SphereMesh(renderVAO, outputBuffer, indices);
  }
}

function createBuffer(gl: WebGL2RenderingContext, data: Float32Array) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

function bindAttrib(
  gl: WebGL2RenderingContext,
  loc: number,
  buf: WebGLBuffer | null,
  size: number,
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}
