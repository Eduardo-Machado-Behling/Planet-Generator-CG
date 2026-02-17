import { SquaredMatrix, Vector } from "./Math.js";
import { Camera } from "./objects/Camera.js";
import { GameObject } from "./objects/GameObject.js";
import { Tree } from "./objects/Tree.js";
import { ObjManager } from "./ObjManager.js";
import { Scene } from "./Scene.js";
import { ShaderManager } from "./ShaderManager.js";
import { ShadowMap } from "./ShadowMap.js";

export enum MouseButton {
	LEFT = 0,
	WHEEL = 1,
	RIGHT = 2,
	SIDE_UP = 3,
	SIDE_DOWN = 4,
}

interface MouseProps {
	position: { x: number; y: number };
	id: { x: number; y: number; z: number; id: number };
	button: MouseButton;
}

export type AfterCallback = () => void;
export type MouseCallback = (props: MouseProps) => void;

export class Engine {
	private context: WebGL2RenderingContext;
	private prog: WebGLProgram | null = null;
	private _canvas: HTMLCanvasElement;
	private _after: AfterCallback[] = [];

	private textureID: TextureID;
	private shadowMap: ShadowMap;
	private lightCamera: Camera | null = null;

	private _activeKeys: Set<string> = new Set();

	camera: Camera | null = null;
	scene: Scene | null = null;
	mousePos: number[] | null = null;
	trees: Tree[] = [];
	mouseCallbacks: MouseCallback[] = [];
	light: GameObject | null = null;
	lightTarget: GameObject | null = null;
	canSwichProgram: boolean = true;

	get program(): WebGLProgram | null {
		return this.prog;
	}

	get canvas(): HTMLCanvasElement {
		return this._canvas;
	}

	set program(prog: WebGLProgram) {
		if (!this.canSwichProgram) return;

		this.prog = prog;
		this.gl.useProgram(prog);

		if (this.camera) this.camera.setup(this.gl, prog);
		this.lightSetup(this.gl, prog);
	}

