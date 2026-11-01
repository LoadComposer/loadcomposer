/* Generated from site/index.html by build-computation-v1.5.0.mjs. */
    function computeSingle(input, CONTAINERS) {
      const { pallet, quantity, gap, stackable, maxLayers, verticalGap } = input;
      const cbmEach = (pallet.length * pallet.width * pallet.height) / 1000000000;
      const cbmTotal = cbmEach * quantity;

      return CONTAINERS.map(container => {
        const capacityLayout = bestLayout(
          container,
          pallet,
          gap,
          pallet.rotationMode,
          pallet.lockedOrientation
        );
        const floorCapacity = capacityLayout.count;
        const physicalLayers = physicalLayersFor(
          container,
          pallet.height,
          verticalGap
        );
        const layers = layersFor(container, pallet.height, stackable, maxLayers, verticalGap);
        const availableLayers = layers;
        const totalCapacity = floorCapacity * availableLayers;
        const placedTarget = Math.min(quantity, totalCapacity);
        const requestedFloorPositions = availableLayers > 0
          ? stackable
            ? Math.min(placedTarget, floorCapacity)
            : quantity
          : 0;
        const selectedLoad = assignLoadStacks(
          bestLoadLayout(
            container,
            pallet,
            gap,
            pallet.rotationMode,
            pallet.lockedOrientation,
            requestedFloorPositions
          ),
          quantity,
          layers
        );
        const loadLayout = selectedLoad.layout;
        const placedFloorPositions = loadLayout.count;
        const placedCount = selectedLoad.placedCount;
        const unplacedCount = Math.max(0, quantity - placedCount);
        const fitsQtyBySpace = placedCount === quantity;
        const requiredLayers = floorCapacity > 0
          ? Math.ceil(quantity / floorCapacity)
          : 0;
        const requiredStackHeight = usedSpan(requiredLayers, pallet.height, verticalGap);
        let stackingLimitReason = null;
        if (stackable && requiredLayers > availableLayers) {
          if (physicalLayers < maxLayers) {
            stackingLimitReason = "height";
          } else if (maxLayers < physicalLayers) {
            stackingLimitReason = "max-layers";
          } else {
            stackingLimitReason = "height-and-max-layers";
          }
        }

        const result = {
          mode: "single", container,
          capacityLayout,
          loadLayout,
          layout: loadLayout,
          layers,
          availableLayers,
          physicalLayers,
          requiredLayers,
          requiredStackHeight,
          stackingLimitReason,
          loadLayers: selectedLoad.loadLayers,
          floorCapacity,
          totalCapacity,
          requestedFloorPositions,
          placedFloorPositions,
          placedCount,
          unplacedCount,
          fitsQtyBySpace, okDoor: false, okHeight: false,
          loadedWeight: 0, okWeight: true, ok: false, input
        };
        return result;
      });

    }
    function computeMixed(input, CONTAINERS) {
      const items = expandMixedItems(input.types);
      const cbmTotal = input.types.reduce((sum, item) => {
        return sum + (item.length * item.width * item.height * item.quantity) / 1000000000;
      }, 0);

      return CONTAINERS.map(container => {
        const advanced = input.advancedStacking
          ? loadComposerAdvancedStacking.solve(container, items, input, {
            bestMixedLayout, packItems, frontCompactSelectedLayout, seededShuffle
          })
          : null;
        const layout = advanced ? advanced.layout : bestMixedLayout(container, items, input.gap);
        const totalItems = items.length;
        const placedCount = advanced?.used ? advanced.placedCount : layout.count;
        const allPlaced = placedCount === totalItems;

        const result = {
          mode: "mixed", container, layout, layers: 1,
          floorCapacity: layout.count, totalCapacity: placedCount,
          totalItems, placedCount, allPlaced, fitsQtyBySpace: allPlaced,
          okDoor: false, okHeight: false,
          loadedWeight: 0, okWeight: true, ok: false, input
        };
        if (advanced) {
          result.advancedStacking = true;
          result.advancedDiagnostics = advanced.diagnostics;
          if (advanced.used) {
            result.stacks = advanced.stacks;
            result.floorPlacedCount = advanced.floorPlacedCount;
            result.stackedCount = advanced.stackedCount;
            result.maxLayersUsed = advanced.maxLayersUsed;
            result.mixedGroupStacks = advanced.mixedGroupStacks;
            result.totalCapacity = placedCount;
          }
        }
        return result;
      });

    }
globalThis.loadComposerComputationCore = Object.freeze({one(input, container) { return (input.mode === "mixed" ? computeMixed : computeSingle)(input, [container])[0]; }});
