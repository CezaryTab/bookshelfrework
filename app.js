const SLOT_COUNT = 3;
const PREMIUM_UNLOCK_COST = 100;
const RENTAL_DURATION_MS = 30 * 60 * 1000;
const SPEEDUP_MS = 6000;
const AUTO_RENDER_INTERVAL_MS = 220;
const DISPLAYED_SHELF_IDS = ["intelligence", "charisma", "vitality"];
const SLOT_LABELS = {
  intelligence: "INT",
  charisma: "CHA",
  vitality: "VIT",
  stamina: "STA",
  resilience: "RES"
};

const BOOK_CATALOG = [
  {
    id: "science_book_1",
    name: "Science Book",
    readingTimeSeconds: 5,
    rewards: { intelligence: 1 }
  },
  {
    id: "self_help_book_1",
    name: "Self Help Book",
    readingTimeSeconds: 5,
    rewards: { charisma: 1 }
  },
  {
    id: "self_help_book_2",
    name: "Self Help Book II",
    readingTimeSeconds: 10,
    rewards: { charisma: 2 }
  },
  {
    id: "science_book_2",
    name: "Science Book II",
    readingTimeSeconds: 10,
    rewards: { intelligence: 2 }
  },
  {
    id: "science_book_3",
    name: "Science Book III",
    readingTimeSeconds: 30,
    rewards: { intelligence: 3 }
  },
  {
    id: "self_help_book_3",
    name: "Self Help Book III",
    readingTimeSeconds: 30,
    rewards: { charisma: 3 }
  },
  {
    id: "life_guide_1",
    name: "Life Guide",
    readingTimeSeconds: 45,
    rewards: { vitality: 1, stamina: 1, resilience: 1, intelligence: 2, charisma: 2 }
  },
  {
    id: "life_guide_2",
    name: "Life Guide II",
    readingTimeSeconds: 60,
    rewards: { vitality: 2, stamina: 2, resilience: 2, intelligence: 3, charisma: 3 }
  },
  {
    id: "life_guide_3",
    name: "Life Guide III",
    readingTimeSeconds: 60,
    rewards: { vitality: 3, stamina: 3, resilience: 3, intelligence: 4, charisma: 4 }
  }
];

function createBookInstance(bookId, progressMs = 0) {
  const definition = BOOK_CATALOG.find((book) => book.id === bookId);
  return {
    ...definition,
    instanceId: `${bookId}-${Math.random().toString(36).slice(2, 8)}`,
    progressMs
  };
}

const state = {
  now: 0,
  lastFrameTime: null,
  lastUiRenderAt: 0,
  lastPurchased: null,
  selectedShelfId: "intelligence",
  shopHighlightUntil: 0,
  bookshelfLevel: 7,
  premiumUnlockCost: PREMIUM_UNLOCK_COST,
  rentalDurationMs: RENTAL_DURATION_MS,
  speedupMs: SPEEDUP_MS,
  shelves: [
    {
      id: "intelligence",
      label: "Intelligence",
      baseLevel: 21,
      currentLevel: 21,
      slots: [
        { permanentUnlocked: true, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 }
      ],
      queue: [createBookInstance("science_book_3", 15000)]
    },
    {
      id: "charisma",
      label: "Charisma",
      baseLevel: 16,
      currentLevel: 16,
      slots: [
        { permanentUnlocked: true, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 }
      ],
      queue: []
    },
    {
      id: "vitality",
      label: "Vitality",
      baseLevel: 13,
      currentLevel: 13,
      slots: [
        { permanentUnlocked: true, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 }
      ],
      queue: []
    },
    {
      id: "stamina",
      label: "Stamina",
      baseLevel: 11,
      currentLevel: 11,
      slots: [
        { permanentUnlocked: true, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 }
      ],
      queue: []
    },
    {
      id: "resilience",
      label: "Resilience",
      baseLevel: 10,
      currentLevel: 10,
      slots: [
        { permanentUnlocked: true, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 },
        { permanentUnlocked: false, rentalEndsAt: 0 }
      ],
      queue: []
    }
  ]
};

const elements = {
  focusShelf: document.querySelector("#focus-shelf"),
  statsList: document.querySelector("#stats-list"),
  shopList: document.querySelector("#shop-list"),
  shopCard: document.querySelector("#shop-card"),
  resetStatsButton: document.querySelector("#reset-stats-button"),
  bookshelfLevelLabel: document.querySelector("#bookshelf-level-label"),
  storageChip: document.querySelector("#storage-chip"),
  shopCapacityChip: document.querySelector("#shop-capacity-chip")
};

