import { SimpleDelaunay } from "../../geometry/delaunay.js";
import { ConfigManager, SystemStateData } from "../../ui/ConfigManager.js";
import { NoiseLayer } from "../../ui/Elements/Noise/NoiseLayer.js";
import { HextoVec3 } from "../../ui/Elements/VisualColor.js";
import { GradientStop } from "../../ui/Elements/VisualGradient.js";
import { AVAILABLE_LAYERS } from "../../ui/Elements/VisualNoises.js";
import { Engine } from "../Engine.js";
import { SquaredMatrix } from "../Math.js";
import { ShaderManager } from "../ShaderManager.js";

import { GameObject } from "./GameObject.js";

class SphereMesh {
	vao: WebGLVertexArrayObject | null = null;
	indicesCount: number = 0;

	vertices: Float32Array | null = null;
	normals: Float32Array | null = null;
	uvs: Float32Array | null = null;
	indices: Uint16Array | null = null;

	clear() {
		this.vertices = null;
		this.normals = null;
		this.uvs = null;
		this.indices = null;
	}
}

class TextureInfo {
	private textureFBO: WebGLFramebuffer;
	private heightTexture: WebGLTexture;
	private textureVAO: WebGLVertexArrayObject;
	private program: WebGLProgram;
	private width: number;
	private height: number;

	public generating = false;

	get texture() {
		return this.heightTexture;
	}

	constructor(
		gl: WebGL2RenderingContext,
		program: WebGLProgram,
		width: number,
		height: number,
	) {
		if (!gl.getExtension("EXT_color_buffer_float"))
			console.error(
				"CRITICAL: EXT_color_buffer_float not supported. Planet generation will fail.",
			);

		if (!gl.getExtension("OES_texture_float_linear"))
			console.warn(
				"OES_texture_float_linear not supported. Terrain might look blocky/aliased.",
			);

		this.program = program;
		this.width = width;
		this.height = height;

		this.textureVAO = this.createQuad(gl);
		this.heightTexture = this.generateHeightTexture(gl, width, height);
		this.textureFBO = this.generateHeightFBO(gl, this.heightTexture);
	}

	private createQuad(gl: WebGL2RenderingContext) {
		const vertices = new Float32Array([
			-1, 1, 0, 0, 0, -1, -1, 0, 0, 1, 1, -1, 0, 1, 1, -1, 1, 0, 0, 0, 1, -1, 0,
			1, 1, 1, 1, 0, 1, 0,
		]);

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		const vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0);

		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

		return vao;
	}

	private generateHeightTexture(
		gl: WebGL2RenderingContext,
		width = 2048,
		height = 2048,
	) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA32F,
			width,
			height,
			0,
			gl.RGBA,
			gl.FLOAT,
			null,
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.bindTexture(gl.TEXTURE_2D, null);
		return texture;
	}

	private generateHeightFBO(gl: WebGL2RenderingContext, texture: WebGLTexture) {
		const FBO = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, FBO);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			texture,
			0,
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return FBO;
	}

	async generateHeightMap(gl: WebGL2RenderingContext, noises: NoiseLayer[]) {
		this.generating = true;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureFBO);
		gl.viewport(0, 0, this.width, this.height);
		gl.useProgram(this.program);

		this.inspectUniforms(gl, this.program, noises);

		gl.bindVertexArray(this.textureVAO);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.bindVertexArray(null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		this.generating = false;

		return this.heightTexture;
	}

	inspectUniforms(
		gl: WebGL2RenderingContext,
		program: WebGLProgram,
		noises: NoiseLayer[],
	) {
		const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		const idxReg: RegExp = /uNoises\[(?<index>\d+)\]\.(?<key>[a-zA-Z_]+)/i;

		for (let i = 0; i < numUniforms; ++i) {
			const info = gl.getActiveUniform(program, i);
			if (!info) continue;

			const name = info.name;
			let idx = -1;
			let key = "";
			const idxMatch = info.name.match(idxReg);
			if (idxMatch?.groups) {
				const indexStr = idxMatch.groups["index"];
				idx = parseInt(indexStr, 10);
				if (idx >= noises.length) break;

				key = idxMatch.groups["key"];
			}

			const type = info.type;
			const location = gl.getUniformLocation(program, name);
			if (name == "noiseAmount") {
				gl.uniform1i(location, noises.length);
			} else if (key == "noiseType") {
				const targetType = noises[idx].type;

				const typeIndex = AVAILABLE_LAYERS.findIndex(
					(LayerClass) => LayerClass.TYPE === targetType,
				);
				gl.uniform1i(location, typeIndex);
			} else if (idx > -1) {
				switch (type) {
					case gl.FLOAT:
						gl.uniform1f(location, noises[idx].params[key]);

						break;
					case gl.INT:
						gl.uniform1i(location, noises[idx].params[key]);

						break;
					case gl.BOOL:
						gl.uniform1i(location, noises[idx].params[key]);

						break;
					default:
						console.log(
							`Unknown type [${type}] for ${name} -> ${noises[idx].params[key]}`,
						);
				}
			}
		}
	}
}

