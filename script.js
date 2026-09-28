/*
 * AgriFam - comportamento da interface
 *
 * Ordem dos blocos:
 * 1. API, estado local e utilitários compartilhados
 * 2. Navegação, busca e carrossel
 * 3. Catálogo, categorias e filtros (dados reais via API)
 * 4. Favoritos
 * 5. Carrinho e checkout (checkout real via POST /api/pedidos)
 * 6. Produtores e autenticação (dados e sessão reais via API)
 * 7. Conversas (reais via /api/conversas)
 *
 * O carrinho e os favoritos continuam guardados no localStorage: dá para navegar e
 * montar o carrinho sem estar logado. Fazer login só é exigido no checkout e no chat,
 * que dependem de saber quem é o usuário.
 */

// -----------------------------------------------------------------------------
// 1. API, ESTADO LOCAL E UTILITÁRIOS COMPARTILHADOS
// -----------------------------------------------------------------------------

// Use the same hostname as the frontend during local development. Mixing
// localhost and 127.0.0.1 can make browsers reject the cross-site session cookie.
const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE = window.AGRIFAM_API_BASE || (localHost
  ? `http://${window.location.hostname}:3333/api`
  : "/api");

const api = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(body?.error || "Não foi possível completar a ação.");
  }
  return body;
};

const categoryIcons = {
  apple:
    '<path d="M12 20.5c-4.5 0-7-3.7-7-8.1C5 9.2 7.1 7 10 7c1.2 0 1.7.7 2 .7s.9-.7 2.4-.7c2.1 0 3.6 1.1 4.3 2.2-3.8 2.1-3.2 7.2.6 8.6-.5 1.1-1.1 2.2-1.8 3.1-1 1.4-2 2.7-3.6 2.7s-2-.9-3.7-.9-2.2.9-3.7.9-2.5-1.2-3.5-2.6Z"/><path d="M14 5.5c.7-1.1 1.8-1.8 3.2-1.9.1 1.4-.4 2.5-1.1 3.3-.8.9-2 1.6-3.2 1.5-.1-1.1.3-2.2 1.1-2.9Z"/>',
  leaf: '<path d="M20 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 10-6 10-15Z"/><path d="M4 20c3-5 7-8 12-10"/>',
  carrot:
    '<path d="m12 10 4 9a2 2 0 0 1-1.8 2.8H9.8A2 2 0 0 1 8 19l4-9Z"/><path d="M12 10c-2-2-2-4 0-6 2 2 2 4 0 6ZM9 7C7 6 6 4 7 2c2 1 3 3 2 5ZM15 7c2-1 3-3 2-5-2 1-3 3-2 5Z"/>',
  wheat:
    '<path d="M12 21V5M12 8c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 13c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 18c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 8c3 0 5-2 5-5-3 0-5 2-5 5ZM12 13c3 0 5-2 5-5-3 0-5 2-5 5ZM12 18c3 0 5-2 5-5-3 0-5 2-5 5Z"/>',
  hexagon:
    '<path d="m12 3 7.8 4.5v9L12 21l-7.8-4.5v-9L12 3Z"/><path d="M8 10h8M8 14h8"/>',
  cheese:
    '<path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z"/><path d="M4 10c2-4 6-6 12-6l4 6M8 14h.01M14 17h.01"/>',
  candy:
    '<path d="m7 8-4-2v4l4 2M17 8l4-2v4l-4 2"/><path d="M7 8h10v8H7z"/><path d="M10 8v8M14 8v8"/>',
  palette:
    '<path d="M12 4a8 8 0 0 0 0 16h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h2a6 6 0 0 0 0-12Z"/><path d="M7 10h.01M9 7h.01M14 7h.01M17 10h.01"/>',
  "map-pin":
    '<path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2"/>',
};

// Estado do cliente. Carrinho e favoritos continuam locais (funcionam sem login);
// usuário, catálogo e conversas vêm do backend.
let currentUser = null;
let categories = [];
let products = [];
let activeProducts = [];
let favoriteProducts = [];
let producers = [];
let cart = JSON.parse(localStorage.getItem("agrifam-cart") || "[]");
let favorites = JSON.parse(localStorage.getItem("agrifam-favorites") || "[]");
let conversations = [];
let activeConversationId = null;
let authMode = "login";
let googleAuthEnabled = false;
let googleAuthClient = null;

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [
  ...context.querySelectorAll(selector),
];
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const safeImageURL = (value) => {
  try {
    const url = new URL(String(value || "asset/imagens/logo 2.png"), window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? escapeHTML(url.href) : "asset/imagens/logo 2.png";
  } catch {
    return "asset/imagens/logo 2.png";
  }
};
const money = (value) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const showToast = (message) => {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
};

// Revela cards quando entram na viewport, sem atrasar o conteúdo ou a busca.
document.body.classList.add("has-scroll-reveal");
const revealObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -35px" },
      )
    : null;
const observeRevealItems = (context) => {
  const items = $$(".reveal-item", context);
  if (!revealObserver) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  items.forEach((item) => revealObserver.observe(item));
};

// -----------------------------------------------------------------------------
// 2. NAVEGAÇÃO, BUSCA E CARROSSEL
// -----------------------------------------------------------------------------