function getShelf(shelfId) {
  return state.shelves.find((shelf) => shelf.id === shelfId);
}

function getSelectedShelf() {
  return getShelf(state.selectedShelfId) || state.shelves[0];
}

function isSlotAccessible(slot) {
  return slot.permanentUnlocked || slot.rentalEndsAt > state.now;
}

function isSlotRented(slot) {
  return !slot.permanentUnlocked && slot.rentalEndsAt > state.now;
}

function getRentalMinutesRemaining(slot) {
  if (!isSlotRented(slot)) {
    return 0;
  }
  return Math.max(1, Math.ceil((slot.rentalEndsAt - state.now) / 60000));
}

function getProgressRatio(book) {
  const durationMs = book.readingTimeSeconds * 1000;
  return Math.max(0, Math.min(1, book.progressMs / durationMs));
}

function getSecondsRemaining(book) {
  const durationMs = book.readingTimeSeconds * 1000;
  return Math.max(0, Math.ceil((durationMs - book.progressMs) / 1000));
}

function formatClockLabel(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function getVisibleFilledSlots(shelf) {
  return Math.min(SLOT_COUNT, shelf.queue.length);
}

function getDisplayedAvailableSlots(shelf) {
  return Math.max(0, SLOT_COUNT - getVisibleFilledSlots(shelf));
}

function getDisplayedFreeUnlockedSlotCount() {
  return getDisplayedShelves().reduce((count, shelf) => {
    for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
      const slot = shelf.slots[slotIndex];
      if (isSlotAccessible(slot) && !shelf.queue[slotIndex]) {
        count += 1;
      }
    }
    return count;
  }, 0);
}

function getBookArtPath(book) {
  const primaryReward = Object.entries(book.rewards)
    .sort((left, right) => right[1] - left[1])[0]?.[0];
  return primaryReward === "intelligence" ? "figma-book.png" : "book.png";
}

function summarizeRewards(rewards) {
  return Object.entries(rewards)
    .map(([statId, value]) => `${SLOT_LABELS[statId]} +${value}`)
    .join(", ");
}

function getTotalStoredBooks() {
  return state.shelves.reduce((count, shelf) => count + shelf.queue.length, 0);
}

function getAccessibleSlotCount() {
  return state.shelves.reduce(
    (count, shelf) => count + shelf.slots.filter((slot) => isSlotAccessible(slot)).length,
    0
  );
}

function getActiveReadingCount() {
  return state.shelves.reduce((count, shelf) => {
    for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
      if (shelf.queue[slotIndex] && isSlotAccessible(shelf.slots[slotIndex])) {
        count += 1;
      }
    }
    return count;
  }, 0);
}

function getLockedSlotCount() {
  return state.shelves.reduce(
    (count, shelf) =>
      count + shelf.slots.filter((slot, slotIndex) => slotIndex > 0 && !isSlotAccessible(slot)).length,
    0
  );
}

function canBuyMoreBooks() {
  return getTotalStoredBooks() < state.bookshelfLevel;
}

function applyBookRewards(book) {
  for (const [statId, rewardValue] of Object.entries(book.rewards)) {
    const shelf = getShelf(statId);
    if (shelf) {
      shelf.currentLevel += rewardValue;
    }
  }
}

function advanceShelfSlot(shelf, slotIndex, deltaMs) {
  const slot = shelf.slots[slotIndex];
  const book = shelf.queue[slotIndex];
  if (!slot || !book || !isSlotAccessible(slot)) {
    return false;
  }

  const durationMs = book.readingTimeSeconds * 1000;
  book.progressMs += deltaMs;

  if (book.progressMs >= durationMs) {
    applyBookRewards(book);
    shelf.queue.splice(slotIndex, 1);
    return true;
  }

  return false;
}

function advanceSimulation(deltaMs) {
  const safeDelta = Math.max(0, Number(deltaMs) || 0);
  state.now += safeDelta;
  let didCompleteBook = false;

  state.shelves.forEach((shelf) => {
    for (let slotIndex = SLOT_COUNT - 1; slotIndex >= 0; slotIndex -= 1) {
      if (advanceShelfSlot(shelf, slotIndex, safeDelta)) {
        didCompleteBook = true;
      }
    }
  });

  return didCompleteBook;
}