	lightSetup(gl: WebGL2RenderingContext, program: WebGLProgram) {
		if (!this.light) return;

		const uSunPos = gl.getUniformLocation(program, "uSunWorldPosition");
		if (uSunPos) {
			gl.uniform3fv(uSunPos, this.light.world.translation.vec);
		}

		const uShadowMap = gl.getUniformLocation(program, "uShadowMap");
		const uLightSpaceMat = gl.getUniformLocation(program, "uLightSpaceMatrix");

		if (uShadowMap && uLightSpaceMat && this.lightCamera) {
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, this.shadowMap.texture);
			gl.uniform1i(uShadowMap, 2);

			gl.uniformMatrix4fv(
				uLightSpaceMat,
				false,
				this.lightCamera.getLightView().mat,
			);
		}
	}

	afterUpdate(callback: () => void) {
		this._after.push(callback);
	}

	get gl(): WebGL2RenderingContext {
		return this.context;
	}

	private static instance: Engine;

	private constructor() {
		const id = "#WebGLCanvas";
		let canvas = document.querySelector<HTMLCanvasElement>(id);
		if (!canvas) {
			throw Error(`Couldn't find canvas ${id}`);
		}

		this._canvas = canvas;
		let gl = canvas.getContext("webgl2", { antialias: false });

		if (!gl) {
			throw Error("Couldn't create WebGL2 context");
		}

		this.context = gl;

		const width = Math.max(1, canvas.width);
		const height = Math.max(1, canvas.height);

		this.textureID = new TextureID(gl, width, height);

		this.shadowMap = new ShadowMap(2048);
		this.shadowMap.init(gl);

		if (!gl.getExtension("EXT_color_buffer_float")) {
			console.error(
				"Your browser does not support EXT_color_buffer_float. Position/ID picking will fail.",
			);
		}

		this.canvas.addEventListener("mousedown", (e) => {
			this.handlePick(e);
		});

		this.canvas.addEventListener("mousemove", (e) => {
			if (e.buttons > 0) {
				this.handlePick(e);
			}
		});

		this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

		window.addEventListener("keydown", (e) => {
			this._activeKeys.add(e.key.toLowerCase());
		});

		window.addEventListener("keyup", (e) => {
			this._activeKeys.delete(e.key.toLowerCase());
		});
	}

	isKeyDown(key: string): boolean {
		return this._activeKeys.has(key.toLowerCase());
	}

	start() {
		if (!this.scene) return;

		const gl = this.gl;
		if (resizeCanvasToDisplaySize(this.canvas)) {
			this.textureID.resizeMRT(gl, gl.canvas.width, gl.canvas.height);
		}

		this._start(this.scene);
	}

	handlePick(e: MouseEvent) {
		const rect = this.canvas.getBoundingClientRect();

		const mouseX = e.clientX - rect.left - this.canvas.clientLeft;
		const mouseY = e.clientY - rect.top - this.canvas.clientTop;

		const pixelX = (mouseX * this.canvas.width) / this.canvas.clientWidth;
		const pixelY = (mouseY * this.canvas.height) / this.canvas.clientHeight;

		let button = e.button;

		if (e.type === "mousemove") {
			if (e.buttons & 1) button = MouseButton.LEFT;
			else if (e.buttons & 2) button = MouseButton.RIGHT;
			else if (e.buttons & 4) button = MouseButton.WHEEL;
		}

		this.mousePos = [pixelX, pixelY, button];
	}

	private _start(go: GameObject) {
		if (go) {
			go.start(this.gl);

			go.children.forEach((child) => {
				this._start(child);
			});
		}
	}

	async mainloop(dt: number) {
		const gl = this.gl;
		let cameraAspect = gl.canvas.width / gl.canvas.height;
		const fov = 60 * (Math.PI / 180);
		const near = 0.1;
		const far = 100.0;
		if (resizeCanvasToDisplaySize(this.canvas)) {
			const aspect = gl.canvas.width / gl.canvas.height;
			if (aspect != cameraAspect) {
				cameraAspect = aspect;
				if (this.camera)
					this.camera.proj = SquaredMatrix.MakePerspective(
						fov,
						cameraAspect,
						near,
						far,
					);
			}
		}

		this.scene?.update(gl, dt);
		this.scene?.computeWorld();

		if (this.light) await this.lightPass(gl, dt);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureID.FBO);

		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

		gl.colorMask(true, true, true, true);

		gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);
		gl.depthFunc(gl.LESS);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
		gl.clearBufferfv(gl.COLOR, 1, [0.0, 0.0, 0.0, 1.0]);
		gl.clear(gl.DEPTH_BUFFER_BIT);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.shadowMap.texture);

		await this.scene?.mainloop(gl, dt);
		await ObjManager.get().draw(gl);

		gl.drawBuffers([gl.NONE, gl.COLOR_ATTACHMENT1]);
		await ObjManager.get().drawPicking(gl);

		if (this.mousePos) {
			const data = this.getObjectIdAtMouse(
				this.gl,
				this.mousePos[0],
				this.mousePos[1],
			);

			const value = this.mousePos[2];
			let button = -1;
			button = value as MouseButton;

			const props: MouseProps = {
				position: { x: this.mousePos[0], y: this.mousePos[1] },
				id: data,
				button: button,
			};
			for (const mcall of this.mouseCallbacks) mcall(props);

			this.mousePos = null;
		}

		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.textureID.FBO);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

		gl.readBuffer(gl.COLOR_ATTACHMENT0);
		gl.blitFramebuffer(
			0,
			0,
			this._canvas.width,
			this._canvas.height,
			0,
			0,
			this._canvas.width,
			this._canvas.height,
			gl.COLOR_BUFFER_BIT,
			gl.NEAREST,
		);

		for (const call of this._after) call();
		this._after = [];
	}

	// Inside Engine.ts

	async lightPass(gl: WebGL2RenderingContext, dt: number) {
		if (!this.light || !this.camera || !this.lightTarget) return;

		const shadowProg = await ShaderManager.load(gl, "depth");
		this.prog = shadowProg;
		gl.useProgram(shadowProg);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, null);

		const sunPos = this.light.world.translation;
		const targetPos = this.lightTarget.world.translation;
		const dist = Vector.distance(sunPos, targetPos);

		const shadowBoxSize = 50.0;

		const nearPlane = 1.0;
		const farPlane = dist + shadowBoxSize * 2.0;

		const lightProj = SquaredMatrix.MakeOrtho(
			-shadowBoxSize,
			shadowBoxSize,
			-shadowBoxSize,
			shadowBoxSize,
			nearPlane,
			farPlane,
		);

		if (!this.lightCamera) {
			this.lightCamera = new Camera(lightProj);
		} else {
			this.lightCamera.proj = lightProj;
		}

		this.lightCamera.view = SquaredMatrix.MakeLookAt(
			sunPos,
			targetPos,
			Vector.up,
		);
		this.lightCamera.updateMatrices();

		this.shadowMap.bind(gl);

		const lightSpaceMat = this.lightCamera.getLightView();
		const loc = gl.getUniformLocation(shadowProg, "uLightSpaceMatrix");
		gl.uniformMatrix4fv(loc, false, lightSpaceMat.mat);
		gl.uniform1i(gl.getUniformLocation(shadowProg, "uIsInstanced"), 0);
		await this.scene?.lightPass(gl, shadowProg);

		gl.uniform1i(gl.getUniformLocation(shadowProg, "uIsInstanced"), 1);
		gl.uniformMatrix4fv(loc, false, lightSpaceMat.mat);
		await ObjManager.get().lightPass(gl, shadowProg);

		this.shadowMap.unbind(gl, this.canvas.width, this.canvas.height);
	}

	enableProgramSwitch(enable: boolean) {
		this.canSwichProgram = enable;
	}

	public static get(): Engine {
		if (!Engine.instance) {
			Engine.instance = new Engine();
		}
		return Engine.instance;
	}

	getObjectIdAtMouse(
		gl: WebGL2RenderingContext,
		mouseX: number,
		mouseY: number,
	) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureID.FBO);
		gl.readBuffer(gl.COLOR_ATTACHMENT1);

		const pixelData = new Float32Array(4);
		const pixelY = this.canvas.height - mouseY;

		const ix = Math.min(Math.max(0, mouseX), this.canvas.width - 1);
		const iy = Math.min(Math.max(0, pixelY), this.canvas.height - 1);

		gl.readPixels(ix, iy, 1, 1, gl.RGBA, gl.FLOAT, pixelData);

		const x = pixelData[0];
		const y = pixelData[1];
		const z = pixelData[2];
		const id = Math.round(pixelData[3]);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.readBuffer(gl.BACK);

		return { x, y, z, id };
	}
}

