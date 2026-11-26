// Prototype only. Coordinates are integer mm, with x=0 at the headboard.
const LIMITS = Object.freeze({ positions: 60, profiles: 8, rowSlots: 8, rows: 2400, transitions: 300_000 });
const end = (item, axis) => axis === "x" ? item.x + item.length : item.y + item.width;
const sum = numbers => numbers.reduce((a, b) => a + b, 0);

function floorUnits(result) {
  const stacks = new Map((result.stacks ?? []).map(stack => [stack.rect.id, stack]));
  return result.layout.rects.map(rect => {
    const stack = stacks.get(rect.id);
    const items = stack?.layers ?? [rect];
    const types = items.map(item => result.mode === "single" ? result.input.pallet : result.input.types[item.typeIndex]);
    return { rect, stack, items, types, quantity: stack?.layers.length ?? rect.stackCount ?? 1 };
  });
}

function physicalOrientations(layer, type, length, width) {
  return [layer.rotated, !layer.rotated].filter(rotated =>
    (type.length === type.width || type.rotationMode === "auto" || rotated === (type.lockedOrientation === "rotated")) &&
    (rotated ? type.width : type.length) === length && (rotated ? type.length : type.width) === width);
}

function profilesFor(units, width, accessWidth) {
  const profiles = new Map();
  for (const unit of units) {
    const { length, width: across } = unit.rect;
    const options = (length === across ? [[length, across]] : [[length, across], [across, length]])
      .filter(([l, w]) => w <= Math.min(width, accessWidth) &&
        unit.items.every((layer, i) => physicalOrientations(layer, unit.types[i], l, w).length))
      .sort(([a, b], [c, d]) => a - c || b - d);
    const key = JSON.stringify([unit.quantity, options]);
    if (!profiles.has(key)) profiles.set(key, { options, units: [] });
    profiles.get(key).units.push(unit);
  }
  return [...profiles.values()];
}

// Each row is a multiset of oriented units. No invented longitudinal clearance.
function enumerateRows(profiles, width, gap) {
  const variants = profiles.flatMap((profile, index) =>
    profile.options.map(([length, width]) => ({ index, length, width })));
  const counts = profiles.map(() => 0);
  const rows = [];
  let truncated = false, rowLimit = false;
  function visit(from, cells, depth, span) {
    if (rows.length === LIMITS.rows) { rowLimit = true; return; }
    if (cells.length) {
      rows.push({ counts: counts.slice(), cells, depth, span,
        quantity: sum(counts.map((count, i) => count * profiles[i].units[0].quantity)) });
    }
    for (let i = from; i < variants.length && !rowLimit; i++) {
      const cell = variants[i];
      const next = span + cell.width + (cells.length ? gap : 0);
      if (next > width || counts[cell.index] === profiles[cell.index].units.length) continue;
      if (cells.length === LIMITS.rowSlots) { truncated = true; return; }
      counts[cell.index]++;
      visit(i, [...cells, cell], Math.max(depth, cell.length), next);
      counts[cell.index]--;
    }
  }
  visit(0, [], 0, 0);
  // For equivalent consumption and depth the widest row minimizes edge clearance.
  const distinct = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.counts, row.depth]);
    if (!distinct.has(key) || distinct.get(key).span < row.span) distinct.set(key, row);
  }
  return { rows: [...distinct.values()].sort((a, b) => b.cells.length - a.cells.length || b.depth - a.depth),
    truncated: truncated || rowLimit };
}

function searchRows(rows, counts, limit, gap, minX) {
  const memo = new Map();
  let transitions = 0;
  let budgetReached = false;
  function visit(remaining, space) {
    if (!remaining.some(Boolean)) return { length: 0, singles: 0, rows: [] };
    if (space < minX || sum(remaining) * minX > space * LIMITS.rowSlots) return null;
    const key = JSON.stringify([remaining, space]);
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (const row of rows) {
      if (transitions >= LIMITS.transitions) { budgetReached = true; break; }
      transitions++;
      const cost = row.depth + gap;
      if (cost > space || row.counts.some((count, i) => count > remaining[i])) continue;
      const tail = visit(remaining.map((count, i) => count - row.counts[i]), space - cost);
      if (!tail) continue;
      const length = cost + tail.length;
      const singles = Number(row.cells.length === 1) + tail.singles;
      if (!best || length > best.length || (length === best.length && singles < best.singles)) {
        best = { length, singles, rows: [row, ...tail.rows] };
      }
    }
    memo.set(key, best);
    return best;
  }
  const best = visit(counts, limit + gap);
  return { best, transitions, budgetReached };
}

