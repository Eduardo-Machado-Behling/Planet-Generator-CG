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
      gl.uniformMatrix4fv(
          gl.getUniformLocation(program, 'uProj'), false, this.proj.mat);
    }
  }
};