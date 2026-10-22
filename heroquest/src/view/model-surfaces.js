(function () {
  "use strict";
  const HQ = window.HeroQuest, T = window.HQThree;

  // Reflection targets belong to one renderer. Never share GPU textures across
  // the board, model viewer or portrait renderer.
  function createEnvironment(renderer, {width = 512, extraPanel = false} = {}) {
    const image = document.createElement("canvas");
    image.width = width;
    image.height = width / 2;
    const context = image.getContext("2d"), scale = width / 512;
    const gradient = context.createLinearGradient(0, 0, 0, image.height);
    gradient.addColorStop(0, "#c2cbd0");
    gradient.addColorStop(.5, "#555d5c");
    gradient.addColorStop(1, "#242b25");
    context.fillStyle = gradient;
    context.fillRect(0, 0, image.width, image.height);
    const panels = [[70, 35, 90, 110, "#fff0d6"], [310, 20, 40, 150, "#e4f0fa"]];
    if (extraPanel) panels.push([450, 60, 45, 65, "#a4b1bd"]);
    for (const [x, y, w, h, colour] of panels) {
      context.fillStyle = colour;
      context.fillRect(x * scale, y * scale, w * scale, h * scale);
    }
    const texture = new T.CanvasTexture(image);
    texture.colorSpace = T.SRGBColorSpace;
    texture.mapping = T.EquirectangularReflectionMapping;
    const generator = new T.PMREMGenerator(renderer);
    try {
      return generator.fromEquirectangular(texture);
    } finally {
      texture.dispose();
      generator.dispose();
    }
  }

  function applyReflections(materials, environment, intensity = .75) {
    for (const material of materials) if (material.metalness > .3) {
      material.envMap = environment.texture;
      material.envMapIntensity = intensity;
      material.needsUpdate = true;
    }
  }

  // Returns the owned materials for explicit disposal; geometry stays shared.
  function cloneForPreview(model, environment) {
    const materials = new Set();
    const clone = source => {
      const copy = source.clone();
      copy.clippingPlanes = null;
      copy.clipShadows = false;
      if (copy.isMeshStandardMaterial) {
        copy.envMap = copy.metalness > .3 ? environment.texture : null;
        copy.envMapIntensity = .75;
      }
      materials.add(copy);
      return copy;
    };
    model.traverse(object => {
      if (object.material) object.material = Array.isArray(object.material)
        ? object.material.map(clone) : clone(object.material);
    });
    return materials;
  }

  HQ.modelSurfaces = Object.freeze({createEnvironment, applyReflections, cloneForPreview});
})();
