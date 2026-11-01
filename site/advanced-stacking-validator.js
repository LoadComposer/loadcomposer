/* Independent, read-only validation of normalized advanced mixed-load results. */
globalThis.loadComposerAdvancedStackingValidator = (() => {
  // Copies must be exact. The epsilon applies only to physical floor separation
  // and bounds, consistently with the general geometry validator.
  const EPSILON = 0.0001;
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
  const nonnegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
  const position = value => typeof value === "string" && /^P\d{2,}$/.test(value);
  const copyFields = ["id", "typeIndex", "unitNo", "positionId", "rotated",
    "x", "y", "length", "width", "originalLength", "originalWidth", "height"];
  // Packing metadata exists on some floor strategies, but not on upper layers.
  // Compare it only between the three floor representations, including presence.
  const floorMetadata = ["layoutIndex", "footprintLength", "footprintWidth"];

  function validate(result) {
    const errors = [];
    const fail = (code, message = code) => errors.push({ code, message });
    const done = () => ({ valid: errors.length === 0, errors });
    if (!object(result)) {
      fail("INVALID_STACK_STRUCTURE");
      return done();
    }
    const { input, container, layout, stacks } = result;
    if (!object(input) || !object(container) || !object(layout) || !Array.isArray(input.types) ||
        !Array.isArray(stacks) || !Array.isArray(layout.rects) || !Array.isArray(layout.unplaced)) {
      fail("INVALID_STACK_STRUCTURE");
      return done();
    }
    // Internal APIs consume normalized integer-mm pallet dimensions/clearances.
    // Do not coerce strings, repair copies, round input, or alter solver units.
    if (!nonnegativeInteger(input.gap) || !nonnegativeInteger(input.verticalGap)) fail("INVALID_STACK_CLEARANCE");
    if (![container.innerLength, container.innerWidth, container.innerHeight].every(value => Number.isFinite(value) && value > 0) ||
        (container.accessKnown !== undefined && typeof container.accessKnown !== "boolean") ||
        (container.accessKnown !== false && ![container.doorWidth, container.doorHeight].every(value => Number.isFinite(value) && value > 0))) {
      fail("INVALID_STACK_CONTAINER");
    }
    for (const type of input.types) {
      if (!object(type) || ![type.length, type.width, type.height].every(positiveInteger) ||
          !nonnegativeInteger(type.quantity) || typeof type.stackingEnabled !== "boolean" ||
          !["any", "base", "top"].includes(type.stackRole) || !positiveInteger(type.maxLayers) ||
          !["auto", "locked"].includes(type.rotationMode) || !["normal", "rotated"].includes(type.lockedOrientation) ||
          !Array.isArray(type.allowedAbove) || type.allowedAbove.some(index => !nonnegativeInteger(index) || index >= input.types.length)) {
        fail("INVALID_STACK_INPUT_TYPE");
      }
    }
    if (errors.length) return done();

    const reference = item => object(item) && nonnegativeInteger(item.typeIndex) &&
      item.typeIndex < input.types.length && positiveInteger(item.unitNo) &&
      item.unitNo <= input.types[item.typeIndex].quantity && item.id === `${item.typeIndex + 1}.${item.unitNo}`;
    function geometry(item) {
      if (!reference(item)) { fail("INVALID_OR_DUPLICATE_REFERENCE"); return false; }
      const type = input.types[item.typeIndex];
      if (![item.x, item.y, item.length, item.width, item.originalLength, item.originalWidth, item.height].every(Number.isFinite) ||
          item.length <= 0 || item.width <= 0 || item.height <= 0 || typeof item.rotated !== "boolean" || !position(item.positionId)) {
        fail("INVALID_STACK_GEOMETRY");
        return false;
      }
      if (item.originalLength !== type.length || item.originalWidth !== type.width || item.height !== type.height) fail("PALLET_DIMENSION_MISMATCH");
      const allowed = type.length === type.width || type.rotationMode === "auto" ||
        (type.lockedOrientation === "rotated") === item.rotated;
      if (!allowed || item.length !== (item.rotated ? type.width : type.length) ||
          item.width !== (item.rotated ? type.length : type.width)) fail("ORIENTATION_OR_FOOTPRINT_MISMATCH");
      if (item.x < 0 || item.y < 0 || item.x + item.length > container.innerLength + EPSILON ||
          item.y + item.width > container.innerWidth + EPSILON) fail("STACK_OUT_OF_BOUNDS");
      return true;
    }
    const floor = new Map();
    const floorPositions = new Set();
    for (const rect of layout.rects) {
      geometry(rect);
      if (!object(rect)) continue;
      if (floor.has(rect.id)) fail("DUPLICATE_FLOOR_REFERENCE");
      floor.set(rect.id, rect);
      if (!position(rect.positionId) || floorPositions.has(rect.positionId)) fail("DUPLICATE_POSITION");
      floorPositions.add(rect.positionId);
      for (const key of floorMetadata) {
        if (Object.hasOwn(rect, key) && (!Number.isFinite(rect[key]) || rect[key] < 0 ||
            (key === "layoutIndex" && !nonnegativeInteger(rect[key])))) fail("INVALID_FLOOR_METADATA");
      }
    }
    for (let i = 0; i < layout.rects.length; i++) for (let j = 0; j < i; j++) {
      const a = layout.rects[i], b = layout.rects[j];
      if (!object(a) || !object(b)) continue;
      if (!(a.x + a.length + input.gap <= b.x + EPSILON || b.x + b.length + input.gap <= a.x + EPSILON ||
            a.y + a.width + input.gap <= b.y + EPSILON || b.y + b.width + input.gap <= a.y + EPSILON)) fail("FLOOR_OVERLAP_OR_GAP");
    }
    const seen = new Set(), linkedFloor = new Set(), positions = new Set();
    let placed = 0, maxLayersUsed = 0, mixedGroupStacks = 0;
    for (const stack of stacks) {
      const rect = stack?.rect, layers = stack?.layers;
      if (!object(stack) || !object(rect) || !Array.isArray(layers) || !layers.length || !floor.has(rect.id)) {
        fail("INVALID_STACK_FLOOR");
        continue;
      }
      const canonical = floor.get(rect.id);
      if (linkedFloor.has(canonical.id)) fail("DUPLICATE_STACK_FLOOR");
      linkedFloor.add(canonical.id);
      geometry(rect);
      if (!position(stack.positionId) || positions.has(stack.positionId)) fail("DUPLICATE_POSITION");
      positions.add(stack.positionId);
      if (stack.positionId !== canonical.positionId || rect.positionId !== canonical.positionId) fail("POSITION_REFERENCE_MISMATCH");
      for (const copy of [rect, layers[0]]) {
        if (!object(copy) || copyFields.some(key => copy[key] !== canonical[key]) ||
            floorMetadata.some(key => Object.hasOwn(copy, key) !== Object.hasOwn(canonical, key) || copy[key] !== canonical[key])) {
          fail("FLOOR_REFERENCE_MISMATCH");
        }
      }
      // The canonical floor's inventory reference selects the base's limits.
      const base = reference(canonical) ? input.types[canonical.typeIndex] : null;
      if (!base || (layers.length > 1 && (!base.stackingEnabled || base.stackRole === "top"))) fail("INVALID_BASE_ROLE");
      if (layers.length > (base?.stackingEnabled ? base.maxLayers : 1)) fail("MAX_LAYERS_EXCEEDED");
      let expectedHeight = 0;
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index];
        if (!reference(layer) || seen.has(layer.id)) { fail("INVALID_OR_DUPLICATE_REFERENCE"); continue; }
        geometry(layer);
        const type = input.types[layer.typeIndex];
        seen.add(layer.id);
        placed++;
        if (layer.layer !== index + 1 || layer.positionId !== canonical.positionId ||
            layer.x !== canonical.x || layer.y !== canonical.y ||
            layer.length !== canonical.length || layer.width !== canonical.width) fail("STACK_GEOMETRY_MISMATCH");
        if (index > 0) {
          const below = input.types[layers[index - 1]?.typeIndex];
          if (!type.stackingEnabled || type.stackRole === "base" || !below?.stackingEnabled ||
              below.stackRole === "top" || !below.allowedAbove.includes(layer.typeIndex)) fail("INCOMPATIBLE_ADJACENT_LAYERS");
        }
        const doorWidth = container.accessKnown === false ? container.innerWidth : container.doorWidth;
        const doorHeight = container.accessKnown === false ? container.innerHeight : container.doorHeight;
        if (layer.width > doorWidth || type.height > doorHeight) fail("INDIVIDUAL_ACCESS_FAILURE");
        expectedHeight += type.height + (index ? input.verticalGap : 0);
      }
      if (!Number.isFinite(stack.height) || expectedHeight !== stack.height || expectedHeight > container.innerHeight) fail("STACK_HEIGHT_MISMATCH");
      maxLayersUsed = Math.max(maxLayersUsed, layers.length);
      mixedGroupStacks += Number(new Set(layers.map(layer => layer?.typeIndex)).size > 1);
    }
    if (linkedFloor.size !== layout.rects.length || floor.size !== layout.rects.length ||
        layout.count !== layout.rects.length || floor.size !== stacks.length || result.floorPlacedCount !== stacks.length ||
        result.placedCount !== placed || result.stackedCount !== placed - stacks.length ||
        result.maxLayersUsed !== maxLayersUsed || result.mixedGroupStacks !== mixedGroupStacks) fail("RESULT_COUNT_MISMATCH");
    for (const item of layout.unplaced) {
      if (!reference(item) || seen.has(item.id)) fail("UNPLACED_REFERENCE_MISMATCH");
      if (object(item)) seen.add(item.id);
    }
    const total = input.types.reduce((count, type) => count + type.quantity, 0);
    if (!nonnegativeInteger(total) || seen.size !== total || placed + layout.unplaced.length !== total) fail("LOST_PALLET_REFERENCE");
    return done();
  }
  return Object.freeze({ validate });
})();