function applySpeedup(shelfId, slotIndex) {
  const shelf = getShelf(shelfId);
  if (!shelf || !shelf.queue[slotIndex] || !isSlotAccessible(shelf.slots[slotIndex])) {
    return;
  }

  advanceShelfSlot(shelf, slotIndex, state.speedupMs);
  render();
}

function highlightShop() {
  state.shopHighlightUntil = state.now + 2500;
  render();

  if (elements.shopCard && typeof elements.shopCard.scrollIntoView === "function") {
    elements.shopCard.scrollIntoView({ block: "start", behavior: "smooth" });
  }
}

function unlockSlot(shelfId, slotIndex) {
  const shelf = getShelf(shelfId);
  const slot = shelf?.slots[slotIndex];
  if (!slot || slot.permanentUnlocked || slotIndex === 0) {
    return;
  }

  slot.permanentUnlocked = true;
  slot.rentalEndsAt = 0;
  state.selectedShelfId = shelfId;
  render();
}

function rentSlot(shelfId, slotIndex) {
  const shelf = getShelf(shelfId);
  const slot = shelf?.slots[slotIndex];
  if (!slot || slot.permanentUnlocked || slotIndex === 0) {
    return;
  }

  slot.rentalEndsAt = state.now + state.rentalDurationMs;
  state.selectedShelfId = shelfId;
  render();
}

function resetAllStats() {
  state.shelves.forEach((shelf) => {
    shelf.currentLevel = shelf.baseLevel;
  });
  render();
}

function chooseShelfForBook(bookDefinition) {
  const candidateStatIds = Object.entries(bookDefinition.rewards)
    .filter(([, rewardValue]) => rewardValue > 0)
    .map(([statId]) => statId);

  return state.shelves
    .filter((shelf) => candidateStatIds.includes(shelf.id))
    .sort((left, right) => {
      const leftHasVisibleSpace = left.queue.length < SLOT_COUNT ? 1 : 0;
      const rightHasVisibleSpace = right.queue.length < SLOT_COUNT ? 1 : 0;
      const visibleSpaceDiff = rightHasVisibleSpace - leftHasVisibleSpace;
      if (visibleSpaceDiff !== 0) {
        return visibleSpaceDiff;
      }

      const leftSelectedBonus = left.id === state.selectedShelfId ? 1 : 0;
      const rightSelectedBonus = right.id === state.selectedShelfId ? 1 : 0;
      const selectedDiff = rightSelectedBonus - leftSelectedBonus;
      if (selectedDiff !== 0) {
        return selectedDiff;
      }

      const rewardDiff = (bookDefinition.rewards[right.id] || 0) - (bookDefinition.rewards[left.id] || 0);
      if (rewardDiff !== 0) {
        return rewardDiff;
      }

      const queueDiff = left.queue.length - right.queue.length;
      if (queueDiff !== 0) {
        return queueDiff;
      }
      return left.label.localeCompare(right.label);
    })[0] || null;
}

function buyBook(bookId) {
  if (!canBuyMoreBooks()) {
    return;
  }

  const bookDefinition = BOOK_CATALOG.find((book) => book.id === bookId);
  if (!bookDefinition) {
    return;
  }

  const targetShelf = chooseShelfForBook(bookDefinition);
  if (!targetShelf) {
    return;
  }

  targetShelf.queue.push(createBookInstance(bookId, 0));
  const queueIndex = targetShelf.queue.length - 1;
  state.selectedShelfId = targetShelf.id;
  state.lastPurchased = {
    shelfId: targetShelf.id,
    slotIndex: queueIndex < SLOT_COUNT ? queueIndex : null,
    overflow: queueIndex >= SLOT_COUNT
  };
  render();
}

function selectShelf(shelfId) {
  if (!getShelf(shelfId)) {
    return;
  }

  state.selectedShelfId = shelfId;
  render();
}

