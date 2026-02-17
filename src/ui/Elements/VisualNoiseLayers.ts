import { NoiseLayer } from "./Noise/NoiseLayer.js";
import { ElementObserver, VisualElement } from "./VisualElement.js";
import { VisualLayer } from "./VisualLayer.js";
import { AVAILABLE_LAYERS } from "./VisualNoises.js";

export class LayerFactory {
  static create(type: string, name: string = ""): VisualLayer | null {
    for (let index = 0; index < AVAILABLE_LAYERS.length; index++) {
      const element = AVAILABLE_LAYERS[index];
      if (element.TYPE === type) {
        return new element(name || `${element.TYPE} Layer`);
      }
    }

    return null;
  }
}

/**
 * VisualLayerList
 * Manages the list of VisualLayer instances and the DOM.
 */
export class VisualLayerList implements VisualElement<NoiseLayer[]> {
  private layerMap = new Map<string, VisualLayer>();
  private layers: VisualLayer[] = [];

  elementId: string;
  private observers: ElementObserver<NoiseLayer[]>[] = [];
  private containerEl: HTMLElement | null = null;
  private activeDragItem: HTMLElement | null = null;
  private onGlobalChange: (() => void) | null = null;

  public _baseLayerId: string | null = null;

  constructor(elementId: string) {
    this.elementId = elementId;
  }

  get value() {
    return this.layers.map((l) => l.value);
  }
  set value(v: NoiseLayer[]) {}

  toJSON() {
    return this.value;
  }

  clear() {
    this.layers = [];
    this.layerMap.clear();

    if (this.containerEl) this.containerEl.innerHTML = "";
  }

  loadFromData(data: NoiseLayer[]) {
    this.clear();
    data.forEach((layerData) => {
      const layer = LayerFactory.create(layerData.type, layerData.name);
      if (layer) {
        layer.blendMode = layerData.blendMode;
        Object.keys(layerData.params).forEach((key) => {
          if (key === "blendMode") return;
          const prop = (layer as any)[key];
          if (prop && prop.value !== undefined) {
            prop.value = layerData.params[key];
          }
        });
        this.addLayer(layer);
      }
    });
  }

  get baseLayerId() {
    return this._baseLayerId;
  }

  public getLayerData(id: string | null): NoiseLayer | undefined {
    if (!id) return undefined;
    return this.layerMap.get(id)?.value;
  }

