import {SquaredMatrix} from '../Math.js';

import {GameObject} from './GameObject.js';

export class Orbit extends GameObject {
  computeLocalMatrix(): void {
    this.localMatrix = SquaredMatrix.scaling(this.local.scale);
    this.localMatrix.transform(SquaredMatrix.translation(this.local.translation));
    this.localMatrix.transform(SquaredMatrix.rotation(this.local.rotation));
  }
}
