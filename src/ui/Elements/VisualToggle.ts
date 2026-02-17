import {ElementObserver, VisualElement} from './VisualElement.js';

export class VisualToggle implements VisualElement<boolean> {
  _value: boolean;
  _lastValue: boolean;
  elementId: string;
  description: string;
  private observers: ElementObserver<boolean>[] = [];
  private inputEl: HTMLInputElement|null = null;

  constructor(value: boolean, elementId: string, description: string = '') {
    this._value = value;
    this._lastValue = value;
    this.elementId = elementId;
    this.description = description;
  }

  get value() {
    return this._value;
  }
  set value(v: boolean) {
    this._value = v;
    if (this.inputEl) this.inputEl.checked = v;
  }

  subscribe(observer: ElementObserver<boolean>): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter(obs => obs !== observer);
    };
  }

  triggerOnChange(): boolean {
    if (this._value !== this._lastValue) {
      this._lastValue = this._value;
      this.observers.forEach(obs => obs(this._value));
      return true;
    }
    return false;
  }

renderHTML() {
    return `<input type="checkbox" id="${this.elementId}" ${this._value ? 'checked' : ''}>`;
}

  attach(root: HTMLElement, onGlobalChange: () => void): void {
    this.inputEl = root.querySelector('#' + this.elementId) as HTMLInputElement;
    if (this.inputEl) {
      this.inputEl.addEventListener('change', () => {
        this._value = this.inputEl!.checked;
        if (this.triggerOnChange()) onGlobalChange();
      });
    }
  }

  toJSON() {
    return this._value;
  }
}
