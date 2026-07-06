const MAX_IV = 15;
const STAT_COUNT = 3;
const MAX_SUM = MAX_IV * STAT_COUNT;
const WILD_SHINY_RATES = [512, 256, 128, 64, 32, 25];
const REFERENCE_COLOR = "#6f55b5";
const STAR_RATINGS = [
  { label: "☆☆☆☆", minSum: 0, maxSum: 22, threshold: percentForSum(0) },
  { label: "★☆☆☆", minSum: 23, maxSum: 29, threshold: percentForSum(23) },
  { label: "★★☆☆", minSum: 30, maxSum: 36, threshold: percentForSum(30) },
  { label: "★★★☆", minSum: 37, maxSum: 44, threshold: percentForSum(37) },
  { label: "★★★★", minSum: 45, maxSum: 45, threshold: percentForSum(45) }
];
const FLOOR_CONFIGS = [
  {
    id: "wild",
    label: "Wild",
    floor: 0,
    color: "#1d6f64",
    fill: "rgba(29, 111, 100, 0.12)",
    dim: "rgba(29, 111, 100, 0.38)"
  },
  {
    id: "weather",
    label: "Weather boost",
    floor: 4,
    color: "#d39b1f",
    fill: "rgba(211, 155, 31, 0.14)",
    dim: "rgba(211, 155, 31, 0.42)"
  },
  {
    id: "raid",
    label: "Raid",
    floor: 10,
    color: "#416fbd",
    fill: "rgba(65, 111, 189, 0.14)",
    dim: "rgba(65, 111, 189, 0.42)"
  },
  {
    id: "lucky",
    label: "Lucky",
    floor: 12,
    color: "#b14c8f",
    fill: "rgba(177, 76, 143, 0.14)",
    dim: "rgba(177, 76, 143, 0.42)"
  }
];

const chart = document.querySelector("#chart");
const chanceTitle = document.querySelector(".chance-title");
const chanceList = document.querySelector("#chanceList");
const referenceRow = document.querySelector("#referenceRow");
const attemptsPanel = document.querySelector("#attemptsPanel");
const attemptsBasis = document.querySelector("#attemptsBasis");
const attemptsList = document.querySelector("#attemptsList");
const attemptsInput = document.querySelector("#attemptsInput");
const targetChanceInput = document.querySelector("#targetChanceInput");
const attemptsChanceOutput = document.querySelector("#attemptsChanceOutput");
const requiredAttemptsOutput = document.querySelector("#requiredAttemptsOutput");
const thresholdControl = document.querySelector("#thresholdControl");
const thresholdOutput = document.querySelector("#thresholdOutput");
const thresholdPrev = document.querySelector("#thresholdPrev");
const thresholdNext = document.querySelector("#thresholdNext");
const chanceModeRadios = [...document.querySelectorAll('input[name="chanceMode"]')];
const floorToggles = [...document.querySelectorAll("[data-floor-toggle]")];
const shinyOptions = document.querySelector("#shinyOptions");
const shinyEnabled = document.querySelector("#shinyEnabled");
const wildRateSlider = document.querySelector("#wildRateSlider");
const wildRateControl = document.querySelector("#wildRateControl");
const raidBoosted = document.querySelector("#raidBoosted");
const raidBoostControl = document.querySelector("#raidBoostControl");
const shinyRateOutput = document.querySelector("#shinyRateOutput");

const distributions = FLOOR_CONFIGS.map(createDistribution);
const distributionById = Object.fromEntries(distributions.map((distribution) => [distribution.id, distribution]));
const wildDistribution = distributionById.wild;
const meaningfulThresholds = [...new Set(wildDistribution.points.map((point) => point.percent))];
let starAxisHitRegions = [];
const state = {
  threshold: snapThreshold(90),
  chanceMode: "higher",
  pinnedReference: null,
  cumulative: {
    attempts: 100,
    targetChance: 50
  },
  selectedFloorIds: new Set(),
  shiny: {
    enabled: false,
    wildRateIndex: 0,
    raidBoosted: false
  }
};