const heroShader = document.querySelector("#heroShader");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
if (window.Swiper && document.documentElement.dataset.page === "inicio") {
  new window.Swiper(".hero", {
    loop: true,
    autoplay: prefersReducedMotion ? false : { delay: 5500, disableOnInteraction: false },
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    keyboard: { enabled: true },
    touchRatio: 1,
  });
}
const initHeroShader = async (canvas) => {
  if (!canvas || prefersReducedMotion) return;
  try {
    const { default: gradientGL } =
      await import("https://unpkg.com/gradient-gl@2.0.5");
    gradientGL("s1.eba9", "#heroShader");
  } catch (error) {
    console.warn(
      "Shader do hero indisponível; mantendo o fundo original.",
      error,
    );
  }
};
void initHeroShader(heroShader);
const menuToggle = $("#menuToggle");
menuToggle.addEventListener("click", () => {
  const open = $("#mobileMenu").classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", open);
  menuToggle.innerHTML = `<img src="asset/icons/menu hamburger ${open ? "close" : "open"}.png" alt="">`;
});
$$(".mobile-menu a").forEach((link) =>
  link.addEventListener("click", () => {
    $("#mobileMenu").classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.innerHTML =
      '<img src="asset/icons/menu hamburger open.png" alt="">';
  }),
);
let searchDebounce;
$$(".search-wrap input").forEach((input) =>
  input.addEventListener("input", (event) => {
    const other =
      event.target.id === "searchInput"
        ? $("#mobileSearchInput")
        : $("#searchInput");
    other.value = event.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadProducts, 300);
  }),
);
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const voiceButtons = $$(".voice-search");
if (!SpeechRecognition) {
  voiceButtons.forEach((button) => {
    button.hidden = true;
  });
} else {
  // A busca por voz é opcional: navegadores sem Web Speech continuam usando a busca normal.
  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.continuous = false;
  voiceButtons.forEach((button) =>
    button.addEventListener("click", () => {
      recognition.start();
      voiceButtons.forEach((item) => item.classList.add("listening"));
      showToast("Ouvindo sua busca...");
    }),
  );
  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript.trim();
    $("#searchInput").value = transcript;
    $("#mobileSearchInput").value = transcript;
    loadProducts();
  });
  recognition.addEventListener("error", (event) => {
    if (event.error !== "aborted")
      showToast("Não foi possível reconhecer sua voz.");
  });
  recognition.addEventListener("end", () =>
    voiceButtons.forEach((item) => item.classList.remove("listening")),
  );
}
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#searchInput").focus();
  }
});

// -----------------------------------------------------------------------------
// 3. CATÁLOGO, CATEGORIAS E FILTROS (dados reais via API)
// -----------------------------------------------------------------------------

const categoryList = $("#categoryList");
const categoryFilter = $("#categoryFilter");

const renderCategories = () => {
  categoryList.innerHTML = categories
    .map(
      // "Regionais" funciona como atalho para "ver tudo": não filtra por categoria.
      (category) =>
        `<button class="category reveal-item" data-category="${category.name === "Regionais" ? "" : escapeHTML(category.name)}"><svg class="category-icon" viewBox="0 0 24 24" aria-hidden="true">${categoryIcons[category.icon] || ""}</svg><strong>${escapeHTML(category.name)}</strong><small>${Number(category.count) || 0}</small></button>`,
    )
    .join("");
  observeRevealItems(categoryList);

  categoryFilter.innerHTML =
    '<option value="">Todas as categorias</option>' +
    categories
      .map((category) => `<option value="${escapeHTML(category.name)}">${escapeHTML(category.name)}</option>`)
      .join("");
};

const loadCategories = async () => {
  try {
    categories = await api("/categorias");
    renderCategories();
  } catch (error) {
    showToast(error.message);
  }
};

const isFavorite = (id) => favorites.includes(id);
const productCard = (product) =>
  `<article class="product-card reveal-item"><div class="product-image"><img src="${safeImageURL(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy"><button class="favorite-button ${isFavorite(product.id) ? "active" : ""}" data-favorite="${Number(product.id)}" aria-label="${isFavorite(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.566" /></svg></button></div><div class="product-info"><h3>${escapeHTML(product.name)}</h3><div class="product-meta"><span>${escapeHTML(product.producer)}</span><span>${escapeHTML(product.location)}</span></div><div class="rating">★★★★★ <span>${Number(product.rating) || 0}</span></div><div class="product-bottom"><span class="price">${money(product.price)} <small>/ ${escapeHTML(product.unit)}</small></span><button class="add-cart" data-cart="${Number(product.id)}" aria-label="Adicionar ${escapeHTML(product.name)} ao carrinho"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-7-7h14" /></svg></button></div></div></article>`;

const renderFavorites = () => {
  const saved = favoriteProducts.filter((product) => isFavorite(product.id));
  $("#favoritesGrid").innerHTML = saved.map(productCard).join("");
  $("#favoritesEmpty").hidden = saved.length > 0;
};
const openFavorites = async () => {
  openModal($("#favoritesModal"));
  try {
    favoriteProducts = await api("/produtos?sort=featured");
    renderFavorites();
  } catch (error) {
    showToast(error.message);
  }
};
const renderProducts = (list) => {
  activeProducts = list;
  $("#productGrid").innerHTML = list.map(productCard).join("");
  observeRevealItems($("#productGrid"));
  $("#resultsCount").textContent =
    `${list.length} resultado${list.length === 1 ? "" : "s"} encontrado${list.length === 1 ? "" : "s"}`;
  $("#emptyState").hidden = list.length > 0;
};

