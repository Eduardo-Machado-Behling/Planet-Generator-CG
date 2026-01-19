export class ShaderManager {
  static programs = new Map<string, WebGLProgram>();

  static async load(
      gl: WebGL2RenderingContext, vertex: string = 'default',
      fragment: string = 'default',
      beforeLink?: (program: WebGLProgram) => void): Promise<WebGLProgram> {
    const name = `${vertex}/${fragment}`;
    const cache = this.programs.get(name);
    if (cache) {
      return cache;
    }

    const [vertSource, fragSource] = await Promise.all([
      loadShaderSource(`./assets/shaders/${vertex}.vert`),
      loadShaderSource(`./assets/shaders/${fragment}.frag`)
    ]);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSource);

    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragShader);

    if (beforeLink) beforeLink(program);

    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      throw Error(`Link failed:\n${gl.getProgramInfoLog(program)}`);
    }

    this.programs.set(name, program);
    return program;
  }
}

async function loadShaderSource(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
        `Failed to load shader from ${url}: ${response.statusText}`);
  }
  return await response.text();
}

export function createShader(
    gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  let shader = gl.createShader(type);

  if (shader) {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (!success) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw Error(`Error compilation: ${info}`);
    }
  } else {
    throw Error(`Error shader creation`);
  }

  return shader;
}