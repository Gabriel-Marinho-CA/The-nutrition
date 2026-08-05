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
    classicButton:
      ".amp-bundles__classic-bundles__cta",
    cartDrawer: "cart-drawer"
  };

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

  const getCartSignature = cart => {
    return [
      cart.item_count,
      cart.total_price,
      ...(cart.items || []).map(
        item => `${item.key}:${item.quantity}`
      )
    ].join("|");
  };

  const waitForCartChange = async previousSignature => {
    for (
      let attempt = 0;
      attempt < 24;
      attempt += 1
    ) {
      await wait(250);

      const cart = await fetchCart();

      if (
        getCartSignature(cart) !==
        previousSignature
      ) {
        return cart;
      }
    }

    throw new Error(
      "O AMP não concluiu a inclusão no carrinho."
    );
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

  const refreshAndOpenCartDrawer = async () => {
    const cartDrawer = getCartDrawer();

    if (!cartDrawer) {
      throw new Error(
        "O minicarrinho não foi encontrado."
      );
    }

    const sectionIds =
      getDrawerSections(cartDrawer);

    if (!sectionIds.length) {
      throw new Error(
        "As seções do minicarrinho não foram encontradas."
      );
    }

    const separator =
      window.location.search ? "&" : "?";

    const sectionsUrl =
      `${window.location.pathname}` +
      `${window.location.search}` +
      `${separator}sections=${encodeURIComponent(
        sectionIds.join(",")
      )}` +
      `&tn_cart_refresh=${Date.now()}`;

    const response = await fetch(sectionsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        "Não foi possível atualizar o minicarrinho."
      );
    }

    const sections = await response.json();

    if (
      typeof cartDrawer.renderContents ===
      "function"
    ) {
      cartDrawer.renderContents({
        sections
      });
    } else {
      throw new Error(
        "O tema não permitiu atualizar o minicarrinho."
      );
    }

    cartDrawer.classList.remove("is-empty");

    await wait(150);

    if (
      typeof cartDrawer.open === "function"
    ) {
      cartDrawer.open();
    }
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

  /* =====================================================
     VOLUME DISCOUNT
     Exemplo: Leve 1 ou Leve 2 Wheys
     ===================================================== */

  const handleVolumeDiscountClick =
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

      if (!form || !cartDrawer) return;

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

        if (
          typeof cartDrawer.renderContents ===
          "function"
        ) {
          cartDrawer.renderContents(data);
        }

        cartDrawer.classList.remove(
          "is-empty"
        );

        await wait(100);

        if (
          typeof cartDrawer.open ===
          "function"
        ) {
          cartDrawer.open();
        }
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
    };

  document.addEventListener(
    "click",
    handleVolumeDiscountClick,
    true
  );

  /* =====================================================
     CLASSIC BUNDLE
     Exemplo: Kit com 6 sachês
     ===================================================== */

  const attachClassicBundleButton =
    button => {
      if (
        button.dataset.tnAmpClassicReady ===
        "true"
      ) {
        return;
      }

      button.dataset.tnAmpClassicReady =
        "true";

      /*
       * Registra o estado do carrinho antes
       * do clique ser processado pelo AMP.
       */
      button.addEventListener(
        "pointerdown",
        async () => {
          try {
            const cart = await fetchCart();

            button.dataset
              .tnCartSignatureBefore =
              getCartSignature(cart);
          } catch (error) {
            console.error(
              "Erro ao registrar o carrinho:",
              error
            );
          }
        },
        {
          passive: true
        }
      );

      button.addEventListener(
        "click",
        async event => {
          /*
           * Não usamos preventDefault nem
           * stopImmediatePropagation.
           *
           * O AMP continua adicionando os
           * produtos do kit.
           *
           * stopPropagation impede que o
           * clique suba até a Yampi.
           */
          event.stopPropagation();

          if (
            button.dataset
              .tnAmpClassicLoading ===
            "true"
          ) {
            return;
          }

          button.dataset
            .tnAmpClassicLoading = "true";

          try {
            let previousSignature =
              button.dataset
                .tnCartSignatureBefore;

            if (!previousSignature) {
              const cartBefore =
                await fetchCart();

              previousSignature =
                getCartSignature(
                  cartBefore
                );
            }

            await waitForCartChange(
              previousSignature
            );

            await refreshAndOpenCartDrawer();
          } catch (error) {
            console.error(
              "Erro no AMP Classic Bundle:",
              error
            );

            alert(
              error.message ||
                "Não foi possível adicionar o kit ao carrinho."
            );
          } finally {
            delete button.dataset
              .tnAmpClassicLoading;

            delete button.dataset
              .tnCartSignatureBefore;
          }
        },
        false
      );
    };

  const scanClassicBundleButtons = () => {
    document
      .querySelectorAll(
        SELECTORS.classicButton
      )
      .forEach(
        attachClassicBundleButton
      );
  };

  const initialize = () => {
    scanClassicBundleButtons();

    const observer = new MutationObserver(
      scanClassicBundleButtons
    );

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }
})();