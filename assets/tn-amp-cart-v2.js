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

    mixSatisfiedProgress:
      ".amp-bundles__mix-and-match-bundles__section-progress--satisfied",

    mixProductWrapper:
      ".amp-bundles__mix-and-match-bundles__product-wrapper",

    mixProductTitle:
      ".amp-bundles__product-tile__title, .amp-bundles__mix-and-match-bundles__product-tile__title",

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


  /* =====================================================
     DEBUG AMP
     Só aparece com ?ampdebug=1
  ===================================================== */

  const AMP_DEBUG_ENABLED =
    new URLSearchParams(
      window.location.search
    ).get("ampdebug") === "1";


  const getDebugStyleValue = (
    element,
    property
  ) => {
    if (!element) {
      return "-";
    }

    return window
      .getComputedStyle(element)
      .getPropertyValue(property)
      .trim();
  };


  const getDebugDimensions =
    element => {
      if (!element) {
        return "-";
      }

      const rect =
        element.getBoundingClientRect();

      return (
        Math.round(rect.width) +
        "×" +
        Math.round(rect.height)
      );
    };


  const createDebugPanel = () => {
    if (!AMP_DEBUG_ENABLED) {
      return null;
    }

    let panel =
      document.getElementById(
        "tn-amp-debug-panel"
      );

    if (panel) {
      return panel;
    }

    panel =
      document.createElement("div");

    panel.id =
      "tn-amp-debug-panel";

    panel.style.cssText = `
      position: fixed;
      left: 10px;
      right: 10px;
      bottom: 10px;
      z-index: 2147483647;
      box-sizing: border-box;
      max-height: 45vh;
      overflow: auto;
      padding: 12px 14px;
      background: rgba(15,15,15,.96);
      color: #fff;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,.35);
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      text-align: left;
      pointer-events: none;
    `;

    document.body.appendChild(
      panel
    );

    return panel;
  };


  const updateDebugPanel = () => {
    if (!AMP_DEBUG_ENABLED) {
      return;
    }

    const panel =
      createDebugPanel();

    if (!panel) {
      return;
    }

    const volumeWidgets =
      Array.from(
        document.querySelectorAll(
          SELECTORS.volumeWidget
        )
      );

    const volumeWidget =
      getBestVolumeWidget();

    const selectedIndex =
      getSelectedVolumeTierIndex(
        volumeWidget
      );

    const mixRoot =
      document.querySelector(
        SELECTORS.mixRoot
      );

    const mixWidget =
      document.querySelector(
        SELECTORS.mixWidget
      );

    const mixRootVisible =
      isVisible(mixRoot);

    const mixWidgetVisible =
      isVisible(mixWidget);

    const productInfo =
      document.querySelector(
        ".wt-product__info"
      );

    const secondTierSelected =
      Boolean(
        productInfo?.querySelector(
          ".amp-bundles__volume-discount-bundles__tier-option:nth-child(2).amp-bundles__volume-discount-bundles__tier-option--selected"
        )
      );


    let diagnosis =
      "Aguardando AMP...";

    if (!volumeWidget) {
      diagnosis =
        "❌ Volume Discount não foi injetado";
    } else if (
      selectedIndex === 1 &&
      !mixRoot
    ) {
      diagnosis =
        "❌ KIT selecionado, mas AMP NÃO criou o root do Mix";
    } else if (
      selectedIndex === 1 &&
      mixRoot &&
      !mixWidget
    ) {
      diagnosis =
        "❌ Root existe, mas AMP NÃO criou o widget do Mix";
    } else if (
      selectedIndex === 1 &&
      mixWidget &&
      !mixWidgetVisible
    ) {
      diagnosis =
        "⚠️ Mix existe no DOM, mas está invisível";
    } else if (
      selectedIndex === 1 &&
      mixWidget &&
      mixWidgetVisible
    ) {
      diagnosis =
        "✅ Mix carregado e visível";
    } else if (
      selectedIndex === 0
    ) {
      diagnosis =
        "ℹ️ 1 unidade selecionada";
    }


    const selectedLabel =
      selectedIndex === 0
        ? "1 unidade"
        : selectedIndex === 1
          ? "Kit com 2"
          : "nenhuma";


    panel.innerHTML = `
      <div style="
        font-size:14px;
        font-weight:700;
        margin-bottom:8px;
      ">
        TN AMP DEBUG
      </div>

      <div style="
        margin-bottom:10px;
        padding:8px 9px;
        background:rgba(255,255,255,.08);
        border-radius:6px;
        font-weight:700;
      ">
        ${diagnosis}
      </div>

      <div>
        <strong>Volume widgets:</strong>
        ${volumeWidgets.length}
      </div>

      <div>
        <strong>Volume encontrado:</strong>
        ${volumeWidget ? "SIM" : "NÃO"}
      </div>

      <div>
        <strong>Selecionado:</strong>
        ${selectedLabel}
      </div>

      <div>
        <strong>2ª opção --selected:</strong>
        ${secondTierSelected ? "SIM" : "NÃO"}
      </div>

      <hr style="
        border:0;
        border-top:1px solid rgba(255,255,255,.15);
        margin:8px 0;
      ">

      <div>
        <strong>Mix root existe:</strong>
        ${mixRoot ? "SIM" : "NÃO"}
      </div>

      <div>
        <strong>Mix root visível:</strong>
        ${mixRootVisible ? "SIM" : "NÃO"}
      </div>

      <div>
        <strong>Root display:</strong>
        ${getDebugStyleValue(
          mixRoot,
          "display"
        )}
      </div>

      <div>
        <strong>Root visibility:</strong>
        ${getDebugStyleValue(
          mixRoot,
          "visibility"
        )}
      </div>

      <div>
        <strong>Root tamanho:</strong>
        ${getDebugDimensions(
          mixRoot
        )}
      </div>

      <hr style="
        border:0;
        border-top:1px solid rgba(255,255,255,.15);
        margin:8px 0;
      ">

      <div>
        <strong>Mix widget existe:</strong>
        ${mixWidget ? "SIM" : "NÃO"}
      </div>

      <div>
        <strong>Mix widget visível:</strong>
        ${mixWidgetVisible ? "SIM" : "NÃO"}
      </div>

      <div>
        <strong>Widget display:</strong>
        ${getDebugStyleValue(
          mixWidget,
          "display"
        )}
      </div>

      <div>
        <strong>Widget visibility:</strong>
        ${getDebugStyleValue(
          mixWidget,
          "visibility"
        )}
      </div>

      <div>
        <strong>Widget opacity:</strong>
        ${getDebugStyleValue(
          mixWidget,
          "opacity"
        )}
      </div>

      <div>
        <strong>Widget tamanho:</strong>
        ${getDebugDimensions(
          mixWidget
        )}
      </div>

      <div style="
        margin-top:8px;
        opacity:.65;
        font-size:10px;
      ">
        ${new Date().toLocaleTimeString()}
      </div>
    `;
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
          Accept:
            "application/json"
        },
        cache:
          "no-store"
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


  const getDrawerSections =
    cartDrawer => {
      if (
        !cartDrawer ||
        typeof cartDrawer
          .getSectionsToRender !==
          "function"
      ) {
        return [];
      }

      return cartDrawer
        .getSectionsToRender()
        .map(
          section =>
            section.id
        )
        .filter(Boolean);
    };


  const parsePositiveInteger =
    value => {
      const match =
        String(
          value || ""
        ).match(/\d+/);

      if (!match) {
        return null;
      }

      const number =
        parseInt(
          match[0],
          10
        );

      return (
        Number.isFinite(
          number
        ) &&
        number > 0
          ? number
          : null
      );
    };


  const parsePercentage =
    value => {
      const match =
        String(
          value || ""
        ).match(
          /(\d+(?:[.,]\d+)?)\s*%/
        );

      if (!match) {
        return 0;
      }

      const number =
        Number(
          match[1].replace(
            ",",
            "."
          )
        );

      if (
        !Number.isFinite(
          number
        ) ||
        number <= 0
      ) {
        return 0;
      }

      return number;
    };


  const isVisible =
    element => {
      if (!element) {
        return false;
      }

      const style =
        window.getComputedStyle(
          element
        );

      return (
        style.display !==
          "none" &&
        style.visibility !==
          "hidden" &&
        element
          .getClientRects()
          .length > 0
      );
    };


  const getBestVolumeWidget =
    () => {
      const widgets =
        Array.from(
          document
            .querySelectorAll(
              SELECTORS.volumeWidget
            )
        );

      if (
        !widgets.length
      ) {
        return null;
      }

      const visibleSelected =
        widgets.find(
          widget =>
            isVisible(
              widget
            ) &&
            Boolean(
              widget.querySelector(
                SELECTORS.selectedVolumeTier
              )
            )
        );

      if (
        visibleSelected
      ) {
        return visibleSelected;
      }

      const selected =
        widgets.find(
          widget =>
            Boolean(
              widget.querySelector(
                SELECTORS.selectedVolumeTier
              )
            )
        );

      return (
        selected ||
        widgets.find(
          isVisible
        ) ||
        widgets[0] ||
        null
      );
    };


  const getBestMixWidget =
    () => {
      const widgets =
        Array.from(
          document
            .querySelectorAll(
              SELECTORS.mixWidget
            )
        );

      if (
        !widgets.length
      ) {
        return null;
      }

      return (
        widgets.find(
          isVisible
        ) ||
        widgets[0] ||
        null
      );
    };


  const getSelectedVolumeTier =
    ampWidget => {
      return ampWidget
        ?.querySelector(
          SELECTORS.selectedVolumeTier
        );
    };


  const getSelectedVolumeTierIndex =
    ampWidget => {
      if (!ampWidget) {
        return -1;
      }

      const tiers =
        Array.from(
          ampWidget
            .querySelectorAll(
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


  const isKitMode =
    () => {
      const volumeWidget =
        getBestVolumeWidget();

      return (
        getSelectedVolumeTierIndex(
          volumeWidget
        ) === 1
      );
    };


  const getVolumeQuantity =
    (
      ampWidget,
      form
    ) => {
      const selectedTier =
        getSelectedVolumeTier(
          ampWidget
        );

      const quantityShown =
        parsePositiveInteger(
          selectedTier
            ?.querySelector(
              SELECTORS.volumeQuantity
            )
            ?.textContent
        );

      if (
        quantityShown
      ) {
        return quantityShown;
      }

      const quantityFromText =
        parsePositiveInteger(
          selectedTier
            ?.querySelector(
              SELECTORS.volumeTierText
            )
            ?.textContent
        );

      if (
        quantityFromText
      ) {
        return quantityFromText;
      }

      const quantityInput =
        form?.querySelector(
          'input[name="quantity"]'
        );

      return (
        parsePositiveInteger(
          quantityInput
            ?.value
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
        selectedTier
          .querySelector(
            SELECTORS.volumeTierBadge
          )
          ?.textContent;

      const fromBadge =
        parsePercentage(
          badgeText
        );

      if (
        fromBadge > 0
      ) {
        return fromBadge;
      }

      return parsePercentage(
        selectedTier
          .textContent
      );
    };


  const syncCartGiftsAfterAdd =
    async () => {
      if (
        typeof window
          .syncCartGifts !==
          "function"
      ) {
        return false;
      }

      const cart =
        await fetchCart();

      return window
        .syncCartGifts(
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
        typeof cartDrawer
          .refresh ===
          "function"
      ) {
        await cartDrawer
          .refresh({
            open: true
          });

        return;
      }

      cartDrawer
        .classList
        .remove(
          "is-empty"
        );

      await wait(150);

      if (
        typeof cartDrawer
          .open ===
          "function"
      ) {
        cartDrawer.open();

        return;
      }

      cartDrawer
        .classList
        .add(
          "active"
        );
    };


  const finalizeCartUpdate =
    async () => {
      await syncCartGiftsAfterAdd();

      await refreshAndOpenCartDrawer();
    };


  /* =====================================================
     MIX & MATCH — PRODUTOS
  ===================================================== */

  const mixSelections =
    new Map();

  const productCache =
    new Map();


  const titleToHandle =
    title => {
      return String(
        title || ""
      )
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .toLowerCase()
        .replace(
          /&/g,
          " e "
        )
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        );
    };


  const getVariantFromProduct =
    async selection => {
      if (
        !selection
          ?.handle
      ) {
        throw new Error(
          "Produto selecionado não identificado."
        );
      }

      if (
        productCache.has(
          selection.handle
        )
      ) {
        return productCache
          .get(
            selection.handle
          );
      }

      const response =
        await fetch(
          `/products/${selection.handle}.js`,
          {
            headers: {
              Accept:
                "application/json"
            },
            cache:
              "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `Não foi possível carregar "${selection.title}".`
        );
      }

      const product =
        await response
          .json();

      const variant =
        product
          ?.variants?.[0];

      if (
        !variant?.id
      ) {
        throw new Error(
          `Variante não encontrada para "${selection.title}".`
        );
      }

      const result = {
        id:
          Number(
            variant.id
          ),
        title:
          selection.title,
        handle:
          selection.handle
      };

      productCache.set(
        selection.handle,
        result
      );

      return result;
    };


  const getMixSectionIndex =
    element => {
      const section =
        element?.closest(
          SELECTORS.mixSection
        );

      const widget =
        element?.closest(
          SELECTORS.mixWidget
        );

      if (
        !section ||
        !widget
      ) {
        return -1;
      }

      const sections =
        Array.from(
          widget
            .querySelectorAll(
              SELECTORS.mixSection
            )
        );

      return sections
        .indexOf(
          section
        );
    };


  const captureMixSelection =
    button => {
      const sectionIndex =
        getMixSectionIndex(
          button
        );

      if (
        sectionIndex < 0
      ) {
        return;
      }

      const wrapper =
        button.closest(
          SELECTORS.mixProductWrapper
        );

      if (!wrapper) {
        return;
      }

      const title =
        wrapper
          .querySelector(
            SELECTORS.mixProductTitle
          )
          ?.textContent
          ?.trim();

      if (!title) {
        return;
      }

      mixSelections.set(
        sectionIndex,
        {
          title,
          handle:
            titleToHandle(
              title
            )
        }
      );
    };


  const clearMixSelection =
    button => {
      const sectionIndex =
        getMixSectionIndex(
          button
        );

      if (
        sectionIndex >= 0
      ) {
        mixSelections.delete(
          sectionIndex
        );
      }
    };


  /* =====================================================
     INTERFACE AMP
  ===================================================== */

  const setTextIfDifferent =
    (
      element,
      text
    ) => {
      if (
        element &&
        element
          .textContent
          .trim() !== text
      ) {
        element
          .textContent =
          text;
      }
    };


  const decorateVolumeDiscount =
    volumeWidget => {
      if (
        !volumeWidget
      ) {
        return;
      }

      const tiers =
        Array.from(
          volumeWidget
            .querySelectorAll(
              SELECTORS.volumeTier
            )
        );

      if (tiers[0]) {
        setTextIfDifferent(
          tiers[0]
            .querySelector(
              SELECTORS.volumeTierText
            ),
          "1 unidade"
        );
      }

      if (tiers[1]) {
        setTextIfDifferent(
          tiers[1]
            .querySelector(
              SELECTORS.volumeTierText
            ),
          "Kit com 2"
        );
      }
    };


  const decorateMixAndMatch =
    mixWidget => {
      if (!mixWidget) {
        return;
      }

      setTextIfDifferent(
        mixWidget
          .querySelector(
            SELECTORS.mixHeadline
          ),
        "Escolha os sabores"
      );

      const sections =
        Array.from(
          mixWidget
            .querySelectorAll(
              SELECTORS.mixSection
            )
        );

      if (sections[0]) {
        setTextIfDifferent(
          sections[0]
            .querySelector(
              SELECTORS.mixSectionName
            ),
          "1º sabor"
        );
      }

      if (sections[1]) {
        setTextIfDifferent(
          sections[1]
            .querySelector(
              SELECTORS.mixSectionName
            ),
          "2º sabor"
        );
      }

      mixWidget
        .querySelectorAll(
          SELECTORS.mixToggleButton
        )
        .forEach(
          button => {
            setTextIfDifferent(
              button,
              "Escolher"
            );

            button
              .setAttribute(
                "aria-label",
                "Escolher sabor"
              );
          }
        );

      mixWidget
        .querySelectorAll(
          SELECTORS.mixRemoveButton
        )
        .forEach(
          button => {
            setTextIfDifferent(
              button,
              "Trocar"
            );

            button
              .setAttribute(
                "aria-label",
                "Trocar sabor"
              );
          }
        );

      const cta =
        mixWidget
          .querySelector(
            SELECTORS.mixCta
          );

      if (cta) {
        const inner =
          cta.querySelector(
            "div"
          );

        setTextIfDifferent(
          inner || cta,
          "Adicionar 2 ao carrinho"
        );
      }
    };


  /* =====================================================
     AUTO-ABERTURA MIX
  ===================================================== */

  const mixState = {
    firstOpened: false,
    secondAutoOpened: false,
    autoCollapsed: false
  };


  const isSectionSatisfied =
    section => {
      return Boolean(
        section
          ?.querySelector(
            SELECTORS.mixSatisfiedProgress
          )
      );
    };


  const openSection =
    section => {
      const header =
        section
          ?.querySelector(
            SELECTORS.mixSectionHeader
          );

      if (
        header &&
        header
          .getAttribute(
            "aria-expanded"
          ) !== "true"
      ) {
        header.click();
      }
    };


  const closeSection =
    section => {
      const header =
        section
          ?.querySelector(
            SELECTORS.mixSectionHeader
          );

      if (
        header &&
        header
          .getAttribute(
            "aria-expanded"
          ) === "true"
      ) {
        header.click();
      }
    };


  const resetMixState =
    () => {
      mixSelections.clear();

      mixState.firstOpened =
        false;

      mixState.secondAutoOpened =
        false;

      mixState.autoCollapsed =
        false;
    };


  const handleMixAndMatchSteps =
    mixWidget => {
      if (
        !isKitMode() ||
        !mixWidget
      ) {
        return;
      }

      const sections =
        Array.from(
          mixWidget
            .querySelectorAll(
              SELECTORS.mixSection
            )
        );

      if (
        sections.length < 2
      ) {
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


      if (
        !firstSatisfied &&
        !mixState
          .firstOpened
      ) {
        mixState.firstOpened =
          true;

        mixState.secondAutoOpened =
          false;

        window
          .setTimeout(
            () => {
              openSection(
                first
              );
            },
            60
          );

        return;
      }


      if (
        !firstSatisfied
      ) {
        mixState.secondAutoOpened =
          false;

        mixState.autoCollapsed =
          false;

        return;
      }


      if (
        firstSatisfied &&
        !secondSatisfied &&
        !mixState
          .secondAutoOpened
      ) {
        mixState.secondAutoOpened =
          true;

        window
          .setTimeout(
            () => {
              openSection(
                second
              );
            },
            80
          );

        return;
      }


      if (
        firstSatisfied &&
        secondSatisfied &&
        !mixState
          .autoCollapsed
      ) {
        mixState.autoCollapsed =
          true;

        window
          .setTimeout(
            () => {
              closeSection(
                second
              );
            },
            180
          );
      }
    };


  /* =====================================================
     CAPTURA ESCOLHAS MIX
  ===================================================== */

  document.addEventListener(
    "click",
    event => {
      const chooseButton =
        event.target
          .closest(
            SELECTORS.mixToggleButton
          );

      if (
        chooseButton
      ) {
        captureMixSelection(
          chooseButton
        );

        return;
      }

      const removeButton =
        event.target
          .closest(
            SELECTORS.mixRemoveButton
          );

      if (
        removeButton
      ) {
        clearMixSelection(
          removeButton
        );
      }
    },
    true
  );


  /* =====================================================
     MIX — ADICIONAR AO CARRINHO
  ===================================================== */

  document.addEventListener(
    "click",
    async event => {
      const button =
        event.target
          .closest(
            SELECTORS.mixCta
          );

      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();


      if (
        button.disabled ||
        button
          .getAttribute(
            "aria-disabled"
          ) === "true" ||
        button.dataset
          .tnMixAdding ===
          "true"
      ) {
        return;
      }


      const firstSelection =
        mixSelections.get(0);

      const secondSelection =
        mixSelections.get(1);


      if (
        !firstSelection ||
        !secondSelection
      ) {
        alert(
          "Escolha os dois sabores antes de adicionar ao carrinho."
        );

        return;
      }


      button.dataset
        .tnMixAdding =
        "true";

      button.disabled =
        true;

      button
        .setAttribute(
          "aria-disabled",
          "true"
        );


      const originalContent =
        button.innerHTML;

      button.innerHTML =
        "<div>ADICIONANDO...</div>";


      try {

        const [
          firstVariant,
          secondVariant
        ] =
          await Promise.all([
            getVariantFromProduct(
              firstSelection
            ),
            getVariantFromProduct(
              secondSelection
            )
          ]);


        const quantities =
          new Map();


        [
          firstVariant.id,
          secondVariant.id
        ].forEach(
          id => {
            quantities.set(
              id,
              (
                quantities.get(
                  id
                ) || 0
              ) + 1
            );
          }
        );


        const items =
          Array.from(
            quantities.entries()
          ).map(
            ([
              id,
              quantity
            ]) => ({
              id,
              quantity,

              properties: {
                _tn_amp_campaign:
                  "volume_discount",

                _tn_amp_discount_percent:
                  "10",

                _tn_amp_group:
                  "volume_2"
              }
            })
          );


        const response =
          await fetch(
            window.routes
              ?.cart_add_url ||
              "/cart/add.js",
            {
              method:
                "POST",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",

                "X-Requested-With":
                  "XMLHttpRequest"
              },

              body:
                JSON.stringify({
                  items
                })
            }
          );


        const data =
          await response
            .json();


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


        await finalizeCartUpdate();


      } catch (error) {

        console.error(
          "Erro ao adicionar Mix & Match:",
          error
        );

        alert(
          error.message ||
            "Não foi possível adicionar os produtos ao carrinho."
        );


      } finally {

        delete button.dataset
          .tnMixAdding;

        button.disabled =
          false;

        button
          .removeAttribute(
            "aria-disabled"
          );

        button.innerHTML =
          originalContent;
      }
    },
    true
  );


  /* =====================================================
     TROCA DE OPÇÃO DO VOLUME
  ===================================================== */

  document.addEventListener(
    "click",
    event => {
      const tier =
        event.target
          .closest(
            SELECTORS.volumeTier
          );

      if (!tier) {
        return;
      }

      resetMixState();

      window.setTimeout(
        scheduleSync,
        60
      );
    },
    true
  );


  /* =====================================================
     SINCRONIZAÇÃO AMP
  ===================================================== */

  let syncTimer =
    null;


  const syncUI =
    () => {
      document
        .querySelectorAll(
          SELECTORS.volumeWidget
        )
        .forEach(
          decorateVolumeDiscount
        );


      document
        .querySelectorAll(
          SELECTORS.mixWidget
        )
        .forEach(
          decorateMixAndMatch
        );


      const mixWidget =
        getBestMixWidget();

      if (mixWidget) {
        handleMixAndMatchSteps(
          mixWidget
        );
      }


      /*
        DEBUG:
        só executa quando a URL
        possui ?ampdebug=1
      */
      if (
        AMP_DEBUG_ENABLED
      ) {
        updateDebugPanel();
      }
    };


  const scheduleSync =
    () => {
      window.clearTimeout(
        syncTimer
      );

      syncTimer =
        window.setTimeout(
          syncUI,
          40
        );
    };


  const pageObserver =
    new MutationObserver(
      scheduleSync
    );


  pageObserver.observe(
    document.documentElement,
    {
      subtree:
        true,

      childList:
        true,

      attributes:
        true,

      attributeFilter: [
        "class",
        "aria-expanded",
        "disabled",
        "checked"
      ]
    }
  );


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        syncUI();

        if (
          AMP_DEBUG_ENABLED
        ) {
          createDebugPanel();
          updateDebugPanel();
        }
      },
      {
        once: true
      }
    );

  } else {

    syncUI();

    if (
      AMP_DEBUG_ENABLED
    ) {
      createDebugPanel();
      updateDebugPanel();
    }
  }


  /* =====================================================
     VOLUME — 1 UNIDADE
  ===================================================== */

  document.addEventListener(
    "click",
    async event => {
      const button =
        event.target
          .closest(
            SELECTORS.productButton
          );

      if (!button) {
        return;
      }


      if (
        isKitMode()
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

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

      if (!ampWidget) {
        return;
      }


      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();


      if (
        button.dataset
          .tnAmpAdding ===
          "true"
      ) {
        return;
      }


      const cartDrawer =
        getCartDrawer();

      if (!cartDrawer) {
        return;
      }


      button.dataset
        .tnAmpAdding =
        "true";

      button
        .setAttribute(
          "aria-disabled",
          "true"
        );

      button
        .classList
        .add(
          "loading"
        );


      const loader =
        button
          .querySelector(
            ".loading-overlay__spinner"
          );

      loader
        ?.classList
        .remove(
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
          new FormData(
            form
          );


        formData.set(
          "quantity",
          String(
            quantity
          )
        );


        if (
          discountPercent > 0
        ) {

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
          form
            .querySelector(
              'input[name="quantity"]'
            );

        if (
          quantityInput
        ) {
          quantityInput.value =
            String(
              quantity
            );
        }


        const sectionIds =
          getDrawerSections(
            cartDrawer
          );

        if (
          sectionIds.length
        ) {
          formData.set(
            "sections",
            sectionIds.join(
              ","
            )
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
              method:
                "POST",

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
          await response
            .json();


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

        button
          .removeAttribute(
            "aria-disabled"
          );

        button
          .classList
          .remove(
            "loading"
          );

        loader
          ?.classList
          .add(
            "hidden"
          );
      }
    },
    true
  );


  /* =====================================================
     CLASSIC BUNDLE — SACHÊS
  ===================================================== */

  const addClassicBundleToCart =
    async () => {
      const payload = {
        items:
          SACHET_BUNDLE_ITEMS
            .map(
              item => ({
                id:
                  item.id,

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


      const response =
        await fetch(
          window.routes
            ?.cart_add_url ||
            "/cart/add.js",
          {
            method:
              "POST",

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
        await response
          .json();


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
        event.target
          .closest(
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


      button.dataset
        .tnBundleAdding =
        "true";

      button.disabled =
        true;

      button
        .setAttribute(
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

        button.disabled =
          false;

        button
          .removeAttribute(
            "aria-disabled"
          );

        button.innerHTML =
          originalContent;
      }
    },
    true
  );

})();