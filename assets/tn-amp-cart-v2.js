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

    cartDrawer:
      "cart-drawer"
  };

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

  /*
   * Gera uma assinatura do estado atual do
   * carrinho para detectar quando o AMP
   * terminou de adicionar o kit.
   */
  const getCartSignature = cart => {
    if (!cart) {
      return "";
    }

    const itemsSignature = (
      cart.items || []
    )
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
      itemsSignature
    ].join("::");
  };

  /*
   * Aguarda o AMP atualizar o carrinho.
   *
   * Não adicionamos nenhum produto aqui.
   * Apenas observamos o resultado da ação
   * nativa do AMP.
   */
  const waitForCartChange = async (
    previousCart,
    options = {}
  ) => {
    const attempts =
      options.attempts || 24;

    const interval =
      options.interval || 250;

    const previousSignature =
      getCartSignature(previousCart);

    for (
      let attempt = 0;
      attempt < attempts;
      attempt += 1
    ) {
      await wait(interval);

      try {
        const currentCart =
          await fetchCart();

        const currentSignature =
          getCartSignature(currentCart);

        if (
          currentSignature !==
          previousSignature
        ) {
          return currentCart;
        }
      } catch (error) {
        console.warn(
          "Ainda não foi possível consultar o carrinho:",
          error
        );
      }
    }

    return null;
  };

  /*
   * Executa a sincronização dos brindes
   * após os produtos serem adicionados.
   *
   * O cart-drawer.js deve expor:
   *
   * window.syncCartGifts = syncCartGifts;
   */
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

  /*
   * Atualiza e abre o carrinho lateral
   * usando o método nativo do tema.
   */
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

  /*
   * Após uma inclusão:
   *
   * 1. sincroniza os brindes;
   * 2. atualiza o conteúdo;
   * 3. abre o carrinho lateral.
   */
  const finalizeCartUpdate =
    async cart => {
      await syncCartGiftsAfterAdd(
        cart
      );

      await refreshAndOpenCartDrawer();
    };

  /* =====================================================
     VOLUME DISCOUNT
     LEVE 1 OU LEVE 2
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

      /*
       * O Volume Discount continua sendo
       * adicionado manualmente porque ele
       * usa o botão principal do produto.
       */
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

  /*
   * IMPORTANTE:
   *
   * Este listener NÃO cancela o clique.
   * Ele NÃO adiciona produtos manualmente.
   *
   * O AMP continua responsável por:
   *
   * - adicionar os seis sachês;
   * - aplicar os 5%;
   * - criar a propriedade do bundle;
   * - controlar as quantidades.
   *
   * Nosso código apenas observa a mudança
   * e atualiza o carrinho lateral.
   */
  document.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          SELECTORS.classicButton
        );

      if (!button) {
        return;
      }

      if (
        button.dataset
          .tnBundleWatching ===
        "true"
      ) {
        return;
      }

      button.dataset
        .tnBundleWatching =
        "true";

      /*
       * A consulta é iniciada durante a
       * captura do clique, antes de o AMP
       * concluir a inclusão.
       */
      const previousCartPromise =
        fetchCart().catch(error => {
          console.warn(
            "Não foi possível obter o estado anterior do carrinho:",
            error
          );

          return null;
        });

      /*
       * O setTimeout permite que o listener
       * nativo do AMP execute primeiro.
       */
      window.setTimeout(
        async () => {
          try {
            const previousCart =
              await previousCartPromise;

            /*
             * Quando não foi possível obter
             * o carrinho anterior, espera um
             * pouco e usa o estado atual.
             */
            if (!previousCart) {
              await wait(900);

              const currentCart =
                await fetchCart();

              await finalizeCartUpdate(
                currentCart
              );

              return;
            }

            const updatedCart =
              await waitForCartChange(
                previousCart,
                {
                  attempts: 24,
                  interval: 250
                }
              );

            if (!updatedCart) {
              console.warn(
                "O AMP não alterou o carrinho dentro do tempo esperado."
              );

              return;
            }

            await finalizeCartUpdate(
              updatedCart
            );
          } catch (error) {
            /*
             * Não mostramos alerta aqui,
             * pois erros da própria campanha
             * devem ser exibidos pelo AMP.
             */
            console.error(
              "Erro ao atualizar o carrinho após o Kit Sachês:",
              error
            );
          } finally {
            delete button.dataset
              .tnBundleWatching;
          }
        },
        0
      );
    },
    true
  );
})();