function rowOrders(rows) {
  const byDensity = [...rows].sort((a, b) => a.quantity / a.depth - b.quantity / b.depth);
  const alternating = [];
  let lo = 0, hi = byDensity.length - 1;
  while (lo <= hi) {
    alternating.push(byDensity[lo++]);
    if (lo <= hi) alternating.push(byDensity[hi--]);
  }
  return [rows, byDensity, byDensity.slice().reverse(), alternating, alternating.slice().reverse()];
}

function materialize(source, rows, profiles) {
  const result = structuredClone(source);
  const positions = new Map();
  const next = profiles.map(() => 0);
  const { gap } = source.input;
  let x = 0;
  for (const row of rows) {
    let y = Math.floor((source.container.innerWidth - row.span) / 2);
    for (const cell of row.cells) {
      const profile = profiles[cell.index];
      const unit = profile.units[next[cell.index]++];
      positions.set(unit.rect, { x, y, length: cell.length, width: cell.width });
      y += cell.width + gap;
    }
    x += row.depth + gap;
  }
  function move(old, type, position) {
    const { length, width } = position;
    const updated = { ...old, ...position, rotated: physicalOrientations(old, type, length, width)[0] };
    if (Object.hasOwn(old, "footprintLength")) updated.footprintLength = length + gap;
    if (Object.hasOwn(old, "footprintWidth")) updated.footprintWidth = width + gap;
    return updated;
  }
  const stackById = new Map((result.stacks ?? []).map(stack => [stack.rect.id, stack]));
  const rects = source.layout.rects.map(old => {
    const position = positions.get(old);
    const type = source.mode === "single" ? source.input.pallet : source.input.types[old.typeIndex];
    const rect = move(old, type, position);
    const stack = stackById.get(old.id);
    if (stack) {
      stack.rect = { ...rect };
      stack.layers = stack.layers.map(layer => move(layer, source.input.types[layer.typeIndex], position));
    }
    return rect;
  });
  const rotated = rects.filter(rect => rect.rotated).length;
  Object.assign(result.layout, { rects, usedLength: Math.max(...rects.map(r => end(r, "x"))),
    usedWidth: Math.max(...rects.map(r => end(r, "y"))),
    orientationCounts: { normal: rects.length - rotated, rotated } });
  // Solver scores and job certification belong exclusively to the original plan.
  result.layout.type = "longitudinal-distribution-spike";
  for (const key of ["score", "orderingName", "selectionStrategy"]) delete result.layout[key];
  for (const key of ["validation", "validationError", "advancedValidation", "advancedDiagnostics",
    "spaceAlert", "ok", "okDoor", "okHeight"]) delete result[key];
  // The runtime rejects detached results with any defined computationVersion.
  result.computationVersion = null;
  return result;
}

function freeIntervals(intervals, low, high) {
  const gaps = [];
  let edge = low;
  for (const [start, end] of intervals.sort(([a], [b]) => a - b)) {
    if (start > edge) gaps.push([edge, start]);
    edge = Math.max(edge, end);
  }
  if (edge < high) gaps.push([edge, high]);
  return gaps;
}

// Equal mass per physical pallet by default. A future mass callback receives one
// Advanced layer (or the single/mixed floor reference and a zero-based layer index).
export function measure(result, massForUnit = () => 1) {
  const units = floorUnits(result);
  const { innerLength: length, innerWidth: width } = result.container;
  const zones = Array.from({ length: 5 }, (_, i) => ({
    fromMm: i * length / 5, toMm: (i + 1) * length / 5,
    areaMm2: 0, palletEquivalents: 0, relativeMass: 0
  }));
  let longitudinalMoment = 0, relativeMass = 0;
  for (const { rect, items, quantity } of units) {
    const mass = sum(Array.from({ length: quantity }, (_, index) => {
      const value = massForUnit(items[index] ?? rect, index);
      if (!Number.isFinite(value) || value <= 0) throw new RangeError("Invalid physical pallet mass");
      return value;
    }));
    relativeMass += mass;
    longitudinalMoment += mass * (rect.x + rect.length / 2);
    for (const zone of zones) {
      const overlap = Math.max(0, Math.min(end(rect, "x"), zone.toMm) - Math.max(rect.x, zone.fromMm));
      zone.areaMm2 += overlap * rect.width;
      zone.palletEquivalents += quantity * overlap / rect.length;
      zone.relativeMass += mass * overlap / rect.length;
    }
  }
  const rects = result.layout.rects;
  const first = rects.length ? Math.min(...rects.map(rect => rect.x)) : 0;
  const last = rects.length ? Math.max(...rects.map(rect => end(rect, "x"))) : 0;
  const longitudinal = freeIntervals(rects.map(rect => [rect.x, end(rect, "x")]), first, last);
  const occupiedFloorLengthMm = last - first - sum(longitudinal.map(([a, b]) => b - a));
  const gap = result.input.gap;
  const edges = [...new Set(rects.flatMap(rect => [rect.x, end(rect, "x")]))].sort((a, b) => a - b);
  const strips = new Map();
  for (let i = 1; i < edges.length; i++) {
    const from = edges[i - 1], to = edges[i];
    const active = rects.filter(rect => rect.x < to && end(rect, "x") > from);
    if (!active.length) continue;
    for (const [a, b] of freeIntervals(active.map(rect => [rect.y, end(rect, "y")]), 0, width)) {
      if (b - a < Math.max(500, gap + 1)) continue;
      const key = a === 0 ? "left" : b === width ? "right" : JSON.stringify([a, b]);
      if (!strips.has(key)) strips.set(key, []);
      const spans = strips.get(key);
      const prior = spans.at(-1);
      if (prior?.toMm === from) {
        prior.toMm = to;
        prior.fromWidthMm = Math.max(prior.fromWidthMm, a);
        prior.toWidthMm = Math.min(prior.toWidthMm, b);
      } else spans.push({ fromMm: from, toMm: to, fromWidthMm: a, toWidthMm: b });
    }
  }
  return { zones, spanMm: last - first, occupiedFloorLengthMm, frontMm: first, rearMm: length - last,
    centreMm: relativeMass ? longitudinalMoment / relativeMass : null,
    internalGaps: longitudinal.filter(([a, b]) => b - a >= Math.max(600, gap + 1)),
    lateralGaps: [...strips.values()].flat().filter(g => g.toMm - g.fromMm >= Math.max(600, gap + 1)) };
}

