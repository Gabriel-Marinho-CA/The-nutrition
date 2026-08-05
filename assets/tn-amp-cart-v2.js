(() => {
  "use strict";

  const SELECTORS = {
    productButton: "product-form .js-add-to-cart",

    volumeWidget: ".amp-volume-discount-bundles",
    selectedVolumeTier:
      ".amp-bundles__volume-discount-bundles__tier-option--selected",
    volumeQuantity:
      ".amp-bundles__volume-discount-bundles__quantity-value",
    volumeTierText:
      ".amp-bundles__volume-discount-bundles__tier-text",

    classicWidget: ".amp-classic-bundles",
    classicButton:
      ".amp-bundles__classic-bundles__cta",

    classicProductListSelectors: [
      ".amp-bundles__classic-bundles__products",
      ".amp-bundles__classic-bundles__items",
      ".amp-bundles__classic-bundles__product-list",
      ".amp-bundles__classic-bundles__products-list"
    ],

    classicProductSelectors: [
      ".amp-bundles__classic-bundles__product",
      ".amp-bundles__classic-bundles__item",
      ".amp-bundles__classic-bundles__product-item"
    ],

    classicTotalSelectors: [
      ".amp-bundles__classic-bundles__total",
      ".amp-bundles__classic-bundles__totals",
      ".amp-bundles__classic-bundles__summary"
    ],

    cartDrawer: "cart-drawer"
  };

  const SACHET_BUNDLE_ID = "1785888881916";

  const SACHET_BUNDLE_ITEMS = [
    {
      id: 44713374810146,
      quantity: 1
    },
    {
      id: 44713374941218,
      quantity: 1
    },
    {
      id: 44713375072290,
      quantity: 1
    },
    {
      id: 44713375268898,
      quantity: 1
    },
    {
      id: 44713375301666,
      quantity: 1
    },
    {
      id: 44713374744610,
      quantity: 1
    }
  ];

  const wait = milliseconds =>
    new Promise(resolve => {
      window.setTimeout(resolve, milliseconds);
    });

  const fetchCart = async () => {
    const response = await fetch("/cart.js", {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "Não foi possível consultar o carrinho."
      );
    }

    return response.json();
  };

  const getCartDrawer = () => {
    return document.querySelector(
      SELECTORS.cartDrawer
    );
  };

  const getDrawerSections = cartDrawer => {
    if (
      !cartDrawer ||
      typeof cartDrawer.getSectionsToRender !==
        "function"
    ) {
      return [];
    }

    return cartDrawer
      .getSectionsToRender()
      .map(section => section.id)
      .filter(Boolean);
  };

  const parsePositiveInteger = value => {
    const match = String(value || "").match(/\d+/);

    if (!match) return null;

    const number = parseInt(match[0], 10);

    return Number.isFinite(number) &&
      number > 0
      ? number
      : null;
  };

  const getVolumeQuantity = (
    ampWidget,
    form
  ) => {
    const selectedTier =
      ampWidget.querySelector(
        SELECTORS.selectedVolumeTier
      );

    const quantityShown =
      parsePositiveInteger(
        selectedTier?.querySelector(
          SELECTORS.volumeQuantity
        )?.textContent
      );

    if (quantityShown) {
      return quantityShown;
    }

    const quantityFromTierText =
      parsePositiveInteger(
        selectedTier?.querySelector(
          SELECTORS.volumeTierText
        )?.textContent
      );

    if (quantityFromTierText) {
      return quantityFromTierText;
    }

    const quantityInput = form.querySelector(
      'input[name="quantity"]'
    );

    const formQuantity =
      parsePositiveInteger(
        quantityInput?.value
      );

    return formQuantity || 1;
  };

  const syncCartGiftsAfterAdd = async () => {
    if (
      typeof window.syncCartGifts !==
      "function"
    ) {
      return false;
    }

    const cart = await fetchCart();

    return window.syncCartGifts(
      cart.items || []
    );
  };

  const refreshAndOpenCartDrawer = async () => {
    const cartDrawer = getCartDrawer();

    if (!cartDrawer) {
      throw new Error(
        "O minicarrinho não foi encontrado."
      );
    }

    if (
      typeof cartDrawer.refresh === "function"
    ) {
      await cartDrawer.refresh({
        open: true
      });

      return;
    }

    cartDrawer.classList.remove("is-empty");

    await wait(150);

    if (
      typeof cartDrawer.open === "function"
    ) {
      cartDrawer.open();
      return;
    }

    cartDrawer.classList.add("active");
  };

  const finalizeCartUpdate = async () => {
    await syncCartGiftsAfterAdd();
    await refreshAndOpenCartDrawer();
  };

  /* =====================================================
     UI DO CLASSIC BUNDLE
     Resumo compacto + abrir/fechar sabores
     ===================================================== */

  const findFirstElement = (
    root,
    selectors
  ) => {
    for (const selector of selectors) {
      const element =
        root.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  };

  const findClassicWidgetFromButton =
    button => {
      return (
        button.closest(
          SELECTORS.classicWidget
        ) ||
        button.closest(
          '[class*="classic-bundles"]'
        ) ||
        button.parentElement
      );
    };

  const findClassicProductsContainer =
    widget => {
      const knownContainer =
        findFirstElement(
          widget,
          SELECTORS.classicProductListSelectors
        );

      if (knownContainer) {
        return knownContainer;
      }

      for (
        const productSelector of
        SELECTORS.classicProductSelectors
      ) {
        const product =
          widget.querySelector(
            productSelector
          );

        if (product?.parentElement) {
          return product.parentElement;
        }
      }

      return null;
    };

  const findClassicTotal = widget => {
    return findFirstElement(
      widget,
      SELECTORS.classicTotalSelectors
    );
  };

  const createClassicBundleToggle = (
    widget,
    productsContainer
  ) => {
    if (
      widget.querySelector(
        ".tn-classic-bundle-toggle"
      )
    ) {
      return;
    }

    const toggle = document.createElement(
      "button"
    );

    toggle.type = "button";
    toggle.className =
      "tn-classic-bundle-toggle";

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );

    const productsId =
      productsContainer.id ||
      `tn-classic-products-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    productsContainer.id = productsId;

    toggle.setAttribute(
      "aria-controls",
      productsId
    );

    toggle.innerHTML = `
      <span class="tn-classic-bundle-toggle__text">
        Ver sabores inclusos
      </span>

      <span
        class="tn-classic-bundle-toggle__icon"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    `;

    productsContainer.classList.add(
      "tn-classic-bundle-products"
    );

    productsContainer.hidden = true;

    const total =
      findClassicTotal(widget);

    if (total) {
      total.parentNode.insertBefore(
        toggle,
        total
      );
    } else {
      productsContainer.parentNode.insertBefore(
        toggle,
        productsContainer
      );
    }

    toggle.addEventListener(
      "click",
      () => {
        const expanded =
          toggle.getAttribute(
            "aria-expanded"
          ) === "true";

        const nextExpanded = !expanded;

        toggle.setAttribute(
          "aria-expanded",
          String(nextExpanded)
        );

        productsContainer.hidden =
          !nextExpanded;

        productsContainer.classList.toggle(
          "tn-classic-bundle-products--open",
          nextExpanded
        );

        widget.classList.toggle(
          "tn-classic-bundle--expanded",
          nextExpanded
        );

        const text =
          toggle.querySelector(
            ".tn-classic-bundle-toggle__text"
          );

        if (text) {
          text.textContent = nextExpanded
            ? "Ocultar sabores"
            : "Ver sabores inclusos";
        }
      }
    );
  };

  const addClassicBundleSummary =
    widget => {
      if (
        widget.querySelector(
          ".tn-classic-bundle-summary"
        )
      ) {
        return;
      }

      const summary =
        document.createElement("div");

      summary.className =
        "tn-classic-bundle-summary";

      summary.innerHTML = `
        <div class="tn-classic-bundle-summary__content">
          <span class="tn-classic-bundle-summary__eyebrow">
            Kit com 6 sachês
          </span>

          <span class="tn-classic-bundle-summary__description">
            3 sabores de whey + 3 sabores de colágeno
          </span>
        </div>

        <span class="tn-classic-bundle-summary__badge">
          Economize 5%
        </span>
      `;

      const productsContainer =
        findClassicProductsContainer(
          widget
        );

      if (productsContainer) {
        productsContainer.parentNode.insertBefore(
          summary,
          productsContainer
        );
      } else {
        widget.prepend(summary);
      }
    };

  const initializeClassicBundleUI =
    () => {
      const classicButtons =
        document.querySelectorAll(
          SELECTORS.classicButton
        );

      classicButtons.forEach(button => {
        const widget =
          findClassicWidgetFromButton(
            button
          );

        if (
          !widget ||
          widget.dataset
            .tnClassicUiInitialized ===
            "true"
        ) {
          return;
        }

        const productsContainer =
          findClassicProductsContainer(
            widget
          );

        if (!productsContainer) {
          return;
        }

        widget.dataset
          .tnClassicUiInitialized =
          "true";

        widget.classList.add(
          "tn-classic-bundle"
        );

        addClassicBundleSummary(widget);

        createClassicBundleToggle(
          widget,
          productsContainer
        );
      });
    };

  let classicBundleUiTimer = null;

  const scheduleClassicBundleUi =
    () => {
      window.clearTimeout(
        classicBundleUiTimer
      );

      classicBundleUiTimer =
        window.setTimeout(() => {
          initializeClassicBundleUI();
        }, 100);
    };

  document.addEventListener(
    "DOMContentLoaded",
    scheduleClassicBundleUi
  );

  window.addEventListener(
    "load",
    scheduleClassicBundleUi
  );

  const classicBundleObserver =
    new MutationObserver(() => {
      scheduleClassicBundleUi();
    });

  classicBundleObserver.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  /* =====================================================
     VOLUME DISCOUNT
     Exemplo: Leve 1 ou Leve 2 Wheys
     ===================================================== */

  document.addEventListener(
    "click",
    async event => {
      const button = event.target.closest(
        SELECTORS.productButton
      );

      if (!button) return;

      const productArea = button.closest(
        [
          ".wt-product__main",
          ".wt-product__info",
          ".product__info-container"
        ].join(",")
      );

      const ampWidget =
        productArea?.querySelector(
          SELECTORS.volumeWidget
        );

      if (!ampWidget) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (
        button.dataset.tnAmpAdding === "true"
      ) {
        return;
      }

      const form = button.closest(
        'form[action*="/cart/add"]'
      );

      const cartDrawer = getCartDrawer();

      if (!form || !cartDrawer) {
        return;
      }

      button.dataset.tnAmpAdding = "true";

      button.setAttribute(
        "aria-disabled",
        "true"
      );

      button.classList.add("loading");

      const loader = button.querySelector(
        ".loading-overlay__spinner"
      );

      loader?.classList.remove("hidden");

      try {
        const quantity =
          getVolumeQuantity(
            ampWidget,
            form
          );

        const formData = new FormData(form);

        formData.set(
          "quantity",
          String(quantity)
        );

        const quantityInput =
          form.querySelector(
            'input[name="quantity"]'
          );

        if (quantityInput) {
          quantityInput.value =
            String(quantity);
        }

        const sectionIds =
          getDrawerSections(cartDrawer);

        if (sectionIds.length) {
          formData.set(
            "sections",
            sectionIds.join(",")
          );
        }

        formData.set(
          "sections_url",
          window.location.pathname
        );

        const response = await fetch(
          window.routes?.cart_add_url ||
            "/cart/add.js",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "X-Requested-With":
                "XMLHttpRequest"
            },
            body: formData
          }
        );

        const data = await response.json();

        if (!response.ok || data.status) {
          throw new Error(
            data.description ||
              data.message ||
              "Não foi possível adicionar o produto."
          );
        }

        await finalizeCartUpdate();
      } catch (error) {
        console.error(
          "Erro no AMP Volume Discount:",
          error
        );

        alert(
          error.message ||
            "Não foi possível adicionar ao carrinho."
        );
      } finally {
        delete button.dataset.tnAmpAdding;

        button.removeAttribute(
          "aria-disabled"
        );

        button.classList.remove("loading");

        loader?.classList.add("hidden");
      }
    },
    true
  );

  /* =====================================================
     CLASSIC BUNDLE
     Kit com 6 sachês
     ===================================================== */

  const createAmpBundleReference = () => {
    const randomPart = Math.random()
      .toString(36)
      .slice(2, 12);

    return [
      SACHET_BUNDLE_ID,
      "tn",
      Date.now(),
      randomPart
    ].join("_");
  };

  const addClassicBundleToCart =
    async () => {
      const bundleReference =
        createAmpBundleReference();

      const payload = {
        items: SACHET_BUNDLE_ITEMS.map(
          item => ({
            id: item.id,
            quantity: item.quantity,
            properties: {
              _amp_bundles:
                bundleReference
            }
          })
        )
      };

      const response = await fetch(
        window.routes?.cart_add_url ||
          "/cart/add.js",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
            "X-Requested-With":
              "XMLHttpRequest"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok || data.status) {
        throw new Error(
          data.description ||
            data.message ||
            "Não foi possível adicionar o kit."
        );
      }

      return data;
    };

  document.addEventListener(
    "click",
    async event => {
      const button = event.target.closest(
        SELECTORS.classicButton
      );

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (
        button.dataset
          .tnBundleAdding === "true"
      ) {
        return;
      }

      button.dataset.tnBundleAdding =
        "true";

      button.disabled = true;

      button.setAttribute(
        "aria-disabled",
        "true"
      );

      const originalContent =
        button.innerHTML;

      button.innerHTML =
        "<div>ADICIONANDO KIT...</div>";

      try {
        await addClassicBundleToCart();
        await finalizeCartUpdate();
      } catch (error) {
        console.error(
          "Erro ao adicionar o Kit Sachês:",
          error
        );

        alert(
          error.message ||
            "Não foi possível adicionar o kit ao carrinho."
        );
      } finally {
        delete button.dataset
          .tnBundleAdding;

        button.disabled = false;

        button.removeAttribute(
          "aria-disabled"
        );

        button.innerHTML =
          originalContent;
      }
    },
    true
  );
})();