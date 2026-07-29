const MAX_IV = 15;
const STAT_COUNT = 3;
const MAX_SUM = MAX_IV * STAT_COUNT;
const WILD_SHINY_RATES = [512, 256, 128, 64, 32, 25];
const REFERENCE_COLOR = "#0E6C99";
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
    id: "shadowRaid",
    label: "Shadow Raid",
    floor: 6,
    color: "#7055a8",
    fill: "rgba(112, 85, 168, 0.14)",
    dim: "rgba(112, 85, 168, 0.42)"
  },
  {
    id: "mighty",
    label: "Mighty",
    floor: 13,
    color: "#e87516",
    fill: "rgba(232, 117, 22, 0.14)",
    dim: "rgba(232, 117, 22, 0.42)"
  },
  {
    id: "lucky",
    label: "Lucky",
    floor: 12,
    color: "#b14c8f",
    fill: "rgba(177, 76, 143, 0.14)",
    dim: "rgba(177, 76, 143, 0.42)"
  },
  {
    id: "goodFriend",
    label: "Good friend",
    floor: 1,
    color: "#487a6f",
    fill: "rgba(72, 122, 111, 0.14)",
    dim: "rgba(72, 122, 111, 0.42)"
  },
  {
    id: "greatFriend",
    label: "Great friend",
    floor: 2,
    color: "#6b8b3e",
    fill: "rgba(107, 139, 62, 0.14)",
    dim: "rgba(107, 139, 62, 0.42)"
  },
  {
    id: "ultraFriend",
    label: "Ultra friend",
    floor: 3,
    color: "#b67633",
    fill: "rgba(182, 118, 51, 0.14)",
    dim: "rgba(182, 118, 51, 0.42)"
  },
  {
    id: "bestFriend",
    label: "Best friend",
    floor: 4,
    color: "#a85f70",
    fill: "rgba(168, 95, 112, 0.14)",
    dim: "rgba(168, 95, 112, 0.42)"
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
const tradeToggle = document.querySelector("#tradeToggle");
const tradeFloorList = document.querySelector("#tradeFloorList");
const tradeIndicator = document.querySelector("#tradeIndicator");
const shinyOptions = document.querySelector("#shinyOptions");
const shinyEnabled = document.querySelector("#shinyEnabled");
const wildRateSlider = document.querySelector("#wildRateSlider");
const wildRateControl = document.querySelector("#wildRateControl");
const raidBoosted = document.querySelector("#raidBoosted");
const raidBoostControl = document.querySelector("#raidBoostControl");
const shinyRateOutput = document.querySelector("#shinyRateOutput");
const ivToggle = document.querySelector("#ivToggle");
const ivControls = document.querySelector("#ivControls");
const ivIndicator = document.querySelector("#ivIndicator");
const ivSummary = document.querySelector("#ivSummary");
const ivInputs = [...document.querySelectorAll("[data-iv-stat]")];
const ivOutputs = [...document.querySelectorAll("[data-iv-output]")];
const pokemonSearch = document.querySelector("#pokemonSearch");
const pokemonOptions = document.querySelector("#pokemonOptions");
const pokemonSearchStatus = document.querySelector("#pokemonSearchStatus");
const levelSettings = document.querySelector("#levelSettings");
const levelSlider = document.querySelector("#levelSlider");
const levelInput = document.querySelector("#levelInput");
const levelPresets = [...document.querySelectorAll("[data-level]")];
const cpOutput = document.querySelector("#cpOutput");

const distributions = FLOOR_CONFIGS.map(createDistribution);
const distributionById = Object.fromEntries(distributions.map((distribution) => [distribution.id, distribution]));
const wildDistribution = distributionById.wild;
const meaningfulThresholds = [...new Set(wildDistribution.points.map((point) => point.percent))];
let starAxisHitRegions = [];
const state = {
  threshold: snapThreshold(90),
  ivValues: typicalIvsForSum(minSumForThreshold(snapThreshold(90))),
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
  },
  pokemon: {
    all: [],
    selected: null,
    cpMultipliers: {},
    level: 20,
    loaded: false
  }
};

