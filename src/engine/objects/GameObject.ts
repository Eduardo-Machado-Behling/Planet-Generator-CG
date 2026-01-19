import {Engine} from '../Engine.js';
import {Quaternion, SquaredMatrix, Vector} from '../Math.js';



export class GameObject {
  _translation: Vector;
  _scale: Vector;
  _rotation: Quaternion;

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

  localMatrix: SquaredMatrix;
  worldMatrix: SquaredMatrix;
  children: Array<GameObject>;

  constructor() {
    this._translation = new Vector(3).fill(0);
    this._scale = new Vector(3).fill(1);
    this._rotation = new Quaternion();

    this.localMatrix = new SquaredMatrix(4).Identity();
    this.worldMatrix = new SquaredMatrix(4).Identity();
    this.children = new Array<GameObject>();

    this.start(Engine.get().gl);
  }



  setParent(parent: GameObject) {
    parent.children.push(this);
  }

  computeWorldMatrix(parentWorldMatrix: SquaredMatrix) {
    if (this.dirty) {
      this.computeLocalMatrix();
      this.dirty = false;
    }

    let worldMatrix =
        SquaredMatrix.multiply(this.localMatrix, parentWorldMatrix);

    this.children.forEach(function(child) {
      child.computeWorldMatrix(worldMatrix);
    });

    this.worldMatrix = worldMatrix;
  }

  computeLocalMatrix() {
    this.localMatrix = SquaredMatrix.scaling(this.scale);
    this.localMatrix.transform(SquaredMatrix.rotation(this.rotation));
    this.localMatrix.transform(SquaredMatrix.translation(this.translation));
  }


  start(gl: WebGL2RenderingContext) {}
  update(deltaTime: number) {}
  async draw(gl: WebGL2RenderingContext) {}

  async mainloop(gl: WebGL2RenderingContext) {
    await this.draw(gl);

    for (const child of this.children) {
      await child.mainloop(gl);
    }
  }
}
