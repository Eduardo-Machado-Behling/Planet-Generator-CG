import { VisualLayer } from "../VisualLayer.js";
import { VisualNumber } from "../VisualNumber.js";
import { VisualSliderNumber } from "../VisualSlider.js";

export class VisualRigidSimplex extends VisualLayer {
  static readonly TYPE = "Rigid (Simplex)";
  readonly type = VisualRigidSimplex.TYPE;

  scale: VisualSliderNumber;
  height: VisualSliderNumber;
  octaves: VisualSliderNumber;
  lacunarity: VisualSliderNumber;
  persistence: VisualSliderNumber;
  multiplier: VisualSliderNumber;
  minValue: VisualSliderNumber;
  seed: VisualNumber;

  constructor(
    name: string,
    scale = 1,
    height = 0.1,
    octaves = 8,
    lacunarity = 5,
    persistence = 0.6,
    multiplier = 0.9,
    seed = 0,
    minValue = 0,
  ) {
    super(name);
    this.scale = new VisualSliderNumber(scale, `${this.id}-scale`, 0, 10, 0.01);
    this.height = new VisualSliderNumber(
      height,
      `${this.id}-height`,
      0,
      10,
      0.01,
    );
    this.octaves = new VisualSliderNumber(
      octaves,
      `${this.id}-octaves`,
      1,
      32,
      1,
    );
    this.lacunarity = new VisualSliderNumber(
      lacunarity,
      `${this.id}-lacunarity`,
      0,
      10,
      0.01,
    );
    this.persistence = new VisualSliderNumber(
      persistence,
      `${this.id}-persistence`,
      0,
      2,
      0.001,
    );
    this.multiplier = new VisualSliderNumber(
      multiplier,
      `${this.id}-multiplier`,
      0,
      5,
      0.001,
    );
    this.seed = new VisualNumber(seed, `${this.id}-seed`, 1);
    this.minValue = new VisualSliderNumber(
      minValue,
      `${this.id}-minValue`,
      -2,
      2,
      0.01,
    );

    this.scale.subscribe(() => this.triggerOnChange());
    this.height.subscribe(() => this.triggerOnChange());
    this.octaves.subscribe(() => this.triggerOnChange());
    this.lacunarity.subscribe(() => this.triggerOnChange());
    this.persistence.subscribe(() => this.triggerOnChange());
    this.multiplier.subscribe(() => this.triggerOnChange());
    this.seed.subscribe(() => this.triggerOnChange());
    this.minValue.subscribe(() => this.triggerOnChange());
  }

  renderParams(): string {
    return `
        <div class="control-group">
            <label>Seed</label>
            ${this.seed.renderHTML()}
        </div>
        <div class="control-group">
            <label>Scale</label>
            ${this.scale.renderHTML()}
        </div>
        <div class="control-group">
            <label>Height</label>
            ${this.height.renderHTML()}
        </div>
        <div class="control-group">
            <label>Octaves</label>
            ${this.octaves.renderHTML()}
        </div>
        <div class="control-group">
            <label>Lacunarity</label>
            ${this.lacunarity.renderHTML()}
        </div>
        <div class="control-group">
            <label>Persistence</label>
            ${this.persistence.renderHTML()}
        </div>
        <div class="control-group">
            <label>Multiplier</label>
            ${this.multiplier.renderHTML()}
        </div>
        <div class="control-group">
            <label>Minimum Value</label>
            ${this.minValue.renderHTML()}
        </div>
    `;
  }

  attachParams(root: HTMLElement, onGlobalChange: () => void): void {
    this.seed.attach(root, onGlobalChange);
    this.scale.attach(root, onGlobalChange);
    this.octaves.attach(root, onGlobalChange);
    this.height.attach(root, onGlobalChange);
    this.lacunarity.attach(root, onGlobalChange);
    this.persistence.attach(root, onGlobalChange);
    this.multiplier.attach(root, onGlobalChange);
    this.minValue.attach(root, onGlobalChange);
  }

  getParams() {
    return {
      scale: this.scale.value,
      height: this.height.value,
      octaves: this.octaves.value,
      lacunarity: this.lacunarity.value,
      persistence: this.persistence.value,
      multiplier: this.multiplier.value,
      seed: this.seed.value,
      minValue: this.minValue.value,
    };
  }
}