let pokemonMatches = [];
let activePokemonOption = -1;

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

function normalizeLevel(value) {
  return Math.round(clamp(Number(value), 1, 50) * 2) / 2;
}

function pokemonName(name) {
  return name
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pokemonLabel(pokemon) {
  return `#${String(pokemon.number).padStart(4, "0")} ${pokemon.names.en}`;
}

function normalizeSearchName(name) {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function calculateCp(pokemon, ivs, level) {
  const multiplier = state.pokemon.cpMultipliers[String(level)];

  if (!pokemon || !Number.isFinite(multiplier)) {
    return null;
  }

  const [attackIv, defenseIv, staminaIv] = ivs;
  return Math.floor(
    ((pokemon.attack + attackIv)
      * Math.sqrt(pokemon.defense + defenseIv)
      * Math.sqrt(pokemon.stamina + staminaIv)
      * (multiplier ** 2)) / 10
  );
}

function calculateCpRange(pokemon, ivSum, level, ivFloor = 0) {
  let minimum = Infinity;
  let maximum = -Infinity;

  for (let attackIv = ivFloor; attackIv <= MAX_IV; attackIv += 1) {
    for (let defenseIv = ivFloor; defenseIv <= MAX_IV; defenseIv += 1) {
      const staminaIv = ivSum - attackIv - defenseIv;

      if (staminaIv < ivFloor || staminaIv > MAX_IV) {
        continue;
      }

      const cp = calculateCp(pokemon, [attackIv, defenseIv, staminaIv], level);

      if (cp !== null) {
        minimum = Math.min(minimum, cp);
        maximum = Math.max(maximum, cp);
      }
    }
  }

  return Number.isFinite(minimum) ? { minimum, maximum } : null;
}

function calculateCpIntervalRange(pokemon, ivFloor, level, threshold, chanceMode) {
  const thresholdSum = minSumForThreshold(threshold);
  let minimum = Infinity;
  let maximum = -Infinity;

  for (let attackIv = ivFloor; attackIv <= MAX_IV; attackIv += 1) {
    for (let defenseIv = ivFloor; defenseIv <= MAX_IV; defenseIv += 1) {
      for (let staminaIv = ivFloor; staminaIv <= MAX_IV; staminaIv += 1) {
        const sum = attackIv + defenseIv + staminaIv;
        const matches = chanceMode === "exact"
          ? sum === thresholdSum
          : chanceMode === "lower"
            ? sum <= thresholdSum
            : sum >= thresholdSum;

        if (!matches) {
          continue;
        }

        const cp = calculateCp(pokemon, [attackIv, defenseIv, staminaIv], level);

        if (cp !== null) {
          minimum = Math.min(minimum, cp);
          maximum = Math.max(maximum, cp);
        }
      }
    }
  }

  return Number.isFinite(minimum) ? { minimum, maximum } : null;
}

function cpRangeText(range) {
  if (!range) {
    return "not encountered";
  }

  const minimum = range.minimum.toLocaleString();
  const maximum = range.maximum.toLocaleString();
  return range.minimum === range.maximum
    ? `CP ${minimum}`
    : `CP ${minimum}–${maximum}`;
}

function cpRangesMatch(first, second) {
  return Boolean(
    first
    && second
    && first.minimum === second.minimum
    && first.maximum === second.maximum
  );
}

function renderCpRanges(pokemon, ivSum) {
  const wildRange = calculateCpRange(pokemon, ivSum, state.pokemon.level);
  const ranges = activeDistributions()
    .map((distribution) => ({
      distribution,
      range: calculateCpRange(pokemon, ivSum, state.pokemon.level, distribution.floor)
    }))
    .filter(({ distribution, range }) => (
      distribution.id === "wild"
      || !range
      || !cpRangesMatch(range, wildRange)
    ));

  const rows = ranges.map(({ distribution, range }) => {
    const row = document.createElement("span");
    const dot = document.createElement("span");
    const value = document.createElement("span");

    row.className = "cp-range-row";
    row.style.setProperty("--series-color", distribution.color);
    dot.className = "cp-range-dot";
    dot.setAttribute("aria-hidden", "true");
    value.className = "cp-range-value";
    value.textContent = cpRangeText(range);
    row.append(dot, value);
    return row;
  });

  cpOutput.replaceChildren(...rows);
  cpOutput.title = `${pokemonLabel(pokemon)} at level ${state.pokemon.level}, possible CPs for IV total ${ivSum}/${MAX_SUM}`;
  cpOutput.setAttribute(
    "aria-label",
    ranges
      .map(({ distribution, range }) => (
        `${distribution.label}: ${range
          ? `Combat Power ${range.minimum}${range.minimum === range.maximum ? "" : ` to ${range.maximum}`}`
          : "not encountered"}`
      ))
      .join(". ")
  );
}

function updatePokemonOutput() {
  const pokemon = state.pokemon.selected;
  levelSettings.hidden = !pokemon;
  cpOutput.hidden = !pokemon;

  if (!pokemon) {
    cpOutput.textContent = "";
    return;
  }

  const exactMode = ivToggle.getAttribute("aria-expanded") === "true";
  cpOutput.dataset.mode = exactMode ? "exact" : "range";

  if (exactMode) {
    const cp = calculateCp(pokemon, state.ivValues, state.pokemon.level);
    cpOutput.textContent = cp === null ? "CP unavailable" : `CP ${cp.toLocaleString()}`;
    cpOutput.title = `${pokemonLabel(pokemon)} at level ${state.pokemon.level}, IVs ${state.ivValues.join("/")}`;
    cpOutput.setAttribute("aria-label", cp === null ? "CP unavailable" : `Combat Power ${cp}`);
  } else {
    const ivSum = state.ivValues.reduce((total, value) => total + value, 0);
    renderCpRanges(pokemon, ivSum);
  }

  levelSlider.value = String(state.pokemon.level);
  levelInput.value = String(state.pokemon.level);
  levelPresets.forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.level) === state.pokemon.level));
  });
}

