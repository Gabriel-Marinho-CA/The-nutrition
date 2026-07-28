// ─────────────────────────────────────────────────────────────────────────────
// Cart drawer (mini cart)
//
// Grupos "Compre X Leve Y" (brindes) — defina aqui os grupos da loja.
// Cada grupo:
//   mains: variantes que disparam o brinde. `factor` = qtd de brinde por unidade.
//   bonus: id da variante do brinde.
// Exemplo:
//   { mains: [{ id: 1234567890, factor: 1 }], bonus: 9876543210 }
//
// Pode ser sobrescrito antes deste script carregar (window.bxgyLinkedGroups = [...]).
// ─────────────────────────────────────────────────────────────────────────────
window.bxgyLinkedGroups = window.bxgyLinkedGroups || [];

class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  connectedCallback() {
    // O product-form deste tema apenas publica `cartUpdate`; ele não chama
    // renderContents(). Reagimos ao evento para atualizar e abrir o drawer.
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source !== 'product-form') return;
      this.refresh({ open: true });
    });

    this.refreshListener = () => this.refresh({ open: false });
    document.addEventListener('cart-drawer:refresh', this.refreshListener);
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) this.cartUpdateUnsubscriber();
    if (this.refreshListener) document.removeEventListener('cart-drawer:refresh', this.refreshListener);
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');

    // O clique é tratado pelo onclick em sections/page-header.liquid — não
    // registramos listener aqui para não abrir o drawer duas vezes.
    // Space num <a> não dispara click nativamente; por isso só este handler.
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  // Recarrega #CartDrawer + bolha do header a partir das seções, opcionalmente abrindo.
  async refresh({ open = false } = {}) {
    try {
      const [drawerText, bubbleText, cartJson] = await Promise.all([
        fetch(`${routes.cart_url}?section_id=cart-drawer`).then((r) => r.text()),
        fetch(`${routes.cart_url}?section_id=cart-icon-bubble`).then((r) => r.text()),
        fetch('/cart.js').then((r) => r.json()),
      ]);

      const drawerDoc = new DOMParser().parseFromString(drawerText, 'text/html');
      const currentDrawer = this.querySelector('#CartDrawer');
      const newDrawer = drawerDoc.querySelector('#CartDrawer');
      if (currentDrawer && newDrawer) {
        currentDrawer.innerHTML = newDrawer.innerHTML;
        // Re-attach do overlay perdido no innerHTML replace
        const overlay = currentDrawer.querySelector('#CartDrawer-Overlay');
        if (overlay) overlay.addEventListener('click', this.close.bind(this));
      }

      this.classList.toggle('is-empty', cartJson.item_count === 0);

      const bubble = document.getElementById('cart-icon-bubble');
      const newBubble = new DOMParser().parseFromString(bubbleText, 'text/html').querySelector('.shopify-section');
      if (bubble && newBubble) bubble.innerHTML = newBubble.innerHTML;
    } catch (e) {
      console.error('[cart-drawer] Erro ao atualizar:', e);
      return;
    }

    if (open) this.open();
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);

// ── Compre X Leve Y (brindes) ────────────────────────────────────────────────
// Quantidade de brinde esperada a partir dos produtos principais no carrinho.
function bxgyExpectedQty(group, cartItems) {
  let expected = 0;
  for (const main of group.mains) {
    const mainQty = cartItems.find((i) => i.variant_id === main.id)?.quantity || 0;
    expected += window.bxgyIsCumulative ? main.factor * mainQty : mainQty > 0 ? main.factor : 0;
  }
  return expected;
}

// Sincroniza todos os grupos com o estado atual do carrinho.
// Retorna true se algo foi alterado.
async function bxgySync(cartItems) {
  const groups = window.bxgyLinkedGroups || [];
  let changed = false;

  for (const group of groups) {
    const expected = bxgyExpectedQty(group, cartItems);
    const bonusItem = cartItems.find((i) => i.variant_id === group.bonus);
    const current = bonusItem?.quantity || 0;
    if (expected === current) continue;

    try {
      if (bonusItem) {
        // /cart/change.js exige a key do item (variantId:hash)
        await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bonusItem.key, quantity: expected }),
        });
      } else if (expected > 0) {
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: group.bonus, quantity: expected }] }),
        });
      }
      changed = true;
    } catch (e) {
      console.error('[bxgy] Erro ao ajustar brinde:', e);
    }
  }

  return changed;
}

// Produto adicionado pelo formulário de produto → adiciona/ajusta o brinde.
subscribe(PUB_SUB_EVENTS.cartUpdate, async (event) => {
  if (event.source !== 'product-form') return;
  if (!window.buyXGetYEnabled) return;
  if (!(window.bxgyLinkedGroups || []).length) return;

  const addedId = parseInt(event.productVariantId, 10);
  const group = window.bxgyLinkedGroups.find((g) => g.mains.some((m) => m.id === addedId));
  if (!group) return;

  const cartItems = await fetch('/cart.js')
    .then((r) => r.json())
    .then((c) => c.items || []);

  if (await bxgySync(cartItems)) {
    document.querySelector('cart-drawer')?.refresh({ open: false });
  }
});

// Quantidade alterada/removida dentro do carrinho → reajusta os brindes.
// Varre todos os grupos: remoções não informam o variantId no evento.
subscribe(PUB_SUB_EVENTS.cartUpdate, async (event) => {
  if (event.source !== 'cart-items') return;
  if (!window.buyXGetYEnabled) return;
  if (!(window.bxgyLinkedGroups || []).length) return;

  // Nem todo tema envia cartData no evento — busca o carrinho quando faltar.
  const cartItems =
    event.cartData?.items ||
    (await fetch('/cart.js')
      .then((r) => r.json())
      .then((c) => c.items || []));

  if (await bxgySync(cartItems)) {
    // onCartUpdate() não atualiza a bolha do header nem o estado vazio do drawer.
    document.querySelector('cart-drawer')?.refresh({ open: false });
  }
});

// No carregamento, remove brindes órfãos (produto principal removido fora do drawer).
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.buyXGetYEnabled) return;
  if (!(window.bxgyLinkedGroups || []).length) return;

  try {
    const cart = await fetch('/cart.js').then((r) => r.json());
    await bxgySync(cart.items || []);
  } catch (e) {
    console.error('[bxgy] Erro ao validar brindes no carregamento:', e);
  }
});

// O <order-bump-slider> vive em `order-bump.js` (módulo ES, por causa do Swiper).
