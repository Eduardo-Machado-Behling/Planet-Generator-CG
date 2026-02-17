import { ElementObserver, VisualElement } from "./VisualElement.js";

export class VisualSliderNumber implements VisualElement<number> {
  _value: number;
  _lastValue: number;
  elementId: string;
  min: number;
  max: number;
  step: number;
  description: string;
  private observers: ElementObserver<number>[] = [];

  constructor(
    value: number,
    elementId: string,
    min: number,
    max: number,
    step: number = 0.1,
    description: string = "",
  ) {
    this._value = value;
    this._lastValue = value;
    this.elementId = elementId;
    this.min = min;
    this.max = max;
    this.step = step;
    this.description = description;
  }

  get value() {
    return this._value;
  }
  set value(v: number) {
    this._value = v;
    this.triggerOnChange();
  }

  subscribe(observer: ElementObserver<number>): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter((obs) => obs !== observer);
    };
  }

  triggerOnChange(): boolean {
    if (this._value !== this._lastValue) {
      this._lastValue = this._value;
      this.observers.forEach((obs) => obs(this._value));
      return true;
    }
    return false;
  }

  renderHTML() {
    const rangeId = `${this.elementId}-range`;
    const numId = `${this.elementId}-num`;

    return `
      <div style="display: flex; gap: 8px; align-items: center; flex-grow: 1;">
        <input type="range" id="${rangeId}" value="${this._value}" 
               min="${this.min}" max="${this.max}" step="${this.step}" 
               class="noise-slider">
        <input type="number" id="${numId}" value="${this._value}" step="${this.step}">
      </div>
    `;
  }

  attach(root: HTMLElement, onGlobalChange: () => void): void {
    const rangeInput = root.querySelector(
      `#${this.elementId}-range`,
    ) as HTMLInputElement;
    const numInput = root.querySelector(
      `#${this.elementId}-num`,
    ) as HTMLInputElement;

    const update = (val: number) => {
      this.value = val;
      if (this.triggerOnChange()) onGlobalChange();
    };

    if (rangeInput && numInput) {
      rangeInput.addEventListener("input", () => {
        const val = parseFloat(rangeInput.value);
        numInput.value = val.toString();
        update(val);
      });

      numInput.addEventListener("change", () => {
        const val = parseFloat(numInput.value);
        rangeInput.value = val.toString();

        update(val);
      });
    }
  }

  valueOf() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}
