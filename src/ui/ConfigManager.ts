import { NoiseLayer } from "./Elements/Noise/NoiseLayer.js";
import { VisualColor } from "./Elements/VisualColor.js";
import { VisualElement } from "./Elements/VisualElement.js";
import { VisualGradient } from "./Elements/VisualGradient.js";
import { VisualLayerList } from "./Elements/VisualNoiseLayers.js";
import { VisualNumber } from "./Elements/VisualNumber.js";
import { VisualSliderNumber } from "./Elements/VisualSlider.js";
import { VisualToggle } from "./Elements/VisualToggle.js";
import { VisualVector3 } from "./Elements/VisualVector3.js";

export class GlobalSettings {
  playrate = new VisualSliderNumber(1.0, "global-playrate", 0, 10, 0.01);
  cameraRelativePlanet = new VisualToggle(true, "global-scene-camera-relative");
  cameraPosition = new VisualVector3(
    { x: 0, y: 0, z: -2 },
    "global-scene-camera-pos",
    "Camera position",
  );
  planetDisplacement = new VisualVector3(
    { x: 0, y: 0, z: 3 },
    "global-planet-displacement",
    "Direction vector of the light source",
  );
  sunColor = new VisualColor(
    "#f19e04",
    "global-color",
    "Scattering color of the atmosphere",
  );
}

export class SphereSettings {
  vertices = new VisualNumber(1000, "sphere-vertices", 1);
  radius = new VisualNumber(1.0, "sphere-radius", 0.1);
  maxTrees = new VisualNumber(20, "sphere-trees", 1);
  displacementMult = new VisualSliderNumber(
    1.0,
    "sphere-displacement-mult",
    0,
    2,
    0.0001,
  );
  pickingMinimum = new VisualSliderNumber(0.4, "sphere-picking", -2, 5, 0.01);
  gradient = new VisualGradient(
    [
      { offset: 0.0, color: "#000080" },
      { offset: 0.45, color: "#0040FF" },
      { offset: 0.55, color: "#D2B48C" },
      { offset: 0.6, color: "#228B22" },
      { offset: 0.75, color: "#696969" },
      { offset: 0.9, color: "#FFFFFF" },
    ],
    "sphere-gradient",
  );
}

export class AtmosphereSettings {
  enabled = new VisualToggle(
    true,
    "atm-enabled",
    "Enable/Disable Atmosphere Rendering",
  );
  color = new VisualColor(
    "#3366ff",
    "atm-color",
    "Scattering color of the atmosphere",
  );
  intensity = new VisualSliderNumber(
    1.0,
    "atm-intensity",
    0,
    5,
    0.1,
    "Brightness intensity",
  );
  falloff = new VisualSliderNumber(
    4.0,
    "atm-falloff",
    0.1,
    10,
    0.1,
    "Exponential falloff of density",
  );
  scale = new VisualSliderNumber(
    1.15,
    "atm-scale",
    1.0,
    2.0,
    0.01,
    "Atmosphere Radius multiplier relative to planet",
  );
}

export class SystemStateData {
  global = new GlobalSettings();
  sphere = new SphereSettings();
  atmosphere = new AtmosphereSettings();
  layers = new VisualLayerList("layer-stack-main");

  get baseLayer(): string | null {
    return this.layers.baseLayerId;
  }

  get baseLayerData(): NoiseLayer | undefined {
    return this.layers.getLayerData(this.layers.baseLayerId);
  }
}

export type StateObserver = (data: SystemStateData) => void;

/**
 * ConfigManager (Singleton)
 */
export class ConfigManager {
  private static _instance: ConfigManager;
  private settingsContainer: HTMLElement;
  private _currentState: SystemStateData;
  public isDirty: boolean = true;

  private observers: StateObserver[] = [];
  private saveTimeout: number = 0;

  public static initialize(settingsContainerId: string): ConfigManager {
    if (!ConfigManager._instance) {
      ConfigManager._instance = new ConfigManager(settingsContainerId);
    }
    return ConfigManager._instance;
  }

  public static get(): ConfigManager {
    if (!ConfigManager._instance)
      throw new Error("ConfigManager not initialized.");
    return ConfigManager._instance;
  }

  public getSystemState(): SystemStateData {
    this.isDirty = false;
    return this._currentState;
  }