class ColorTexture {
	private _texture: WebGLTexture;
	private width: number;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private gradient: CanvasGradient;

	get texture() {
		return this._texture;
	}

	constructor(gl: WebGL2RenderingContext, width = 256) {
		this._texture = gl.createTexture();
		this.width = width;

		const height = 1;
		this.canvas = document.createElement("canvas");
		this.canvas.width = width;
		this.canvas.height = height;
		const ctx = this.canvas.getContext("2d");

		if (!ctx) throw new Error("Could not create canvas context");
		this.ctx = ctx;

		this.gradient = ctx.createLinearGradient(0, 0, width, 0);

		gl.bindTexture(gl.TEXTURE_2D, this._texture);

		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			this.canvas,
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	setGrandiet(gl: WebGL2RenderingContext, stops: GradientStop[]) {
		console.log("Update");

		this.ctx.clearRect(0, 0, this.width, 1);
		this.gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);

		stops.forEach((stop) => {
			this.gradient.addColorStop(stop.offset, stop.color);
		});

		this.ctx.fillStyle = this.gradient;
		this.ctx.fillRect(0, 0, this.width, 1);

		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			this.canvas,
		);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}

export class Planet extends GameObject {
	radius: number = 1.0;
	pointsAmount: number = 1000;

	heightTex: TextureInfo | null = null;
	biomeTex: ColorTexture | null = null;
	program: WebGLProgram | null = null;
	atmosphereProgram: WebGLProgram | null = null;

	sphereMesh: SphereMesh = new SphereMesh();
	normalMat: SquaredMatrix = new SquaredMatrix(3);

	ready: boolean = false;
	generating: boolean = false;

	constructor(name: string = "") {
		super(name);

		this.radius = ConfigManager.get().getSystemState().sphere.radius.value;
		this.pointsAmount =
			ConfigManager.get().getSystemState().sphere.vertices.value;
	}

	computeWorldMatrix(parentWorldMatrix?: SquaredMatrix): SquaredMatrix {
		const dirty = this.dirty;
		let res = super.computeWorldMatrix(parentWorldMatrix);

		if (dirty) this.normalMat.mat = SquaredMatrix.makeNormalMatrix(res);

		return res;
	}

	start(gl: WebGL2RenderingContext) {
		const config = ConfigManager.get().getSystemState();
		config.sphere.vertices.subscribe((data) => {
			this.pointsAmount = data;
			this.ready = false;
		});
		config.sphere.radius.subscribe((data) => {
			this.radius = data;
			this.ready = false;
		});

		config.layers.subscribe((data) => this.genTexHelper(gl, data));

		const width = 2048;
		const height = 2048;

		ShaderManager.load(gl, "noise").then((shader) => {
			this.heightTex = new TextureInfo(gl, shader, width, height);
		});

		this.biomeTex = new ColorTexture(gl);
		this.biomeTex.setGrandiet(gl, config.sphere.gradient.value);
		config.sphere.gradient.subscribe((data) => {
			if (this.biomeTex) this.biomeTex.setGrandiet(gl, data);
		});

		ShaderManager.load(gl, "atmosphere").then((data) => {
			this.atmosphereProgram = data;
		});
	}

