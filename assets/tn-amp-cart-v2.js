(() => {
  "use strict";

  const SELECTORS = {
    productButton:
      "product-form .js-add-to-cart",

    volumeWidget:
      ".amp-volume-discount-bundles",

    volumeTier:
      ".amp-bundles__volume-discount-bundles__tier-option",

    selectedVolumeTier:
      ".amp-bundles__volume-discount-bundles__tier-option--selected",

    volumeQuantity:
      ".amp-bundles__volume-discount-bundles__quantity-value",

    volumeTierText:
      ".amp-bundles__volume-discount-bundles__tier-text",

    volumeTierBadge:
      ".amp-bundles__volume-discount-bundles__tier-badge",

    classicButton:
      ".amp-bundles__classic-bundles__cta",

    cartDrawer:
      "cart-drawer"
  };


  /* =====================================================
     KIT SACHÊS
  ===================================================== */

  const SACHET_BUNDLE_REFERENCE =
    "1785888881916_tn_sachets";

  const SACHET_BUNDLE_DISCOUNT_PERCENT = 5;

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


  /* =====================================================
     UTILITÁRIOS
  ===================================================== */

  const wait = milliseconds =>
    new Promise(resolve => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    });


  const fetchCart = async () => {
    const response = await fetch(
      "/cart.js",
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

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
    const match = String(
      value || ""
    ).match(/\d+/);

    if (!match) {
      return null;
    }

    const number =
      parseInt(match[0], 10);

    return Number.isFinite(number) &&
      number > 0
      ? number
      : null;
  };


  const parsePercentage = value => {
    const match = String(
      value || ""
    ).match(
      /(\d+(?:[.,]\d+)?)\s*%/
    );

    if (!match) {
      return 0;
    }

    const number = Number(
      match[1].replace(",", ".")
    );

    if (
      !Number.isFinite(number) ||
      number <= 0
    ) {
      return 0;
    }

    return number;
  };


  const isVisible = element => {
    if (!element) {
      return false;
    }

    const style =
      window.getComputedStyle(
        element
      );

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    );
  };


  const getBestVolumeWidget = () => {
    const widgets =
      Array.from(
        document.querySelectorAll(
          SELECTORS.volumeWidget
        )
      );

    if (!widgets.length) {
      return null;
    }

    const visibleSelected =
      widgets.find(widget => {
        return (
          isVisible(widget) &&
          Boolean(
            widget.querySelector(
              SELECTORS.selectedVolumeTier
            )
          )
        );
      });

    if (visibleSelected) {
      return visibleSelected;
    }

    const selected =
      widgets.find(widget => {
        return Boolean(
          widget.querySelector(
            SELECTORS.selectedVolumeTier
          )
        );
      });

    return (
      selected ||
      widgets.find(isVisible) ||
      widgets[0] ||
      null
    );
  };


  const getSelectedVolumeTier =
    ampWidget => {
      return ampWidget?.querySelector(
        SELECTORS.selectedVolumeTier
      );
    };


  const getVolumeQuantity = (
    ampWidget,
    form
  ) => {
    const selectedTier =
      getSelectedVolumeTier(
        ampWidget
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

    const quantityFromText =
      parsePositiveInteger(
        selectedTier?.querySelector(
          SELECTORS.volumeTierText
        )?.textContent
      );

    if (quantityFromText) {
      return quantityFromText;
    }

    const quantityInput =
      form?.querySelector(
        'input[name="quantity"]'
      );

    return (
      parsePositiveInteger(
        quantityInput?.value
      ) || 1
    );
  };


  const getVolumeDiscountPercent =
    ampWidget => {
      const selectedTier =
        getSelectedVolumeTier(
          ampWidget
        );

      if (!selectedTier) {
        return 0;
      }

      const badgeText =
        selectedTier.querySelector(
          SELECTORS.volumeTierBadge
        )?.textContent;

      const fromBadge =
        parsePercentage(
          badgeText
        );

      if (fromBadge > 0) {
        return fromBadge;
      }

      return parsePercentage(
        selectedTier.textContent
      );
    };


  const syncCartGiftsAfterAdd =
    async () => {
      if (
        typeof window.syncCartGifts !==
        "function"
      ) {
        return false;
      }

      const cart =
        await fetchCart();

      return window.syncCartGifts(
        cart.items || []
      );
    };


  const refreshAndOpenCartDrawer =
    async () => {
      const cartDrawer =
        getCartDrawer();

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

      cartDrawer.classList.add(
        "active"
      );
    };


  const finalizeCartUpdate =
    async () => {
      await syncCartGiftsAfterAdd();
      await refreshAndOpenCartDrawer();
    };


  /* =====================================================
     VOLUME DISCOUNT
  ===================================================== */

  document.addEventListener(
    "click",
    async event => {
      const button =
        event.target.closest(
          SELECTORS.productButton
        );

      if (!button) {
        return;
      }


      const form =
        button.closest(
          'form[action*="/cart/add"]'
        );

      if (!form) {
        return;
      }


      const ampWidget =
        getBestVolumeWidget();

      /*
        Produto sem Volume Discount:
        deixa o comportamento normal do tema.
      */
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


      const cartDrawer =
        getCartDrawer();

      if (!cartDrawer) {
        return;
      }


      button.dataset.tnAmpAdding =
        "true";

      button.setAttribute(
        "aria-disabled",
        "true"
      );

      button.classList.add(
        "loading"
      );


      const loader =
        button.querySelector(
          ".loading-overlay__spinner"
        );

      loader?.classList.remove(
        "hidden"
      );


      try {

        const quantity =
          getVolumeQuantity(
            ampWidget,
            form
          );

        const discountPercent =
          getVolumeDiscountPercent(
            ampWidget
          );

        const formData =
          new FormData(form);


        formData.set(
          "quantity",
          String(quantity)
        );


        if (discountPercent > 0) {

          formData.set(
            "properties[_tn_amp_campaign]",
            "volume_discount"
          );

          formData.set(
            "properties[_tn_amp_discount_percent]",
            String(
              discountPercent
            )
          );

          formData.set(
            "properties[_tn_amp_group]",
            `volume_${quantity}`
          );

        } else {

          formData.delete(
            "properties[_tn_amp_campaign]"
          );

          formData.delete(
            "properties[_tn_amp_discount_percent]"
          );

          formData.delete(
            "properties[_tn_amp_group]"
          );
        }


        const quantityInput =
          form.querySelector(
            'input[name="quantity"]'
          );

        if (quantityInput) {
          quantityInput.value =
            String(quantity);
        }


        const sectionIds =
          getDrawerSections(
            cartDrawer
          );

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


        const response =
          await fetch(
            window.routes
              ?.cart_add_url ||
              "/cart/add.js",
            {
              method: "POST",

              headers: {
                Accept:
                  "application/json",

                "X-Requested-With":
                  "XMLHttpRequest"
              },

              body:
                formData
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

        button.classList.remove(
          "loading"
        );

        loader?.classList.add(
          "hidden"
        );
      }
    },
    true
  );


  /* =====================================================
     CLASSIC BUNDLE — KIT SACHÊS
  ===================================================== */

  const addClassicBundleToCart =
    async () => {
      const payload = {
        items:
          SACHET_BUNDLE_ITEMS.map(
            item => ({
              id: item.id,
              quantity: item.quantity,

              properties: {
                _amp_bundles:
                  SACHET_BUNDLE_REFERENCE,

                _tn_amp_campaign:
                  "classic_bundle",

                _tn_amp_discount_percent:
                  String(
                    SACHET_BUNDLE_DISCOUNT_PERCENT
                  ),

                _tn_amp_group:
                  "kit_sachets"
              }
            })
          )
      };


      const response =
        await fetch(
          window.routes
            ?.cart_add_url ||
            "/cart/add.js",
          {
            method: "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              "X-Requested-With":
                "XMLHttpRequest"
            },

            body:
              JSON.stringify(
                payload
              )
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
            "Não foi possível adicionar o kit."
        );
      }


      return data;
    };


  document.addEventListener(
    "click",
    async event => {
      const button =
        event.target.closest(
          SELECTORS.classicButton
        );

      if (!button) {
        return;
      }


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

      button.disabled =
        true;

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

        delete button.dataset.tnBundleAdding;

        button.disabled =
          false;

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