class TextureID {
	private _FBO: WebGLFramebuffer | null = null;
	private colorTex: WebGLTexture | null = null;
	private idTex: WebGLTexture | null = null;
	private depthBuffer: WebGLRenderbuffer | null = null;
	private _supportsFloat: boolean = false;

	get FBO() {
		return this._FBO;
	}
	get supportsFloat() {
		return this._supportsFloat;
	}
	resizeMRT(gl: WebGL2RenderingContext, width: number, height: number) {
		if (this.FBO) {
			gl.deleteTexture(this!.colorTex);
			gl.deleteTexture(this!.idTex);
			gl.deleteRenderbuffer(this!.depthBuffer);
			gl.deleteFramebuffer(this!._FBO);
		}
		this.create(gl, width, height);
	}
	constructor(gl: WebGL2RenderingContext, width: number, height: number) {
		this.create(gl, width, height);
	}
	create(gl: WebGL2RenderingContext, width: number, height: number) {
		width = Math.max(1, width);
		height = Math.max(1, height);
		this._FBO = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._FBO);
		this.colorTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.colorTex);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			width,
			height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null,
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.colorTex,
			0,
		);
		this.idTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.idTex);
		const ext = gl.getExtension("EXT_color_buffer_float");
		if (ext) {
			this._supportsFloat = true;
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
		} else {
			this._supportsFloat = false;
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				width,
				height,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null,
			);
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT1,
			gl.TEXTURE_2D,
			this.idTex,
			0,
		);
		this.depthBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
		gl.renderbufferStorage(
			gl.RENDERBUFFER,
			gl.DEPTH_COMPONENT24,
			width,
			height,
		);
		gl.framebufferRenderbuffer(
			gl.FRAMEBUFFER,
			gl.DEPTH_ATTACHMENT,
			gl.RENDERBUFFER,
			this.depthBuffer,
		);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, multiplier = 1) {
	multiplier = multiplier || 1;
	const width = (canvas.clientWidth * multiplier) | 0;
	const height = (canvas.clientHeight * multiplier) | 0;
	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
		return true;
	}
	return false;
}