	update(gl: WebGL2RenderingContext, deltaTime: number): void {
		super.update(gl, deltaTime);
		if (this.ready || this.generating || this.heightTex == null) return;

		this.generating = true;
		this.loadModel(gl).then(() => {
			this.ready = true;
			this.generating = false;

			this.genTexHelper(gl, ConfigManager.get().getSystemState().layers.value);
		});
	}

	async lightPass(gl: WebGL2RenderingContext, program: WebGLProgram) {
		if (!this.ready || this.sphereMesh.indicesCount === 0 || !this.heightTex) {
			return;
		}
		gl.useProgram(program);

		gl.uniformMatrix4fv(
			gl.getUniformLocation(program, "uModel"),
			false,
			this.worldMatrix.mat,
		);
		gl.uniform1i(gl.getUniformLocation(program, "uHasNoise"), 1);

		const data = ConfigManager.get().getSystemState();

		const terrainHeightMap = this.heightTex.texture;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, terrainHeightMap);
		gl.uniform1i(gl.getUniformLocation(program, "uHeightMap"), 0);

		gl.uniform1f(
			gl.getUniformLocation(program, "uDisplacementStrength"),
			data.sphere.displacementMult.value
		);

		gl.bindVertexArray(this.sphereMesh.vao);
		gl.drawElements(
			gl.TRIANGLES,
			this.sphereMesh.indicesCount,
			gl.UNSIGNED_SHORT,
			0,
		);

