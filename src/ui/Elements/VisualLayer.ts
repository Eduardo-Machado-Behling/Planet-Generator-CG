import { NoiseLayer } from "./Noise/NoiseLayer.js";
import { ElementObserver, VisualElement } from "./VisualElement.js";
import { BLEND_MODE, BLEND_MODES, BlendMode } from "./VisualNoises.js";

export abstract class VisualLayer implements VisualElement<NoiseLayer> {
  id: string;
  name: string;
  enabled: boolean = true;
  blendMode: BlendMode = "Add";

  abstract readonly type: string;
  static readonly TYPE: string;

  protected observers: ElementObserver<NoiseLayer>[] = [];
  protected containerEl: HTMLElement | null = null;

  constructor(name: string) {
    this.id = "layer-" + Math.random().toString(36).substr(2, 9);
    this.name = name || "Unnamed Layer";
  }

  abstract renderParams(): string;
  abstract attachParams(root: HTMLElement, onGlobalChange: () => void): void;
  abstract getParams(): Record<string, number>;

  get value(): NoiseLayer {
    const params = this.getParams();

    params["blendMode"] = BLEND_MODES.indexOf(this.blendMode);
    params["enabled"] = this.enabled ? 1 : 0;

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      enabled: this.enabled,
      blendMode: this.blendMode,
      params: params,
    };
  }

  set value(v: NoiseLayer) {
    this.name = v.name;
    this.blendMode = v.blendMode;
  }

  public setIsBase(isBase: boolean) {
    if (this.containerEl) {
      const btn = this.containerEl.querySelector(".btn-base") as HTMLElement;
      if (btn) {
        btn.style.color = isBase ? "#ffc107" : "#444";
        btn.style.opacity = isBase ? "1" : "0.5";
        btn.title = isBase ? "Current Base Layer" : "Set as Base Layer";
      }
    }
  }

  subscribe(observer: ElementObserver<NoiseLayer>): () => void {
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
      <div id="${this.id}" class="panel-item draggable-layer">
        <div class="panel-header">
            <span class="drag-handle">☰</span>

            <input type="checkbox" class="layer-enable-toggle" ${this.enabled ? "checked" : ""} 
                   title="Enable/Disable Layer">
            
            <div style="flex-grow: 1; display: flex; align-items: baseline; gap: 6px;">
                <span class="panel-title" contenteditable="true" spellcheck="false">
                      ${this.name}
                </span>
                <span style="font-size: 0.8rem; color: #888; user-select: none;">(${this.type})</span>
            </div>

            <span class="btn-remove">×</span>
        </div>
        
        <div class="panel-content collapsed">
             <div class="control-group">
                <label>Blend Mode</label>
                <select class="setting-blend-mode">
                    ${this.generateOptions()}
                </select>
             </div>
             ${this.renderParams()}
        </div>
      </div>
    `;
  }

  generateOptions() {
    let source = "";

    BLEND_MODES.forEach((element) => {
      source += ` <option value="${element}" ${this.blendMode === element ? "selected" : ""}>${element}</option> `;
    });

    return source;
  }

  attach(root: HTMLElement, onGlobalChange: () => void): void {
    this.containerEl = root.querySelector("#" + this.id) as HTMLElement;
    if (!this.containerEl) return;

    const header = this.containerEl.querySelector(
      ".panel-header",
    ) as HTMLElement;
    const content = this.containerEl.querySelector(
      ".panel-content",
    ) as HTMLElement;
    const removeBtn = this.containerEl.querySelector(
      ".btn-remove",
    ) as HTMLElement;
    const blendSelect = this.containerEl.querySelector(
      ".setting-blend-mode",
    ) as HTMLSelectElement;

    const title = this.containerEl.querySelector(".panel-title") as HTMLElement;
    const handle = this.containerEl.querySelector(
      ".drag-handle",
    ) as HTMLElement;
    const enableToggle = this.containerEl.querySelector(
      ".layer-enable-toggle",
    ) as HTMLInputElement;

    header.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (
        t.closest(".btn-remove") ||
        t.closest(".drag-handle") ||
        t.closest(".setting-blend-mode") ||
        t === title
      )
        return;
      content.classList.toggle("collapsed");
      content.style.display = content.classList.contains("collapsed")
        ? "none"
        : "grid";
    });

    title.addEventListener("blur", () => {
      this.name = title.innerText;
      onGlobalChange();
    });
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        title.blur();
      }
    });

    if (blendSelect) {
      blendSelect.addEventListener("change", () => {
        if (this.blendMode === blendSelect.value) return;
        this.blendMode = blendSelect.value as any;
        this.triggerOnChange();
        onGlobalChange();
      });
    }

    if (enableToggle) {
      enableToggle.addEventListener("change", () => {
        this.enabled = enableToggle.checked;

        if (this.enabled) {
          title.style.color = "";
        } else {
          title.style.color = "#777";
        }
        this.triggerOnChange();
        onGlobalChange();
      });
    }

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const event = new CustomEvent("layer-remove", {
        detail: { id: this.id },
        bubbles: true,
      });
      this.containerEl?.dispatchEvent(event);
    });

    handle.addEventListener(
      "mousedown",
      () => (this.containerEl!.draggable = true),
    );
    handle.addEventListener(
      "mouseup",
      () => (this.containerEl!.draggable = false),
    );
    this.containerEl.addEventListener("dragstart", (e) => {
      this.containerEl!.classList.add("dragging");
      const event = new CustomEvent("layer-drag-start", {
        detail: { el: this.containerEl },
        bubbles: true,
      });
      this.containerEl?.dispatchEvent(event);
    });
    this.containerEl.addEventListener("dragend", () => {
      this.containerEl!.classList.remove("dragging");
      this.containerEl!.draggable = false;
      const event = new CustomEvent("layer-drag-end", { bubbles: true });
      this.containerEl?.dispatchEvent(event);
    });

    this.attachParams(this.containerEl, onGlobalChange);
  }
}
