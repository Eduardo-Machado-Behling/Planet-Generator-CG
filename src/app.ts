import { Engine, MouseButton } from "./engine/Engine.js";
import { Quaternion, SquaredMatrix, Vector } from "./engine/Math.js";
import { Camera } from "./engine/objects/Camera.js";
import { GameObject, IDManager } from "./engine/objects/GameObject.js";
import { Orbit } from "./engine/objects/Orbit.js";
import { Planet } from "./engine/objects/Planet.js";
import { Sky } from "./engine/objects/Sky.js";
import { Sphere } from "./engine/objects/Sphere.js";
import { Tree } from "./engine/objects/Tree.js";
import { Scene } from "./engine/Scene.js";
import { ConfigManager, SystemStateData } from "./ui/ConfigManager.js";

async function main() {
  const engine = Engine.get();
  const gl = engine.gl;

  const manager = ConfigManager.initialize("stack-container");
  const state = ConfigManager.get().getSystemState();

  engine.scene = new Scene();

  let sun = new Sphere("Sun");
  sun.setParent(engine.scene);

  let planetOrbit = new Orbit("PlanetOrbit");
  planetOrbit.setParent(sun);
  planetOrbit.local.translation = Vector.Vec3(
    state.global.planetDisplacement.value,
  );
  state.global.planetDisplacement.subscribe((pos) => {
    planetOrbit.local.translation = Vector.Vec3(pos);
  });

  let sky = new Sky("Sky");
  sky.setFirstParent(engine.scene);

  let planet = new Planet("Planet");
  planet.local.scale = new Vector(3).fill(0.5);
  planet.setParent(planetOrbit);

  let moonOrbit = new Orbit("MoonOrbit");
  moonOrbit.local.translation = Vector.Vec([0, 1.5, 0]);
  moonOrbit.setParent(planetOrbit);

  let moon = new Planet("Moon");
  moon.local.scale = new Vector(3).fill(0.2);
  moon.setParent(moonOrbit);
  moon.local.translation = Vector.Vec([0, 0, 0]);

  const fov = 60 * (Math.PI / 180);
  let cameraAspect = gl.canvas.width / gl.canvas.height;
  const near = 0.1;
  const far = 100.0;
  engine.camera = new Camera(
    SquaredMatrix.MakePerspective(fov, cameraAspect, near, far),
  );

  engine.camera.local.translation = Vector.Vec3(
    state.global.cameraPosition.value,
  );

  let globalPos = engine.camera.local.translation;
  let planetPos = engine.camera.local.translation;
  let rel = state.global.cameraRelativePlanet.value;
  state.global.cameraPosition.subscribe((vec) => {
    if (engine.camera) {
      engine.camera.local.translation = Vector.Vec3(vec);
      if (rel) {
        planetPos = engine.camera.local.translation;
      } else {
        globalPos = engine.camera.local.translation;
      }
    }
  });

  const relCall = (rela: boolean) => {
    rel = rela;
    engine.afterUpdate(() => {
      if (engine.camera) {
        if (rela) {
          engine.camera.setParent(planetOrbit);
          engine.camera.target = planet;

          state.global.cameraPosition.value = planetPos.toVec3();
          state.global.cameraPosition.triggerOnChange();
        } else {
          engine.camera.setParent(sun);
          engine.camera.target = null;

          state.global.cameraPosition.value = globalPos.toVec3();
          state.global.cameraPosition.triggerOnChange();
        }
      }
    });
  };

  relCall(rel);
  state.global.cameraRelativePlanet.subscribe(relCall);

  let then = 0;
  let cameraAngle = 0;
  let moonAngle = 0;
  let planetAngle = 0;
  let orbitAngle = 0;
  let planetOrbitAngle = 0;
  let playRate = state.global.playrate.value;

  state.global.playrate.subscribe((data) => (playRate = data));

  const fullRevolution = 2 * Math.PI;

  moon.updates.push((gl, dt) => {
    moonAngle += dt * 4;
    if (moonAngle > fullRevolution) moonAngle = 0;

    moon.local.rotation = Quaternion.FromAxisAngle(Vector.up, moonAngle);
  });

  let dir = Vector.left;
  moonOrbit.updates.push((gl, dt) => {
    orbitAngle += dt * 2;
    if (orbitAngle > fullRevolution) {
      orbitAngle = 0;
    }
    moonOrbit.local.rotation = Quaternion.FromAxisAngle(dir, orbitAngle);
  });

  planet.updates.push((gl, dt) => {
    planetAngle += dt * 0.5;
    if (planetAngle > fullRevolution) planetAngle = 0;
    planet.local.rotation = Quaternion.FromAxisAngle(Vector.up, planetAngle);
  });

  planetOrbit.updates.push((gl, dt) => {
    planetOrbitAngle += dt * 1;
    if (planetOrbitAngle > fullRevolution) planetOrbitAngle = 0;
    planetOrbit.local.rotation = Quaternion.FromAxisAngle(
      Vector.up,
      planetOrbitAngle,
    );
  });

  let trees: Tree[] = [];
  const planetId = planet.pickId;
  engine.mouseCallbacks.push(({ position: pos, id: data, button }) => {
    if (data.id === planetId && button === MouseButton.LEFT) {
      console.log(`Hit Object ${data.id} at WorldPos:`, data.x, data.y, data.z);

      if (trees.length <= state.sphere.maxTrees.value) {
        let tree = new Tree(trees);
        tree.setParent(planet);

        let hitWorldPos = Vector.Vec3({ x: data.x, y: data.y, z: data.z });

        let inverseMatrix = new SquaredMatrix(4);
        inverseMatrix.mat.set(planet.worldMatrix.mat);
        inverseMatrix.invert();

        let localPos = inverseMatrix.multiplyVector(hitWorldPos);

        tree.local.translation = localPos;

        let normal = localPos.normalized();
        tree.local.scale = new Vector(3).fill(0.025);

        tree.local.rotation = Quaternion.FromToRotation(Vector.up, normal);
      }
    } else if (
      data.id !== planetId &&
      data.id > 0 &&
      button === MouseButton.RIGHT
    ) {
      console.log(
        `Deleting Object ${data.id} at WorldPos:`,
        data.x,
        data.y,
        data.z,
      );
      IDManager.get().getObject(data.id)?.destroy();
    } else {
      console.log(
        `${pos.x}, ${pos.y} -> ${data.x}, ${data.y}, ${data.z}, ${data.id} Hit Background`,
      );
    }
  });

  engine.light = sun;
  engine.lightTarget = planet;
  engine.start();

  async function render(now: number) {
    now *= 0.001;
    let dt = now - then;
    then = now;

    dt *= playRate;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    if (engine.scene) {
      await engine.mainloop(dt);
    }

    requestAnimationFrame(render);
  }

  let last = state.global.playrate.value;
  let paused = false;
  document.addEventListener("keydown", (ev) => {
    if (ev.key == " ") {
      if (!paused) {
        last = state.global.playrate.value;
        state.global.playrate.value = 0;
      } else {
        state.global.playrate.value = last;
      }
      paused = !paused;
    }
  });

  render(0);
}

(window as any).main = main;

main();