function closePokemonOptions() {
  pokemonOptions.hidden = true;
  pokemonSearch.setAttribute("aria-expanded", "false");
  pokemonSearch.removeAttribute("aria-activedescendant");
  activePokemonOption = -1;
}

function setActivePokemonOption(index) {
  const options = [...pokemonOptions.querySelectorAll(".pokemon-option")];

  if (options.length === 0) {
    return;
  }

  activePokemonOption = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => {
    option.setAttribute("aria-selected", String(optionIndex === activePokemonOption));
  });
  const active = options[activePokemonOption];
  pokemonSearch.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block: "nearest" });
}

function selectPokemon(pokemon) {
  state.pokemon.selected = pokemon;
  pokemonSearch.value = pokemon ? pokemonLabel(pokemon) : "";
  pokemonSearchStatus.textContent = pokemon
    ? `${pokemon.attack} Attack · ${pokemon.defense} Defense · ${pokemon.stamina} Stamina`
    : "No Pokémon selected — showing IV odds only.";
  closePokemonOptions();
  updateStats();
}

function renderPokemonOptions(matches) {
  pokemonMatches = matches;
  const choices = [null, ...matches];

  pokemonOptions.replaceChildren(...choices.map((pokemon, index) => {
    const option = document.createElement("button");
    const number = document.createElement("small");
    const names = document.createElement("span");
    const englishName = document.createElement("strong");
    const translatedNames = document.createElement("small");
    const germanName = document.createElement("span");
    const japaneseName = document.createElement("span");

    option.type = "button";
    option.className = "pokemon-option";
    option.id = `pokemon-option-${index}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    number.textContent = pokemon ? `#${String(pokemon.number).padStart(4, "0")}` : "None";
    names.className = "pokemon-option-names";
    englishName.textContent = pokemon ? pokemon.names.en : "IV odds only";
    names.append(englishName);

    if (pokemon) {
      translatedNames.className = "pokemon-option-translations";
      germanName.lang = "de";
      germanName.textContent = pokemon.names.de;
      japaneseName.lang = "ja";
      japaneseName.textContent = pokemon.names.ja;
      translatedNames.append(germanName, japaneseName);
      names.append(translatedNames);
    }

    option.append(number, names);
    option.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      selectPokemon(pokemon);
    });
    return option;
  }));

  pokemonOptions.hidden = false;
  pokemonSearch.setAttribute("aria-expanded", "true");
  activePokemonOption = -1;
}

