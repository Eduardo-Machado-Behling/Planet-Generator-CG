import { Engine } from '../Engine.js';
import { Quaternion, SquaredMatrix, Vector } from '../Math.js';

import { GameObject } from './GameObject.js'

export class Camera extends GameObject {
	target: GameObject | null = null;

	up = new Vector(3);

	view = new SquaredMatrix(4);
	proj: SquaredMatrix;

	constructor(proj: SquaredMatrix) {
		super();

		this.up.fill(0);
		this.up.vec[1] = 1;

		this.proj = proj;
		this.view.Identity();
	} update(gl: WebGL2RenderingContext, deltaTime: number): void { 
	}

	updateViewTarget(target: Vector) {
		const eyePos = this.world.translation;

		this.view =
			SquaredMatrix.MakeLookAt(eyePos, target, this.up);
	}

	updateView() {
		
		
		const world = this.worldMatrix;
		const view = new SquaredMatrix(4);
		view.mat.set(world.mat);
		view.invert();
		this.view = view;
	}

	updateMatrices(){
		if (this.target) {
			this.updateViewTarget(this.target.world.translation);
		} else {
			this.updateView();
		}
	}

	setup(gl: WebGL2RenderingContext, program: WebGLProgram) {
		
		this.updateMatrices()

		if (program) {
			gl.uniformMatrix4fv(
				gl.getUniformLocation(program, 'uView'), false, this.view.mat);

			gl.uniform3fv(
				gl.getUniformLocation(program, 'viewPos'), this.world.translation.vec);

			gl.uniformMatrix4fv(
				gl.getUniformLocation(program, 'uProj'), false, this.proj.mat);
		}
	}

	getLightView(): SquaredMatrix {
		return SquaredMatrix.multiply(this.proj, this.view);
	}
};
