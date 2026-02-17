import { Engine } from './Engine.js';
import { SquaredMatrix } from './Math.js';
import { GameObject } from './objects/GameObject.js';
import { ShaderManager } from './ShaderManager.js';

export interface MeshData {
	vertices: Float32Array;
	normals: Float32Array;
	uvs: Float32Array;
	indices: Uint16Array | Uint32Array;
	aabb: AABB
}

export class MeshInstaceData {
	private _modelMat: SquaredMatrix = new SquaredMatrix(4).Identity();
	private _id: number = 0;
	private parent: MeshDrawData

	get id() { return this._id; }

	static byteSize() { return this.floatSize() * 4 }
	static floatSize() { return (4 * 4 + 1) }

	static setup(gl: WebGL2RenderingContext) {
		const stride = this.byteSize();
		const bytesPerVec4 = 16;

		let loc = 3;
		for (let i = 0; i < 4; i++) {
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, i * bytesPerVec4);
			gl.vertexAttribDivisor(loc, 1);
			loc++;
		}

		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, stride, 4 * bytesPerVec4);
		gl.vertexAttribDivisor(loc, 1);
	}

	constructor(parent: MeshDrawData, id: number) {
		this.parent = parent
		this._id = id
	}

	set modelMat(mat: SquaredMatrix) {
		this._modelMat = mat;
		this.parent.dirty = true;
	}

	get modelMat() { return this._modelMat; }
};

interface AABB {
	min: Float32Array
	max: Float32Array
};

export interface MeshDrawData {
	vao: WebGLVertexArrayObject;
	indiceCount: number;
	instances: Map<GameObject, MeshInstaceData>;
	aabb: AABB
	dirty: boolean;
	instanceBuffer: WebGLBuffer;
	dataCache: Float32Array;
}

export class ObjManager {
	private models: MeshDrawData[] = [];
	private instances = new Map<GameObject, MeshDrawData>();
	private static instance = new ObjManager();

	private cubeVAO: WebGLVertexArrayObject | null = null;

	
	private texture: WebGLTexture | null = null;

	private constructor() {
		this.fetchAllObjs();
	}

	static get(): ObjManager {
		return ObjManager.instance;
	}

	
	private async loadSharedTexture(gl: WebGL2RenderingContext) {
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		
		const pixel = new Uint8Array([255, 255, 255, 255]);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

		
		const image = new Image();
		image.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

			
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		};
		
