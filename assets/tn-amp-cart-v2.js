(() => {
  "use strict";

  const SELECTORS = {
    productButton: "product-form .js-add-to-cart",

    volumeWidget:
      ".amp-volume-discount-bundles",

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
    const itemSignature = (cart.items || [])
      .map(item => {
        const properties =
          item.properties || {};

        return [
          item.key || "",
          item.variant_id || item.id || "",
          item.quantity || 0,
          item.final_line_price || 0,
          properties._amp_bundles || ""
        ].join(":");
      })
      .sort()
      .join("|");

    return [
      cart.item_count || 0,
      cart.total_price || 0,
      cart.total_discount || 0,
      itemSignature
    ].join("::");
  };

  const waitForCartChange = async (
    previousSignature,
    attempts = 28,
    interval = 250
  ) => {
    for (
      let attempt = 0;
      attempt < attempts;
      attempt += 1
    ) {
      await wait(interval);

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

  const parsePositiveInteger = value => {
    const match = String(value || "").match(/\d+/);

    if (!match) {
      return null;
    }

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

    const quantityInput =
      form.querySelector(
        'input[name="quantity"]'
      );

    const formQuantity =
      parsePositiveInteger(
        quantityInput?.value
      );

    return formQuantity || 1;
  };

  const syncCartGiftsAfterAdd =
    async cart => {
      if (
        typeof window.syncCartGifts !==
        "function"
      ) {
        return false;
      }

      const currentCart =
        cart || (await fetchCart());

      return window.syncCartGifts(
        currentCart.items || []
      );
    };

  const refreshAndOpenCartDrawer =
    async () => {
      const cartDrawer = getCartDrawer();

      if (!cartDrawer) {
        throw new Error(
          "O minicarrinho não foi encontrado."
        );
      }

      if (
        typeof cartDrawer.refresh ===
        "function"
      ) {
        await cartDrawer.refresh({
          open: true
        });

        return;
      }

      cartDrawer.classList.remove(
        "is-empty"
      );

      await wait(150);

      if (
        typeof cartDrawer.open ===
        "function"
      ) {
        cartDrawer.open();
        return;
      }

      cartDrawer.classList.add("active");
    };

  const finalizeCartUpdate =
    async cart => {
      await syncCartGiftsAfterAdd(cart);
      await refreshAndOpenCartDrawer();
    };

  /* =====================================================
     VOLUME DISCOUNT
     LEVE 1 OU LEVE 2
     ===================================================== */

  document.addEventListener(
    "click",
    async event => {
      const button = event.target.closest(
        SELECTORS.productButton
      );

      if (!button) {
        return;
      }

      const productArea =
        button.closest(
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

      if (!ampWidget) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (
        button.dataset.tnAmpAdding ===
        "true"
      ) {
        return;
      }

      const form =
        button.closest(
          'form[action*="/cart/add"]'
        );

      const cartDrawer = getCartDrawer();

      if (!form || !cartDrawer) {
        return;
      }

      button.dataset.tnAmpAdding =
        "true";

      button.setAttribute(
        "aria-disabled",
        "true"
      );

      button.classList.add("loading");

      const loader =
        button.querySelector(
          ".loading-overlay__spinner"
        );

      loader?.classList.remove("hidden");

      try {
        const quantity =
          getVolumeQuantity(
            ampWidget,
            form
          );

        const formData =
          new FormData(form);

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

        const data =
          await response.json();

        if (
          !response.ok ||
          data.status
        ) {
          throw new Error(
            data.description ||
              data.message ||
              "Não foi possível adicionar o produto."
          );
        }

        const updatedCart =
          await fetchCart();

        await finalizeCartUpdate(
          updatedCart
        );
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
        delete button.dataset
          .tnAmpAdding;

        button.removeAttribute(
          "aria-disabled"
        );

        button.classList.remove(
          "loading"
        );

        loader?.classList.add("hidden");
      }
    },
    true
  );

  /* =====================================================
     CLASSIC BUNDLE
     KIT COM 6 SACHÊS
     ===================================================== */

  const handleClassicBundleClick =
    async event => {
      const button = event.currentTarget;

      /*
       * Não cancela o comportamento do AMP.
       * Apenas impede que o clique continue
       * subindo até o listener global da Yampi.
       */
      event.stopPropagation();

      if (
        button.dataset
          .tnClassicWatching === "true"
      ) {
        return;
      }

      button.dataset
        .tnClassicWatching = "true";

      try {
        /*
         * Este listener está no próprio botão.
         * O AMP também recebe o clique nesse
         * elemento e executa sua inclusão normal.
         */
        const cartBefore =
          await fetchCart();

        const previousSignature =
          getCartSignature(cartBefore);

        const updatedCart =
          await waitForCartChange(
            previousSignature
          );

        await finalizeCartUpdate(
          updatedCart
        );
      } catch (error) {
        console.error(
          "Erro após adicionar o Kit Sachês:",
          error
        );
      } finally {
        delete button.dataset
          .tnClassicWatching;
      }
    };

  const attachClassicBundleButton =
    button => {
      if (
        button.dataset
          .tnClassicListenerAttached ===
        "true"
      ) {
        return;
      }

      button.dataset
        .tnClassicListenerAttached =
        "true";

      /*
       * Listener no próprio botão e em fase
       * normal de bubbling:
       *
       * - o AMP continua funcionando;
       * - o clique para antes de chegar
       *   ao document/Yampi.
       */
      button.addEventListener(
        "click",
        handleClassicBundleClick,
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

  const initializeClassicBundle =
    () => {
      scanClassicBundleButtons();

      const observer =
        new MutationObserver(() => {
          scanClassicBundleButtons();
        });

      observer.observe(
        document.documentElement,
        {
          childList: true,
          subtree: true
        }
      );
    };

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeClassicBundle,
      {
        once: true
      }
    );
  } else {
    initializeClassicBundle();
  }
})();