		gl.uniform1i(gl.getUniformLocation(program, "uHasNoise"), 0);
		super.lightPass(gl, program);
	}

	async draw(gl: WebGL2RenderingContext) {
		if (!this.ready || this.sphereMesh.indicesCount === 0 || !this.heightTex) {
			return;
		}

		this.program = await ShaderManager.load(gl, "rigid");

		Engine.get().program = this.program;

		gl.uniformMatrix4fv(
			gl.getUniformLocation(this.program, "uModel"),
			false,
			this.worldMatrix.mat,
		);

		gl.uniformMatrix3fv(
			gl.getUniformLocation(this.program, "uNormalMatrix"),
			false,
			this.normalMat.mat,
		);

		const data = ConfigManager.get().getSystemState();

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.heightTex.texture);
		gl.uniform1i(gl.getUniformLocation(this.program, "uHeightMap"), 0);
		gl.uniform1i(gl.getUniformLocation(this.program, "uObjectID"), this.pickId);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "uDisplacementStrength"),
			data.sphere.displacementMult.value,
		);

		gl.uniform1f(
			gl.getUniformLocation(this.program, "uPickingMinimum"),
			data.sphere.pickingMinimum.value,
		);

		if (this.biomeTex) {
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.biomeTex.texture);
			gl.uniform1i(gl.getUniformLocation(this.program, "uBiomeGradient"), 1);
		}
		gl.bindVertexArray(this.sphereMesh.vao);
		gl.drawElements(
			gl.TRIANGLES,
			this.sphereMesh.indicesCount,
			gl.UNSIGNED_SHORT,
			0,
		);

		this.atmosphereDraw(gl, data);
	}

	private atmosphereDraw(gl: WebGL2RenderingContext, state: SystemStateData) {
		if (this.atmosphereProgram && state.atmosphere.enabled.value) {
			Engine.get().program = this.atmosphereProgram;
			gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.depthMask(false);

			gl.enable(gl.CULL_FACE);
			gl.cullFace(gl.FRONT);

			gl.uniformMatrix4fv(
				gl.getUniformLocation(this.atmosphereProgram, "uModel"),
				false,
				this.worldMatrix.mat,
			);

			gl.uniform1f(
				gl.getUniformLocation(this.atmosphereProgram, "uAtmosphereScale"),
				state.atmosphere.scale.value,
			);
			gl.uniform3fv(
				gl.getUniformLocation(this.atmosphereProgram, "uColor"),
				HextoVec3(state.atmosphere.color.value),
			);
			gl.uniform1f(
				gl.getUniformLocation(this.atmosphereProgram, "uFalloff"),
				state.atmosphere.falloff.value,
			);
			gl.uniform1f(
				gl.getUniformLocation(this.atmosphereProgram, "uIntensity"),
				state.atmosphere.intensity.value,
			);

			gl.bindVertexArray(this.sphereMesh.vao);
			gl.drawElements(
				gl.TRIANGLES,
				this.sphereMesh.indicesCount,
				gl.UNSIGNED_SHORT,
				0,
			);

			gl.cullFace(gl.BACK);
			gl.depthMask(true);
			gl.disable(gl.BLEND);
			gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
		}
	}

	private genTexHelper(gl: WebGL2RenderingContext, data: NoiseLayer[]) {
		if (this.heightTex && !this.heightTex.generating) {
			this.ready = false;
			this.heightTex
				.generateHeightMap(gl, data)
				.then((_) => (this.ready = true));
		}
	}

	async loadModel(gl: WebGL2RenderingContext) {
		this.program = await ShaderManager.load(
			gl,
			"fibSphere",
			"lathe",
			(program) => {
				gl.transformFeedbackVaryings(
					program,
					["vOutPos", "vOutNormal"],
					gl.SEPARATE_ATTRIBS,
				);
			},
		);
		const slices = this.pointsAmount;

		this.createMesh(gl, this.program, slices);
	}

	private createMesh(
		gl: WebGL2RenderingContext,
		program: WebGLProgram,
		slices: number,
	) {
		const totalVertices = slices;
		if (slices <= 0) {
			return;
		}

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
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posBuffer);
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, normBuffer);

		gl.useProgram(program);

		const phi = (1.0 + Math.sqrt(5)) / 2.0;
		gl.uniform1i(gl.getUniformLocation(program, "uResolution"), slices);
		gl.uniform1f(gl.getUniformLocation(program, "uRadius"), this.radius);
		gl.uniform1f(gl.getUniformLocation(program, "uPhi"), phi);

		gl.enable(gl.RASTERIZER_DISCARD);
		gl.beginTransformFeedback(gl.POINTS);
		gl.drawArrays(gl.POINTS, 0, slices);
		gl.endTransformFeedback();
		gl.disable(gl.RASTERIZER_DISCARD);

		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
		gl.deleteTransformFeedback(tf);

		gl.finish();

		const verticesSize = 3 * slices;
		if (
			this.sphereMesh.vertices === null ||
			this.sphereMesh.vertices.length < verticesSize
		) {
			this.sphereMesh.vertices = new Float32Array(verticesSize);
		}

		gl.bindBuffer(gl.COPY_READ_BUFFER, posBuffer);
		gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, this.sphereMesh.vertices);
		gl.bindBuffer(gl.COPY_READ_BUFFER, null);

		if (
			this.sphereMesh.normals === null ||
			this.sphereMesh.normals.length < verticesSize
		) {
			this.sphereMesh.normals = new Float32Array(verticesSize);
		}

		gl.bindBuffer(gl.COPY_READ_BUFFER, normBuffer);
		gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, this.sphereMesh.normals);
		gl.bindBuffer(gl.COPY_READ_BUFFER, null);

		console.log(
			`param: ${slices}, ${this.radius} => ${this.sphereMesh.vertices.length}`,
		);

		this.sphereMesh.uvs = this.generateUVs(this.sphereMesh.vertices);
		const uvBuffer = gl.createBuffer();

		this.sphereMesh.vao = gl.createVertexArray();
		gl.bindVertexArray(this.sphereMesh.vao);

		gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.sphereMesh.uvs, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

		this.sphereMesh.indices = this.generateTopology();
		const indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			this.sphereMesh.indices,
			gl.STATIC_DRAW,
		);

		this.sphereMesh.indicesCount = this.sphereMesh.indices.length;
		this.sphereMesh.clear();
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	private generateTopology(): Uint16Array {
		if (!this.sphereMesh.vertices) throw Error("Vertices == null");

		const poleIndex = this.pointsAmount - 1;

		const undoRotation = this.alignSphereToPole(poleIndex);

		const coords = new Float32Array((this.pointsAmount - 1) * 2);

		const projectedToOriginalId = new Int32Array(this.pointsAmount - 1);

		let p = 0;
		for (let i = 0; i < this.pointsAmount; i++) {
			if (i === poleIndex) continue;

			const x = this.sphereMesh.vertices[i * 3 + 0];
			const y = this.sphereMesh.vertices[i * 3 + 1];
			const z = this.sphereMesh.vertices[i * 3 + 2];

			const ny = y / this.radius;

			const safeDenom = 1.0 + ny < 1e-6 ? 1e-6 : 1.0 + ny;

			coords[p * 2 + 0] = x / safeDenom;
			coords[p * 2 + 1] = z / safeDenom;

			projectedToOriginalId[p] = i;
			p++;
		}

		const delaunay = new SimpleDelaunay(coords);

		const indices: number[] = [];

		for (let i = 0; i < delaunay.triangles.length; i++) {
			const projectedId = delaunay.triangles[i];
			indices.push(projectedToOriginalId[projectedId]);
		}

		const hull = delaunay.hull;
		for (let i = 0; i < hull.length; i++) {
			const p1 = projectedToOriginalId[hull[i]];
			const p2 = projectedToOriginalId[hull[(i + 1) % hull.length]];

			indices.push(p1, poleIndex, p2);
		}

		this.applyRotation(undoRotation);
		return new Uint16Array(indices);
	}

	private alignSphereToPole(idx: number): Float32Array {
		if (!this.sphereMesh.vertices) throw Error("Vertices == null");

		const i3 = idx * 3;
		let ux = this.sphereMesh.vertices[i3 + 0];
		let uy = this.sphereMesh.vertices[i3 + 1];
		let uz = this.sphereMesh.vertices[i3 + 2];

		const len = Math.sqrt(ux * ux + uy * uy + uz * uz);
		ux /= len;
		uy /= len;
		uz /= len;

		const dot = -uy;

		const mat = new Float32Array([
			1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
		]);

		if (dot > 0.99999) {
			return mat;
		} else if (dot < -0.99999) {
			mat[5] = -1;
			mat[10] = -1;
		} else {
			let ax = uz;
			let ay = 0;
			let az = -ux;

			const axisLen = Math.sqrt(ax * ax + ay * ay + az * az);
			ax /= axisLen;

			az /= axisLen;

			const c = dot;
			const s = Math.sqrt(1 - c * c);
			const t = 1 - c;

			mat[0] = t * ax * ax + c;
			mat[1] = s * az;
			mat[2] = t * ax * az;

			mat[4] = -s * az;
			mat[5] = c;
			mat[6] = s * ax;

			mat[8] = t * ax * az;
			mat[9] = -s * ax;
			mat[10] = t * az * az + c;
		}

		for (let i = 0; i < this.sphereMesh.vertices.length; i += 3) {
			const x = this.sphereMesh.vertices[i];
			const y = this.sphereMesh.vertices[i + 1];
			const z = this.sphereMesh.vertices[i + 2];

			this.sphereMesh.vertices[i] = mat[0] * x + mat[4] * y + mat[8] * z;
			this.sphereMesh.vertices[i + 1] = mat[1] * x + mat[5] * y + mat[9] * z;
			this.sphereMesh.vertices[i + 2] = mat[2] * x + mat[6] * y + mat[10] * z;
		}

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
		if (!this.sphereMesh.vertices) throw Error("Vertices == null");

		for (let i = 0; i < this.sphereMesh.vertices.length; i += 3) {
			const x = this.sphereMesh.vertices[i];
			const y = this.sphereMesh.vertices[i + 1];
			const z = this.sphereMesh.vertices[i + 2];

			this.sphereMesh.vertices[i] =
				mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
			this.sphereMesh.vertices[i + 1] =
				mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
			this.sphereMesh.vertices[i + 2] =
				mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
		}
	}

	createMeshIndices(vertices: Float32Array): Uint16Array {
		const coords = new Float32Array(this.pointsAmount * 2);

		for (let i = 0; i < this.pointsAmount; i++) {
			const x = vertices[i * 3 + 0];
			const y = vertices[i * 3 + 1];
			const z = vertices[i * 3 + 2];

			const nx = x / this.radius;
			const ny = y / this.radius;
			const nz = z / this.radius;

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

	private generateUVs(vertices: Float32Array): Float32Array {
		const numVertices = vertices.length / 3;
		const uvs = new Float32Array(numVertices * 2);

		const PI = Math.PI;
		const TWO_PI = Math.PI * 2;

		for (let i = 0; i < numVertices; i++) {
			const x = vertices[i * 3 + 0];
			const y = vertices[i * 3 + 1];
			const z = vertices[i * 3 + 2];

			const len = Math.sqrt(x * x + y * y + z * z);
			const nx = x / len;
			const ny = y / len;
			const nz = z / len;

			let u = 0.5 + Math.atan2(nz, nx) / TWO_PI;

			let v = 0.5 + Math.asin(ny) / PI;

			uvs[i * 2 + 0] = u;
			uvs[i * 2 + 1] = v;
		}

		return uvs;
	}

	download() {
		if (
			this.sphereMesh.vertices &&
			this.sphereMesh.indices &&
			this.sphereMesh.uvs &&
			this.sphereMesh.normals
		)
			downloadOBJ(
				this.sphereMesh.vertices,
				this.sphereMesh.normals,
				this.sphereMesh.uvs,
				this.sphereMesh.indices,
			);
	}
}

function downloadOBJ(
	vertices: Float32Array,
	normals?: Float32Array | null,
	uvs?: Float32Array | null,
	indices?: Uint16Array | Uint32Array | null,
	filename = "mesh.obj",
) {
	const lines: string[] = [];
	lines.push("# Exported from WebGL");
	lines.push("o Mesh");
	lines.push("");

	const numVertices = vertices.length / 3;

	for (let i = 0; i < vertices.length; i += 3) {
		const x = vertices[i];
		const y = vertices[i + 1];
		const z = vertices[i + 2];
		lines.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
	}
	lines.push("");

	const hasUVs = uvs && uvs.length > 0;
	if (hasUVs) {
		for (let i = 0; i < uvs.length; i += 2) {
			const u = uvs[i];
			const v = uvs[i + 1];
			lines.push(`vt ${u.toFixed(6)} ${v.toFixed(6)}`);
		}
		lines.push("");
	}

	const hasNormals = normals && normals.length > 0;
	if (hasNormals) {
		for (let i = 0; i < normals.length; i += 3) {
			const x = normals[i];
			const y = normals[i + 1];
			const z = normals[i + 2];
			lines.push(`vn ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
		}
		lines.push("");
	}

	// Face format: f v/vt/vn v/vt/vn v/vt/vn

	if (indices && indices.length > 0) {
		for (let i = 0; i < indices.length; i += 3) {
			const v1 = indices[i] + 1;
			const v2 = indices[i + 1] + 1;
			const v3 = indices[i + 2] + 1;

			if (hasUVs && hasNormals) {
				lines.push(`f ${v1}/${v1}/${v1} ${v2}/${v2}/${v2} ${v3}/${v3}/${v3}`);
			} else if (hasUVs) {
				lines.push(`f ${v1}/${v1} ${v2}/${v2} ${v3}/${v3}`);
			} else if (hasNormals) {
				lines.push(`f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}`);
			} else {
				lines.push(`f ${v1} ${v2} ${v3}`);
			}
		}
	} else {
		for (let i = 0; i < numVertices; i += 3) {
			const v1 = i + 1;
			const v2 = i + 2;
			const v3 = i + 3;

			if (hasUVs && hasNormals) {
				lines.push(`f ${v1}/${v1}/${v1} ${v2}/${v2}/${v2} ${v3}/${v3}/${v3}`);
			} else if (hasUVs) {
				lines.push(`f ${v1}/${v1} ${v2}/${v2} ${v3}/${v3}`);
			} else if (hasNormals) {
				lines.push(`f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}`);
			} else {
				lines.push(`f ${v1} ${v2} ${v3}`);
			}
		}
	}

	const objContent = lines.join("\n");
	const blob = new Blob([objContent], { type: "text/plain" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.style.display = "none";
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();

	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	console.log(
		`✓ Downloaded ${filename} (${numVertices} vertices, ${indices ? indices.length / 3 : numVertices / 3} triangles)`,
	);
}