const loadProducts = async () => {
  const params = new URLSearchParams();
  const term = $(".search-wrap input")?.value.trim();
  if (term) params.set("search", term);
  if (categoryFilter.value) params.set("category", categoryFilter.value);
  const sort = $("#sortFilter").value;
  if (sort) params.set("sort", sort);

  try {
    products = await api(`/produtos?${params.toString()}`);
    renderProducts(products);
  } catch (error) {
    showToast(error.message);
  }
};

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  categoryFilter.value = button.dataset.category;
  loadProducts();
  document.querySelector("#produtos").scrollIntoView({ behavior: "smooth" });
});
categoryFilter.addEventListener("change", loadProducts);
$("#sortFilter").addEventListener("change", loadProducts);
$("#clearFilters").addEventListener("click", () => {
  categoryFilter.value = "";
  $("#sortFilter").value = "featured";
  $("#searchInput").value = "";
  $("#mobileSearchInput").value = "";
  loadProducts();
});
$("#filterTrigger").addEventListener("click", () => {
  $("#filters").classList.add("open");
  $("#overlay").classList.add("open");
});
$("#closeFilters").addEventListener("click", () => {
  $("#filters").classList.remove("open");
  $("#overlay").classList.remove("open");
});

// -----------------------------------------------------------------------------
// 4. FAVORITOS
// -----------------------------------------------------------------------------

// Favoritos continuam só no localStorage: não há endpoint de favoritos no backend
// (fora do escopo atual), então isso é uma preferência só deste navegador.
const saveFavorites = () => {
  localStorage.setItem("agrifam-favorites", JSON.stringify(favorites));
  updateCounters();
};

// -----------------------------------------------------------------------------
// 5. CARRINHO E CHECKOUT
// -----------------------------------------------------------------------------

// O carrinho continua no localStorage — dá para montar a sacola sem estar logado.
// Só o checkout (POST /api/pedidos) exige sessão.
const saveCart = () => {
  localStorage.setItem("agrifam-cart", JSON.stringify(cart));
  updateCounters();
};
const updateCounters = () => {
  $$(".cart-count").forEach(
    (element) =>
      (element.textContent = cart.reduce(
        (sum, item) => sum + item.quantity,
        0,
      )),
  );
  $$(".favorite-count").forEach(
    (element) => (element.textContent = favorites.length),
  );
};
const renderCart = () => {
  const items = $("#cartItems");
  if (!cart.length) {
    items.innerHTML =
      '<div class="cart-empty"><p>Seu carrinho está esperando por boas escolhas.</p><a class="text-link" href="#produtos" id="emptyCartLink">Explorar produtos →</a></div>';
  } else {
    items.innerHTML = cart
      .map(
        (item) =>
          `<div class="cart-item"><img src="${safeImageURL(item.image)}" alt=""><div><h4>${escapeHTML(item.name)}</h4><small>${money(item.price)} / ${escapeHTML(item.unit)}</small><div class="qty-controls"><button data-quantity="${Number(item.id)}" data-change="-1">−</button><span>${Number(item.quantity)}</span><button data-quantity="${Number(item.id)}" data-change="1">+</button></div><button class="remove-item" data-remove="${Number(item.id)}">Remover</button></div><strong class="cart-item-price">${money(item.price * item.quantity)}</strong></div>`,
      )
      .join("");
  }
  $("#cartTotal").textContent = money(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  updateCounters();
};
const openCart = () => {
  renderCart();
  $("#cartDrawer").classList.add("open");
  $("#cartDrawer").setAttribute("aria-hidden", "false");
  $("#overlay").classList.add("open");
};
const closeCart = () => {
  $("#cartDrawer").classList.remove("open");
  $("#cartDrawer").setAttribute("aria-hidden", "true");
  $("#overlay").classList.remove("open");
};
document.addEventListener("click", (event) => {
  const favoritesLink = event.target.closest("[data-open-favorites]");
  if (favoritesLink) {
    event.preventDefault();
    $("#mobileMenu").classList.remove("open");
    openFavorites();
    return;
  }
  const cartButton = event.target.closest("[data-cart]");
  if (cartButton) {
    const product = [...activeProducts, ...favoriteProducts, ...products].find(
      (item) => item.id === Number(cartButton.dataset.cart),
    );
    if (product) {
      const existing = cart.find((item) => item.id === product.id);
      existing ? existing.quantity++ : cart.push({ ...product, quantity: 1 });
      saveCart();
      renderCart();
      showToast(`${product.name} foi adicionado ao carrinho`);
    }
  }
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const id = Number(favoriteButton.dataset.favorite);
    favorites = isFavorite(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    saveFavorites();
    renderProducts(activeProducts);
    renderFavorites();
    showToast(
      isFavorite(id)
        ? "Produto salvo nos favoritos"
        : "Produto removido dos favoritos",
    );
  }
  const quantityButton = event.target.closest("[data-quantity]");
  if (quantityButton) {
    const item = cart.find(
      (entry) => entry.id === Number(quantityButton.dataset.quantity),
    );
    item.quantity += Number(quantityButton.dataset.change);
    if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== item.id);
    saveCart();
    renderCart();
  }
  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    cart = cart.filter(
      (item) => item.id !== Number(removeButton.dataset.remove),
    );
    saveCart();
    renderCart();
  }
});
$$('[data-action="favorites"]').forEach((button) => button.addEventListener("click", openFavorites));
$$('[data-action="cart"]').forEach((button) =>
  button.addEventListener("click", openCart),
);
$("#closeCart").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", () => {
  closeCart();
  closeChat();
  $("#filters").classList.remove("open");
});
$("#checkoutButton").addEventListener("click", async () => {
  if (!cart.length) {
    showToast("Seu carrinho está vazio.");
    return;
  }
  if (!currentUser) {
    closeCart();
    showToast("Entre na sua conta para finalizar o pedido.");
    openAuthModal("login");
    return;
  }
  try {
    const order = await api("/pedidos", {
      method: "POST",
      body: JSON.stringify({
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      }),
    });
    cart = [];
    saveCart();
    renderCart();
    closeCart();
    showToast(`Pedido #${order.id} confirmado! Total: ${money(order.total)}`);
  } catch (error) {
    showToast(error.message);
  }
});
updateCounters();

