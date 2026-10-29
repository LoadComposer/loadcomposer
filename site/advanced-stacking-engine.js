/* Deterministic floor-first mixed stacking. Floor geometry remains owned by the v1.4 planner. */
globalThis.loadComposerAdvancedStacking = (() => {
  const strategies = ["constrained", "future", "height", "self", "neutral", "low-height"];
  const byReference = (a, b) => a.typeIndex - b.typeIndex || a.unitNo - b.unitNo;

  function orientation(item, length, width) {
    if (item.length === length && item.width === width &&
        (item.rotationMode === "auto" || item.lockedOrientation !== "rotated" || item.length === item.width)) return false;
    if (item.width === length && item.length === width &&
        (item.rotationMode === "auto" || item.lockedOrientation === "rotated" || item.length === item.width)) return true;
    return null;
  }

  function orderings(items, types, seededShuffle) {
    const sorted = comparator => items.slice().sort((a, b) => comparator(a, b) || byReference(a, b));
    const strength = item => {
      const type = types[item.typeIndex];
      return type.stackingEnabled && type.stackRole !== "top"
        ? (type.allowedAbove.length * 10 + type.maxLayers) : -1;
    };
    const list = [
      ["area-desc", sorted((a, b) => b.length * b.width - a.length * a.width)],
      ["long-side", sorted((a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width))],
      ["short-side", sorted((a, b) => Math.min(b.length, b.width) - Math.min(a.length, a.width))],
      ["length", sorted((a, b) => b.length - a.length || b.width - a.width)],
      ["width", sorted((a, b) => b.width - a.width || b.length - a.length)],
      ["area-asc", sorted((a, b) => a.length * a.width - b.length * b.width)],
      ["input", items.slice()],
      ["base-first", sorted((a, b) => Number(types[b.typeIndex].stackRole === "base") - Number(types[a.typeIndex].stackRole === "base"))],
      ["support-first", sorted((a, b) => strength(b) - strength(a))],
      ["top-last", sorted((a, b) => Number(types[a.typeIndex].stackRole === "top") - Number(types[b.typeIndex].stackRole === "top"))],
      ["low-bases", sorted((a, b) => a.height - b.height || strength(b) - strength(a))]
    ];
    const attempts = Math.min(20, Math.max(8, items.length));
    for (let seed = 1; seed <= attempts; seed++) {
      list.push([`seed-${seed}`, seededShuffle(items, seed * 9973)]);
    }
    return list;
  }

  function signature(rects) {
    return rects.map(r => [r.typeIndex, r.x, r.y, r.length, r.width, Number(r.rotated)].join(":")).sort().join("|");
  }

  function candidates(container, items, types, gap, packItems, frontCompact, seededShuffle, baseline) {
    const attempts = orderings(items, types, seededShuffle);
    const seen = new Set();
    const layouts = [baseline];
    seen.add(signature(baseline.rects));
    for (const [name, sequence] of attempts) {
      const packed = packItems(container, sequence, gap);
      const layout = frontCompact(container, {
        mode: "mixed", type: "advanced mixed", count: packed.placed.length,
        rects: packed.placed, materializedCount: packed.placed.length,
        truncated: false, unplaced: packed.unplaced,
        usedLength: packed.usedLength, usedWidth: packed.usedWidth,
        orderingName: name,
        score: {
          placedCount: packed.placed.length,
          placedArea: packed.placedArea,
          compactness: packed.placedArea / Math.max(1, packed.usedLength * packed.usedWidth)
        }
      }, gap);
      const key = signature(layout.rects);
      if (!seen.has(key)) {
        seen.add(key);
        layouts.push(layout);
      }
    }
    return { attempts: attempts.length, layouts };
  }

  // Immutable relations are local to one solve, never shared between inputs.
  // Filter/sort once by footprint, directional edge and strategy; only stock
  // and accumulated stack height change during the matching passes.
  function relationCache(types, container) {
    const accessWidth = container.accessKnown === false ? container.innerWidth : container.doorWidth;
    const accessHeight = container.accessKnown === false ? container.innerHeight : container.doorHeight;
    const allowed = types.map(type => new Set(type.allowedAbove));
    const footprints = new Map(), orders = new Map();
    const stats = { footprintClasses: 0, orderClasses: 0, cachedEdges: 0,
      optionQueries: 0, matchingEvaluations: 0, logicalEvaluations: 0 };
    const upper = types.filter(type => type.quantity > 0 && type.stackingEnabled && type.stackRole !== "base");
    const equalHeights = new Set(types.map(type => type.height)).size <= 1;
    const equalFuture = new Set(upper.map(type => type.stackRole === "any" ? type.allowedAbove.length : -1)).size <= 1;
    const noSelfChoice = types.every((type, group) => type.quantity <= 1 || !type.allowedAbove.includes(group));
    function options(topGroup, length, width, strategy) {
      stats.optionQueries++;
      const footprint = length + ":" + width;
      const key = topGroup + "|" + footprint + "|" + strategy;
      if (orders.has(key)) return orders.get(key);
      if (!footprints.has(footprint)) {
        const edges = [];
        if (!(width > accessWidth)) types.forEach((type, group) => {
          if (!type.stackingEnabled || type.stackRole === "base" || type.height > accessHeight) return;
          const rotated = orientation(type, length, width);
          if (rotated !== null) edges.push({ group, rotated });
        });
        footprints.set(footprint, edges); stats.footprintClasses++;
      }
      const edges = footprints.get(footprint).filter(edge => allowed[topGroup].has(edge.group));
      const future = group => types[group].stackRole === "any" ? types[group].allowedAbove.length : -1;
      edges.sort((a, b) => {
        if (strategy === "future" && future(a.group) !== future(b.group)) return future(b.group) - future(a.group);
        if (strategy === "low-height" && types[a.group].height !== types[b.group].height) return types[a.group].height - types[b.group].height;
        if (strategy === "height" && types[a.group].height !== types[b.group].height) return types[b.group].height - types[a.group].height;
        if (strategy === "self" && (a.group === topGroup) !== (b.group === topGroup)) return a.group === topGroup ? -1 : 1;
        return a.group - b.group;
      });
      orders.set(key, edges); stats.orderClasses++; stats.cachedEdges += edges.length;
      return edges;
    }
    function representatives(active, layout) {
      const classes = new Map();
      for (const strategy of active) {
        const equivalent = strategy === "neutral" ||
          (strategy === "height" || strategy === "low-height") && equalHeights ||
          strategy === "future" && equalFuture || strategy === "self" && noSelfChoice ||
          strategy === "constrained" && layout.rects.length <= 1;
        const key = equivalent ? "neutral" : strategy;
        if (!classes.has(key) || strategy < classes.get(key)) classes.set(key, strategy);
      }
      stats.logicalEvaluations += active.length;
      return active.filter(strategy => [...classes.values()].includes(strategy));
    }
    return { options, representatives, stats };
  }

  function optionsFor(stack, remaining, types, container, verticalGap, strategy, relations, firstOnly) {
    const base = types[stack.layers[0].typeIndex];
    const topGroup = stack.layers.at(-1).typeIndex;
    const top = types[topGroup];
    if (!base.stackingEnabled || base.stackRole === "top" ||
        stack.layers.length >= base.maxLayers || !top.stackingEnabled || top.stackRole === "top") return [];
    const choices = [];
    for (const edge of relations.options(topGroup, stack.rect.length, stack.rect.width, strategy)) {
      if (!remaining[edge.group]?.length) continue;
      const height = stack.height + verticalGap + types[edge.group].height;
      if (height <= container.innerHeight) {
        choices.push({ ...edge, height });
        // With one floor slot its first eligible edge is always accepted:
        // positive remaining capacity, no previously assigned slot to displace.
        if (firstOnly) break;
      }
    }
    return choices;
  }

  function assign(layout, items, types, container, verticalGap, strategy, relations = relationCache(types, container)) {
    relations.stats.matchingEvaluations++;
    const floorIds = new Set(layout.rects.map(rect => rect.id));
    const remaining = types.map(() => []);
    items.filter(item => !floorIds.has(item.id)).sort(byReference)
      .forEach(item => remaining[item.typeIndex].push(item));
    const stacks = layout.rects.map(rect => ({
      rect: { ...rect }, layers: [{ ...rect, layer: 1 }],
      height: types[rect.typeIndex].height
    }));
    let passes = 0;
    while (remaining.some(group => group.length)) {
      const edges = stacks.map(stack => optionsFor(stack, remaining, types, container, verticalGap, strategy, relations, stacks.length === 1));
      const slots = stacks.map((_, index) => index).filter(index => edges[index].length);
      if (strategy === "constrained") slots.sort((a, b) => edges[a].length - edges[b].length || a - b);
      const assigned = new Map();
      const capacity = remaining.map(group => group.length);
      const groupSlots = remaining.map(() => []);
      function set(slot, edge) {
        const previous = assigned.get(slot);
        if (previous) {
          const occupied = groupSlots[previous.group];
          const index = occupied.indexOf(slot);
          if (index !== -1) occupied.splice(index, 1);
        }
        assigned.set(slot, edge);
        groupSlots[edge.group].push(slot);
      }
      function visit(slot, visitedGroups, visitedSlots) {
        for (const edge of edges[slot]) {
          const group = edge.group;
          if (visitedGroups.has(group)) continue;
          visitedGroups.add(group);
          if (groupSlots[group].length < capacity[group]) {
            set(slot, edge);
            return true;
          }
          for (const previousSlot of groupSlots[group].slice()) {
            if (visitedSlots.has(previousSlot)) continue;
            visitedSlots.add(previousSlot);
            if (visit(previousSlot, visitedGroups, visitedSlots)) {
              set(slot, edge);
              return true;
            }
          }
        }
        return false;
      }
      slots.forEach(slot => visit(slot, new Set(), new Set([slot])));
      if (!assigned.size) break;
      [...assigned].sort((a, b) => a[0] - b[0]).forEach(([slot, edge]) => {
        const item = remaining[edge.group].shift();
        const stack = stacks[slot];
        stack.layers.push({
          ...item, layer: stack.layers.length + 1, rotated: edge.rotated,
          originalLength: item.length, originalWidth: item.width,
          length: stack.rect.length, width: stack.rect.width,
          x: stack.rect.x, y: stack.rect.y
        });
        stack.height = edge.height;
      });
      passes++;
    }
    const unplaced = remaining.flat().sort(byReference);
    const placedCount = stacks.reduce((sum, stack) => sum + stack.layers.length, 0);
    return {
      layout, stacks, unplaced, placedCount,
      floorPlacedCount: stacks.length,
      stackedCount: placedCount - stacks.length,
      maxLayersUsed: Math.max(0, ...stacks.map(stack => stack.layers.length)),
      mixedGroupStacks: stacks.filter(stack => new Set(stack.layers.map(layer => layer.typeIndex)).size > 1).length,
      passes, strategy
    };
  }

  function better(a, b) {
    if (!b) return true;
    for (const [left, right] of [
      [a.placedCount, b.placedCount],
      [a.floorPlacedCount, b.floorPlacedCount],
      [-a.maxLayersUsed, -b.maxLayersUsed],
      [-a.mixedGroupStacks, -b.mixedGroupStacks],
      [a.layout.score.compactness, b.layout.score.compactness],
      [-a.layout.usedLength, -b.layout.usedLength],
      [-a.layout.usedWidth, -b.layout.usedWidth]
    ]) {
      if (left !== right) return left > right;
    }
    return a.tieKey < b.tieKey;
  }

  /* C1: independent bounded search over group-count chains and normal patterns.
   * No oracle, grid occupancy mask or audit fixture is used by production.
   * Budgets count work, not wall time: identical inputs explore identical nodes.
   * This is a feasible-solution improvement search, never an optimality claim. */
  function improveSmall(container, items, input, incumbent) {
    const stats = { enabled: items.length <= 12, chainVisits: 0, placementVisits: 0,
      chains: 0, anchorPairs: 0, exhausted: false, improved: false,
      statesVisited: 0, dominated: 0, boundsRejected: 0, stockRejected: 0,
      overlapRejected: 0, materializations: 0, cannotImprovePrimary: 0,
      systematicVisits: 0, systematicStates: 0, systematicAreaPruned: 0, systematicSelections: 0, systematicOverlapRejected: 0, systematicOrderingRestarts: 0, symmetrySkipped: 0 };
    const chainStarted = performance.now();
    if (!stats.enabled || !items.length) return { best: incumbent, stats };
    const types = input.types, gap = input.gap, verticalGap = input.verticalGap;
    const chainBudget = 6000, placementBudget = 120000, anchorLimit = 64;
    const accessWidth = container.accessKnown === false ? container.innerWidth : container.doorWidth;
    const accessHeight = container.accessKnown === false ? container.innerHeight : container.doorHeight;
    const stock = types.map(type => type.quantity);
    const used = types.map(() => 0);
    const catalog = new Map(), states = new Set();
    const rotations = type => [false, true].filter(rotated =>
      (!rotated || type.length !== type.width) &&
      orientation(type, rotated ? type.width : type.length, rotated ? type.length : type.width) !== null);
    const chain = [];
    function extend(length, width, height, limit) {
      if (stats.chainVisits >= chainBudget) { stats.exhausted = true; return; }
      stats.chainVisits++;
      const last = chain.at(-1).group;
      const state = [length, width, limit, last, ...used].join(":");
      if (states.has(state)) return;
      states.add(state);
      const key = [length, width, ...used].join(":");
      if (!catalog.has(key)) catalog.set(key, { length, width, height,
        sequence: chain.map(edge => ({ ...edge })), counts: used.slice(),
        count: chain.length, mixed: Number(used.filter(Boolean).length > 1) });
      if (chain.length >= limit || !types[last].stackingEnabled || types[last].stackRole === "top") return;
      for (const group of types[last].allowedAbove.slice().sort((a, b) => a - b)) {
        const type = types[group];
        if (used[group] >= stock[group] || !type.stackingEnabled || type.stackRole === "base" || type.height > accessHeight) continue;
        const rotated = orientation(type, length, width);
        const nextHeight = height + verticalGap + type.height;
        if (rotated === null || nextHeight > container.innerHeight) continue;
        used[group]++; chain.push({ group, rotated });
        extend(length, width, nextHeight, limit);
        chain.pop(); used[group]--;
        if (stats.chainVisits >= chainBudget) break;
      }
    }
    for (let group = 0; group < types.length; group++) {
      const type = types[group];
      if (!stock[group] || type.height > accessHeight || type.height > container.innerHeight) continue;
      for (const rotated of rotations(type)) {
        const length = rotated ? type.width : type.length, width = rotated ? type.length : type.width;
        if (length > container.innerLength || width > container.innerWidth || width > accessWidth) continue;
        used[group]++; chain.push({ group, rotated });
        extend(length, width, type.height, type.stackingEnabled && type.stackRole !== "top" ? type.maxLayers : 1);
        chain.pop(); used[group]--;
      }
    }
    const configs = [...catalog.values()].sort((a, b) => a.count - b.count || a.mixed - b.mixed ||
      a.length - b.length || a.width - b.width ||
      a.sequence.map(x => `${x.group}/${Number(x.rotated)}`).join(",").localeCompare(b.sequence.map(x => `${x.group}/${Number(x.rotated)}`).join(","), "en"));
    stats.chains = configs.length;
    stats.chainMs = performance.now() - chainStarted;
    const floorStarted = performance.now();
    if (!configs.length) return { best: incumbent, stats };
    // Every coordinate is a sum of legal item extents plus the inter-item gap.
    // The cap bounds coordinate generation too; exceeding it falls back safely.
    function anchors(axis, bound) {
      let sums = new Set([0]);
      for (const item of items) {
        const values = rotations(item).map(rotated =>
          (axis === "x" ? (rotated ? item.width : item.length) : (rotated ? item.length : item.width)) + gap);
        const next = new Set(sums);
        for (const value of sums) for (const step of values) if (value + step < bound) next.add(value + step);
        if (next.size > anchorLimit) return null;
        sums = next;
      }
      return [...sums].sort((a, b) => a - b);
    }
    const xs = anchors("x", container.innerLength), ys = anchors("y", container.innerWidth);
    if (!xs || !ys) { stats.exhausted = true; stats.reason = "anchor-limit"; return { best: incumbent, stats }; }
    const points = [];
    for (const x of xs) for (const y of ys) points.push({ x, y });
    stats.anchorPairs = points.length;
    stats.xCoordinates = xs; stats.yCoordinates = ys;
    const placed = [], remaining = stock.slice();
    let best = incumbent;
    function proposal() {
      stats.materializations++;
      const available = types.map(() => []);
      items.slice().sort(byReference).forEach(item => available[item.typeIndex].push(item));
      const stacks = placed.map(({ config, x, y }) => {
        const layers = config.sequence.map(({ group, rotated }, index) => {
          const item = available[group].shift();
          return { ...item, originalLength: item.length, originalWidth: item.width,
            x, y, length: config.length, width: config.width, rotated, layer: index + 1 };
        });
        return { rect: { ...layers[0] }, layers, height: config.height };
      });
      const rects = stacks.map(stack => ({ ...stack.rect }));
      const unplaced = available.flat().sort(byReference);
      const usedLength = Math.max(0, ...rects.map(rect => rect.x + rect.length));
      const usedWidth = Math.max(0, ...rects.map(rect => rect.y + rect.width));
      const area = rects.reduce((sum, rect) => sum + rect.length * rect.width, 0);
      return { layout: { mode: "mixed", type: "advanced joint search", count: rects.length, rects,
        materializedCount: rects.length, truncated: false, unplaced, usedLength, usedWidth,
        orderingName: "bounded-chain-patterns", score: { placedCount: rects.length,
          placedArea: area, compactness: area / Math.max(1, usedLength * usedWidth) } },
        stacks, unplaced, placedCount: items.length - unplaced.length, floorPlacedCount: stacks.length,
        stackedCount: items.length - unplaced.length - stacks.length,
        maxLayersUsed: Math.max(0, ...stacks.map(stack => stack.layers.length)),
        mixedGroupStacks: stacks.filter(stack => new Set(stack.layers.map(layer => layer.typeIndex)).size > 1).length,
        passes: 0, strategy: "bounded-chain-patterns", tieKey: "9999:bounded-chain-patterns" };
    }
    // C1b: a fixed selection is packed in item order, independently of the
    // coordinate order used by C1 below. Identical pieces use increasing
    // placement indices. Failed bounded searches leave the incumbent intact.
    // Normal-pattern anchors are shared; this is not an exactness claim.
    function packSelection(pieces, limit) {
      stats.systematicSelections++;
      const area = pieces.reduce((sum, piece) => sum +
        Math.min(...piece.map(c => (c.length + gap) * (c.width + gap))), 0);
      if (area > (container.innerLength + gap) * (container.innerWidth + gap)) {
        stats.systematicAreaPruned++; return;
      }
      const options = pieces.map(piece => {
        const positions = [];
        for (const config of piece) for (const { x, y } of points) {
          if (x + config.length <= container.innerLength && y + config.width <= container.innerWidth)
            positions.push({ config, x, y });
        }
        positions.sort((a, b) => b.config.length - a.config.length || a.x - b.x || a.y - b.y);
        return { positions, key: piece.map(c => [c.length, c.width, ...c.counts].join(":")).sort().join("|"),
          area: Math.min(...piece.map(c => (c.length + gap) * (c.width + gap))) };
      }).sort((a, b) => b.area - a.area || a.positions.length - b.positions.length || a.key.localeCompare(b.key, "en"));
      const chosen = [], last = new Map();
      let localLimit = Math.min(limit, stats.systematicVisits + 3000);
      function visitPiece(index) {
        stats.systematicStates++;
        if (index === options.length) {
          placed.push(...chosen);
          const next = proposal();
          if (better(next, best)) best = next;
          placed.length = 0;
          return true;
        }
        const piece = options[index], previous = last.get(piece.key);
        if (previous !== undefined) stats.symmetrySkipped += previous + 1;
        for (let j = previous === undefined ? 0 : previous + 1; j < piece.positions.length; j++) {
          if (stats.systematicVisits >= localLimit) return false;
          stats.systematicVisits++;
          const candidate = piece.positions[j], { config, x, y } = candidate;
          if (chosen.some(p => !(x + config.length + gap <= p.x ||
              p.x + p.config.length + gap <= x || y + config.width + gap <= p.y ||
              p.y + p.config.width + gap <= y))) { stats.systematicOverlapRejected++; continue; }
          chosen.push(candidate); last.set(piece.key, j);
          if (visitPiece(index + 1)) return true;
          chosen.pop();
          if (previous === undefined) last.delete(piece.key); else last.set(piece.key, previous);
        }
        return false;
      }
      if (!visitPiece(0) && stats.systematicVisits >= localLimit && stats.systematicVisits < limit) {
        // Transposing the search order gives both axes a fair allowance;
        // geometry, legal orientations and the objective stay unchanged.
        stats.systematicOrderingRestarts++;
        options.forEach(piece => piece.positions.sort((a, b) =>
          b.config.width - a.config.width || a.y - b.y || a.x - b.x));
        localLimit = limit;
        visitPiece(0);
      }
    }
    // Complete singleton catalog + one fixed footprint admits an elementary
    // capacity bound: map each origin to (floor(x/(L+g)),floor(y/(W+g))).
    // Two rectangles in the same cell overlap. A compact grid attains the
    // resulting count bound and minimum bounding-box area, then length/width.
    const uniform = !stats.exhausted && configs.every(c => c.count === 1) &&
      configs.every(c => c.length === configs[0].length && c.width === configs[0].width);
    if (uniform) {
      const { length, width } = configs[0];
      const eligible = new Set(configs.map(c => c.sequence[0].group));
      const capacityX = Math.floor((container.innerLength + gap) / (length + gap));
      const capacityY = Math.floor((container.innerWidth + gap) / (width + gap));
      const count = Math.min(capacityX * capacityY, [...eligible].reduce((sum, g) => sum + stock[g], 0));
      const pool = configs.flatMap(c => Array(stock[c.sequence[0].group]).fill(c));
      for (let columns = 1; columns <= Math.min(count, capacityX); columns++) {
        const rows = Math.ceil(count / columns);
        if (rows > capacityY) continue;
        for (let i = 0; i < count; i++) placed.push({ config: pool[i],
          x: Math.floor(i / rows) * (length + gap), y: (i % rows) * (width + gap) });
        const next = proposal();
        if (better(next, best)) best = next;
        placed.length = 0;
      }
      stats.uniformCapacity = count; stats.reason = "proved-uniform-singletons";
      stats.improved = best !== incumbent; stats.floorMs = performance.now() - floorStarted;
      return { best, stats, configs };
    }
    const systematicStarted = performance.now();
    const singletons = types.map((_, group) => configs.filter(c => c.count === 1 && c.sequence[0].group === group));
    const selections = [{ reserved: [], left: stock.slice() }];
    for (const config of configs.filter(c => c.count > 1).slice().sort((a, b) =>
      b.count - a.count || a.mixed - b.mixed || a.length - b.length || a.width - b.width)) {
      const maximum = Math.min(...config.counts.flatMap((count, g) => count ? [Math.floor(stock[g] / count)] : []));
      for (const copies of new Set([maximum, 1])) {
        selections.push({ reserved: Array.from({ length: copies }, () => [config]),
          left: stock.map((count, g) => count - config.counts[g] * copies) });
      }
      if (selections.length >= 32) break;
    }
    for (const selection of selections) {
      const pieces = [...selection.reserved];
      selection.left.forEach((count, g) => { if (singletons[g].length)
        for (let i = 0; i < count; i++) pieces.push(singletons[g]); });
      const total = selection.reserved.reduce((sum, p) => sum + p[0].count, 0) + pieces.length - selection.reserved.length;
      if (total < best.placedCount || total === best.placedCount && pieces.length < best.floorPlacedCount) continue;
      // Fair per-selection allowances prevent one impossible floor selection
      // from starving a chain-reserved selection. Total work remains bounded.
      packSelection(pieces, Math.min(60000, stats.systematicVisits + 6000));
      if (stats.systematicVisits >= 60000) { stats.systematicExhausted = true; break; }
    }
    stats.systematicMs = performance.now() - systematicStarted;
    const legacyStarted = performance.now();
    let memo = new Map();
    let phaseLimit = 30000;
    const smallest = Math.min(...configs.map(config => (config.length + gap) * (config.width + gap)));
    function visit(start, count, depth, mixed) {
      stats.statesVisited++;
      const state = remaining.join(",") + "|" + placed.map(p =>
        [p.x, p.y, p.config.length, p.config.width].join(":")).join(";");
      const prior = memo.get(state) || [];
      // Closed chains interact only through inventory and floor geometry.
      // Retain the Pareto frontier: a smaller max depth can later be eclipsed,
      // so neither depth nor mixed-stack count alone is a valid dominance key.
      if (prior.some(pair => pair[0] <= depth && pair[1] <= mixed)) { stats.dominated++; return; }
      memo.set(state, prior.filter(pair => !(depth <= pair[0] && mixed <= pair[1])).concat([[depth, mixed]]));
      const left = remaining.reduce((sum, value) => sum + value, 0);
      if (best.placedCount === items.length) {
        const occupied = placed.reduce((sum, p) => sum + (p.config.length + gap) * (p.config.width + gap), 0);
        const floorUpper = placed.length + Math.min(left,
          Math.floor(((container.innerLength + gap) * (container.innerWidth + gap) - occupied) / smallest));
        if (floorUpper < best.floorPlacedCount ||
            floorUpper === best.floorPlacedCount && (depth > best.maxLayersUsed ||
              depth === best.maxLayersUsed && mixed > best.mixedGroupStacks)) { stats.boundsRejected++; return; }
      }
      // Materialize only candidates which can improve one of the contract keys.
      const keys = [count, placed.length, -depth, -mixed];
      const incumbentKeys = [best.placedCount, best.floorPlacedCount, -best.maxLayersUsed, -best.mixedGroupStacks];
      let relation = 0;
      for (let i = 0; i < keys.length && !relation; i++) relation = Math.sign(keys[i] - incumbentKeys[i]);
      if (relation < 0) stats.cannotImprovePrimary++;
      if (relation >= 0) {
        const next = proposal();
        if (better(next, best)) best = next;
      }
      if (!remaining.some(Boolean)) return;
      for (let point = start; point < points.length; point++) {
        const { x, y } = points[point];
        for (const config of configs) {
          if (stats.placementVisits >= phaseLimit) { stats.exhausted = true; return; }
          stats.placementVisits++;
          if (x + config.length > container.innerLength || y + config.width > container.innerWidth) { stats.boundsRejected++; continue; }
          if (config.counts.some((value, group) => value > remaining[group])) { stats.stockRejected++; continue; }
          if (placed.some(prior => !(x + config.length + gap <= prior.x ||
              prior.x + prior.config.length + gap <= x || y + config.width + gap <= prior.y ||
              prior.y + prior.config.width + gap <= y))) { stats.overlapRejected++; continue; }
          config.counts.forEach((value, group) => { remaining[group] -= value; });
          placed.push({ config, x, y });
          visit(point + 1, count + config.count, Math.max(depth, config.count), mixed + config.mixed);
          placed.pop(); config.counts.forEach((value, group) => { remaining[group] += value; });
          if (stats.placementVisits >= phaseLimit) return;
        }
      }
    }
    for (let phase = 0; phase < 2; phase++) {
      const allowance = phase === 0 ? 30000 : 90000;
      phaseLimit = stats.placementVisits + allowance;
      memo = new Map();
      if (phase === 1) configs.sort((a, b) => b.count - a.count || a.mixed - b.mixed || a.length - b.length || a.width - b.width);
      const before = stats.placementVisits;
      visit(0, 0, 0, 0);
      if (stats.placementVisits - before < allowance) break;
    }
    stats.improved = best !== incumbent;
    stats.legacyFloorMs = performance.now() - legacyStarted;
    stats.floorMs = performance.now() - floorStarted;
    return { best, stats, configs };
  }

  function orientationPortfolio(container, items, input, helpers, incumbent, relations) {
    const stats = { attempts: 0, candidates: 0, improved: false };
    const groups = input.types.flatMap((type, group) => type.quantity &&
      type.rotationMode === "auto" && type.length !== type.width ? [group] : []);
    if (!groups.length) return { best: incumbent, stats };
    const patterns = new Set([0, (1 << groups.length) - 1]);
    for (let mask = 0; mask < (1 << groups.length) && patterns.size < 16; mask++) patterns.add(mask);
    const seen = new Set(), originals = new Map(items.map(item => [item.id, item]));
    let best = incumbent;
    for (const pattern of patterns) {
      const forced = items.map(item => {
        const bit = groups.indexOf(item.typeIndex);
        return bit === -1 ? item : { ...item, rotationMode: "locked",
          lockedOrientation: pattern & (1 << bit) ? "rotated" : "normal" };
      });
      const sequences = [forced,
        forced.slice().sort((a, b) => b.length * b.width - a.length * a.width || byReference(a, b)),
        forced.slice().sort((a, b) => a.length * a.width - b.length * b.width || byReference(a, b)),
        forced.slice().sort((a, b) => Number(input.types[b.typeIndex].stackRole === "base") -
          Number(input.types[a.typeIndex].stackRole === "base") || byReference(a, b))];
      for (let seed = 1; seed <= 4; seed++) sequences.push(helpers.seededShuffle(forced, seed * 7919));
      for (const sequence of sequences) {
        stats.attempts++;
        const packed = helpers.packItems(container, sequence, input.gap);
        const rects = packed.placed.map(rect => ({ ...rect,
          rotationMode: originals.get(rect.id).rotationMode,
          lockedOrientation: originals.get(rect.id).lockedOrientation }));
        const key = signature(rects);
        if (seen.has(key)) continue;
        seen.add(key); stats.candidates++;
        const layout = helpers.frontCompactSelectedLayout(container, { mode: "mixed",
          type: "advanced orientation portfolio", count: rects.length, rects,
          materializedCount: rects.length, truncated: false, unplaced: packed.unplaced,
          usedLength: packed.usedLength, usedWidth: packed.usedWidth,
          orderingName: "bounded-orientations", score: { placedCount: rects.length,
            placedArea: packed.placedArea,
            compactness: packed.placedArea / Math.max(1, packed.usedLength * packed.usedWidth) } }, input.gap);
        for (const strategy of relations.representatives(strategies, layout)) {
          const next = assign(layout, items, input.types, container, input.verticalGap, strategy, relations);
          next.tieKey = `9998:${String(stats.attempts).padStart(4, "0")}:${strategy}`;
          if (better(next, best)) best = next;
        }
      }
    }
    stats.improved = best !== incumbent;
    return { best, stats };
  }

  // Reserve complete chains before packing their bases. This explores plans
  // which a maximum-floor-first ordering cannot produce, without enumerating
  // a large geometry tree or changing the incumbent's ranking priorities.
  function bundlePortfolio(container, items, input, helpers, incumbent, configs) {
    const stats = { attempts: 0, candidates: 0, improved: false };
    let best = incumbent;
    const seeds = configs.filter(config => config.count > 1).slice().sort((a, b) =>
      b.count - a.count || a.mixed - b.mixed || a.length - b.length || a.width - b.width);
    const seen = new Set();
    for (const config of seeds) {
      const maximum = Math.min(...config.counts.flatMap((count, group) => count ? [Math.floor(input.types[group].quantity / count)] : []));
      for (const copies of new Set([maximum, 1])) {
        const available = input.types.map(() => []);
        items.slice().sort(byReference).forEach(item => available[item.typeIndex].push(item));
        const bundles = new Map(), bases = [];
        for (let copy = 0; copy < copies; copy++) {
          const chain = config.sequence.map(edge => ({ item: available[edge.group].shift(), rotated: edge.rotated }));
          const base = chain[0].item;
          bundles.set(base.id, chain);
          bases.push({ ...base, rotationMode: "locked", lockedOrientation: chain[0].rotated ? "rotated" : "normal" });
        }
        const floor = [...bases, ...available.flat()];
        for (const forced of [null, "normal", "rotated"]) {
          const pool = floor.map(item => !bundles.has(item.id) && item.rotationMode === "auto" && forced
            ? { ...item, rotationMode: "locked", lockedOrientation: forced } : item);
          const sequences = [pool,
            pool.slice().sort((a, b) => b.length * b.width - a.length * a.width || byReference(a, b)),
            pool.slice().sort((a, b) => a.length * a.width - b.length * b.width || byReference(a, b))];
          for (let seed = 1; seed <= 5; seed++) sequences.push(helpers.seededShuffle(pool, seed * 7919));
          for (const sequence of sequences) {
            if (stats.attempts >= 256) { stats.improved = best !== incumbent; return { best, stats }; }
            stats.attempts++;
            const packed = helpers.packItems(container, sequence, input.gap);
            const key = signature(packed.placed) + "|" + [...bundles].map(([id, chain]) =>
              id + ":" + chain.map(edge => edge.item.id).join(",")).join(";");
            if (seen.has(key)) continue;
            seen.add(key); stats.candidates++;
            const layout = helpers.frontCompactSelectedLayout(container, { mode: "mixed",
              type: "advanced chain bases", rects: packed.placed, count: packed.placed.length,
              materializedCount: packed.placed.length, truncated: false, unplaced: [],
              usedLength: packed.usedLength, usedWidth: packed.usedWidth,
              orderingName: "bounded-chain-bases", score: { placedCount: packed.placed.length,
                placedArea: packed.placedArea,
                compactness: packed.placedArea / Math.max(1, packed.usedLength * packed.usedWidth) } }, input.gap);
            const used = new Set();
            const stacks = layout.rects.map(rect => {
              const original = items.find(item => item.id === rect.id);
              Object.assign(rect, { rotationMode: original.rotationMode, lockedOrientation: original.lockedOrientation });
              const chain = bundles.get(rect.id) || [{ item: original, rotated: rect.rotated }];
              const layers = chain.map(({ item, rotated }, index) => {
                used.add(item.id);
                return index === 0 ? { ...rect, layer: 1 } : { ...item, originalLength: item.length,
                  originalWidth: item.width, x: rect.x, y: rect.y, length: rect.length,
                  width: rect.width, rotated, layer: index + 1 };
              });
              return { rect: { ...rect }, layers, height: layers.reduce((sum, layer, index) =>
                sum + layer.height + (index ? input.verticalGap : 0), 0) };
            });
            const unplaced = items.filter(item => !used.has(item.id)).sort(byReference);
            layout.unplaced = unplaced;
            const next = { layout, stacks, unplaced, placedCount: used.size,
              floorPlacedCount: stacks.length, stackedCount: used.size - stacks.length,
              maxLayersUsed: Math.max(0, ...stacks.map(stack => stack.layers.length)),
              mixedGroupStacks: stacks.filter(stack => new Set(stack.layers.map(layer => layer.typeIndex)).size > 1).length,
              passes: 0, strategy: "bounded-chain-bases", tieKey: `9997:${String(stats.attempts).padStart(4, "0")}` };
            if (better(next, best)) best = next;
          }
        }
      }
    }
    stats.improved = best !== incumbent;
    return { best, stats };
  }

  function solve(container, items, input, helpers) {
    const started = performance.now();
    const baseline = helpers.bestMixedLayout(container, items, input.gap);
    const baselineFloorMs = performance.now() - started;
    if (baseline.count === items.length) {
      return { layout: baseline, configured: true, used: false,
        diagnostics: { floorAttempts: 1, candidates: 1, strategies: 0, solverMs: performance.now() - started } };
    }
    const generatedStarted = performance.now();
    const generated = candidates(container, items, input.types, input.gap,
      helpers.packItems, helpers.frontCompactSelectedLayout, helpers.seededShuffle, baseline);
    const candidateFloorMs = performance.now() - generatedStarted;
    const matchingStarted = performance.now();
    const relations = relationCache(input.types, container);
    // With equal item heights, low-height has exactly neutral's edge and slot
    // order. Avoid a duplicate matching pass, especially on deep large loads.
    const activeStrategies = new Set(items.map(item => item.height)).size > 1
      ? strategies : strategies.filter(strategy => strategy !== "low-height");
    let best = null;
    generated.layouts.forEach((layout, index) => {
      relations.representatives(activeStrategies, layout).forEach(strategy => {
        const proposal = assign(layout, items, input.types, container, input.verticalGap, strategy, relations);
        proposal.tieKey = `${String(index).padStart(4, "0")}:${strategy}`;
        if (better(proposal, best)) best = proposal;
      });
    });
    const matchingMs = performance.now() - matchingStarted;
    if (!best) throw new Error("ADVANCED_NO_FLOOR_CANDIDATE");
    const qualityStarted = performance.now();
    const improved = improveSmall(container, items, input, best);
    best = improved.best;
    const qualitySearchMs = performance.now() - qualityStarted;
    const orientationStarted = performance.now();
    const alternative = improved.stats.exhausted && best.floorPlacedCount < items.length
      ? orientationPortfolio(container, items, input, helpers, best, relations)
      : { best, stats: { attempts: 0, candidates: 0, improved: false } };
    best = alternative.best;
    const orientationPortfolioMs = performance.now() - orientationStarted;
    const bundleStarted = performance.now();
    const bundled = improved.stats.exhausted && improved.configs && best.floorPlacedCount < items.length
      ? bundlePortfolio(container, items, input, helpers, best, improved.configs)
      : { best, stats: { attempts: 0, candidates: 0, improved: false } };
    best = bundled.best;
    const chainBasePortfolioMs = performance.now() - bundleStarted;
    const materializationStarted = performance.now();
    best.layout = {
      ...best.layout, rects: best.layout.rects.map(rect => ({ ...rect })),
      unplaced: best.unplaced
    };
    best.stacks.sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y || byReference(a.rect, b.rect));
    best.stacks.forEach((stack, index) => {
      const id = `P${String(index + 1).padStart(2, "0")}`;
      stack.positionId = id;
      stack.rect.positionId = id;
      stack.layers.forEach(layer => { layer.positionId = id; });
      const floorRect = best.layout.rects.find(rect => rect.id === stack.rect.id);
      floorRect.positionId = id;
    });
    return {
      ...best, configured: true, used: best.stackedCount > 0,
      diagnostics: {
        phases: { baselineFloorMs, candidateFloorMs, matchingMs, qualitySearchMs, orientationPortfolioMs, chainBasePortfolioMs, materializationMs: performance.now() - materializationStarted },
        relations: relations.stats,
        floorAttempts: generated.attempts,
        candidates: generated.layouts.length,
        strategies: activeStrategies.length,
        qualitySearch: improved.stats,
        orientationSearch: alternative.stats,
        chainBaseSearch: bundled.stats,
        solverMs: performance.now() - started
      }
    };
  }

  return Object.freeze({ solve, orientation, assign, better });
})();
