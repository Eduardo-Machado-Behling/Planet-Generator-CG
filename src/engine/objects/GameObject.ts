import { Quaternion, SquaredMatrix, Vector } from '../Math.js';

export class IDManager {
	private static instance = new IDManager();

	private idToObject = new Map<number, GameObject>();

	private nextPickID = 1;

	private freeIds: number[] = [];

	static get() { return this.instance; }

	register(go: GameObject): number {
		let id: number;

		if (this.freeIds.length > 0) {
			id = this.freeIds.pop()!;
		} else {
			id = this.nextPickID++;
		}

		this.idToObject.set(id, go);
		return id;
	}

	unregister(id: number) {
		this.idToObject.delete(id);

		this.freeIds.push(id);
	}

	getObject(pickID: number): GameObject | undefined {
		return this.idToObject.get(pickID);
	}
}

export class Transform {
	_translation: Vector = new Vector(3).fill(0);
	_scale: Vector = new Vector(3).fill(1);
	_rotation: Quaternion = new Quaternion();
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
}

type UpdateCallback = (gl: WebGL2RenderingContext, dt: number) => void;
export class GameObject {
	local: Transform = new Transform()
	world: Transform = new Transform()
	name: string = ""
	enabled: boolean = true;

	private _uuid: string;
	private _pickId: number;
	private parent: GameObject | null = null;

	dirty: boolean = false;

	get uuid() {
		return this._uuid;
	}

	get pickId() {
		return this._pickId
	}

	localMatrix: SquaredMatrix;
	worldMatrix: SquaredMatrix;
	children: Array<GameObject>;

	updates: Array<UpdateCallback> = [];

	constructor(name: string = "") {

		this.localMatrix = new SquaredMatrix(4).Identity();
		this.worldMatrix = new SquaredMatrix(4).Identity();
		this.children = new Array<GameObject>();

		this._uuid = crypto.randomUUID();
		this._pickId = IDManager.get().register(this);

		if (name) {
			this.name = name
		} else {
			this.name = `${this._uuid}: GO`
		}
	}

	destroy() {
		IDManager.get().unregister(this.pickId);

		if (this.parent) {
			const index = this.parent.children.indexOf(this);
			if (index !== -1) {
				this.parent.children.splice(index, 1);
			}
		}
	}



	setParent(newParent: GameObject) {
		if (this.parent) {
			const index = this.parent.children.indexOf(this);
			if (index !== -1) {
				this.parent.children.splice(index, 1);
			}
		}

		this.parent = newParent;

		newParent.children.push(this);
	}

	setFirstParent(newParent: GameObject) {
		if (this.parent) {
			const index = this.parent.children.indexOf(this);
			if (index !== -1) {
				this.parent.children.splice(index, 1);
			}
		}

		this.parent = newParent;
		newParent.children.unshift(this);
	}

	debug = 10;
	computeWorldMatrix(
		parentWorldMatrix: SquaredMatrix = new SquaredMatrix(4).Identity()) {
		if (this.local.dirty) {
			this.computeLocalMatrix();


			this.local.dirty = false;
		}

		let worldMatrix =
			SquaredMatrix.multiply(this.localMatrix, parentWorldMatrix);

		this.world.translation = Vector.Vec([
			worldMatrix.mat[12],
			worldMatrix.mat[13],
			worldMatrix.mat[14]
		]);


		if (this.debug) {
			console.log(`${this.name}: pos = ${this.world.translation.vec}`)
			this.debug -= 1;
		}


		this.worldMatrix = worldMatrix;
		return this.worldMatrix;
	}

	computeLocalMatrix() {
		this.localMatrix = SquaredMatrix.scaling(this.local.scale);
		this.localMatrix.transform(SquaredMatrix.rotation(this.local.rotation));
		this.localMatrix.transform(SquaredMatrix.translation(this.local.translation));
	}


	start(gl: WebGL2RenderingContext) { }
	update(gl: WebGL2RenderingContext, deltaTime: number) {
		this.updates.forEach(callback => {
			callback(gl, deltaTime);
		});

		for (const child of this.children) {
			child.update(gl, deltaTime);
		}

	}
	async lightPass(gl: WebGL2RenderingContext, program: WebGLProgram) {
		for (const child of this.children) {
			await child.lightPass(gl, program);
		}
	}

	async draw(gl: WebGL2RenderingContext) { }

	computeWorld(worldMatrix = new SquaredMatrix(4).Identity()) {
		worldMatrix = this.computeWorldMatrix(worldMatrix);

		for (const child of this.children) {
			child.computeWorld(worldMatrix);
		}
	}


	async mainloop(
		gl: WebGL2RenderingContext, deltaTime: number,
		worldMatrix = new SquaredMatrix(4).Identity()) {

		if (this.enabled)
			await this.draw(gl);

		for (const child of this.children) {
			await child.mainloop(gl, deltaTime, worldMatrix);
		}
	}
}