  subscribe(observer: ElementObserver<NoiseLayer[]>): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter((obs) => obs !== observer);
    };
  }

  triggerOnChange(): boolean {
    const val = this.value;
    this.observers.forEach((obs) => obs(val));
    return true;
  }

  renderHTML(): string {
    return `
      <div style="display: flex; flex-direction: column; height: 100%; width: 100%; gap: 10px;">
        <div style="display:flex; gap:5px; flex-shrink: 0;">
            <select id="${this.elementId}-type-select" style="flex:1;">
                ${this.getOptions()}
            </select>
            <button id="${this.elementId}-btn-add" class="btn-add">
                + Add
            </button>
        </div>
        <div id="${this.elementId}" class="layer-stack-container stack-container">
            </div>
      </div>
    `;
  }

  getOptions() {
    let source = "";
    for (let index = 0; index < AVAILABLE_LAYERS.length; index++) {
      const element = AVAILABLE_LAYERS[index];
      source += `<option value="${element.TYPE}">${element.TYPE}</option>
      `;
    }

    return source;
  }

  private dragCache: { elements: HTMLElement[]; rects: DOMRect[] } | null =
    null;

  private rafPending = false;
  private lastInsertPosition: {
    drag: HTMLElement;
    after: Element | null;
  } | null = null;

  attach(root: HTMLElement, onGlobalChange: () => void): void {
    this.containerEl = root.querySelector("#" + this.elementId) as HTMLElement;
    const addBtn = root.querySelector(
      "#" + this.elementId + "-btn-add",
    ) as HTMLElement;
    const typeSelect = root.querySelector(
      "#" + this.elementId + "-type-select",
    ) as HTMLSelectElement;
    this.onGlobalChange = onGlobalChange;

    if (!this.containerEl || !addBtn) return;

    if (this.layers.length > 0 && this.containerEl.children.length === 0) {
      this.layers.forEach((layer) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = layer.renderHTML();
        const domEl = wrapper.firstElementChild as HTMLElement;
        this.containerEl!.appendChild(domEl);
        layer.attach(this.containerEl!, onGlobalChange);
      });
    }

    addBtn.addEventListener("click", () => {
      const type = typeSelect.value;
      const newLayer = LayerFactory.create(type);
      if (newLayer) this.addLayer(newLayer);
    });

    this.containerEl.addEventListener(
      "dragover",
      this.onDragOverThrottled.bind(this),
    );

    this.containerEl.addEventListener("drop", (e) => e.preventDefault());

    this.containerEl.addEventListener("layer-remove", (e: any) => {
      const id = e.detail.id;
      this.removeLayer(id);
    });

    this.containerEl.addEventListener("layer-drag-start", (e: any) => {
      this.activeDragItem = e.detail.el;
      this.containerEl?.classList.add("is-dragging");
      this.buildDragCache();
    });

    this.containerEl.addEventListener("layer-drag-end", () => {
      this.containerEl?.classList.remove("is-dragging");
      this.clearDragCache();
      this.activeDragItem = null;
      this.syncOrderFromDOM();
    });
  }

  private onDragOverThrottled = (() => {
    let lastTime = 0;
    return (e: DragEvent) => {
      const now = performance.now();
      if (now - lastTime < 16) return;
      lastTime = now;
      this.onDragOver(e);
    };
  })();

  private onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.containerEl || !this.activeDragItem) return;

    const after = this.getDragAfterElement(e.clientY);

    this.scheduleDOMUpdate(this.activeDragItem, after);
  }

  private scheduleDOMUpdate(drag: HTMLElement, after: Element | null): void {
    this.lastInsertPosition = { drag, after };

    if (!this.rafPending) {
      this.rafPending = true;
      requestAnimationFrame(() => {
        if (this.lastInsertPosition && this.containerEl) {
          const { drag, after } = this.lastInsertPosition;

          if (after !== drag.nextElementSibling) {
            if (after) {
              this.containerEl.insertBefore(drag, after);
            } else {
              this.containerEl.appendChild(drag);
            }
          }
        }
        this.rafPending = false;
        this.lastInsertPosition = null;
      });
    }
  }

  private buildDragCache(): void {
    if (!this.containerEl) return;

    const elements = Array.from(
      this.containerEl.querySelectorAll<HTMLElement>(
        ".draggable-layer:not(.dragging)",
      ),
    );

    const rects = elements.map((el) => el.getBoundingClientRect());

    this.dragCache = { elements, rects };
  }

  private clearDragCache(): void {
    this.dragCache = null;
  }

  private getDragAfterElement(y: number): Element | null {
    if (!this.containerEl) return null;

    if (!this.dragCache) {
      this.buildDragCache();
    }

    if (!this.dragCache) return null;

    const { elements, rects } = this.dragCache;

    let closestOffset = Number.NEGATIVE_INFINITY;
    let closestElement: Element | null = null;

    for (let i = 0; i < elements.length; i++) {
      const box = rects[i];
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closestElement = elements[i];
      }
    }

    return closestElement;
  }

  public addLayer(layer: VisualLayer): void {
    layer.subscribe((_) => this.triggerOnChange());
    this.layers.push(layer);
    this.layerMap.set(layer.id, layer);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = layer.renderHTML();
    const domEl = wrapper.firstElementChild as HTMLElement;
    this.containerEl?.appendChild(domEl);

    if (this.onGlobalChange) {
      layer.attach(this.containerEl!, this.onGlobalChange);
    }

    this.triggerOnChange();
    if (this.onGlobalChange) this.onGlobalChange();
  }

  private setBaseLayer(id: string): void {
    if (this._baseLayerId === id) return;

    const oldBase = this._baseLayerId
      ? this.layerMap.get(this._baseLayerId)
      : null;
    const newBase = this.layerMap.get(id);

    if (oldBase) oldBase.setIsBase(false);
    if (newBase) {
      newBase.setIsBase(true);
      this._baseLayerId = id;
    }

    if (this.onGlobalChange) this.onGlobalChange();
  }

  private removeLayer(id: string): void {
    const layer = this.layerMap.get(id);
    if (layer) {
      this.layers = this.layers.filter((l) => l !== layer);
      this.layerMap.delete(id);

      if (this.containerEl) {
        const elToRemove = this.containerEl.querySelector(`#${id}`);
        if (elToRemove) elToRemove.remove();
      }

      this.triggerOnChange();
      if (this.onGlobalChange) this.onGlobalChange();
    }
  }

  private syncOrderFromDOM(): void {
    if (!this.containerEl) return;
    const newOrder: VisualLayer[] = [];
    const domIds = Array.from(this.containerEl.children).map((c) => c.id);
    domIds.forEach((id) => {
      const layer = this.layerMap.get(id);
      if (layer) newOrder.push(layer);
    });
    this.layers = newOrder;

    this.triggerOnChange();
    if (this.onGlobalChange) this.onGlobalChange();
  }
}