function renderSlotCard(shelf, slotIndex) {
  const slot = shelf.slots[slotIndex];
  const book = shelf.queue[slotIndex] || null;
  const accessible = isSlotAccessible(slot);
  const rented = isSlotRented(slot);
  const isPurchasedSlot =
    state.lastPurchased &&
    state.lastPurchased.shelfId === shelf.id &&
    state.lastPurchased.slotIndex === slotIndex;
  const slotClasses = [
    "focus-slot",
    book && accessible ? "is-reading" : "",
    !accessible ? "is-locked" : "",
    accessible && !book ? "is-empty" : "",
    rented ? "is-rented" : "",
    isPurchasedSlot ? "is-new-book" : ""
  ].filter(Boolean).join(" ");

  let visualMarkup = "";
  let statusMarkup = "";
  let actionMarkup = `<div class="slot-action-spacer" aria-hidden="true"></div>`;

  if (book && accessible) {
    const progressPercent = Math.round(getProgressRatio(book) * 100);
    visualMarkup = `
      <img class="slot-art" src="${getBookArtPath(book)}" alt="${book.name}">
      ${rented ? `<span class="slot-rental-badge">${getRentalMinutesRemaining(slot)}m</span>` : ""}
    `;
    statusMarkup = `
      <div class="slot-timer-pill">
        <div class="slot-timer-fill" style="width: ${progressPercent}%;"></div>
        <strong>${formatClockLabel(getSecondsRemaining(book))}</strong>
      </div>
    `;
    actionMarkup = `
      <button class="slot-action-button slot-action-button--speed" type="button" data-speedup-shelf="${shelf.id}" data-speedup-slot="${slotIndex}" aria-label="Speed up ${book.name} with rewarded video">
        <span class="slot-action-title">SPEED</span>
        <span class="slot-action-meta">
          <span>+6s</span>
          <img class="slot-action-icon slot-action-icon--play" src="figma-play.svg" alt="" aria-hidden="true">
        </span>
      </button>
    `;
  } else if (!accessible) {
    visualMarkup = `
      ${book ? `<img class="slot-art slot-art--dimmed" src="${getBookArtPath(book)}" alt="${book.name}">` : ""}
      <img class="slot-lock-art" src="figma-lock.png" alt="" aria-hidden="true">
    `;
    statusMarkup = `<div class="slot-status slot-status--locked">LOCKED</div>`;
    actionMarkup = slotIndex === 1
      ? `
        <button class="slot-action-button slot-action-button--rent" type="button" data-rent-shelf="${shelf.id}" data-rent-slot="${slotIndex}" aria-label="Rent slot for 30 minutes with rewarded video">
          <span class="slot-action-title">RENT</span>
          <span class="slot-action-meta">
            <span>${formatClockLabel(state.rentalDurationMs / 1000)}</span>
            <img class="slot-action-icon slot-action-icon--play" src="figma-play.svg" alt="" aria-hidden="true">
          </span>
        </button>
      `
      : `
        <button class="slot-action-button slot-action-button--buy" type="button" data-unlock-shelf="${shelf.id}" data-unlock-slot="${slotIndex}" aria-label="Buy slot unlock with ${state.premiumUnlockCost} gems">
          <span class="slot-action-title">BUY</span>
          <span class="slot-action-meta">
            <span>${state.premiumUnlockCost}</span>
            <img class="slot-action-icon" src="gem.png" alt="" aria-hidden="true">
          </span>
        </button>
      `;
  } else {
    visualMarkup = `
      <button class="slot-empty-button" type="button" data-highlight-shop="true" aria-label="Open book shop for ${shelf.label}">
        +
      </button>
      ${rented ? `<span class="slot-rental-badge">${getRentalMinutesRemaining(slot)}m</span>` : ""}
    `;
    statusMarkup = `<div class="slot-status">EMPTY</div>`;
  }

  return `
    <div class="slot-column" data-slot-index="${slotIndex}">
      <article class="${slotClasses}">
        <div class="slot-visual">
          ${visualMarkup}
        </div>
        <div class="slot-status-row">
          ${statusMarkup}
        </div>
      </article>
      ${actionMarkup}
    </div>
  `;
}

function bindFocusShelfEvents() {
  elements.focusShelf.querySelectorAll("[data-speedup-shelf]").forEach((button) => {
    button.addEventListener("click", () => applySpeedup(button.dataset.speedupShelf, Number(button.dataset.speedupSlot)));
  });
  elements.focusShelf.querySelectorAll("[data-unlock-shelf]").forEach((button) => {
    button.addEventListener("click", () => unlockSlot(button.dataset.unlockShelf, Number(button.dataset.unlockSlot)));
  });
  elements.focusShelf.querySelectorAll("[data-rent-shelf]").forEach((button) => {
    button.addEventListener("click", () => rentSlot(button.dataset.rentShelf, Number(button.dataset.rentSlot)));
  });
  elements.focusShelf.querySelectorAll("[data-highlight-shop]").forEach((button) => {
    button.addEventListener("click", () => highlightShop());
  });
}