		image.src = './assets/textures/trees.png';
	}

	private async fetchAllObjs() {
		try {
			const res = await fetch('./assets/models/objs.txt');
			if (!res.ok) throw new Error("Could not load objs.txt");

			const text = await res.text();
			const files = text.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0 && !line.startsWith('#'));

			for (const file of files) {
				const meshData = await this.fetchObj(file);
				const drawData = this.generateVAO(meshData);
				this.models.push(drawData);
				console.log(`Loaded model: ${file}`);
			}
		} catch (err) {
			console.error("ObjManager Error:", err);
		}
	}

	private createCubeVAO(gl: WebGL2RenderingContext) {
		
		const vertices = new Float32Array([
			
			-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
			0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
			-0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
			0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
			-0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
			0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
			-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,
			0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5,
			0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
			0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5,
			-0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
			-0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
		]);

		this.cubeVAO = gl.createVertexArray();
		gl.bindVertexArray(this.cubeVAO);

		const vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindVertexArray(null);
	}

	public async drawPicking(gl: WebGL2RenderingContext) {
		const program = await ShaderManager.load(gl, "aabb");
		Engine.get().program = program;

		if (!this.cubeVAO) this.createCubeVAO(gl);

		gl.bindVertexArray(this.cubeVAO);

		for (const mesh of this.models) {
			if (mesh.instances.size === 0) continue;

			const min = mesh.aabb.min;
			const max = mesh.aabb.max;
			const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
			const center = [(max[0] + min[0]) * 0.5, (max[1] + min[1]) * 0.5, (max[2] + min[2]) * 0.5];

			gl.uniform3fv(gl.getUniformLocation(program, "uAABBSize"), size);
			gl.uniform3fv(gl.getUniformLocation(program, "uAABBCenter"), center);
			MeshInstaceData.setup(gl);

			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instanceBuffer);
			gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, mesh.instances.size);
		}
		gl.bindVertexArray(null);
	}

	private updateInstanceBuffer(gl: WebGL2RenderingContext, mesh: MeshDrawData) {
		if (!mesh.dirty) return;

		mesh.dirty = false;
		const floatsPerInstance = MeshInstaceData.floatSize();
		const requiredSize = mesh.instances.size * floatsPerInstance;

		if (mesh.dataCache.length < requiredSize) {
			mesh.dataCache = new Float32Array(requiredSize);
		}

		let offset = 0;
		for (const [_, instanceData] of mesh.instances) {
			mesh.dataCache.set(instanceData.modelMat.mat, offset);
			mesh.dataCache[offset + 16] = instanceData.id;
			offset += floatsPerInstance;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instanceBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.dataCache, gl.DYNAMIC_DRAW);
	}

	public async lightPass(gl: WebGL2RenderingContext, program: WebGLProgram) {
		
		gl.useProgram(program);

		for (const mesh of this.models) {
			if (mesh.instances.size === 0) continue;

			
			this.updateInstanceBuffer(gl, mesh);

			gl.bindVertexArray(mesh.vao);
			const indexType = mesh.indiceCount > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
			gl.drawElementsInstanced(gl.TRIANGLES, mesh.indiceCount, indexType, 0, mesh.instances.size);
			gl.bindVertexArray(null);
		}
	}

	public async draw(gl: WebGL2RenderingContext) {
		const program = await ShaderManager.load(gl, "tree");
		if (!this.texture) await this.loadSharedTexture(gl);
		Engine.get().program = program;

		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(gl.getUniformLocation(program, "uSampler"), 0);

		for (const mesh of this.models) {
			if (mesh.instances.size === 0) continue;

			this.updateInstanceBuffer(gl, mesh);

			gl.bindVertexArray(mesh.vao);
			const indexType = mesh.indiceCount > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
			gl.drawElementsInstanced(gl.TRIANGLES, mesh.indiceCount, indexType, 0, mesh.instances.size);
			gl.bindVertexArray(null);
		}
	}

	private async fetchObj(src: string): Promise<MeshData> {
		const res = await fetch(`./assets/models/${src}`);
		const text = await res.text();
		return this.parse(text);
	}

	private generateVAO(meshData: MeshData): MeshDrawData {
		const gl = Engine.get().gl;
		const vao = gl.createVertexArray();

		if (!vao) throw new Error("Failed to create VAO");

		gl.bindVertexArray(vao);

		const posBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, meshData.vertices, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		const normBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, meshData.normals, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

		const uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, meshData.uvs, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

		const instanceBuffer = gl.createBuffer();
		if (!instanceBuffer) throw Error("Buffer fail");
		gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, 100 * MeshInstaceData.byteSize(), gl.DYNAMIC_DRAW);
		MeshInstaceData.setup(gl)

		const indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshData.indices, gl.STATIC_DRAW);

		gl.bindVertexArray(null);

		return {
			vao: vao,
			indiceCount: meshData.indices.length,
			instances: new Map(),
			aabb: meshData.aabb,
			dirty: false,
			instanceBuffer: instanceBuffer,
			dataCache: new Float32Array(0)
		};
	}

	public instantiateRandom(go: GameObject): MeshInstaceData | null {
		if (this.models.length === 0) return null;
		const index = Math.floor(Math.random() * this.models.length);
		return this.instanciate(this.models[index], go);
	}

	public deinstantiate(go: GameObject) {
		const mesh = this.instances.get(go);
		if (mesh) {
			mesh.instances.delete(go);
			this.instances.delete(go);
		}
	}

	public get(go: GameObject): MeshInstaceData | null {
		let mesh = this.instances.get(go)
		if (!mesh) return null;
		return mesh.instances.get(go) || null;
	}

	private instanciate(mesh: MeshDrawData, go: GameObject): MeshInstaceData {
		let data = new MeshInstaceData(mesh, go.pickId);
		mesh.instances.set(go, data);
		this.instances.set(go, mesh);
		return data;
	}

	private parse(text: string): MeshData {
		const objPositions: number[][] = [[0, 0, 0]];
		const objNormals: number[][] = [[0, 0, 0]];
		const objUVs: number[][] = [[0, 0]];

		const finalVertices: number[] = [];
		const finalNormals: number[] = [];
		const finalUVs: number[] = [];
		const finalIndices: number[] = [];

		const cache: Record<string, number> = {};
		let nextIndex = 0;

		const lines = text.split('\n');
		const min = [Infinity, Infinity, Infinity];
		const max = [-Infinity, -Infinity, -Infinity];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.length === 0 || line.startsWith('#')) continue;

			const parts = line.split(/\s+/);
			const type = parts[0];

			if (type === 'v') {
				const x = parseFloat(parts[1]);
				const y = parseFloat(parts[2]);
				const z = parseFloat(parts[3]);

				min[0] = Math.min(min[0], x); max[0] = Math.max(max[0], x);
				min[1] = Math.min(min[1], y); max[1] = Math.max(max[1], y);
				min[2] = Math.min(min[2], z); max[2] = Math.max(max[2], z);
				objPositions.push([x, y, z]);
			} else if (type === 'vn') {
				objNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
			} else if (type === 'vt') {
				objUVs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
			} else if (type === 'f') {
				const quad = parts.slice(1);
				for (let j = 0; j < quad.length - 2; j++) {
					const p1 = quad[0];
					const p2 = quad[j + 1];
					const p3 = quad[j + 2];

					[p1, p2, p3].forEach(vertexString => {
						if (cache[vertexString] !== undefined) {
							finalIndices.push(cache[vertexString]);
						} else {
							const indices = vertexString.split('/');
							const vIdx = parseInt(indices[0]);
							const vtIdx = indices[1] ? parseInt(indices[1]) : 0;
							const vnIdx = indices[2] ? parseInt(indices[2]) : 0;

							const pos = objPositions[vIdx];
							finalVertices.push(pos[0], pos[1], pos[2]);

							const uv = vtIdx > 0 ? objUVs[vtIdx] : [0, 0];
							finalUVs.push(uv[0], 1 - uv[1]);

							const norm = vnIdx > 0 ? objNormals[vnIdx] : [0, 1, 0];
							finalNormals.push(norm[0], norm[1], norm[2]);

							cache[vertexString] = nextIndex;
							finalIndices.push(nextIndex);
							nextIndex++;
						}
					});
				}
			}
		}

		return {
			vertices: new Float32Array(finalVertices),
			normals: new Float32Array(finalNormals),
			uvs: new Float32Array(finalUVs),
			aabb: {
				min: new Float32Array(min),
				max: new Float32Array(max)
			},
			indices: finalVertices.length / 3 > 65535
				? new Uint32Array(finalIndices)
				: new Uint16Array(finalIndices)
		};
	}
}
