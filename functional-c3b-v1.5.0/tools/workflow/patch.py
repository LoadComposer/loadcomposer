from pathlib import Path
w=Path('c3b/work');p=w/'site/index.html';s=p.read_text()
s=s.replace('if (!container || !layout || !input || !Array.isArray(layout.rects)) {','if (!container || !layout || !input || !Array.isArray(layout.rects) ||\n          !["single", "mixed"].includes(result.mode) || input.mode !== result.mode) {',1)
anchor='''        const capacityLayout = result.capacityLayout;

        if ('''
replacement='''        const capacityLayout = result.capacityLayout;

        // Single results carry theoretical capacity and the actual loaded plan.
        // Derive limits from the canonical input, never from Worker metadata.
        if (!pallet || typeof input.stackable !== "boolean" ||
            ![pallet.length, pallet.width, pallet.height, input.quantity, input.maxLayers].every(
              value => Number.isSafeInteger(value) && value > 0) ||
            input.quantity > MAX_TOTAL_PALLETS || input.maxLayers > MAX_TOTAL_PALLETS ||
            !Number.isSafeInteger(input.verticalGap) || input.verticalGap < 0 ||
            !Number.isSafeInteger(layout.count) || layout.count < 0 || layout.count > input.quantity) {
          errors.push(geometryIssue("INVALID_SINGLE_INPUT", t("geometry.invalidSingleStructure")));
          return { valid: false, internalError: true, okDoor: false, okHeight: false,
            errors, accessFailures, heightFailures, minDoorWidthMargin, minDoorHeightMargin };
        }
        const canonicalLayers = layersFor(container, pallet.height, input.stackable,
          input.maxLayers, input.verticalGap);

        if ('''
assert anchor in s;s=s.replace(anchor,replacement,1)
s=s.replace('capacityLayout.count * Math.max(0, result.layers)','capacityLayout.count * canonicalLayers',1).replace('const expectedRequestedFloorPositions = result.layers > 0','const expectedRequestedFloorPositions = canonicalLayers > 0',1).replace('if (input.stackable && expectedRequiredLayers > result.layers)','if (input.stackable && expectedRequiredLayers > canonicalLayers)',1)
s=s.replace('result.totalCapacity !== result.floorCapacity * result.layers ||','result.totalCapacity !== result.floorCapacity * canonicalLayers ||\n          result.layers !== canonicalLayers ||',1).replace('result.availableLayers !== result.layers ||','result.availableLayers !== canonicalLayers ||',1)
s=s.replace('if (!Number.isSafeInteger(result.layers) || result.layers < 0) {','if (!Number.isSafeInteger(result.layers) || result.layers < 0 || result.layers !== canonicalLayers) {',1)
start=s.index('    function validateAdvancedOperationalResult(result) {');end=s.index('    function isOperationalPrintAvailable(result)',start)
s=s[:start]+'''    function validateAdvancedOperationalResult(result) {
      if (!result) return;
      // The common operational gate must also recheck single results, including
      // stale successful flags left by an invalidated or altered loaded plan.
      if (result.mode === "single") {
        result.validation = validateResultGeometry(result);
        result.validationError = result.validation.internalError;
        result.okDoor = result.validation.okDoor;
        result.okHeight = result.validation.okHeight;
        result.ok = result.ok === true && result.validation.valid;
        return;
      }
      if (!(Object.hasOwn(result, "stacks") || result.advancedValidation ||
          (result.advancedStacking && result.stackedCount > 0))) return;
      let check;
      try {
        check = loadComposerAdvancedStackingValidator.validate(result);
        result.validation = validateResultGeometry(result);
      } catch {
        check = { valid: false, errors: [{ code: "INVALID_STACK_STRUCTURE" }] };
        result.validation = { valid: false, internalError: true, okDoor: false,
          okHeight: false, errors: [] };
      }
      result.advancedValidation = check;
      if (!check.valid) {
        // V-01 remains read-only and unchanged. Only individually unfit pallets
        // are per-vehicle operational failures; malformed stacks still fail closed.
        const solitaryHeightFailure = result.stacks?.some(stack =>
          stack.layers?.length === 1 && stack.layers[0]?.height > result.container.innerHeight) &&
          result.stacks.every(stack => {
            const expected = stack.layers.reduce((sum, layer, index) => sum +
              result.input.types[layer.typeIndex].height + (index ? result.input.verticalGap : 0), 0);
            return stack.height === expected && (expected <= result.container.innerHeight || stack.layers.length === 1);
          });
        const internal = check.errors.filter(issue => issue.code !== "INDIVIDUAL_ACCESS_FAILURE" &&
          !(issue.code === "STACK_HEIGHT_MISMATCH" && solitaryHeightFailure));
        result.validation.errors.push(...internal.map(issue => ({
          code: issue.code, message: t("preview.validationFallback")
        })));
        result.validation.valid = false;
        if (internal.length) result.validation.internalError = true;
        // Access may concern an upper unit, absent from the general floor check.
        if (check.errors.some(issue => issue.code === "INDIVIDUAL_ACCESS_FAILURE")) {
          const width = result.container.accessKnown === false ? result.container.innerWidth : result.container.doorWidth;
          const height = result.container.accessKnown === false ? result.container.innerHeight : result.container.doorHeight;
          for (const stack of result.stacks || []) for (const layer of stack.layers || []) {
            const type = result.input.types[layer.typeIndex];
            if (layer.width > width) result.validation.okDoor = false;
            if (type?.height > height) result.validation.okHeight = false;
          }
        }
        if (solitaryHeightFailure) result.validation.okHeight = false;
      }
      result.validationError = result.validation.internalError;
      result.okDoor = result.validation.okDoor;
      result.okHeight = result.validation.okHeight;
      result.ok = result.ok === true && result.validation.valid;
    }

'''+s[end:]
p.write_text(s)
