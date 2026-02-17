import { ElementObserver, VisualElement } from "./VisualElement.js";

export class VisualNumber implements VisualElement<number> {
  _value: number;
  _lastValue: number;
  elementId: string;
  step: number;
  min: number | null;
  description: string;
  private observers: ElementObserver<number>[] = [];

  constructor(
    value: number,
    elementId: string,
    step: number = 0.1,
    min: number | null = null,
    description: string = "",
  ) {
    this._value = value;
    this._lastValue = value;
    this.description = description;
    this.elementId = elementId;
    this.step = step;
    this.min = min;
  }

  get value() {
    return this._value;
  }
  set value(v: number) {
    this._value = v;
  }
  toJSON() {
    return this._value;
  }

  subscribe(observer: ElementObserver<number>): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter((obs) => obs !== observer);
    };
  }

  triggerOnChange(): boolean {
    if (
      this._value !== this._lastValue &&
      (this.min === null || this._value > this.min)
    ) {
      this._lastValue = this._value;
      this.observers.forEach((obs) => obs(this._value));
      return true;
    }
    return false;
  }

  renderHTML() {
    return `<input type="number" id="${this.elementId}" value="${
      this._value
    }" step="${
      this.step
    }" style="width: 60%; background: #121212; border: 1px solid #3e3e3e; color: white; padding: 4px; border-radius: 3px;">`;
  }

  attach(root: HTMLElement, onGlobalChange: () => void): void {
    const input = root.querySelector("#" + this.elementId) as HTMLInputElement;
    if (input) {
      input.addEventListener("change", () => {
        this.value = parseFloat(input.value);
        if (this.triggerOnChange()) onGlobalChange();
      });
    }
  }

  valueOf() {
    return this._value;
  }
}