// -----------------------------------------------------------------------------
// 6. PRODUTORES E AUTENTICAÇÃO (dados e sessão reais via API)
// -----------------------------------------------------------------------------

const producerGrid = $("#producerGrid");

const producerCard = (producer) =>
  `<article class="producer-card reveal-item"><div class="producer-photo"><img src="${safeImageURL(producer.image)}" alt="${escapeHTML(producer.name)}" loading="lazy"></div><div class="producer-info"><h3>${escapeHTML(producer.name)}</h3><p>${escapeHTML(producer.property)} · ${escapeHTML(producer.location)}</p><span class="producer-specialty">${escapeHTML(producer.specialty)} · ★ ${Number(producer.rating) || 0}</span><button class="text-link" data-producer="${Number(producer.id)}">Ver perfil <span>→</span></button></div></article>`;

const renderProducers = () => {
  producerGrid.innerHTML = producers.map(producerCard).join("");
  observeRevealItems(producerGrid);
  const statProducers = $("#statProducers");
  if (statProducers) statProducers.textContent = producers.length;
};

const loadProducers = async () => {
  try {
    producers = await api("/produtores");
    renderProducers();
  } catch (error) {
    showToast(error.message);
  }
};

observeRevealItems(document);
const openModal = (modal) => {
  modal.classList.add("open");
  $("#overlay").classList.add("open");
};
const closeModals = () => {
  $$(".modal").forEach((modal) => modal.classList.remove("open"));
  $("#overlay").classList.remove("open");
};
producerGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-producer]");
  if (!button) return;
  const producer = producers.find(
    (item) => item.id === Number(button.dataset.producer),
  );
  if (!producer) return;
  const productCount = products.filter((item) => item.producer === producer.property).length;
  $("#producerModalContent").innerHTML =
    `<img class="modal-producer-image" src="${safeImageURL(producer.image)}" alt="${escapeHTML(producer.name)}"><p class="eyebrow">Produtor AgriFam</p><h2 id="producerModalTitle">${escapeHTML(producer.name)}</h2><p class="modal-subtitle">${escapeHTML(producer.property)} · ${escapeHTML(producer.location)} · ★ ${Number(producer.rating) || 0}</p><p>${escapeHTML(producer.history || "Este produtor ainda não contou sua história.")}</p><div class="modal-detail"><span>Especialidade</span><strong>${escapeHTML(producer.specialty)}</strong><small>${productCount} produto${productCount === 1 ? "" : "s"} ${productCount === 1 ? "disponível" : "disponíveis"}</small></div><div class="modal-actions"><a href="?page=produtos#produtos" class="button button-green" data-close-modal>Ver produtos <span>→</span></a><button class="button button-light" type="button" data-message-producer="${Number(producer.id)}">Enviar mensagem</button></div>`;
  openModal($("#producerModal"));
});
$$("[data-training]").forEach((button) =>
  button.addEventListener("click", () => {
    $("#trainingModalTitle").textContent = button.dataset.training;
    openModal($("#trainingModal"));
  }),
);
$$("[data-close-modal]").forEach((button) =>
  button.addEventListener("click", closeModals),
);
$("#overlay").addEventListener("click", closeModals);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModals();
    closeCart();
    closeChat();
  }
});

// Envia mensagem a um produtor a partir do modal de perfil (botão inserido acima).
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-message-producer]");
  if (!button) return;
  if (!currentUser) {
    closeModals();
    showToast("Entre na sua conta para conversar com o produtor.");
    openAuthModal("login");
    return;
  }
  try {
    const conversation = await api("/conversas", {
      method: "POST",
      body: JSON.stringify({ producerId: Number(button.dataset.messageProducer) }),
    });
    closeModals();
    await openChat(conversation.id);
  } catch (error) {
    showToast(error.message);
  }
});

// --- Autenticação: login e cadastro (com perfil de produtor) reais ---

const updateAuthUI = () => {
  $$('.login-link').forEach((link) => {
    // Só "Sair" (sem o nome): um nome longo quebra o layout do menu do cabeçalho.
    link.textContent = currentUser ? "Sair" : "Entrar";
  });
  $("#profileLink").hidden = !currentUser;
  $("#profileLinkMobile").hidden = !currentUser;

  const isProducer = currentUser?.role === "producer";
  const sellerCta = $("#sellerCta");
  if (sellerCta) {
    sellerCta.innerHTML = isProducer ? "Meus produtos" : 'Vender no AgriFam <span>↗</span>';
    sellerCta.href = isProducer ? "#meus-produtos" : "?page=produtores#seja-produtor";
  }
  const sellerCtaMobile = $("#sellerCtaMobile");
  if (sellerCtaMobile) {
    sellerCtaMobile.textContent = isProducer ? "Meus produtos" : "Seja um produtor";
    sellerCtaMobile.href = isProducer ? "#meus-produtos" : "?page=produtores#seja-produtor";
  }
};

