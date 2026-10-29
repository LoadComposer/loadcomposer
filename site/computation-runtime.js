/* Versioned application jobs. Worker output is untrusted until main-thread validation. */
globalThis.loadComposerComputation = (() => {
  let version = 0, current = null, installed = false;
  // Per-vehicle inactivity is deliberately far above the measured difficult
  // workloads. A hard total deadline also bounds an advancing but stuck job.
  const limits = Object.freeze({ startupMs: 5000, progressMs: 120000, totalMs: 900000 });
  const stats = { created: 0, terminated: 0, activeWorkers: 0, urls: 0,
    cancelled: 0, timeouts: 0, staleMessages: 0, failures: 0, fallbacks: 0, commits: 0, listenerInstalls: 0 };
  const history = [];
  const keyFor = input => JSON.stringify(input);
  // Application-owned provenance survives loss of mutable result fields.
  const provenance = new WeakMap();
  function immutable(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(immutable); Object.freeze(value);
    }
    return value;
  }
  function register(job, index, result) {
    result.input = job.input; result.container = job.containers[index];
    result.computationVersion = job.version;
    provenance.set(result, { job, index });
    return result;
  }
  function installInlineResults(results) {
    if (!current || current.phase !== 'inline' || current.results.length) return;
    results.forEach((result, index) => register(current, index, result));
    current.results = results;
  }
  const pending = () => Boolean(current && current.phase === 'pending');
  function announce(key) {
    const node = document.getElementById('calculationStatus');
    if (node) { node.textContent = key ? t(key) : ''; node.classList.toggle('hidden', !key); }
    document.getElementById('resultsBody')?.closest('.card')?.setAttribute('aria-busy', String(pending()));
    if (pending()) { els.layoutNotes.textContent = t(key || 'compute.busy'); els.printLayoutBtn.disabled = true; }
  }
  function dispose(job) {
    clearTimeout(job.timer); clearTimeout(job.startupTimer);
    clearTimeout(job.progressTimer); clearTimeout(job.deadlineTimer);
    if (job.worker) {
      job.worker.onmessage = job.worker.onerror = job.worker.onmessageerror = null;
      job.worker.terminate(); job.worker = null; stats.terminated++; stats.activeWorkers--;
    }
    if (job.url) { URL.revokeObjectURL(job.url); job.url = null; stats.urls--; }
  }
  function cancel(clear = true) {
    version++;
    if (current) {
      const job = current; dispose(job);
      if (job.phase === 'pending') { stats.cancelled++; job.resolve?.(false); }
      job.results = []; job.input = null; current = null;
    }
    lastCalculationInput = null;
    if (clear) suspendCalculation([]);
    announce(null);
  }
  function record(job, state) {
    history.push({ version: job.version, state, mode: job.mode,
      elapsedMs: performance.now() - job.started, firstResultMs: job.firstResultMs,
      validationMs: job.validationMs, computeMs: job.computeMs, results: job.results.length,
      failureReason: job.failureReason || null });
    if (history.length > 20) history.shift();
  }
  function fail(job, validation = false, reason = null) {
    if (current !== job) return;
    job.failureReason = reason;
    dispose(job); job.phase = 'failed'; stats.failures++; record(job, 'failed');
    job.results = []; lastCalculationInput = null; suspendCalculation([]);
    const message = validation ? 'status.validationError' : reason === 'timeout' ? 'compute.timeout' : 'compute.failed';
    announce(message);
    els.layoutNotes.textContent = t(validation ? 'preview.validationFallback' : message);
    job.resolve(false);
  }
  function watchProgress(job, worker) {
    clearTimeout(job.progressTimer);
    job.progressTimer = setTimeout(() => {
      if (current !== job || job.worker !== worker || !pending()) return;
      stats.timeouts++; fail(job, false, 'timeout');
    }, limits.progressMs);
  }
  function accept(job, index, raw) {
    if (current !== job || !pending()) return false;
    if (!Number.isSafeInteger(index) || index !== job.results.length || index >= CONTAINERS.length ||
        !raw || typeof raw !== 'object' || Array.isArray(raw) || raw.mode !== job.input.mode ||
        !raw.layout || !Array.isArray(raw.layout.rects) || raw.layout.rects.length > MAX_LAYOUT_RECTS ||
        !Number.isSafeInteger(raw.placedCount) || raw.placedCount < 0 || raw.placedCount > job.input.quantity ||
        ['input','container','validation','advancedValidation','validationError','spaceAlert','computationVersion'].some(k => Object.hasOwn(raw, k))) {
      fail(job, true); return false;
    }
    if (raw.mode === 'mixed' && (raw.totalItems !== job.input.quantity ||
        raw.floorCapacity !== raw.layout.count || raw.totalCapacity !== raw.placedCount ||
        Boolean(raw.advancedStacking) !== Boolean(job.input.advancedStacking))) {
      fail(job, true); return false;
    }
    const result = register(job, index, { ...raw });
    const started = performance.now();
    try {
      // The same fresh validation and eligibility reconciliation as later gates.
      validateAdvancedOperationalResult(result);
      if (!result.validation.valid && result.validation.internalError) { fail(job, true); return false; }
      result.spaceAlert = evaluateSpaceAlert(result);
    } catch (_) { fail(job, true); return false; }
    job.validationMs += performance.now() - started;
    job.firstResultMs ??= performance.now() - job.started;
    job.results.push(result); return true;
  }
  function commit(job) {
    if (current !== job || !pending()) return;
    if (job.results.length !== CONTAINERS.length) { fail(job, true); return; }
    dispose(job); job.phase = 'complete';
    lastResults = job.results; lastCalculationInput = job.input;
    lastCbmTotal = job.input.mode === 'mixed'
      ? job.input.types.reduce((sum, type) => sum + type.length * type.width * type.height * type.quantity / 1e9, 0)
      : job.input.pallet.length * job.input.pallet.width * job.input.pallet.height * job.input.quantity / 1e9;
    stats.commits++; announce('compute.done');
    const renderStarted = performance.now();
    renderSummary(lastCbmTotal, job.input); renderTable(); renderDrawOptions(); drawSelected();
    job.renderMs = performance.now() - renderStarted;
    record(job, 'complete'); history.at(-1).renderMs = job.renderMs;
    job.resolve(true);
  }
  function fallback(job) {
    if (current !== job || !pending()) return;
    if (job.mode === 'fallback') { fail(job); return; }
    dispose(job); job.results = []; job.mode = 'fallback'; stats.fallbacks++;
    announce('compute.fallback');
    function next() {
      if (current !== job || !pending()) return;
      const index = job.results.length, started = performance.now();
      try {
        const result = loadComposerComputationCore.one(job.input, CONTAINERS[index]);
        job.computeMs += performance.now() - started;
        delete result.input; delete result.container;
        if (!accept(job, index, result)) return;
        if (job.results.length === CONTAINERS.length) commit(job);
        else job.timer = setTimeout(next, 0);
      } catch (_) { fail(job); }
    }
    job.timer = setTimeout(next, 0);
  }
  function start(job) {
    if (current !== job || !pending()) return;
    if (typeof Worker !== 'function' || typeof loadComposerWorkerSource !== 'string') { fallback(job); return; }
    try {
      job.url = URL.createObjectURL(new Blob([loadComposerWorkerSource], { type: 'text/javascript' })); stats.urls++;
      job.worker = new Worker(job.url); stats.created++; stats.activeWorkers++; job.mode = 'worker';
      const worker = job.worker;
      job.startupTimer = setTimeout(() => fallback(job), limits.startupMs);
      job.worker.onmessage = event => {
        if (current !== job || job.worker !== worker || !pending()) { stats.staleMessages++; return; }
        const data = event.data;
        if (data && data.kind === 'ready' && !job.ready) {
          job.ready = true; clearTimeout(job.startupTimer);
          job.activeIndex = null;
          watchProgress(job, worker);
          job.deadlineTimer = setTimeout(() => {
            if (current !== job || job.worker !== worker || !pending()) return;
            stats.timeouts++; fail(job, false, 'timeout');
          }, limits.totalMs);
          URL.revokeObjectURL(job.url); job.url = null; stats.urls--;
          try {
            const input = job.input.mode === 'mixed' ? { ...job.input, types: job.input.types.map(({allowedAboveIds, ...type}) => type) } : job.input;
            job.worker.postMessage({kind:'compute',version:job.version,input,containers:CONTAINERS});
          }
          catch (_) { fallback(job); }
          return;
        }
        if (!job.ready || !data || data.version !== job.version) { fail(job, true); return; }
        if (data.kind === 'progress') {
          // A start signal is accepted only once for the next expected vehicle.
          // Repeated heartbeats cannot keep an incomplete job alive indefinitely.
          if (job.activeIndex !== null || !Number.isSafeInteger(data.index) ||
              data.index !== job.results.length || data.index >= CONTAINERS.length) { fail(job, true); return; }
          job.activeIndex = data.index; watchProgress(job, worker);
        } else if (data.kind === 'result') {
          if (data.index !== job.activeIndex) { fail(job, true); return; }
          if (Number.isFinite(data.computeMs) && data.computeMs >= 0) job.computeMs += data.computeMs;
          if (accept(job, data.index, data.result)) {
            job.activeIndex = null; watchProgress(job, worker);
          }
        } else if (data.kind === 'complete' && data.count === CONTAINERS.length) commit(job);
        else if (data.kind === 'failure') fallback(job);
        else fail(job, true);
      };
      job.worker.onerror = event => { event.preventDefault(); if (job.worker === worker) fallback(job); };
      job.worker.onmessageerror = () => { if (job.worker === worker) fail(job, true); };
    } catch (_) { fallback(job); }
  }
  function request(input, options = {}) {
    const key = keyFor(input);
    if (current && current.key === key && (pending() || current.phase === 'complete')) {
      if (pending()) announce(current.mode === 'fallback' ? 'compute.fallback' : 'compute.busy');
      else { renderSummary(lastCbmTotal, lastCalculationInput); renderTable(); renderDrawOptions(); drawSelected(); }
      return true;
    }
    cancel(false);
    const job = { version, key, input: immutable(JSON.parse(key)), containers: CONTAINERS.map(c => immutable(JSON.parse(keyFor(c)))), phase: 'pending', results: [], mode: 'inline',
      started: performance.now(), validationMs: 0, computeMs: 0, firstResultMs: null };
    job.promise = new Promise(resolve => { job.resolve = resolve; }); current = job;
    if (input.quantity <= 12 && (input.types?.length || 1) <= 12) {
      job.phase = 'inline';
      try {
        if (input.mode === 'mixed') calculateMixed(input); else calculateSingle(input);
        lastResults.forEach(result => { result.computationVersion = job.version; });
        job.results = lastResults; job.phase = 'complete'; job.computeMs = performance.now() - job.started;
        stats.commits++; announce(null); record(job, 'complete'); job.resolve(true);
      } catch (_) { job.phase = 'pending'; fail(job); }
      return true;
    }
    lastCalculationInput = null; suspendCalculation([]); announce('compute.busy');
    job.timer = setTimeout(() => start(job), options.debounce ? 40 : 0);
    return true;
  }
  function matchesCanonicalResult(result) {
    if (!result) return false;
    const record = provenance.get(result);
    if (!record) {
      // Pure diagnostics never acquire operational provenance through membership.
      return result.computationVersion === undefined && !lastResults.includes(result);
    }
    const { job, index } = record;
    return current === job && ['inline', 'pending', 'complete'].includes(job.phase) &&
      result.computationVersion === job.version && result.input === job.input &&
      result.container === job.containers[index] &&
      (job.phase === 'pending' || lastResults[index] === result && lastResults.indexOf(result) === index);
  }
  function isCurrent(result) {
    return !pending() && matchesCanonicalResult(result);
  }
  function printMatchesCurrentInput(result) {
    const record = result && provenance.get(result);
    if (!record || !isCurrent(result) || current.phase !== 'complete') return false;
    const index = Number(els.drawSelect.value || 0);
    if (record.index !== index || lastResults[index] !== result ||
        selectedContainerId !== record.job.containers[index].id) return false;
    const validation = validateAndReadInput();
    if (!validation.valid || keyFor(validation.input) !== current.key) { cancel(); return false; }
    return true;
  }
  function install() {
    if (installed) return; installed = true; stats.listenerInstalls++;
    function modelChange(event) {
      const target = event.target;
      if (target.closest?.('.pallet-group') || [els.gap,els.maxLayers,els.verticalGap].includes(target)) cancel();
    }
    document.addEventListener('input', modelChange, true);
    document.addEventListener('change', modelChange, true);
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-action="selectPreset"], [data-action="removeGroup"], #resetBtn, #addMixedRowBtn')) cancel();
    }, true);
    window.addEventListener('pagehide', () => cancel(false));
  }
  return Object.freeze({ request, cancel, pending, announce, installInlineResults, isCurrent, matchesCanonicalResult, printMatchesCurrentInput, install, limits,
    whenIdle: () => current?.promise || Promise.resolve(false),
    get state() { return { version, phase: current?.phase || 'idle', mode: current?.mode || null,
      results: current?.results.length || 0, ...stats, history: history.map(row => ({...row})) }; } });
})();
