import {SquaredMatrix} from './Math.js';
import {Camera} from './objects/Camera.js';
import {Scene} from './Scene.js';

export class Engine {
  private context: WebGL2RenderingContext;
  private prog: WebGLProgram|null = null;
  private _canvas: HTMLCanvasElement;

  camera: Camera|null = null;
  scene: Scene|null = null;

  get program(): WebGLProgram|null {
    return this.prog;
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  set program(prog: WebGLProgram) {
    this.prog = prog;
    this.gl.useProgram(prog);

    if (this.camera) this.camera.setup(this.gl, prog);
  }



  get gl(): WebGL2RenderingContext {
    return this.context;
  }

  private static instance: Engine;

  private constructor() {
    const id = '#WebGLCanvas'
    let canvas = document.querySelector<HTMLCanvasElement>(id)
    if (!canvas) {
      throw Error(`Couldn't find canvas ${id}`);
    }

    this._canvas = canvas;
    let gl = canvas.getContext('webgl2');

    if (!gl) {
      throw Error('Couldn\'t create WebGL2 context');
    }

    this.context = gl;
  }

  public static get(): Engine {
    if (!Engine.instance) {
      Engine.instance = new Engine();
    }
    return Engine.instance;
  }
}