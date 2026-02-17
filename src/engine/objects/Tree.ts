import { MeshInstaceData, ObjManager } from "../ObjManager.js";
import { GameObject } from "./GameObject.js";

export class Tree extends GameObject {
	data: MeshInstaceData
	container: Tree[]

	constructor(container: Tree[], name: string = ""){
		super(name)

		let data = ObjManager.get().instantiateRandom(this)
		if(!data) throw Error(`[Tree::${name}] Couldn't instantiate!`)
		this.data = data

		this.container = container
		this.container.push(this)
	}

	destroy(): void {
	    super.destroy();
		ObjManager.get().deinstantiate(this);

		if (this.container) {
			const index = this.container.indexOf(this);
			if (index !== -1) {
				this.container.splice(index, 1);
			}
		}
	}

	async draw(gl: WebGL2RenderingContext) {
		this.data.modelMat =  this.worldMatrix;
	}
}
