import {Engine} from './engine/Engine.js';
import {Quaternion, SquaredMatrix, Vector} from './engine/Math.js';
import {Camera} from './engine/objects/Camera.js';
import {GameObject} from './engine/objects/GameObject.js';
import {Orbit} from './engine/objects/Orbit.js';
import {Planet} from './engine/objects/Planet.js';
import {Scene} from './engine/Scene.js';

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, multiplier = 1) {
  multiplier = multiplier || 1;
  const width = canvas.clientWidth * multiplier | 0;
  const height = canvas.clientHeight * multiplier | 0;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}


async function main() {
  const engine = Engine.get();
  const gl = engine.gl;

  engine.scene = new Scene();
  let planetOrbit = new Orbit();
  planetOrbit.setParent(engine.scene);

  let planet = new Planet();
  planet.scale = new Vector(3).fill(0.5);
  planet.setParent(planetOrbit)

  let moonOrbit = new Orbit();
  moonOrbit.translation = Vector.Vec([0, 1, 0])
  moonOrbit.setParent(engine.scene);

  let moon = new Planet();
  moon.scale = new Vector(3).fill(0.1);
  moon.setParent(moonOrbit);
  moon.translation = Vector.Vec([0, 0, 0])

  const fov = 60 * (Math.PI / 180);
  let cameraAspect = gl.canvas.width / gl.canvas.height;
  const near = 0.1;
  const far = 100.0;
  engine.camera =
      new Camera(SquaredMatrix.MakePerspective(fov, cameraAspect, near, far));

  engine.camera.target = planet;
  engine.camera.translation = Vector.Vec([0, 0, 3]);

  engine.camera.setParent(engine.scene);

  let then = 0
  let cameraAngle = 0;
  let moonAngle = 0;
  let planetAngle = 0;
  let orbitAngle = 0;

  async function render(now: number) {
    now *= 0.001;
    let dt = now - then;
    then = now;

    if (resizeCanvasToDisplaySize(engine.canvas)) {
      const aspect = gl.canvas.width / gl.canvas.height;
      if (aspect != cameraAspect) {
        cameraAspect = aspect;
        if (engine.camera)
          engine.camera.proj =
              SquaredMatrix.MakePerspective(fov, cameraAspect, near, far);
      }
    }


    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // if (engine.camera) {
    //   cameraAngle += dt * 2;
    //   engine.camera.rotation = Quaternion.FromAxisAngle(Vector.up,
    //   cameraAngle);
    // }

    moonAngle += dt * 4;
    moon.rotation = Quaternion.FromAxisAngle(Vector.up, moonAngle)

    orbitAngle += dt * 2;
    moonOrbit.rotation = Quaternion.FromAxisAngle(Vector.forward, orbitAngle)

    planetAngle += dt * 0.5;
    planet.rotation = Quaternion.FromAxisAngle(Vector.up, planetAngle)


    if (engine.scene) {
      engine.scene.computeWorldMatrix(new SquaredMatrix(4).Identity());

      await engine.scene.mainloop(gl);
    }


    requestAnimationFrame(render);
  }

  render(0)
}


(window as any).main = main;

main();