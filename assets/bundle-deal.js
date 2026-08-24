/**
 * <bundle-deal> — bundle com desconto progressivo da página de produto.
 *
 * Cada `[data-bundle-option]` é um "leve N" com sua própria porcentagem de
 * desconto. Ao escolher uma opção de mais de 1 unidade, abre a lista de
 * produtos vinda do metafield `custom.itens_do_bundle` e a pessoa monta os
 * sabores (no máximo N itens). O que sobrar do N vira o produto/variante atual.
 *
 * Tudo é enviado numa única chamada `/cart/add.js` (`items: [...]`) e, se a
 * opção tiver código de desconto, ele é aplicado na sessão antes de abrir o
 * carrinho.
 *
 * A markup vive em `snippets/bundle-deal.liquid`.
 */
if (!customElements.get('bundle-deal')) {
  customElements.define(
    'bundle-deal',
    class BundleDeal extends HTMLElement {
      connectedCallback() {
        this.basePrice = parseInt(this.dataset.basePrice, 10) || 0;
        this.variantId = Number(this.dataset.variantId) || null;

        this.options = Array.from(this.querySelectorAll('[data-bundle-option]'));
        this.submitButton = this.querySelector('[data-bundle-submit]');
        this.errorEl = this.querySelector('[data-bundle-error]');
        this.spinner = this.querySelector('.loading-overlay__spinner');

        // Garante que sempre exista uma opção marcada.
        if (this.options.length && !this.checkedRadio) {
          this.options[0].querySelector('[data-bundle-radio]').checked = true;
        }

        this.addEventListener('click', this.onClick.bind(this));
        this.addEventListener('change', this.onChange.bind(this));
        this.listenToVariantChange();

        this.update();
      }

      disconnectedCallback() {
        if (this.unsubscribeVariantChange) this.unsubscribeVariantChange();
      }

      /** Acompanha o seletor de variantes da seção para recalcular os preços. */
      listenToVariantChange() {
        if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;

        this.unsubscribeVariantChange = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
          const { sectionId, variant } = event.data || {};
          if (sectionId && this.dataset.sectionId && sectionId !== this.dataset.sectionId) return;
          if (!variant) return;

          this.basePrice = variant.price;
          this.variantId = variant.id;
          this.syncMainItems(variant);
          this.update();
        });
      }

      /**
       * O card do produto da página não tem select próprio: ele segue o seletor
       * de variantes da seção.
       */
      syncMainItems(variant) {
        this.querySelectorAll('[data-bundle-main]').forEach((item) => {
          item.dataset.variantId = variant.id;
          item.dataset.price = variant.price;
          item.dataset.available = variant.available ? 'true' : 'false';

          if (!variant.available) item.dataset.qty = 0;
          item.classList.toggle('bundle-deal__product--sold-out', !variant.available);
          item.querySelector('[data-bundle-select]').disabled = !variant.available;

          const image = item.querySelector('.bundle-deal__product-image');
          const source = variant.featured_image || variant.featured_media?.preview_image;
          if (image && source?.src) {
            image.removeAttribute('srcset');
            image.src = `${source.src}${source.src.includes('?') ? '&' : '?'}width=240`;
          }
        });
      }

      // — estado ————————————————————————————————————————————————————————

      /** Exige que a pessoa preencha todas as vagas da opção antes de comprar. */
      get requireFull() {
        return this.dataset.requireFull !== 'false';
      }

      get checkedRadio() {
        return this.querySelector('[data-bundle-radio]:checked');
      }

      get selectedOption() {
        return this.checkedRadio?.closest('[data-bundle-option]') || this.options[0] || null;
      }

      quantityOf(option) {
        return parseInt(option?.dataset.quantity, 10) || 1;
      }

      discountOf(option) {
        return parseFloat(option?.dataset.discount) || 0;
      }

      itemsOf(option) {
        return Array.from(option?.querySelectorAll('[data-bundle-item]') || []);
      }

      qtyOf(item) {
        return parseInt(item.dataset.qty, 10) || 0;
      }

      /** Preço da variante escolhida na linha (o select de sabor manda). */
      priceOf(item) {
        const select = item.querySelector('[data-bundle-variant-select]');
        const chosen = select?.selectedOptions?.[0];
        return parseInt(chosen?.dataset.price ?? item.dataset.price, 10) || 0;
      }

      variantIdOf(item) {
        const select = item.querySelector('[data-bundle-variant-select]');
        return Number(select?.value || item.dataset.variantId);
      }

      /** Quantas unidades ainda cabem na opção. */
      remainingOf(option) {
        const used = this.itemsOf(option).reduce((sum, item) => sum + this.qtyOf(item), 0);
        return Math.max(0, this.quantityOf(option) - used);
      }

      selectionOf(option) {
        return this.itemsOf(option)
          .filter((item) => item.dataset.available === 'true' && this.qtyOf(item) > 0)
          .map((item) => ({
            id: this.variantIdOf(item),
            quantity: this.qtyOf(item),
            price: this.priceOf(item),
          }));
      }

      // — interação —————————————————————————————————————————————————————

      onClick(event) {
        if (event.target.closest('[data-bundle-submit]')) {
          this.onSubmit();
          return;
        }

        const item = event.target.closest('[data-bundle-item]');
        if (!item || item.dataset.available !== 'true') return;

        const option = item.closest('[data-bundle-option]');
        const current = this.qtyOf(item);

        if (event.target.closest('[data-bundle-decrease]')) {
          this.setQty(item, current - 1);
        } else if (event.target.closest('[data-bundle-increase]')) {
          this.setQty(item, current + 1, option);
        } else if (event.target.closest('[data-bundle-select]')) {
          // Clique no card soma 1 (dá para repetir o mesmo sabor até o limite).
          // Sem espaço sobrando, o clique zera a linha e libera as vagas.
          const room = this.remainingOf(option);
          this.setQty(item, room > 0 ? current + 1 : 0, option);
        } else {
          return;
        }

        this.update();
      }

      onChange(event) {
        if (event.target.matches('[data-bundle-radio]')) {
          this.update();
          return;
        }

        if (event.target.matches('[data-bundle-variant-select]')) this.update();
      }

      /** Grava a quantidade da linha respeitando o teto da opção. */
      setQty(item, value, option) {
        let next = Math.max(0, value);

        if (option && next > this.qtyOf(item)) {
          const max = this.quantityOf(option);
          const others = this.itemsOf(option)
            .filter((other) => other !== item)
            .reduce((sum, other) => sum + this.qtyOf(other), 0);
          next = Math.min(next, Math.max(0, max - others));
        }

        item.dataset.qty = next;
      }

      // — render ————————————————————————————————————————————————————————

      update() {
        const selected = this.selectedOption;

        this.options.forEach((option) => {
          const isSelected = option === selected;
          option.dataset.active = isSelected ? 'true' : 'false';

          const picker = option.querySelector('[data-bundle-picker]');
          if (picker) picker.hidden = !isSelected;

          this.updatePrices(option);
          this.updateItems(option);
        });

        this.updateSubmit(selected);
        this.showError(false);
      }

      /** Trava o botão enquanto faltar produto para fechar a opção escolhida. */
      updateSubmit(option) {
        if (!this.submitButton) return;

        const locked = this.requireFull && this.isIncomplete(option);
        this.submitButton.disabled = locked;
        this.dataset.complete = locked ? 'false' : 'true';
      }

      /** Só cobra seleção completa de opções que realmente têm produtos para escolher. */
      isIncomplete(option) {
        if (!option || !this.itemsOf(option).length) return false;
        return this.remainingOf(option) > 0;
      }

      /**
       * Preço cheio da opção: os itens escolhidos no metacampo valem o próprio
       * preço, e as vagas que sobraram valem a variante atual da página.
       */
      subtotalOf(option) {
        const items = this.itemsOf(option);
        if (!items.length) return this.basePrice * this.quantityOf(option);

        const chosen = items.reduce((sum, item) => sum + this.priceOf(item) * this.qtyOf(item), 0);
        return chosen + this.remainingOf(option) * this.basePrice;
      }

      updatePrices(option) {
        const compare = this.subtotalOf(option);
        const total = Math.round((compare * (100 - this.discountOf(option))) / 100);

        const compareEl = option.querySelector('[data-bundle-compare]');
        const totalEl = option.querySelector('[data-bundle-total]');

        if (compareEl) compareEl.textContent = this.formatMoney(compare);
        if (totalEl) totalEl.textContent = this.formatMoney(total);
      }

      updateItems(option) {
        const items = this.itemsOf(option);
        if (!items.length) return;

        const max = this.quantityOf(option);
        const total = items.reduce((sum, item) => sum + this.qtyOf(item), 0);
        const remaining = this.remainingOf(option);

        items.forEach((item) => {
          const qty = this.qtyOf(item);
          const countEl = item.querySelector('[data-bundle-count]');
          const stepper = item.querySelector('[data-bundle-stepper]');
          const qtyEl = item.querySelector('[data-bundle-qty]');
          const button = item.querySelector('[data-bundle-select]');

          item.dataset.selected = qty > 0 ? 'true' : 'false';
          button?.setAttribute('aria-pressed', qty > 0 ? 'true' : 'false');

          if (countEl) {
            countEl.textContent = qty;
            countEl.hidden = qty === 0;
          }

          if (stepper) stepper.hidden = qty === 0;
          if (qtyEl) qtyEl.textContent = qty;

          const increase = item.querySelector('[data-bundle-increase]');
          if (increase) increase.disabled = remaining === 0;
        });

        const statusEl = option.querySelector('[data-bundle-status]');
        if (statusEl) {
          statusEl.textContent = remaining
            ? (this.dataset.textRemaining || 'Escolha até mais [count] item(ns)')
                .replace('[count]', remaining)
                .replace('[total]', total)
                .replace('[max]', max)
            : (this.dataset.textComplete || '[max] de [max] selecionados')
                .replace('[total]', total)
                .replace('[max]', max);
          statusEl.dataset.complete = remaining === 0 ? 'true' : 'false';
        }

        // Sem exigir seleção completa, o que sobrar vira o produto da página.
        const restEl = option.querySelector('[data-bundle-rest]');
        if (restEl) {
          restEl.hidden = remaining === 0 || this.requireFull;
          restEl.textContent = (this.dataset.textRest || '[count]x [product] (opção atual)')
            .replace('[count]', remaining)
            .replace('[product]', this.dataset.productTitle || '');
        }
      }

      formatMoney(cents) {
        const currency = this.dataset.currency || window.Shopify?.currency?.active || 'BRL';
        try {
          return new Intl.NumberFormat(document.documentElement.lang || 'pt-BR', {
            style: 'currency',
            currency,
          }).format(cents / 100);
        } catch (e) {
          return `${(cents / 100).toFixed(2)} ${currency}`;
        }
      }

      showError(message) {
        if (!this.errorEl) return;
        this.errorEl.textContent = message || '';
        this.errorEl.toggleAttribute('hidden', !message);
      }

      setLoading(loading) {
        this.submitButton?.classList.toggle('loading', loading);
        this.submitButton?.setAttribute('aria-disabled', loading);
        this.spinner?.classList.toggle('hidden', !loading);
      }

      // — envio —————————————————————————————————————————————————————————

      async onSubmit() {
        const option = this.selectedOption;
        if (!option) return;

        const quantity = this.quantityOf(option);
        const selection = this.selectionOf(option);
        const chosen = selection.reduce((sum, line) => sum + line.quantity, 0);
        const remaining = Math.max(0, quantity - chosen);
        const label = option.dataset.label || `Leve ${quantity}`;

        if (this.requireFull && this.isIncomplete(option)) {
          this.showError(
            (this.dataset.textError || 'Selecione os [max] produtos para continuar.')
              .replace('[count]', remaining)
              .replace('[total]', chosen)
              .replace('[max]', quantity)
          );
          return;
        }

        const items = selection.map(({ id, quantity: qty }) => ({
          id,
          quantity: qty,
          properties: { _bundle: label },
        }));

        if (remaining > 0 && this.variantId) {
          items.unshift({
            id: this.variantId,
            quantity: remaining,
            properties: { _bundle: label },
          });
        }

        if (!items.length) {
          this.showError('Selecione ao menos um produto.');
          return;
        }

        this.showError(false);
        this.setLoading(true);

        try {
          const response = await fetch(window.routes?.cart_add_url || '/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ items }),
          });
          const data = await response.json();

          if (!response.ok || data.status) {
            this.showError(data.description || data.message || 'Não foi possível adicionar o bundle.');
            return;
          }

          await this.applyDiscount(option.dataset.discountCode);
          await this.afterAdd();
          this.reset();
        } catch (e) {
          console.error('[bundle-deal] Erro ao adicionar o bundle:', e);
          this.showError('Não foi possível adicionar o bundle. Tente novamente.');
        } finally {
          this.setLoading(false);
        }
      }

      /** Guarda o código de desconto da opção na sessão do checkout. */
      async applyDiscount(code) {
        if (!code) return;

        try {
          await fetch(`/discount/${encodeURIComponent(code)}`, { credentials: 'same-origin' });
        } catch (e) {
          console.error('[bundle-deal] Erro ao aplicar o desconto:', e);
        }
      }

      /** Avisa o tema e abre/atualiza o carrinho. */
      async afterAdd() {
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'bundle-deal' });
        }

        // Brindes (Compre X Leve Y / níveis) vivem em cart-drawer.js.
        if (typeof window.syncCartGifts === 'function') {
          try {
            const cart = await fetch('/cart.js').then((r) => r.json());
            await window.syncCartGifts(cart.items || []);
          } catch (e) {
            console.error('[bundle-deal] Erro ao sincronizar brindes:', e);
          }
        }

        const drawer = document.querySelector('cart-drawer');
        if (drawer && typeof drawer.refresh === 'function') {
          await drawer.refresh({ open: true });
          return;
        }

        window.location = window.routes?.cart_url || '/cart';
      }

      reset() {
        this.options.forEach((option) => {
          this.itemsOf(option).forEach((item) => {
            item.dataset.qty = 0;
          });
        });
        this.update();
      }
    }
  );
}
