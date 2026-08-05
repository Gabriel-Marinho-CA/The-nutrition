(() => {
  "use strict";

  console.log("TN AMP CART V2 CARREGADO");

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

  const openCartDrawer = async (
    cartDrawer,
    data
  ) => {
    if (!cartDrawer) {
      throw new Error(
        "O minicarrinho não foi encontrado."
      );
    }

    if (
      data?.sections &&
      typeof cartDrawer.renderContents ===
        "function"
    ) {
      cartDrawer.renderContents(data);
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

        await openCartDrawer(
          cartDrawer,
          data
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
      const cartDrawer =
        getCartDrawer();

      if (!cartDrawer) {
        throw new Error(
          "O minicarrinho não foi encontrado."
        );
      }

      const bundleReference =
        createAmpBundleReference();

      const sectionIds =
        getDrawerSections(cartDrawer);

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
        ),
        sections: sectionIds,
        sections_url:
          window.location.pathname
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

      await openCartDrawer(
        cartDrawer,
        data
      );

      return data;
    };

  document.addEventListener(
    "click",
    async event => {
      const button = event.target.closest(
        SELECTORS.classicButton
      );

      if (!button) return;

      console.log(
        "CLIQUE NO CLASSIC BUNDLE INTERCEPTADO"
      );

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (
        button.dataset.tnBundleAdding ===
        "true"
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