function getDisplayedShelves() {
  return DISPLAYED_SHELF_IDS
    .map((shelfId) => getShelf(shelfId))
    .filter(Boolean);
}

function renderFocusShelf() {
  elements.focusShelf.innerHTML = `
    <div class="focus-shelf-list">
      ${getDisplayedShelves().map((shelf) => {
        const overflowCount = Math.max(0, shelf.queue.length - SLOT_COUNT);
        const isPurchasedShelf = state.lastPurchased && state.lastPurchased.shelfId === shelf.id;
        const isSelectedShelf = state.selectedShelfId === shelf.id;

        return `
          <article class="shelf-panel ${isPurchasedShelf ? "is-purchased" : ""} ${isSelectedShelf ? "is-selected" : ""}" data-shelf-id="${shelf.id}">
            <div class="shelf-panel__copy">
              <h1 class="shelf-panel__title">${shelf.label}</h1>
              <div class="shelf-panel__level">
                <img class="shelf-panel__level-icon" src="figma-lightbulb.svg" alt="" aria-hidden="true">
                <span>lvl. ${shelf.currentLevel}</span>
              </div>
            </div>
            <div class="focus-slot-grid">
              ${Array.from({ length: SLOT_COUNT }, (_, slotIndex) => renderSlotCard(shelf, slotIndex)).join("")}
            </div>
            ${overflowCount > 0 ? `<p class="overflow-note ${state.lastPurchased?.overflow ? "is-purchased" : ""}">${overflowCount} more queued on this shelf</p>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;

  bindFocusShelfEvents();
}

function renderStats() {
  elements.statsList.innerHTML = state.shelves.map((shelf) => {
    const selected = shelf.id === state.selectedShelfId;
    return `
      <button class="skill-card ${selected ? "is-selected" : ""}" type="button" data-select-shelf="${shelf.id}" aria-pressed="${selected ? "true" : "false"}">
        <span class="skill-card__name">${shelf.label}</span>
        <span class="skill-card__meta">lvl. ${shelf.currentLevel}</span>
        <span class="skill-card__slots">${getVisibleFilledSlots(shelf)}/${SLOT_COUNT}</span>
      </button>
    `;
  }).join("");

  elements.statsList.querySelectorAll("[data-select-shelf]").forEach((button) => {
    button.addEventListener("click", () => selectShelf(button.dataset.selectShelf));
  });
}

function renderShop() {
  const canBuy = canBuyMoreBooks();

  elements.shopList.innerHTML = BOOK_CATALOG.map((book) => {
    const targetShelf = chooseShelfForBook(book);
    const targetLabel = targetShelf ? targetShelf.label : "No shelf";

    return `
      <article class="shop-item">
        <div class="shop-thumb">
          <img src="${getBookArtPath(book)}" alt="${book.name}">
        </div>
        <div class="shop-copy">
          <div class="shop-meta-top">
            <p class="shop-name">${book.name}</p>
            <p class="shop-duration">${formatClockLabel(book.readingTimeSeconds)}</p>
          </div>
          <p class="shop-target">Auto shelf: ${targetLabel}</p>
          <p class="shop-rewards">${summarizeRewards(book.rewards)}</p>
        </div>
        <button class="shop-buy-button" type="button" data-buy-book="${book.id}" ${canBuy ? "" : "disabled"}>
          ${canBuy ? "BUY" : "FULL"}
        </button>
      </article>
    `;
  }).join("");

  elements.shopList.querySelectorAll("[data-buy-book]").forEach((button) => {
    button.addEventListener("click", () => buyBook(button.dataset.buyBook));
  });
}

function renderStatus() {
  const shopHighlighted = state.shopHighlightUntil > state.now;

  elements.bookshelfLevelLabel.textContent = state.bookshelfLevel;
  elements.storageChip.textContent = String(getDisplayedFreeUnlockedSlotCount());
  elements.shopCapacityChip.textContent = `${Math.max(0, state.bookshelfLevel - getTotalStoredBooks())} open spots`;
  if (elements.shopCard) {
    elements.shopCard.className = shopHighlighted ? "support-section shop-card is-highlighted" : "support-section shop-card";
  }
}

function updateLiveFocusShelf() {
  for (const shelf of getDisplayedShelves()) {
    for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
      const slotElement = elements.focusShelf.querySelector(
        `[data-shelf-id="${shelf.id}"] [data-slot-index="${slotIndex}"]`
      );
      const slot = shelf.slots[slotIndex];
      const book = shelf.queue[slotIndex] || null;
      const accessible = isSlotAccessible(slot);

      if (!slotElement) {
        renderFocusShelf();
        return;
      }

      if (book && accessible) {
        const timerFill = slotElement.querySelector(".slot-timer-fill");
        const timerLabel = slotElement.querySelector(".slot-timer-pill strong");
        if (!timerFill || !timerLabel) {
          renderFocusShelf();
          return;
        }

        timerFill.style.width = `${Math.round(getProgressRatio(book) * 100)}%`;
        timerLabel.textContent = formatClockLabel(getSecondsRemaining(book));
      }

      const rentalBadge = slotElement.querySelector(".slot-rental-badge");
      if (rentalBadge && isSlotRented(slot)) {
        rentalBadge.textContent = `${getRentalMinutesRemaining(slot)}m`;
      }
    }
  }
}

function renderLive() {
  updateLiveFocusShelf();
  renderStatus();
}

function render() {
  renderFocusShelf();
  renderStats();
  renderShop();
  renderStatus();
}

function hasRealtimeUpdates() {
  if (state.shopHighlightUntil > state.now) {
    return true;
  }

  return state.shelves.some((shelf) =>
    shelf.slots.some((slot, slotIndex) => isSlotRented(slot) || (shelf.queue[slotIndex] && isSlotAccessible(slot)))
  );
}

function animationFrame(frameTime) {
  if (state.lastFrameTime == null) {
    state.lastFrameTime = frameTime;
  }

  const delta = Math.min(250, frameTime - state.lastFrameTime);
  state.lastFrameTime = frameTime;
  const hadRealtimeUpdates = hasRealtimeUpdates();

  if (hadRealtimeUpdates) {
    const didCompleteBook = advanceSimulation(delta);
    const hasRealtimeNow = hasRealtimeUpdates();
    const reachedRefreshInterval = frameTime - state.lastUiRenderAt >= AUTO_RENDER_INTERVAL_MS;

    if (reachedRefreshInterval || !hasRealtimeNow || didCompleteBook) {
      state.lastUiRenderAt = frameTime;
      if (didCompleteBook || !hasRealtimeNow) {
        render();
      } else {
        renderLive();
      }
    }
  }

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(animationFrame);
  }
}

window.advanceTime = (ms = 0) => {
  advanceSimulation(ms);
  render();
};

window.render_game_to_text = () => {
  const selectedShelf = getSelectedShelf();
  return JSON.stringify({
    mode: "bookshelf-simulation",
    coordinateSystem: "DOM prototype, page origin at top-left",
    bookshelfLevel: state.bookshelfLevel,
    totalStoredBooks: getTotalStoredBooks(),
    accessibleSlotCount: getAccessibleSlotCount(),
    activeReadingCount: getActiveReadingCount(),
    lockedSlotCount: getLockedSlotCount(),
    selectedShelfId: selectedShelf.id,
    selectedShelfLabel: selectedShelf.label,
    selectedShelfAvailableSlots: getDisplayedAvailableSlots(selectedShelf),
    displayedFreeUnlockedSlots: getDisplayedFreeUnlockedSlotCount(),
    speedupMs: state.speedupMs,
    rentalDurationMs: state.rentalDurationMs,
    shelves: state.shelves.map((shelf) => ({
      id: shelf.id,
      label: shelf.label,
      currentLevel: shelf.currentLevel,
      queueLength: shelf.queue.length,
      overflowCount: Math.max(0, shelf.queue.length - SLOT_COUNT),
      slots: shelf.slots.map((slot, slotIndex) => ({
        slotIndex,
        permanentUnlocked: slot.permanentUnlocked,
        rented: isSlotRented(slot),
        accessible: isSlotAccessible(slot),
        rentalMinutesRemaining: getRentalMinutesRemaining(slot),
        book: shelf.queue[slotIndex]
          ? {
              id: shelf.queue[slotIndex].id,
              name: shelf.queue[slotIndex].name,
              rewards: shelf.queue[slotIndex].rewards,
              progressRatio: getProgressRatio(shelf.queue[slotIndex]),
              secondsRemaining: getSecondsRemaining(shelf.queue[slotIndex])
            }
          : null
      }))
    }))
  });
};

render();

if (elements.resetStatsButton) {
  elements.resetStatsButton.addEventListener("click", () => resetAllStats());
}

if (typeof window.requestAnimationFrame === "function") {
  window.requestAnimationFrame(animationFrame);
}