function percentForSum(sum) {
  return Math.round((sum / MAX_SUM) * 100);
}

function createDistribution(config) {
  const counts = Array.from({ length: MAX_SUM + 1 }, () => 0);
  const rollValues = MAX_IV - config.floor + 1;
  const total = rollValues ** STAT_COUNT;

  for (let attack = config.floor; attack <= MAX_IV; attack += 1) {
    for (let defense = config.floor; defense <= MAX_IV; defense += 1) {
      for (let stamina = config.floor; stamina <= MAX_IV; stamina += 1) {
        counts[attack + defense + stamina] += 1;
      }
    }
  }

  const points = counts.map((count, sum) => ({
    sum,
    count,
    percent: percentForSum(sum),
    frequency: count / total
  }));

  return {
    ...config,
    counts,
    total,
    points,
    maxFrequency: Math.max(...points.map((point) => point.frequency))
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function minSumForThreshold(threshold) {
  const snappedThreshold = snapThreshold(threshold);
  const point = wildDistribution.points.find((candidate) => candidate.percent >= snappedThreshold);
  return point ? point.sum : MAX_SUM;
}

function sumBandPercents(sum) {
  return {
    left: (Math.max(0, sum - 0.5) / MAX_SUM) * 100,
    right: (Math.min(MAX_SUM, sum + 0.5) / MAX_SUM) * 100
  };
}

function snapThreshold(value) {
  const clamped = clamp(Number(value), 0, 100);
  let snapped = meaningfulThresholds[0];
  let bestDistance = Infinity;

  meaningfulThresholds.forEach((candidate) => {
    const distance = Math.abs(candidate - clamped);

    if (distance < bestDistance || (distance === bestDistance && candidate > snapped)) {
      snapped = candidate;
      bestDistance = distance;
    }
  });

  return snapped;
}

function thresholdIndex() {
  return meaningfulThresholds.indexOf(state.threshold);
}

function activeDistributions() {
  return distributions.filter((distribution) => (
    distribution.id === "wild" || state.selectedFloorIds.has(distribution.id)
  ));
}

function matchingRolls(distribution, threshold, mode) {
  const minSum = minSumForThreshold(threshold);

  if (mode === "exact") {
    return distribution.counts[minSum];
  }

  if (mode === "lower") {
    return distribution.counts.slice(0, minSum + 1).reduce((total, count) => total + count, 0);
  }

  return distribution.counts.slice(minSum).reduce((total, count) => total + count, 0);
}

function formatPercent(value, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

function formatInteger(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatOdds(probability) {
  return probability === 1
    ? "Every roll"
    : `1 in ${formatInteger(1 / probability)}`;
}

function formatChancePercent(probability) {
  const percent = probability * 100;

  if (percent > 0 && percent < 0.0001) {
    return formatPercent(percent, 6);
  }

  if (percent < 0.01) {
    return formatPercent(percent, 4);
  }

  return formatPercent(percent, 2);
}

function formatInputNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatRatio(value) {
  if (value >= 100) {
    return value.toFixed(0);
  }

  if (value >= 10) {
    return value.toFixed(1).replace(/\.0$/, "");
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function comparisonText(probability) {
  const reference = state.pinnedReference;

  if (!reference) {
    return "";
  }

  if (reference.probability === 0 && probability === 0) {
    return "Same as reference";
  }

  if (reference.probability === 0) {
    return "Reference is 0%";
  }

  if (probability === 0) {
    return "Not possible vs reference";
  }

  const ratio = probability / reference.probability;

  if (Math.abs(ratio - 1) < 0.005) {
    return "Same as reference";
  }

  if (ratio > 1) {
    return `${formatRatio(ratio)}x more likely than reference`;
  }

  return `${formatRatio(1 / ratio)}x less likely than reference`;
}

function shinyRateDenominator(distribution) {
  if (distribution.id === "wild" || distribution.id === "weather") {
    return WILD_SHINY_RATES[state.shiny.wildRateIndex];
  }

  if (distribution.id === "raid") {
    return state.shiny.raidBoosted ? 10 : 20;
  }

  return null;
}

function shinyMultiplier(distribution) {
  const denominator = shinyRateDenominator(distribution);
  return state.shiny.enabled && denominator ? 1 / denominator : 1;
}

function shinyOddsText(distribution) {
  if (!state.shiny.enabled) {
    return "";
  }

  const denominator = shinyRateDenominator(distribution);
  return denominator ? ` · shiny 1 in ${denominator}` : "";
}

function chanceTitleText() {
  const thresholdText = formatPercent(state.threshold, 0);
  let base = `Chance of ${thresholdText}`;

  if (state.chanceMode === "higher" && state.threshold !== 100) {
    base = `${base} or higher`;
  } else if (state.chanceMode === "lower" && state.threshold !== 0) {
    base = `${base} or lower`;
  }

  return state.shiny.enabled ? `${base} + shiny` : base;
}

function updateShinyControls() {
  const enabled = state.shiny.enabled;
  const raidActive = state.selectedFloorIds.has("raid");
  const wildDenominator = WILD_SHINY_RATES[state.shiny.wildRateIndex];
  const raidDenominator = state.shiny.raidBoosted ? 10 : 20;

  shinyOptions.dataset.enabled = String(enabled);
  chanceTitle.textContent = chanceTitleText();
  shinyEnabled.checked = enabled;
  wildRateSlider.value = String(state.shiny.wildRateIndex);
  raidBoosted.checked = state.shiny.raidBoosted;
  shinyRateOutput.textContent = enabled
    ? `Wild/weather 1 in ${wildDenominator}${raidActive ? ` · Raid 1 in ${raidDenominator}` : ""}`
    : "Off";
  wildRateSlider.setAttribute("aria-valuetext", `1 in ${WILD_SHINY_RATES[state.shiny.wildRateIndex]}`);
  raidBoosted.setAttribute("aria-label", `Raid shiny rate ${state.shiny.raidBoosted ? "1 in 10" : "1 in 20"}`);
  wildRateControl.dataset.active = String(enabled);
  raidBoostControl.dataset.active = String(enabled && raidActive);

  wildRateSlider.disabled = !enabled;
  raidBoosted.disabled = !enabled || !raidActive;
}

function cumulativeProbability(probability, attempts) {
  if (probability <= 0 || attempts <= 0) {
    return 0;
  }

  if (probability >= 1) {
    return 1;
  }

  return -Math.expm1(attempts * Math.log1p(-probability));
}

function attemptsForChance(probability, targetChance) {
  const target = clamp(targetChance / 100, 0, 1);

  if (target <= 0) {
    return 0;
  }

  if (probability <= 0) {
    return Infinity;
  }

  if (probability >= 1) {
    return 1;
  }

  if (target >= 1) {
    return Infinity;
  }

  return Math.ceil(Math.log1p(-target) / Math.log1p(-probability));
}

function updateAttemptsPanel() {
  const reference = state.pinnedReference;

  if (!reference) {
    attemptsPanel.hidden = false;
    attemptsList.hidden = true;
    attemptsBasis.textContent = "Pin a chance to compute";
    return;
  }

  const cumulativeChance = cumulativeProbability(reference.probability, state.cumulative.attempts);
  const neededAttempts = attemptsForChance(reference.probability, state.cumulative.targetChance);

  attemptsPanel.hidden = false;
  attemptsList.hidden = false;
  attemptsBasis.textContent = `${reference.titleText} · ${reference.label} · ${reference.valueText} per attempt`;
  attemptsInput.value = String(state.cumulative.attempts);
  targetChanceInput.value = formatInputNumber(state.cumulative.targetChance);
  attemptsChanceOutput.textContent = formatChancePercent(cumulativeChance);
  requiredAttemptsOutput.textContent = Number.isFinite(neededAttempts)
    ? `${formatInteger(neededAttempts)} attempts`
    : "Not finite";
}

function chanceSnapshot(distribution) {
  const matched = matchingRolls(distribution, state.threshold, state.chanceMode);
  const probability = (matched / distribution.total) * shinyMultiplier(distribution);

  return {
    distributionId: distribution.id,
    label: distribution.label,
    color: distribution.color,
    probability,
    valueText: formatChancePercent(probability),
    oddsText: `${formatOdds(probability)}${shinyOddsText(distribution)}`
  };
}

function chartMetrics(width, height) {
  const compact = width < 560;
  const tiny = width < 380;
  const margins = {
    top: compact ? 50 : 30,
    right: compact ? 10 : 22,
    bottom: tiny ? 66 : compact ? 70 : 52,
    left: compact ? 26 : 62
  };

  return {
    ...margins,
    compact,
    width,
    height,
    plotWidth: width - margins.left - margins.right,
    plotHeight: height - margins.top - margins.bottom
  };
}

function xForPercent(percent, metrics) {
  return metrics.left + (percent / 100) * metrics.plotWidth;
}

function yForFrequency(frequency, metrics, yMax) {
  return metrics.top + metrics.plotHeight - (frequency / yMax) * metrics.plotHeight;
}

function updateStats() {
  updateReferenceRow();
  chanceList.replaceChildren(...activeDistributions().map((distribution) => {
    const snapshot = chanceSnapshot(distribution);
    const row = document.createElement("div");
    const dot = document.createElement("span");
    const label = document.createElement("span");
    const value = document.createElement("strong");
    const odds = document.createElement("small");
    const pin = document.createElement("button");

    row.className = "chance-row";
    row.style.setProperty("--series-color", distribution.color);
    dot.className = "chance-dot";
    label.className = "chance-label";
    value.className = "chance-value";
    odds.className = "chance-odds";
    pin.className = "pin-button";
    pin.type = "button";
    pin.textContent = "📌";
    pin.title = `Pin ${distribution.label} as reference`;
    pin.setAttribute("aria-label", `Pin ${distribution.label} as reference`);
    pin.addEventListener("click", () => {
      pinReference(snapshot);
    });

    label.textContent = snapshot.label;
    value.textContent = snapshot.valueText;
    odds.textContent = snapshot.oddsText;

    row.append(dot, label, value, pin, odds);

    if (state.pinnedReference) {
      const ratio = document.createElement("small");
      ratio.className = "chance-ratio";
      ratio.textContent = comparisonText(snapshot.probability);
      row.append(ratio);
    }

    return row;
  }));

  thresholdOutput.textContent = formatPercent(state.threshold, 0);
  thresholdPrev.disabled = thresholdIndex() === 0;
  thresholdNext.disabled = thresholdIndex() === meaningfulThresholds.length - 1;
  chanceModeRadios.forEach((radio) => {
    radio.checked = radio.value === state.chanceMode;
  });
  updateShinyControls();
  updateAttemptsPanel();
}

function pinReference(snapshot) {
  state.pinnedReference = {
    ...snapshot,
    threshold: state.threshold,
    chanceMode: state.chanceMode,
    titleText: chanceTitleText()
  };
  updateStats();
  drawChart();
}

function unpinReference() {
  state.pinnedReference = null;
  updateStats();
  drawChart();
}

function updateReferenceRow() {
  const reference = state.pinnedReference;

  if (!reference) {
    referenceRow.hidden = true;
    referenceRow.replaceChildren();
    return;
  }

  const dot = document.createElement("span");
  const label = document.createElement("span");
  const value = document.createElement("strong");
  const unpin = document.createElement("button");
  const odds = document.createElement("small");
  const context = document.createElement("small");

  referenceRow.hidden = false;
  referenceRow.style.setProperty("--series-color", REFERENCE_COLOR);
  dot.className = "chance-dot";
  label.className = "chance-label";
  value.className = "chance-value";
  unpin.className = "pin-button";
  odds.className = "chance-odds";
  context.className = "chance-context";

  label.textContent = `${reference.label} reference`;
  value.textContent = reference.valueText;
  unpin.type = "button";
  unpin.textContent = "×";
  unpin.title = "Remove reference";
  unpin.setAttribute("aria-label", "Remove pinned reference");
  unpin.addEventListener("click", unpinReference);
  odds.textContent = reference.oddsText;
  context.textContent = reference.titleText;

  referenceRow.replaceChildren(dot, label, value, unpin, odds, context);
}

function isSumInChanceMode(sum, selectedSum) {
  if (state.chanceMode === "exact") {
    return sum === selectedSum;
  }

  if (state.chanceMode === "lower") {
    return sum <= selectedSum;
  }

  return sum >= selectedSum;
}

function selectedRangePercents(selectedSum) {
  const band = sumBandPercents(selectedSum);

  if (state.chanceMode === "exact") {
    return band;
  }

  if (state.chanceMode === "lower") {
    return { left: 0, right: band.right };
  }

  return { left: band.left, right: 100 };
}

function drawChart() {
  const bounds = chart.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, bounds.width);
  const height = Math.max(280, bounds.height);

  if (chart.width !== Math.round(width * dpr) || chart.height !== Math.round(height * dpr)) {
    chart.width = Math.round(width * dpr);
    chart.height = Math.round(height * dpr);
  }

  const ctx = chart.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const visibleDistributions = activeDistributions();
  const metrics = chartMetrics(width, height);
  const yMax = Math.max(...visibleDistributions.map((distribution) => distribution.maxFrequency)) * 1.16;
  const plotRight = metrics.left + metrics.plotWidth;
  const plotBottom = metrics.top + metrics.plotHeight;
  const thresholdX = xForPercent(state.threshold, metrics);
  const minSum = minSumForThreshold(state.threshold);
  const selectedRange = selectedRangePercents(minSum);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(29, 111, 100, 0.1)";
  ctx.fillRect(
    xForPercent(selectedRange.left, metrics),
    metrics.top,
    xForPercent(selectedRange.right, metrics) - xForPercent(selectedRange.left, metrics),
    metrics.plotHeight
  );

  ctx.strokeStyle = "#d9e0db";
  ctx.lineWidth = 1;
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#68716d";
  ctx.textBaseline = "middle";

  for (let tick = 0; tick <= 4; tick += 1) {
    const frequency = (yMax / 4) * tick;
    const y = yForFrequency(frequency, metrics, yMax);
    ctx.beginPath();
    ctx.moveTo(metrics.left, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
  }

  const barGap = width < 560 ? 1 : 2;
  wildDistribution.points.forEach((point) => {
    const { left: leftPercent, right: rightPercent } = sumBandPercents(point.sum);
    const x = xForPercent(leftPercent, metrics) + barGap / 2;
    const barWidth = Math.max(2, xForPercent(rightPercent, metrics) - xForPercent(leftPercent, metrics) - barGap);
    const y = yForFrequency(point.frequency, metrics, yMax);
    const heightPx = plotBottom - y;

    ctx.fillStyle = isSumInChanceMode(point.sum, minSum) ? "#1d6f64" : "#9dcfc1";
    ctx.fillRect(x, y, barWidth, heightPx);
  });

  visibleDistributions
    .filter((distribution) => distribution.id !== "wild")
    .forEach((distribution) => {
      drawOverlayDistribution(ctx, distribution, metrics, yMax, plotBottom, minSum);
    });

  ctx.strokeStyle = "#1f2523";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(metrics.left, metrics.top);
  ctx.lineTo(metrics.left, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  ctx.fillStyle = "#68716d";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawStarAxis(ctx, metrics, plotBottom, height);

  if (!metrics.compact) {
    ctx.save();
    ctx.translate(18, metrics.top + metrics.plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Relative frequency", 0, 0);
    ctx.restore();
  }

  ctx.strokeStyle = "#d8423a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(thresholdX, metrics.top);
  ctx.lineTo(thresholdX, plotBottom);
  ctx.stroke();

  drawReferenceLine(ctx, metrics, plotBottom);

  const controlWidth = thresholdControl.offsetWidth || 132;
  const controlHeight = thresholdControl.offsetHeight || 24;
  const controlX = clamp(thresholdX, metrics.left + controlWidth / 2, plotRight - controlWidth / 2);
  thresholdControl.style.left = `${controlX}px`;
  thresholdControl.style.top = `${Math.max(4, metrics.top - controlHeight - 4)}px`;
}

function drawReferenceLine(ctx, metrics, plotBottom) {
  const reference = state.pinnedReference;

  if (!reference) {
    return;
  }

  const referenceX = xForPercent(reference.threshold, metrics);

  ctx.save();
  ctx.strokeStyle = REFERENCE_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(referenceX, metrics.top);
  ctx.lineTo(referenceX, plotBottom);
  ctx.stroke();
  ctx.restore();
}

function drawStarAxis(ctx, metrics, plotBottom, canvasHeight) {
  const labelY = plotBottom + (metrics.compact ? 9 : 12);
  const hitTop = plotBottom;
  const hitBottom = canvasHeight;
  const starFont = `${metrics.compact ? "10px" : "15px"} Inter, "Segoe UI Symbol", "Apple Color Emoji", system-ui, sans-serif`;

  ctx.font = starFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const rawRegions = STAR_RATINGS.map((rating, index) => {
    const left = xForPercent(rating.threshold, metrics);
    const next = STAR_RATINGS[index + 1];
    const right = next ? xForPercent(next.threshold, metrics) : metrics.left + metrics.plotWidth;

    return { ...rating, left, right };
  });
  const lastRegion = rawRegions[rawRegions.length - 1];
  const lastLabelWidth = ctx.measureText(lastRegion.label).width;
  const lastMinWidth = Math.max(lastLabelWidth + 16, metrics.compact ? 42 : 48);
  lastRegion.left = Math.max(metrics.left, lastRegion.right - lastMinWidth);
  rawRegions[rawRegions.length - 2].right = Math.max(rawRegions[rawRegions.length - 2].left, lastRegion.left);
  starAxisHitRegions = rawRegions.map((region) => ({
    threshold: region.threshold,
    left: region.left,
    right: region.right,
    top: hitTop,
    bottom: hitBottom
  }));

  STAR_RATINGS.forEach((rating) => {
    const x = xForPercent(rating.threshold, metrics);
    ctx.strokeStyle = "#cfd8d2";
    ctx.beginPath();
    ctx.moveTo(x, plotBottom);
    ctx.lineTo(x, plotBottom + 6);
    ctx.stroke();
  });

  rawRegions.forEach((region) => {
    const label = metrics.compact ? [...region.label].join("\n") : region.label;
    const labelWidth = metrics.compact
      ? Math.max(...[...region.label].map((star) => ctx.measureText(star).width))
      : ctx.measureText(region.label).width;
    const center = (region.left + region.right) / 2;
    const labelX = clamp(center, metrics.left + labelWidth / 2 + 2, metrics.left + metrics.plotWidth - labelWidth / 2 - 2);

    ctx.fillStyle = region.threshold === state.threshold ? "#1f2523" : "#68716d";
    drawAxisLabel(ctx, label, labelX, labelY, metrics.compact ? 11 : 0);
  });
}

function drawAxisLabel(ctx, label, x, y, lineHeight) {
  const lines = label.split("\n");

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function drawOverlayDistribution(ctx, distribution, metrics, yMax, plotBottom, minSum) {
  const pointsToDraw = distribution.points.filter((point) => point.count > 0);

  if (pointsToDraw.length === 0) {
    return;
  }

  ctx.beginPath();
  pointsToDraw.forEach((point, index) => {
    const x = xForPercent(point.percent, metrics);
    const y = yForFrequency(point.frequency, metrics, yMax);

    if (index === 0) {
      ctx.moveTo(x, plotBottom);
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineTo(xForPercent(pointsToDraw[pointsToDraw.length - 1].percent, metrics), plotBottom);
  ctx.closePath();
  ctx.fillStyle = distribution.fill;
  ctx.fill();

  drawLineSegment(ctx, pointsToDraw, metrics, yMax, distribution.dim, 2);
  drawLineSegment(
    ctx,
    pointsToDraw.filter((point) => isSumInChanceMode(point.sum, minSum)),
    metrics,
    yMax,
    distribution.color,
    3
  );
}

function drawLineSegment(ctx, pointsToDraw, metrics, yMax, color, width) {
  if (pointsToDraw.length === 0) {
    return;
  }

  if (pointsToDraw.length === 1) {
    const point = pointsToDraw[0];
    const x = xForPercent(point.percent, metrics);
    const y = yForFrequency(point.frequency, metrics, yMax);

    ctx.beginPath();
    ctx.arc(x, y, Math.max(3, width * 1.35), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }

  ctx.beginPath();
  pointsToDraw.forEach((point, index) => {
    const x = xForPercent(point.percent, metrics);
    const y = yForFrequency(point.frequency, metrics, yMax);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function setThreshold(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return;
  }

  state.threshold = snapThreshold(parsed);
  updateStats();
  drawChart();
}

function stepThreshold(direction) {
  const nextIndex = clamp(thresholdIndex() + direction, 0, meaningfulThresholds.length - 1);
  setThreshold(meaningfulThresholds[nextIndex]);
}

function thresholdFromPointer(event) {
  const bounds = chart.getBoundingClientRect();
  const metrics = chartMetrics(bounds.width, bounds.height);
  const x = clamp(event.clientX - bounds.left, metrics.left, metrics.left + metrics.plotWidth);
  return ((x - metrics.left) / metrics.plotWidth) * 100;
}

function starRatingFromPointer(event) {
  const bounds = chart.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;

  return starAxisHitRegions.find((region) => (
    x >= region.left && x <= region.right && y >= region.top && y <= region.bottom
  ));
}

floorToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      state.selectedFloorIds.add(toggle.value);
    } else {
      state.selectedFloorIds.delete(toggle.value);
    }

    updateStats();
    drawChart();
  });
});

chanceModeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      state.chanceMode = radio.value;
      updateStats();
      drawChart();
    }
  });
});

shinyEnabled.addEventListener("change", () => {
  state.shiny.enabled = shinyEnabled.checked;
  updateStats();
});

wildRateSlider.addEventListener("input", () => {
  state.shiny.wildRateIndex = Number(wildRateSlider.value);
  updateStats();
});

raidBoosted.addEventListener("change", () => {
  state.shiny.raidBoosted = raidBoosted.checked;
  updateStats();
});

attemptsInput.addEventListener("input", () => {
  const value = Number(attemptsInput.value);

  if (Number.isFinite(value)) {
    state.cumulative.attempts = clamp(Math.floor(value), 1, 1000000);
    updateAttemptsPanel();
  }
});

targetChanceInput.addEventListener("input", () => {
  const value = Number(targetChanceInput.value);

  if (Number.isFinite(value)) {
    state.cumulative.targetChance = clamp(value, 0, 100);
    updateAttemptsPanel();
  }
});

thresholdPrev.addEventListener("click", () => {
  stepThreshold(-1);
});

thresholdNext.addEventListener("click", () => {
  stepThreshold(1);
});

chart.addEventListener("pointerdown", (event) => {
  const starRating = starRatingFromPointer(event);

  if (starRating) {
    setThreshold(starRating.threshold);
    return;
  }

  chart.setPointerCapture(event.pointerId);
  setThreshold(thresholdFromPointer(event));
});

chart.addEventListener("pointermove", (event) => {
  if (event.buttons === 1) {
    setThreshold(thresholdFromPointer(event));
  }
});

new ResizeObserver(drawChart).observe(chart);
updateStats();
drawChart();