function searchPokemon() {
  if (!state.pokemon.loaded) {
    return;
  }

  const query = pokemonSearch.value.trim();
  const selectedLabel = state.pokemon.selected ? pokemonLabel(state.pokemon.selected) : "";

  if (query === selectedLabel) {
    pokemonSearchStatus.textContent = `${state.pokemon.selected.attack} Attack · ${state.pokemon.selected.defense} Defense · ${state.pokemon.selected.stamina} Stamina`;
    renderPokemonOptions([state.pokemon.selected]);
    return;
  }

  const normalizedName = normalizeSearchName(query);
  const numberQuery = /^\d+$/.test(query) ? Number(query) : null;
  const matches = query
    ? state.pokemon.all.filter((pokemon) => (
      (numberQuery !== null && pokemon.number === numberQuery)
      || pokemon.searchNames.some((name) => name.includes(normalizedName))
    ))
    : [];

  pokemonSearchStatus.textContent = query
    ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}`
    : (state.pokemon.selected
      ? `${state.pokemon.selected.attack} Attack · ${state.pokemon.selected.defense} Defense · ${state.pokemon.selected.stamina} Stamina`
      : "No Pokémon selected — showing IV odds only.");
  renderPokemonOptions(matches);
}

function applyPokemonData(pokemonRows, cpMultipliers, namesByPokemonId) {
  state.pokemon.all = pokemonRows.map(([id, number, name, attack, defense, stamina]) => ({
    id,
    number,
    name,
    attack,
    defense,
    stamina,
    names: namesByPokemonId[id] || {
      csvId: null,
      en: pokemonName(name),
      de: "",
      ja: ""
    }
  })).map((pokemon) => ({
    ...pokemon,
    searchNames: [
      pokemon.names.en,
      pokemon.names.de,
      pokemon.names.ja
    ].filter(Boolean).map(normalizeSearchName)
  }));
  state.pokemon.cpMultipliers = cpMultipliers;
  state.pokemon.loaded = true;
  pokemonSearch.disabled = false;
  pokemonSearchStatus.textContent = "No Pokémon selected — showing IV odds only.";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = rows.shift();
  return rows
    .filter((values) => values.some(Boolean))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function mapPokemonNames(pokemonRows, translatedNameRows) {
  return Object.fromEntries(pokemonRows.map(([pokemonId, number]) => {
    const names = translatedNameRows[number - 1];

    if (!names) {
      return [pokemonId, null];
    }

    return [pokemonId, {
      csvId: names.key,
      en: names.en,
      de: names.de,
      ja: names.ja
    }];
  }));
}

function loadOfflinePokemonData() {
  return new Promise((resolve, reject) => {
    if (window.POGO_OFFLINE_DATA) {
      resolve(window.POGO_OFFLINE_DATA);
      return;
    }

    const script = document.createElement("script");
    script.src = "offline-data.js";
    script.onload = () => {
      if (window.POGO_OFFLINE_DATA) {
        resolve(window.POGO_OFFLINE_DATA);
      } else {
        reject(new Error("Offline Pokémon data is invalid."));
      }
    };
    script.onerror = () => reject(new Error("Offline Pokémon data could not be loaded."));
    document.head.append(script);
  });
}

async function loadPokemonData() {
  try {
    let pokemonRows;
    let cpMultipliers;
    let namesByPokemonId;

    if (window.location.protocol === "file:") {
      const offlineData = await loadOfflinePokemonData();
      pokemonRows = offlineData.pokemon;
      cpMultipliers = offlineData.cpMultipliers;
      namesByPokemonId = offlineData.names;
    } else {
      try {
        const [pokemonResponse, multiplierResponse, namesResponse] = await Promise.all([
          fetch("pokemon.json"),
          fetch("cp-multipliers.json"),
          fetch("names.csv")
        ]);

        if (!pokemonResponse.ok || !multiplierResponse.ok || !namesResponse.ok) {
          throw new Error("Pokémon data could not be loaded.");
        }

        const [loadedPokemonRows, loadedCpMultipliers, namesCsv] = await Promise.all([
          pokemonResponse.json(),
          multiplierResponse.json(),
          namesResponse.text()
        ]);
        pokemonRows = loadedPokemonRows;
        cpMultipliers = loadedCpMultipliers;
        namesByPokemonId = mapPokemonNames(pokemonRows, parseCsv(namesCsv));
      } catch (fetchError) {
        console.warn("Using offline Pokémon data fallback.", fetchError);
        const offlineData = await loadOfflinePokemonData();
        pokemonRows = offlineData.pokemon;
        cpMultipliers = offlineData.cpMultipliers;
        namesByPokemonId = offlineData.names;
      }
    }

    applyPokemonData(pokemonRows, cpMultipliers, namesByPokemonId || {});
  } catch (error) {
    pokemonSearch.disabled = true;
    pokemonSearchStatus.textContent = "Pokémon data unavailable.";
    console.error(error);
  }
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

function typicalIvsForSum(sum) {
  const values = [0, 0, 0];

  for (let currentSum = 0; currentSum < sum; currentSum += 1) {
    const lowest = Math.min(...values);
    const index = values.findIndex((value) => value === lowest);
    values[index] += 1;
  }

  return values;
}

function syncIvsToSum(targetSum) {
  let currentSum = state.ivValues.reduce((total, value) => total + value, 0);

  while (currentSum < targetSum) {
    const lowest = Math.min(...state.ivValues);
    const index = state.ivValues.findIndex((value) => value === lowest);
    state.ivValues[index] += 1;
    currentSum += 1;
  }

  while (currentSum > targetSum) {
    const highest = Math.max(...state.ivValues);
    let index = state.ivValues.length - 1;

    while (state.ivValues[index] !== highest) {
      index -= 1;
    }

    state.ivValues[index] -= 1;
    currentSum -= 1;
  }
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
  if (distribution.id === "wild" || distribution.id === "weather" || distribution.id === "mighty") {
    return WILD_SHINY_RATES[state.shiny.wildRateIndex];
  }

  if (distribution.id === "raid" || distribution.id === "shadowRaid") {
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
  const subject = state.pokemon.selected ? "Chance and CP" : "Chance";
  let base = `${subject} of ${thresholdText}`;

  if (state.chanceMode === "higher" && state.threshold !== 100) {
    base = `${base} or higher`;
  } else if (state.chanceMode === "lower" && state.threshold !== 0) {
    base = `${base} or lower`;
  }

  return state.shiny.enabled ? `${base} + shiny` : base;
}

function updateShinyControls() {
  const enabled = state.shiny.enabled;
  const raidActive = state.selectedFloorIds.has("raid") || state.selectedFloorIds.has("shadowRaid");
  const wildDenominator = WILD_SHINY_RATES[state.shiny.wildRateIndex];
  const raidDenominator = state.shiny.raidBoosted ? 10 : 20;

  shinyOptions.dataset.enabled = String(enabled);
  chanceTitle.textContent = chanceTitleText();
  shinyEnabled.checked = enabled;
  wildRateSlider.value = String(state.shiny.wildRateIndex);
  raidBoosted.checked = state.shiny.raidBoosted;
  shinyRateOutput.textContent = enabled
    ? `Wild/weather/mighty 1 in ${wildDenominator}${raidActive ? ` · Raid 1 in ${raidDenominator}` : ""}`
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

    if (state.pokemon.selected) {
      const cpInterval = calculateCpIntervalRange(
        state.pokemon.selected,
        distribution.floor,
        state.pokemon.level,
        state.threshold,
        state.chanceMode
      );
      const cpPill = document.createElement("small");

      cpPill.className = "cp-interval-pill";
      cpPill.textContent = cpRangeText(cpInterval);
      cpPill.title = `${distribution.label} CP interval at level ${state.pokemon.level}`;
      label.append(cpPill);
    }

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
  ivInputs.forEach((input, index) => {
    const value = state.ivValues[index];
    const bar = input.closest(".iv-bar");

    input.value = String(value);
    input.setAttribute("aria-valuetext", `${value} out of ${MAX_IV}`);
    bar.style.setProperty("--iv-fill", `${(value / MAX_IV) * 100}%`);
    bar.dataset.perfect = String(value === MAX_IV);
  });
  ivOutputs.forEach((output, index) => {
    output.textContent = String(state.ivValues[index]);
  });
  ivSummary.textContent = state.ivValues.join(" / ");
  updatePokemonOutput();
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

  ctx.strokeStyle = "#0E6C99";
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

function setThreshold(value, { syncIvs = true } = {}) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return;
  }

  const threshold = snapThreshold(parsed);

  if (syncIvs) {
    syncIvsToSum(minSumForThreshold(threshold));
  }

  state.threshold = threshold;
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

function setTradeOpen(isOpen) {
  tradeToggle.setAttribute("aria-expanded", String(isOpen));
  tradeFloorList.hidden = !isOpen;
  tradeIndicator.textContent = isOpen ? "▾" : "▸";
}

function setIvControlsOpen(isOpen) {
  ivToggle.setAttribute("aria-expanded", String(isOpen));
  ivControls.hidden = !isOpen;
  ivIndicator.textContent = isOpen ? "▾" : "▸";
  updatePokemonOutput();
}

ivToggle.addEventListener("click", () => {
  setIvControlsOpen(ivToggle.getAttribute("aria-expanded") !== "true");
});

ivInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    state.ivValues[index] = clamp(Math.round(Number(input.value)), 0, MAX_IV);
    const sum = state.ivValues.reduce((total, value) => total + value, 0);
    setThreshold(percentForSum(sum), { syncIvs: false });
  });
});

pokemonSearch.disabled = true;
pokemonSearch.addEventListener("input", searchPokemon);
pokemonSearch.addEventListener("focus", searchPokemon);
pokemonSearch.addEventListener("keydown", (event) => {
  const options = [...pokemonOptions.querySelectorAll(".pokemon-option")];

  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActivePokemonOption(activePokemonOption + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActivePokemonOption(activePokemonOption - 1);
  } else if (event.key === "Enter" && activePokemonOption >= 0) {
    event.preventDefault();
    const pokemon = activePokemonOption === 0 ? null : pokemonMatches[activePokemonOption - 1];
    selectPokemon(pokemon);
  } else if (event.key === "Escape") {
    pokemonSearch.value = state.pokemon.selected ? pokemonLabel(state.pokemon.selected) : "";
    closePokemonOptions();
  } else if (event.key === "Tab" && options.length > 0) {
    closePokemonOptions();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".combobox")) {
    closePokemonOptions();
  }
});

function setPokemonLevel(value) {
  if (!Number.isFinite(Number(value))) {
    return;
  }

  state.pokemon.level = normalizeLevel(value);
  updateStats();
}

levelSlider.addEventListener("input", () => {
  setPokemonLevel(levelSlider.value);
});

levelInput.addEventListener("input", () => {
  if (levelInput.value !== "") {
    setPokemonLevel(levelInput.value);
  }
});

levelInput.addEventListener("change", () => {
  setPokemonLevel(levelInput.value || state.pokemon.level);
});

levelPresets.forEach((button) => {
  button.addEventListener("click", () => {
    setPokemonLevel(button.dataset.level);
  });
});

tradeToggle.addEventListener("click", () => {
  setTradeOpen(tradeToggle.getAttribute("aria-expanded") !== "true");
});

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
loadPokemonData();