const loadSession = async () => {
  try {
    const data = await api("/auth/me");
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
  updateAuthUI();
};

const toggleProducerFields = () => {
  const isProducer = $("#authRole").value === "producer";
  $("#authProducerFields").hidden = !isProducer;
  ["authProperty", "authLocation", "authSpecialty"].forEach((id) => {
    $(`#${id}`).required = isProducer;
  });
};

const setAuthMode = (mode) => {
  authMode = mode;
  $$(".mode-switch [data-auth-mode]").forEach((button) =>
    button.classList.toggle("active", button.dataset.authMode === mode),
  );
  $("#authNameField").hidden = mode !== "register";
  $("#authName").required = mode === "register";
  $("#authRoleField").hidden = mode !== "register";
  $("#authTitle").textContent = mode === "register" ? "Crie sua conta" : "Entre no AgriFam";
  $("#authSubtitle").textContent =
    mode === "register"
      ? "Compre direto de quem produz ou venda a sua produção."
      : "Acompanhe seus pedidos e descubra novidades da sua região.";
  $("#authSubmit").innerHTML =
    mode === "register" ? "Criar conta <span>→</span>" : "Entrar <span>→</span>";
  $("#authSwitchText").innerHTML =
    mode === "register"
      ? 'Já tem conta? <a href="#" data-auth-mode="login">Entrar</a>'
      : 'Ainda não tem conta? <a href="#" data-auth-mode="register">Criar conta</a>';
  if (mode !== "register") {
    $("#authRole").value = "buyer";
  }
  $("#authGoogleDivider").hidden = !googleAuthEnabled;
  $("#googleAuthButton").hidden = !googleAuthEnabled;
  toggleProducerFields();
};

const openAuthModal = (mode = "login", presetRole = "buyer") => {
  setAuthMode(mode);
  if (mode === "register") $("#authRole").value = presetRole;
  toggleProducerFields();
  openModal($("#authModal"));
};

$("#authModal").addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-auth-mode]");
  if (!trigger) return;
  event.preventDefault();
  setAuthMode(trigger.dataset.authMode);
});
$("#authRole").addEventListener("change", toggleProducerFields);
$("#googleAuthButton").addEventListener("click", async () => {
  if (!googleAuthClient) {
    showToast("Login Google indisponível. Confira a conexão e a configuração do Supabase.");
    return;
  }
  const { error } = await googleAuthClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error) showToast(error.message);
});
$("#authForgot").addEventListener("click", (event) => {
  event.preventDefault();
  showToast("Recuperação de senha ainda não está disponível.");
});

$$('[href="#login"]').forEach((link) =>
  link.addEventListener("click", async (event) => {
    event.preventDefault();
    if (currentUser) {
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {
        // Mesmo se a chamada falhar, limpamos a sessão local.
      }
      currentUser = null;
      updateAuthUI();
      showToast("Sessão encerrada.");
    } else {
      openAuthModal("login");
    }
  }),
);
$$('[href="#cadastro"]').forEach((link) =>
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openAuthModal("register", "producer");
  }),
);

$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;

  try {
    let data;
    if (authMode === "register") {
      const role = $("#authRole").value;
      const payload = { name: $("#authName").value.trim(), email, password, role };
      if (role === "producer") {
        payload.property = $("#authProperty").value.trim();
        payload.location = $("#authLocation").value.trim();
        payload.specialty = $("#authSpecialty").value.trim();
      }
      data = await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    } else {
      data = await api("/auth", { method: "POST", body: JSON.stringify({ email, password }) });
    }
    currentUser = data.user;
    updateAuthUI();
    closeModals();
    event.target.reset();
    showToast(
      authMode === "register"
        ? `Bem-vindo(a) ao AgriFam, ${currentUser.name}!`
        : `Olá de novo, ${currentUser.name}!`,
    );
    if (currentUser.role === "producer") await loadProducers();
  } catch (error) {
    showToast(error.message);
  }
});

const uploadImage = async (file, kind) => {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Escolha uma imagem PNG, JPG ou WebP.");
  }
  if (file.size > 3 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 3 MB.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
  const endpoint = kind === "profile" ? "/perfil/imagem" : "/produtor/imagens";
  const result = await api(endpoint, {
    method: "POST",
    body: JSON.stringify({ dataUrl, kind }),
  });
  return result.image;
};

let profileAvatarPreviewUrl = null;
let clearProfileAvatar = false;

const renderProfileAvatarPreview = (imageUrl, name) => {
  const preview = $("#profileAvatarPreview");
  const initial = escapeHTML((name || "A").trim().charAt(0).toLocaleUpperCase("pt-BR"));
  preview.innerHTML = imageUrl
    ? `<img src="${escapeHTML(imageUrl)}" alt="" />`
    : `<span>${initial}</span>`;
};

const releaseProfileAvatarPreview = () => {
  if (profileAvatarPreviewUrl) URL.revokeObjectURL(profileAvatarPreviewUrl);
  profileAvatarPreviewUrl = null;
};

