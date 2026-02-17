import { ElementObserver, VisualElement } from './VisualElement.js';

export class VisualVector3 implements
	VisualElement<{ x: number, y: number, z: number }> {
	_value: { x: number, y: number, z: number };
	_lastValueStr: string;
	elementId: string;
	description: string;
	private observers: ElementObserver<{ x: number, y: number, z: number }>[] = [];
	private inputs: HTMLInputElement[] = [];

	constructor(
		value: { x: number, y: number, z: number }, elementId: string,
		description: string = '') {
		this._value = { ...value };
		this._lastValueStr = JSON.stringify(value);
		this.elementId = elementId;
		this.description = description;
	}

	get value() {
		return this._value;
	}
	set value(v: { x: number, y: number, z: number }) {
		this._value = { ...v };
		this.updateUI();
	}

	subscribe(observer: ElementObserver<{ x: number, y: number, z: number }>):
		() => void {
		this.observers.push(observer);
		return () => {
			this.observers = this.observers.filter(obs => obs !== observer);
		};
	}

	triggerOnChange(): boolean {
		const currentStr = JSON.stringify(this._value);
		if (currentStr !== this._lastValueStr) {
			this._lastValueStr = currentStr;
			this.observers.forEach(obs => obs(this._value));
			return true;
		}
		return false;
	}

	private updateUI() {
		if (this.inputs[0]) this.inputs[0].value = this._value.x.toString();
		if (this.inputs[1]) this.inputs[1].value = this._value.y.toString();
		if (this.inputs[2]) this.inputs[2].value = this._value.z.toString();
	}

	renderHTML() {
		return `
      <div style="display: flex; gap: 4px; flex-grow: 1;">
        <input type="number" id="${this.elementId}-x" value="${this._value.x}" step="0.1" placeholder="X">
        <input type="number" id="${this.elementId}-y" value="${this._value.y}" step="0.1" placeholder="Y">
        <input type="number" id="${this.elementId}-z" value="${this._value.z}" step="0.1" placeholder="Z">
      </div>
    `;
	}

	attach(root: HTMLElement, onGlobalChange: () => void): void {
		this.inputs = ['x', 'y', 'z'].map(
			axis => root.querySelector(`#${this.elementId}-${axis}`) as
				HTMLInputElement);

		this.inputs.forEach((input, i) => {
			if (!input) return;
			input.addEventListener('input', () => {
				const val = parseFloat(input.value) || 0;
				if (i === 0) this._value.x = val;
				if (i === 1) this._value.y = val;
				if (i === 2) this._value.z = val;

				if (this.triggerOnChange()) onGlobalChange();
			});
		});
	}

	toJSON() {
		return this._value;
	}
}

export function toVec3(value: { x: number; y: number; z: number; }):
	Iterable<number> {
	return [value.x, value.y, value.z];
}
