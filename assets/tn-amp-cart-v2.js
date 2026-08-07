(() => {
  "use strict";

  const SELECTORS = {
    productButton:
      "product-form .js-add-to-cart",

    productArea:
      [
        ".wt-product__info",
        ".product__info-container",
        ".wt-product__main"
      ].join(","),

    volumeWidget:
      ".amp-volume-discount-bundles",

    volumeInner:
      ".amp-bundles__volume-discount-bundles",

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

    mixRoot:
      "#amp-mix-and-match-bundles-embed-section",

    mixWidget:
      ".amp-bundles__mix-and-match-bundles",

    mixHeadline:
      ".amp-bundles__mix-and-match-bundles__headline",

    mixSection:
      ".amp-bundles__mix-and-match-bundles__section",

    mixSectionHeader:
      ".amp-bundles__mix-and-match-bundles__section-header",

    mixSectionName:
      ".amp-bundles__mix-and-match-bundles__section-name",

    mixSectionProgress:
      ".amp-bundles__mix-and-match-bundles__section-progress",

    mixSatisfiedProgress:
      ".amp-bundles__mix-and-match-bundles__section-progress--satisfied",

    mixProductTitle:
      ".amp-bundles__mix-and-match-bundles__product-tile__title",

    mixToggleButton:
      ".amp-bundles__mix-and-match-bundles__toggle-btn",

    mixRemoveButton:
      ".amp-bundles__mix-and-match-bundles__remove-button",

    mixCta:
      ".amp-bundles__mix-and-match-bundles__cta",

    classicButton:
      ".amp-bundles__classic-bundles__cta",

    cartDrawer:
      "cart-drawer"
  };

  /*
   * Kit Sachês — campanha Classic Bundle.
   */
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

    const number = parseInt(
      match[0],
      10
    );

    return Number.isFinite(number) &&
      number > 0
      ? number
      : null;
  };

  const parsePercentage = value => {
    const match = String(
      value || ""
    ).match(/(\d+(?:[.,]\d+)?)\s*%/);

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

  const getSelectedVolumeTier = ampWidget => {
    return ampWidget?.querySelector(
      SELECTORS.selectedVolumeTier
    );
  };

  const getSelectedVolumeTierIndex =
    ampWidget => {
      if (!ampWidget) {
        return -1;
      }

      const tiers = Array.from(
        ampWidget.querySelectorAll(
          SELECTORS.volumeTier
        )
      );

      const selectedTier =
        getSelectedVolumeTier(
          ampWidget
        );

      return tiers.indexOf(
        selectedTier
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

      const discountFromBadge =
        parsePercentage(
          badgeText
        );

      if (discountFromBadge > 0) {
        return discountFromBadge;
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

      const cart = await fetchCart();

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
     FLUXO INTEGRADO
     VOLUME DISCOUNT + MIX & MATCH
  ===================================================== */

  let integratedFlow = null;

  let flowSyncTimer = null;

  const scheduleFlowSync = () => {
    window.clearTimeout(
      flowSyncTimer
    );

    flowSyncTimer =
      window.setTimeout(
        syncIntegratedFlow,
        30
      );
  };

  const getIntegratedFlowElements =
    () => {
      const volumeWidget =
        document.querySelector(
          SELECTORS.volumeWidget
        );

      const mixRoot =
        document.querySelector(
          SELECTORS.mixRoot
        );

      const mixWidget =
        mixRoot?.querySelector(
          SELECTORS.mixWidget
        );

      if (
        !volumeWidget ||
        !mixRoot ||
        !mixWidget
      ) {
        return null;
      }

      const productArea =
        volumeWidget.closest(
          ".wt-product__info"
        ) ||
        volumeWidget.closest(
          ".product__info-container"
        ) ||
        volumeWidget.closest(
          ".wt-product__main"
        );

      if (!productArea) {
        return null;
      }

      return {
        productArea,
        volumeWidget,
        mixRoot,
        mixWidget
      };
    };

  const setTextIfDifferent = (
    element,
    text
  ) => {
    if (
      element &&
      element.textContent.trim() !==
        text
    ) {
      element.textContent = text;
    }
  };

  const decorateVolumeDiscount =
    volumeWidget => {
      const tiers =
        Array.from(
          volumeWidget.querySelectorAll(
            SELECTORS.volumeTier
          )
        );

      if (tiers[0]) {
        const text =
          tiers[0].querySelector(
            SELECTORS.volumeTierText
          );

        setTextIfDifferent(
          text,
          "1 unidade"
        );
      }

      if (tiers[1]) {
        const text =
          tiers[1].querySelector(
            SELECTORS.volumeTierText
          );

        setTextIfDifferent(
          text,
          "Kit com 2"
        );
      }
    };

  const getSimplifiedFlavorName =
    title => {
      const normalized =
        String(
          title || ""
        ).toLowerCase();

      if (
        normalized.includes(
          "cacao"
        ) ||
        normalized.includes(
          "cacau"
        )
      ) {
        return "Cacau";
      }

      if (
        normalized.includes(
          "strawberry"
        ) ||
        normalized.includes(
          "morango"
        )
      ) {
        return "Morango";
      }

      if (
        normalized.includes(
          "vanilla"
        ) ||
        normalized.includes(
          "vanila"
        )
      ) {
        return "Vanilla";
      }

      return title;
    };

  const decorateMixAndMatch =
    mixWidget => {
      const headline =
        mixWidget.querySelector(
          SELECTORS.mixHeadline
        );

      setTextIfDifferent(
        headline,
        "Escolha os sabores"
      );

      const sections =
        Array.from(
          mixWidget.querySelectorAll(
            SELECTORS.mixSection
          )
        );

      if (sections[0]) {
        setTextIfDifferent(
          sections[0].querySelector(
            SELECTORS.mixSectionName
          ),
          "1º sabor"
        );
      }

      if (sections[1]) {
        setTextIfDifferent(
          sections[1].querySelector(
            SELECTORS.mixSectionName
          ),
          "2º sabor"
        );
      }

      mixWidget
        .querySelectorAll(
          SELECTORS.mixProductTitle
        )
        .forEach(title => {
          const simplified =
            getSimplifiedFlavorName(
              title.textContent
            );

          setTextIfDifferent(
            title,
            simplified
          );
        });

      mixWidget
        .querySelectorAll(
          SELECTORS.mixToggleButton
        )
        .forEach(button => {
          setTextIfDifferent(
            button,
            "Escolher"
          );

          button.setAttribute(
            "aria-label",
            "Escolher sabor"
          );
        });

      mixWidget
        .querySelectorAll(
          SELECTORS.mixRemoveButton
        )
        .forEach(button => {
          setTextIfDifferent(
            button,
            "Trocar"
          );

          button.setAttribute(
            "aria-label",
            "Trocar sabor"
          );
        });

      const cta =
        mixWidget.querySelector(
          SELECTORS.mixCta
        );

      if (cta) {
        const inner =
          cta.querySelector("div");

        setTextIfDifferent(
          inner || cta,
          "Adicionar 2 ao carrinho"
        );
      }
    };

  const isSectionSatisfied =
    section => {
      return Boolean(
        section?.querySelector(
          SELECTORS.mixSatisfiedProgress
        )
      );
    };

  const openSection = section => {
    const header =
      section?.querySelector(
        SELECTORS.mixSectionHeader
      );

    if (
      !header ||
      header.getAttribute(
        "aria-expanded"
      ) === "true"
    ) {
      return;
    }

    header.click();
  };

  const closeSection = section => {
    const header =
      section?.querySelector(
        SELECTORS.mixSectionHeader
      );

    if (
      !header ||
      header.getAttribute(
        "aria-expanded"
      ) !== "true"
    ) {
      return;
    }

    header.click();
  };

  const handleMixAndMatchSteps =
    (
      productArea,
      mixWidget,
      isKitMode
    ) => {
      if (!isKitMode) {
        return;
      }

      const sections =
        Array.from(
          mixWidget.querySelectorAll(
            SELECTORS.mixSection
          )
        );

      if (sections.length < 2) {
        return;
      }

      const first =
        sections[0];

      const second =
        sections[1];

      const firstSatisfied =
        isSectionSatisfied(
          first
        );

      const secondSatisfied =
        isSectionSatisfied(
          second
        );

      /*
       * Primeiro acesso ao Kit com 2:
       * já abre a escolha do primeiro sabor.
       */
      if (
        !firstSatisfied &&
        !productArea.dataset
          .tnMixFirstOpened
      ) {
        productArea.dataset
          .tnMixFirstOpened =
          "true";

        window.setTimeout(
          () => {
            openSection(first);
          },
          60
        );

        return;
      }

      /*
       * Primeiro sabor escolhido:
       * abre automaticamente o segundo.
       */
      if (
        firstSatisfied &&
        !secondSatisfied
      ) {
        delete productArea.dataset
          .tnMixAutoCollapsed;

        window.setTimeout(
          () => {
            openSection(second);
          },
          80
        );

        return;
      }

      /*
       * Os dois sabores escolhidos:
       * fecha automaticamente a segunda etapa
       * uma única vez para deixar a interface
       * compacta e destacar o CTA.
       */
      if (
        firstSatisfied &&
        secondSatisfied &&
        productArea.dataset
          .tnMixAutoCollapsed !==
          "true"
      ) {
        productArea.dataset
          .tnMixAutoCollapsed =
          "true";

        window.setTimeout(
          () => {
            closeSection(second);
          },
          180
        );
      }
    };

  function syncIntegratedFlow() {
    const context =
      getIntegratedFlowElements();

    if (!context) {
      return;
    }

    const {
      productArea,
      volumeWidget,
      mixWidget
    } = context;

    productArea.classList.add(
      "tn-amp-commerce-flow"
    );

    decorateVolumeDiscount(
      volumeWidget
    );

    decorateMixAndMatch(
      mixWidget
    );

    /*
     * Tier 0 = 1 unidade
     * Tier 1 = Kit com 2
     */
    const selectedTierIndex =
      getSelectedVolumeTierIndex(
        volumeWidget
      );

    const isKitMode =
      selectedTierIndex === 1;

    productArea.classList.toggle(
      "tn-amp-mode-kit",
      isKitMode
    );

    productArea.classList.toggle(
      "tn-amp-mode-single",
      !isKitMode
    );

    handleMixAndMatchSteps(
      productArea,
      mixWidget,
      isKitMode
    );
  }

  const initializeIntegratedFlow =
    () => {
      const context =
        getIntegratedFlowElements();

      if (!context) {
        return;
      }

      if (
        integratedFlow &&
        integratedFlow.volumeWidget ===
          context.volumeWidget &&
        integratedFlow.mixWidget ===
          context.mixWidget
      ) {
        return;
      }

      integratedFlow = context;

      const observer =
        new MutationObserver(
          scheduleFlowSync
        );

      observer.observe(
        context.volumeWidget,
        {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: [
            "class",
            "aria-expanded",
            "disabled"
          ]
        }
      );

      observer.observe(
        context.mixWidget,
        {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: [
            "class",
            "aria-expanded",
            "disabled"
          ]
        }
      );

      scheduleFlowSync();
    };

  const pageObserver =
    new MutationObserver(
      initializeIntegratedFlow
    );

  pageObserver.observe(
    document.documentElement,
    {
      subtree: true,
      childList: true
    }
  );

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeIntegratedFlow,
      {
        once: true
      }
    );
  } else {
    initializeIntegratedFlow();
  }


  /* =====================================================
     VOLUME DISCOUNT
     COMPRA NORMAL DE 1 UNIDADE
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

      const productArea =
        button.closest(
          SELECTORS.productArea
        );

      const ampWidget =
        productArea?.querySelector(
          SELECTORS.volumeWidget
        );

      if (!ampWidget) {
        return;
      }

      /*
       * Quando Kit com 2 está ativo,
       * quem controla a compra é o CTA
       * nativo do Mix & Match.
       */
      if (
        productArea.classList.contains(
          "tn-amp-mode-kit"
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

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

      const cartDrawer =
        getCartDrawer();

      if (!form || !cartDrawer) {
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

        const response = await fetch(
          window.routes?.cart_add_url ||
            "/cart/add.js",
          {
            method: "POST",
            headers: {
              Accept:
                "application/json",

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
        delete button.dataset
          .tnAmpAdding;

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
     CLASSIC BUNDLE
     KIT COM 6 SACHÊS
  ===================================================== */

  const addClassicBundleToCart =
    async () => {
      const payload = {
        items:
          SACHET_BUNDLE_ITEMS.map(
            item => ({
              id: item.id,

              quantity:
                item.quantity,

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

      const response = await fetch(
        window.routes?.cart_add_url ||
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
          body: JSON.stringify(
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
        button.dataset
          .tnBundleAdding ===
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