$("#profileAvatarFile").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    event.target.value = "";
    showToast("Escolha uma imagem PNG, JPG ou WebP.");
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    event.target.value = "";
    showToast("A imagem deve ter no máximo 3 MB.");
    return;
  }
  releaseProfileAvatarPreview();
  profileAvatarPreviewUrl = URL.createObjectURL(file);
  clearProfileAvatar = false;
  renderProfileAvatarPreview(profileAvatarPreviewUrl, currentUser?.name);
});

$("#profileAvatarRemove").addEventListener("click", () => {
  $("#profileAvatarFile").value = "";
  releaseProfileAvatarPreview();
  clearProfileAvatar = true;
  renderProfileAvatarPreview("", currentUser?.name);
});

const openProfile = async () => {
  try {
    const data = await api("/auth/me");
    currentUser = data.user;
    $("#profileName").value = data.user.name;
    $("#profileEmail").value = data.user.email;
    $("#profileAvatarFile").value = "";
    clearProfileAvatar = false;
    releaseProfileAvatarPreview();
    renderProfileAvatarPreview(data.user.avatarUrl || "", data.user.name);
    const producer = data.producer;
    $("#profileStoreFields").hidden = !producer;
    if (producer) {
      $("#profileProperty").value = producer.property;
      $("#profileLocation").value = producer.location;
      $("#profileSpecialty").value = producer.specialty;
      $("#profileHistory").value = producer.history || "";
      $("#profileStoreImage").value = producer.image || "";
      $("#profileStoreImageFile").value = "";
    }
    openModal($("#profileModal"));
  } catch (error) {
    showToast(error.message);
  }
};

document.addEventListener("click", (event) => {
  const link = event.target.closest('[href="#perfil"]');
  if (!link) return;
  event.preventDefault();
  openProfile();
});

$("#profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: $("#profileName").value.trim(),
    email: $("#profileEmail").value.trim(),
  };
  const currentPassword = $("#profileCurrentPassword").value;
  const newPassword = $("#profileNewPassword").value;
  if (currentPassword || newPassword) {
    payload.currentPassword = currentPassword;
    payload.newPassword = newPassword;
  }
  if (!$("#profileStoreFields").hidden) {
    payload.property = $("#profileProperty").value.trim();
    payload.location = $("#profileLocation").value.trim();
    payload.specialty = $("#profileSpecialty").value.trim();
    payload.history = $("#profileHistory").value.trim();
    payload.image = $("#profileStoreImage").value.trim();
  }
  try {
    const avatarFile = $("#profileAvatarFile").files[0];
    if (avatarFile) {
      payload.avatarUrl = await uploadImage(avatarFile, "profile");
    } else if (clearProfileAvatar) {
      payload.avatarUrl = "";
    }
    const storeFile = $("#profileStoreImageFile").files[0];
    if (storeFile) payload.image = await uploadImage(storeFile, "store");
    const data = await api("/auth/me", { method: "PATCH", body: JSON.stringify(payload) });
    currentUser = data.user;
    clearProfileAvatar = false;
    releaseProfileAvatarPreview();
    $("#profileCurrentPassword").value = "";
    $("#profileNewPassword").value = "";
    updateAuthUI();
    closeModals();
    await loadProducers();
    showToast("Perfil atualizado.");
  } catch (error) {
    showToast(error.message);
  }
});

const completeGoogleLogin = async () => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  let accessToken = params.get("access_token");
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const authError = params.get("error_description") || params.get("error") || url.searchParams.get("error_description");
  if (code) {
    if (!googleAuthClient) {
      url.searchParams.delete("code");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      showToast("Configuração do login Google indisponível. Confira se a API está rodando.");
      return;
    }
    try {
      const { data, error } = await googleAuthClient.auth.exchangeCodeForSession(code);
      if (error) throw error;
      accessToken = data.session?.access_token || null;
    } catch {
      url.searchParams.delete("code");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      showToast("Não foi possível concluir o login Google. Tente novamente.");
      return;
    }
  }
  if (!accessToken && !authError) return;
  url.searchParams.delete("code");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  if (authError) {
    showToast("Não foi possível entrar com Google. Confira a configuração OAuth no Supabase.");
    return;
  }
  try {
    const data = await api("/auth/google/callback", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    });
    currentUser = data.user;
    updateAuthUI();
    try {
      await googleAuthClient?.auth.signOut({ scope: "local" });
    } catch {
      // A sessão da aplicação já foi criada pelo backend; falha ao limpar a sessão OAuth
      // temporária no navegador não deve desfazer o login concluído.
    }
    showToast(`Olá, ${currentUser.name}!`);
  } catch (error) {
    showToast(error.message);
  }
};

const loadGoogleAuthConfig = async () => {
  try {
    const config = await api("/auth/google/config");
    googleAuthEnabled = config.enabled;
    if (googleAuthEnabled && window.supabase?.createClient) {
      googleAuthClient = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true, autoRefreshToken: false },
      });
    }
  } catch {
    googleAuthEnabled = false;
    googleAuthClient = null;
  }
  $("#authGoogleDivider").hidden = !googleAuthEnabled;
  $("#googleAuthButton").hidden = !googleAuthEnabled;
};

// --- Meus produtos: painel do produtor (POST/PATCH/DELETE /api/produtos) ---

let myProducts = [];
let editingProductId = null;

const productForm = $("#productForm");
const productFormSubmit = $("#productFormSubmit");
const productFormCancel = $("#productFormCancel");

