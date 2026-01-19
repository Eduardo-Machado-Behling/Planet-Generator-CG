import {Camera} from './objects/Camera.js';
import {GameObject} from './objects/GameObject.js';

export class Scene extends GameObject {
  currCamera: Camera|null = null;

  constructor() {
    super();

    this.dirty = false;
  }
}