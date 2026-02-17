import { ElementObserver, VisualElement } from './VisualElement.js';

export interface GradientStop {
	offset: number;  
	color: string;   
}

export class VisualGradient implements VisualElement<GradientStop[]> {
	_value: GradientStop[];
	_lastValueStr: string;
	elementId: string;
	description: string;
	private observers: ElementObserver<GradientStop[]>[] = [];

	private container: HTMLElement | null = null;
	private track: HTMLElement | null = null;
	private colorInput: HTMLInputElement | null = null;

	private activeDragStop: GradientStop | null = null;
	private activeEditStop: GradientStop | null = null;

	constructor(
		value: GradientStop[], elementId: string, description: string = '') {
		this._value = value.sort((a, b) => a.offset - b.offset);
		this._lastValueStr = JSON.stringify(this._value);
		this.elementId = elementId;
		this.description = description;
	}

	get value() {
		return this._value;
	}
	set value(v: GradientStop[]) {
		this._value = v.sort((a, b) => a.offset - b.offset);
		this.updateUI();
	}

	subscribe(observer: ElementObserver<GradientStop[]>): () => void {
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

	toJSON() {
		return this._value;
	}

	renderHTML() {
		return `
      <div id="${this.elementId}" class="gradient-editor">
         <div class="gradient-preview"></div>
         <input type="color" class="gradient-color-picker">
         </div>
    `;
	}

	private updateUI() {
		if (!this.container || !this.track) return;

		
		const sortedStops = [...this._value].sort((a, b) => a.offset - b.offset);
		const stopsStr =
			sortedStops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
		this.track.style.background = `linear-gradient(to right, ${stopsStr})`;

		
		const thumbs =
			Array.from(this.container.querySelectorAll('.gradient-thumb')) as
			HTMLElement[];

		
		while (thumbs.length > this._value.length) {
			thumbs.pop()?.remove();
		}

		
		while (thumbs.length < this._value.length) {
			const thumb = document.createElement('div');
			thumb.className = 'gradient-thumb';
			this.container.appendChild(thumb);
			thumbs.push(thumb);
		}

		
		this._value.forEach((stop, index) => {
			const thumb = thumbs[index];
			thumb.style.left = `${stop.offset * 100}%`;
			thumb.style.backgroundColor = stop.color;
			thumb.dataset.index = index.toString();
			thumb.title = `Offset: ${(stop.offset)
					.toFixed(
						2)}\nDouble-click to change color\nRight-click to remove`;

			if (stop === this.activeDragStop) {
				thumb.style.zIndex = '100';
				thumb.style.borderColor = '#007acc';
			} else {
				thumb.style.zIndex = '';
				thumb.style.borderColor = '#fff';
			}
		});
	}

	attach(root: HTMLElement, onGlobalChange: () => void): void {
		this.container = root.querySelector('#' + this.elementId);
		if (!this.container) return;

		this.track = this.container.querySelector('.gradient-preview');
		this.colorInput = this.container.querySelector('.gradient-color-picker');
		this.updateUI();

		const onMove = (e: MouseEvent) => {
			if (!this.activeDragStop) return;
			const rect = this.container!.getBoundingClientRect();
			let x = e.clientX - rect.left;
			let offset = Math.max(0, Math.min(1, x / rect.width));

			this.activeDragStop.offset = offset;
			this.updateUI();  

			if (this.triggerOnChange()) onGlobalChange();
		};

		const onUp = () => {
			if (this.activeDragStop) {
				this.activeDragStop = null;
				window.removeEventListener('mousemove', onMove);
				window.removeEventListener('mouseup', onUp);

				
				
				this._value.sort((a, b) => a.offset - b.offset);
				this.updateUI();
				if (this.triggerOnChange()) onGlobalChange();
			}
		};

		
		this.container.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;  

			const target = e.target as HTMLElement;
			const rect = this.container!.getBoundingClientRect();

			if (target.classList.contains('gradient-thumb')) {
				
				const idx = parseInt(target.dataset.index || '-1');
				if (idx >= 0 && idx < this._value.length) {
					this.activeDragStop = this._value[idx];
					window.addEventListener('mousemove', onMove);
					window.addEventListener('mouseup', onUp);
					e.stopPropagation();
				}
			} else if (target === this.track || target === this.container) {
				
				const x = e.clientX - rect.left;
				const offset = Math.max(0, Math.min(1, x / rect.width));

				const newStop = { offset, color: '#ffffff' };
				this._value.push(newStop);
				this.updateUI();  

				
				this.activeDragStop = newStop;
				window.addEventListener('mousemove', onMove);
				window.addEventListener('mouseup', onUp);

				if (this.triggerOnChange()) onGlobalChange();
			}
		});

		
		this.container.addEventListener('dblclick', (e) => {
			if (e.button !== 0) return;
			const target = e.target as HTMLElement;
			if (target.classList.contains('gradient-thumb')) {
				const idx = parseInt(target.dataset.index || '-1');
				if (idx >= 0 && idx < this._value.length && this.colorInput) {
					this.activeEditStop = this._value[idx];
					this.colorInput.value = this.activeEditStop.color;
					this.colorInput.click();
				}
			}
		});

		
		if (this.colorInput) {
			this.colorInput.addEventListener('input', () => {
				if (this.activeEditStop && this.colorInput) {
					this.activeEditStop.color = this.colorInput.value;
					this.updateUI();
					if (this.triggerOnChange()) onGlobalChange();
				}
			});
		}

		
		this.container.addEventListener('contextmenu', (e) => {
			const target = e.target as HTMLElement;
			if (target.classList.contains('gradient-thumb')) {
				e.preventDefault();
				e.stopPropagation();
				const idx = parseInt(target.dataset.index || '-1');

				
				if (idx >= 0 && idx < this._value.length && this._value.length > 2) {
					this._value.splice(idx, 1);
					this.updateUI();
					if (this.triggerOnChange()) onGlobalChange();
				}
			}
		});
	}
}