const populateProductCategorySelect = () => {
  const select = $("#productCategory");
  const current = select.value;
  select.innerHTML =
    '<option value="">Selecione...</option>' +
    categories.map((category) => `<option value="${escapeHTML(category.name)}">${escapeHTML(category.name)}</option>`).join("");
  if (current) select.value = current;
};

const resetProductForm = () => {
  productForm.reset();
  $("#productImageFile").value = "";
  editingProductId = null;
  productFormSubmit.innerHTML = "Adicionar produto <span>→</span>";
  productFormCancel.hidden = true;
};

const myProductItem = (product) =>
  `<div class="my-product-item"><img src="${safeImageURL(product.image)}" alt="${escapeHTML(product.name)}"><div><h4>${escapeHTML(product.name)}</h4><small>${money(product.price)} / ${escapeHTML(product.unit)} · ${escapeHTML(product.category)}</small></div><div class="my-product-actions"><button type="button" data-edit-product="${Number(product.id)}">Editar</button><button type="button" class="my-product-delete" data-delete-product="${Number(product.id)}">Remover</button></div></div>`;

const renderMyProductsList = () => {
  $("#myProductsList").innerHTML = myProducts.length
    ? myProducts.map(myProductItem).join("")
    : '<p class="my-products-empty">Você ainda não cadastrou nenhum produto.</p>';
};

const loadMyProducts = async () => {
  try {
    myProducts = await api("/produtor/produtos");
    renderMyProductsList();
  } catch (error) {
    showToast(error.message);
  }
};

// Atualiza o catálogo/categorias exibidos no site depois de criar, editar ou remover
// um produto, para o preço/contagem não ficarem desatualizados até um F5.
const refreshCatalogAfterChange = () => Promise.all([loadProducts(), loadCategories()]);

const openMyProductsModal = async () => {
  populateProductCategorySelect();
  resetProductForm();
  openModal($("#myProductsModal"));
  await loadMyProducts();
};

// Delegado (não um listener por elemento): o href só vira "#meus-produtos" depois que
// updateAuthUI() roda de forma assíncrona, então o elemento não existe com esse href
// ainda no momento em que o script carrega.
document.addEventListener("click", (event) => {
  const link = event.target.closest('[href="#meus-produtos"]');
  if (!link) return;
  event.preventDefault();
  openMyProductsModal();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: $("#productName").value.trim(),
    price: Number($("#productPrice").value),
    unit: $("#productUnit").value.trim(),
    location: $("#productLocation").value.trim(),
    category: $("#productCategory").value,
    image: $("#productImage").value.trim(),
  };

  try {
    const imageFile = $("#productImageFile").files[0];
    if (imageFile) payload.image = await uploadImage(imageFile, "products");
    if (editingProductId) {
      await api(`/produtos/${editingProductId}`, { method: "PATCH", body: JSON.stringify(payload) });
      showToast("Produto atualizado.");
    } else {
      await api("/produtos", { method: "POST", body: JSON.stringify(payload) });
      showToast("Produto cadastrado.");
    }
    resetProductForm();
    await loadMyProducts();
    await refreshCatalogAfterChange();
  } catch (error) {
    showToast(error.message);
  }
});

productFormCancel.addEventListener("click", resetProductForm);

$("#myProductsList").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    const product = myProducts.find((item) => item.id === Number(editButton.dataset.editProduct));
    if (!product) return;
    editingProductId = product.id;
    $("#productName").value = product.name;
    $("#productPrice").value = product.price;
    $("#productUnit").value = product.unit;
    $("#productLocation").value = product.location;
    populateProductCategorySelect();
    $("#productCategory").value = product.category;
    $("#productImage").value = product.image;
    productFormSubmit.innerHTML = "Salvar alterações <span>→</span>";
    productFormCancel.hidden = false;
    return;
  }

  const deleteButton = event.target.closest("[data-delete-product]");
  if (deleteButton) {
    const product = myProducts.find((item) => item.id === Number(deleteButton.dataset.deleteProduct));
    if (!product) return;
    if (!confirm(`Remover "${product.name}" do catálogo?`)) return;
    try {
      await api(`/produtos/${product.id}`, { method: "DELETE" });
      showToast("Produto removido.");
      if (editingProductId === product.id) resetProductForm();
      await loadMyProducts();
      await refreshCatalogAfterChange();
    } catch (error) {
      showToast(error.message);
    }
  }
});

// -----------------------------------------------------------------------------
// 7. CONVERSAS (reais via /api/conversas)
// -----------------------------------------------------------------------------

const chatDrawer = $("#chatDrawer");
const chatContactsElement = $("#chatContacts");
const chatMessages = $("#chatMessages");
const chatContactHeading = $("#chatContactHeading");
const chatSearch = $("#chatSearch");
const chatForm = $("#chatForm");

const formatChatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date);
};

const otherParty = (conversation) =>
  currentUser && currentUser.id === conversation.buyer.id
    ? { label: conversation.producer.name, sub: conversation.producer.property, avatarUrl: conversation.producer.avatarUrl }
    : { label: conversation.buyer.name, sub: "Comprador", avatarUrl: conversation.buyer.avatarUrl };

const chatAvatarMarkup = (name, imageUrl, extraClass = "") =>
  `<span class="chat-avatar ${extraClass}">${imageUrl ? `<img src="${safeImageURL(imageUrl)}" alt="" />` : escapeHTML(name.charAt(0).toLocaleUpperCase("pt-BR"))}</span>`;

