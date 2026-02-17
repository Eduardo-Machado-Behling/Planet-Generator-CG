import { Engine } from "../Engine.js";
import { Quaternion, SquaredMatrix, Vector } from "../Math.js";
import { ShaderManager } from "../ShaderManager.js";

import { GameObject } from "./GameObject.js";

export class Sky extends GameObject {
  program: WebGLProgram | null = null;
  time = 0.0;

  start(gl: WebGL2RenderingContext): void {
    ShaderManager.load(gl, "star").then((prog) => {
      this.program = prog;
    });
  }

  update(gl: WebGL2RenderingContext, deltaTime: number): void {
    this.time += deltaTime;
  }

  async draw(gl: WebGL2RenderingContext) {
    if (!this.program) return;
    gl.disable(gl.CULL_FACE);
    Engine.get().program = this.program;
    gl.uniform1f(gl.getUniformLocation(this.program, "uTime"), this.time);
    gl.uniform2fv(gl.getUniformLocation(this.program, "uResolution"), [
      gl.canvas.width,
      gl.canvas.height,
    ]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.CULL_FACE);
  }
}