  public subscribe(observer: StateObserver): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter((obs) => obs !== observer);
    };
  }

  private constructor(settingsContainerId: string) {
    const panel = document.getElementById(settingsContainerId);
    if (!panel) throw new Error("ConfigManager: DOM element not found");

    this.settingsContainer = panel;
    this._currentState = new SystemStateData();

    this.setupSidebarToggle(this.settingsContainer);

    this.loadState();
    this.renderState(this._currentState, this.settingsContainer);
    this.notifyChange();
  }

  private setupSidebarToggle(container: HTMLElement): void {
    const sidebar = container.closest(".sidebar") as HTMLElement;
    if (!sidebar) return;

    const btn = document.createElement("div");
    btn.className = "sidebar-toggle-btn";
    btn.title = "Toggle Sidebar";
    btn.innerHTML = '<span class="icon">◀</span>';

    btn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");

      window.dispatchEvent(new Event("resize"));
    });

    sidebar.appendChild(btn);
  }

  private saveState(): void {
    console.log("Save");
    const state = {
      global: this._currentState.global,
      sphere: this._currentState.sphere,
      atmosphere: this._currentState.atmosphere,
      layers: this._currentState.layers,
    };
    localStorage.setItem("noise_app_config", JSON.stringify(state));
  }

  private loadState(): void {
    try {
      const raw = localStorage.getItem("noise_app_config");
      if (!raw) return;
      const data = JSON.parse(raw);

      const loadGroup = (groupName: keyof SystemStateData) => {
        if (data[groupName]) {
          Object.keys(data[groupName]).forEach((key) => {
            const setting = (this._currentState[groupName] as any)[key];
            if (setting && typeof setting === "object" && "value" in setting) {
              setting.value = data[groupName][key];
            }
          });
        }
      };

      loadGroup("global");
      loadGroup("sphere");
      loadGroup("atmosphere");

      if (data.layers && Array.isArray(data.layers)) {
        this._currentState.layers.loadFromData(data.layers);
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }

  private renderState(dataObject: any, container: HTMLElement): void {
    if (
      dataObject &&
      typeof dataObject === "object" &&
      "renderHTML" in dataObject
    ) {
      const visualEl = dataObject as VisualElement;
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "10px";
      wrapper.innerHTML = visualEl.renderHTML();
      container.appendChild(wrapper);
      visualEl.attach(container, () => this.notifyChange());
      return;
    }

    const keys = Object.keys(dataObject);
    if (dataObject === this._currentState) {
      container.innerHTML = "";
      keys.forEach((key) => {
        const value = dataObject[key];
        if (value && typeof value === "object" && "renderHTML" in value) {
          const section = document.createElement("div");
          section.innerHTML = `<h3 style="font-size: 0.9rem; color: #888; text-transform: uppercase; margin-bottom: 5px;">${key}</h3>`;
          container.appendChild(section);

          const wrapper = document.createElement("div");
          wrapper.style = "display: flex; flex-grow: 1;";
          wrapper.innerHTML = (value as VisualElement).renderHTML();
          container.appendChild(wrapper);
          (value as VisualElement).attach(container, () => this.notifyChange());
        } else {
          this.createGroupPanel(key, value, container);
        }
      });
    }
  }

  private createGroupPanel(
    title: string,
    dataObject: any,
    parent: HTMLElement,
  ): void {
    const panelEl = document.createElement("div");
    panelEl.className = "panel-item static";
    panelEl.style.marginBottom = "10px";

    const displayTitle = title.charAt(0).toUpperCase() + title.slice(1);

    panelEl.innerHTML = `
        <div class="panel-header" aria-expanded="true">
            <span class="chevron">▶</span>
            <span class="panel-title">${displayTitle} Settings</span>
        </div>
        <div class="panel-content collapsed"></div>
    `;

    const contentArea = panelEl.querySelector(".panel-content") as HTMLElement;
    const header = panelEl.querySelector(".panel-header") as HTMLElement;
    const chevron = header.querySelector(".chevron") as HTMLElement;

    chevron.style.transform = "rotate(90deg)";

    header.addEventListener("click", () => {
      contentArea.classList.toggle("collapsed");
      const isCollapsed = contentArea.classList.contains("collapsed");

      chevron.style.transform = isCollapsed ? "rotate(0deg)" : "rotate(90deg)";
    });

    Object.keys(dataObject).forEach((prop) => {
      const val = dataObject[prop];
      if (val && typeof val === "object" && "renderHTML" in val) {
        const vEl = val as VisualElement;
        const row = document.createElement("div");
        row.className = "control-group";

        let labelContent = prop;
        if (vEl.description) {
          labelContent += ` <span title="${vEl.description}" style="cursor: help; color: #666; margin-left: 4px;">ⓘ</span>`;
        }

        row.innerHTML = `<p id=${prop}>${labelContent}</p>`;

        row.insertAdjacentHTML("beforeend", vEl.renderHTML());
        contentArea.appendChild(row);
        vEl.attach(panelEl, () => this.notifyChange());
      }
    });

    parent.appendChild(panelEl);
  }

  private notifyChange(): void {
    this.isDirty = true;
    this.observers.forEach((obs) => obs(this._currentState));

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveState(), 1000);
  }
}