const renderConversationList = () => {
  const query = chatSearch.value.trim().toLocaleLowerCase("pt-BR");
  const visibleConversations = conversations.filter((conversation) => {
    const party = otherParty(conversation);
    const searchText = `${party.label} ${party.sub} ${conversation.lastMessage?.text || ""}`;
    return searchText.toLocaleLowerCase("pt-BR").includes(query);
  });
  chatContactsElement.innerHTML = visibleConversations.length
    ? visibleConversations
        .map((conversation) => {
          const party = otherParty(conversation);
          const lastMessage = conversation.lastMessage;
          return `<button class="chat-contact ${conversation.id === activeConversationId ? "active" : ""}" data-chat-contact="${Number(conversation.id)}" aria-pressed="${conversation.id === activeConversationId}">${chatAvatarMarkup(party.label, party.avatarUrl)}<span class="chat-contact-copy"><span class="chat-contact-top"><strong>${escapeHTML(party.label)}</strong><time>${lastMessage ? escapeHTML(formatChatTime(lastMessage.createdAt)) : ""}</time></span><small>${escapeHTML(party.sub)}</small><span class="chat-last-message">${escapeHTML(lastMessage?.text || "Inicie a conversa")}</span></span></button>`;
        })
        .join("")
    : `<p class="chat-empty-state">${conversations.length ? "Nenhuma conversa encontrada." : "Suas conversas com produtores e clientes aparecerão aqui."}</p>`;
};

const renderMessages = (messages) => {
  const conversation = conversations.find((item) => item.id === activeConversationId);
  const party = conversation ? otherParty(conversation) : { label: "", avatarUrl: "" };
  chatMessages.innerHTML = messages
    .map(
      (message) => {
        const mine = message.senderId === currentUser?.id;
        const senderName = mine ? currentUser.name : party.label;
        const senderAvatar = mine ? currentUser.avatarUrl : party.avatarUrl;
        return `<div class="chat-message-row ${mine ? "mine" : ""}">${chatAvatarMarkup(senderName, senderAvatar, "chat-message-avatar")}<div class="chat-message"><p>${escapeHTML(message.text)}</p><time datetime="${escapeHTML(message.createdAt)}">${escapeHTML(formatChatTime(message.createdAt))}</time></div></div>`;
      },
    )
    .join("");
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const selectConversation = async (conversationId) => {
  activeConversationId = conversationId;
  renderConversationList();
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  chatForm.hidden = false;
  const party = otherParty(conversation);
  chatContactHeading.innerHTML = `${chatAvatarMarkup(party.label, party.avatarUrl)}<span><strong>${escapeHTML(party.label)}</strong><small>${escapeHTML(party.sub)}</small></span><span class="chat-heading-caption">Conversa direta</span>`;
  try {
    const messages = await api(`/conversas/${conversationId}/mensagens`);
    renderMessages(messages);
  } catch (error) {
    showToast(error.message);
  }
};

const loadConversations = async () => {
  conversations = await api("/conversas");
  renderConversationList();
};

const openChat = async (conversationId) => {
  chatDrawer.classList.add("open");
  chatDrawer.setAttribute("aria-hidden", "false");
  $("#overlay").classList.add("open");
  chatForm.hidden = true;
  chatSearch.value = "";
  activeConversationId = null;

  if (!currentUser) {
    chatContactsElement.innerHTML = "";
    chatContactHeading.innerHTML = "";
    chatMessages.innerHTML = '<p class="chat-empty-state">Entre na sua conta para acessar suas conversas.</p>';
    return;
  }

  try {
    await loadConversations();
    const targetId = conversationId ?? conversations[0]?.id;
    if (targetId) {
      await selectConversation(targetId);
    } else {
      chatContactHeading.innerHTML = "";
      chatMessages.innerHTML = '<p class="chat-empty-state">Você ainda não tem conversas. Quando iniciar um contato com um produtor, ele aparecerá aqui.</p>';
    }
  } catch (error) {
    showToast(error.message);
  }
};
const closeChat = () => {
  chatDrawer.classList.remove("open");
  chatDrawer.setAttribute("aria-hidden", "true");
  $("#overlay").classList.remove("open");
};
$$('[data-action="chat"]').forEach((button) =>
  button.addEventListener("click", () => openChat()),
);
$("#closeChat").addEventListener("click", closeChat);
chatSearch.addEventListener("input", renderConversationList);
chatContactsElement.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-contact]");
  if (!button) return;
  selectConversation(Number(button.dataset.chatContact));
});
$("#chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#chatInput");
  const text = input.value.trim();
  if (!text || !activeConversationId) return;
  try {
    await api(`/conversas/${activeConversationId}/mensagens`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    input.value = "";
    await selectConversation(activeConversationId);
    await loadConversations();
  } catch (error) {
    showToast(error.message);
  }
});

// -----------------------------------------------------------------------------
// Inicialização
// -----------------------------------------------------------------------------

(async () => {
  await loadGoogleAuthConfig();
  await completeGoogleLogin();
  await Promise.all([loadSession(), loadCategories(), loadProducers()]);
  await loadProducts();
  // "produtos disponíveis" é uma foto do catálogo no carregamento da página, não
  // atualiza em tempo real conforme o usuário filtra.
  const statProducts = $("#statProducts");
  if (statProducts) statProducts.textContent = products.length;
})();