export function distribute(source, { rearReserveMm = 0, validateGeometry, validateAdvanced } = {}) {
  const { innerLength, innerWidth, accessKnown, doorWidth } = source.container;
  const limit = innerLength - rearReserveMm;
  if (!Number.isSafeInteger(rearReserveMm) || rearReserveMm < 0 || limit <= 0)
    throw new RangeError("Invalid rear reservation");
  if (typeof validateGeometry !== "function" || (source.stacks && typeof validateAdvanced !== "function"))
    throw new TypeError("Original geometry validators required");
  const fallback = (reason, search = {}) => ({ status: "no-alternative", reason, search, rearReserveMm });
  if (!validateGeometry(source).valid || (source.stacks && !validateAdvanced(source).valid))
    return fallback("invalid-original");
  const requested = source.mode === "single" ? source.input.quantity : sum(source.input.types.map(t => t.quantity));
  const units = floorUnits(source);
  if (requested === 0 || source.placedCount !== requested || sum(units.map(u => u.quantity)) !== requested)
    return fallback("original-incomplete");
  if (units.length > LIMITS.positions) return fallback("position-limit");
  const profiles = profilesFor(units, innerWidth, accessKnown === false ? innerWidth : doorWidth);
  if (profiles.length > LIMITS.profiles) return fallback("profile-limit");
  if (profiles.some(profile => !profile.options.length)) return fallback("no-orientation");
  const { rows, truncated } = enumerateRows(profiles, innerWidth, source.input.gap);
  const minX = Math.min(...profiles.flatMap(p => p.options.map(([l]) => l)));
  const { best, transitions, budgetReached } = searchRows(rows, profiles.map(p => p.units.length),
    limit, source.input.gap, minX);
  const search = { rowPatterns: rows.length, rowsTruncated: truncated, transitions, budgetReached, acceptedOrders: 0 };
  if (!best) return fallback(budgetReached || truncated ? "search-limited" :
    rearReserveMm ? "rear-reserve-unmet" : "no-row-plan", search);
  let selected = null;
  let tested = 0;
  const seenOrders = new Set();
  let selectedScore = Infinity;
  const original = measure(source);
  for (const order of rowOrders(best.rows)) {
    const key = JSON.stringify(order.map(row => rows.indexOf(row)));
    if (seenOrders.has(key)) continue;
    seenOrders.add(key);
    const witness = materialize(source, order, profiles);
    const analysis = measure(witness);
    if (analysis.frontMm !== 0 || analysis.rearMm < rearReserveMm ||
        (original.rearMm >= rearReserveMm && analysis.spanMm <= original.spanMm)) continue;
    tested++;
    if (!validateGeometry(witness).valid || (witness.stacks && !validateAdvanced(witness).valid)) continue;
    search.acceptedOrders++;
    const mean = requested / 5;
    const score = sum(analysis.zones.map(zone => (zone.palletEquivalents - mean) ** 2));
    if (score < selectedScore) {
      selectedScore = score;
      selected = { status: "distributed", rearReserveMm, witness, analysis, search };
    }
  }
  return selected ?? fallback(budgetReached || truncated ? "search-limited" :
    tested ? "validator-rejected" : "no-eligible-extension", search);
}
