/**
 * <kit-choice> — kit com itens fixos e etapas de escolha de sabor.
 *
 * Cada `[data-kit-slot]` é uma etapa do kit:
 *   - `data-type="fixed"`: o item já vem escolhido (a pessoa só vê o que entra);
 *   - `data-type="choice"`: a pessoa escolhe `data-quantity` itens da lista
 *     (pode repetir o mesmo sabor).
 *
 * O botão só libera quando todas as etapas de escolha estão completas. No envio,
 * o bloco manda cada item do kit como uma linha (`_kit`) ou manda o produto da
 * página com as escolhas nas propriedades da linha, conforme `data-cart-mode`.
 *
 * A markup vive em `snippets/kit-choice.liquid`.
 */
if (!customElements.get('kit-choice')) {
  customElements.define(
    'kit-choice',
    class KitChoice extends HTMLElement {
      connectedCallback() {
        this.basePrice = parseInt(this.dataset.basePrice, 10) || 0;
        this.variantId = Number(this.dataset.variantId) || null;

        this.slots = Array.from(this.querySelectorAll('[data-kit-slot]'));
        this.submitButton = this.querySelector('[data-kit-submit]');
        this.errorEl = this.querySelector('[data-kit-error]');
        this.spinner = this.querySelector('.loading-overlay__spinner');
        this.compareEl = this.querySelector('[data-kit-compare]');
        this.totalEl = this.querySelector('[data-kit-total]');

        this.addEventListener('click', this.onClick.bind(this));
        this.addEventListener('change', this.onChange.bind(this));
        this.listenToVariantChange();

        this.update();
      }

      disconnectedCallback() {
        if (this.unsubscribeVariantChange) this.unsubscribeVariantChange();
      }

      /** No modo "produto da página", o preço do kit segue o seletor da seção. */
      listenToVariantChange() {
        if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;

        this.unsubscribeVariantChange = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
          const { sectionId, variant } = event.data || {};
          if (sectionId && this.dataset.sectionId && sectionId !== this.dataset.sectionId) return;
          if (!variant) return;

          this.basePrice = variant.price;
          this.variantId = variant.id;
          this.update();
        });
      }

      // — estado ————————————————————————————————————————————————————————

      get cartMode() {
        return this.dataset.cartMode === 'page' ? 'page' : 'components';
      }

      get requireChoice() {
        return this.dataset.requireChoice !== 'false';
      }

      get discount() {
        return parseFloat(this.dataset.discount) || 0;
      }

      isChoice(slot) {
        return slot.dataset.type !== 'fixed';
      }

      quantityOf(slot) {
        return parseInt(slot.dataset.quantity, 10) || 1;
      }

      /** Preço de referência das vagas que ainda não foram escolhidas. */
      placeholderOf(slot) {
        return parseInt(slot.dataset.placeholderPrice, 10) || 0;
      }

      itemsOf(slot) {
        return Array.from(slot.querySelectorAll('[data-kit-item]'));
      }

      qtyOf(item) {
        return parseInt(item.dataset.qty, 10) || 0;
      }

      /** O seletor de sabor do card, quando existe, manda no preço e no id. */
      chosenOptionOf(item) {
        return item.querySelector('[data-kit-variant-select]')?.selectedOptions?.[0] || null;
      }

      priceOf(item) {
        const chosen = this.chosenOptionOf(item);
        return parseInt(chosen?.dataset.price ?? item.dataset.price, 10) || 0;
      }

      variantIdOf(item) {
        const select = item.querySelector('[data-kit-variant-select]');
        return Number(select?.value || item.dataset.variantId);
      }

      titleOf(item) {
        return this.chosenOptionOf(item)?.dataset.title || item.dataset.title || '';
      }

      /** Quantas unidades ainda faltam para fechar a etapa. */
      remainingOf(slot) {
        const used = this.itemsOf(slot).reduce((sum, item) => sum + this.qtyOf(item), 0);
        return Math.max(0, this.quantityOf(slot) - used);
      }

      linesOf(slot) {
        return this.itemsOf(slot)
          .filter((item) => item.dataset.available === 'true' && this.qtyOf(item) > 0)
          .map((item) => ({
            id: this.variantIdOf(item),
            quantity: this.qtyOf(item),
            price: this.priceOf(item),
            title: this.titleOf(item),
          }));
      }

      incompleteSlots() {
        return this.slots.filter((slot) => this.isChoice(slot) && this.remainingOf(slot) > 0);
      }

      soldOutFixed() {
        return this.slots.filter(
          (slot) => !this.isChoice(slot) && slot.querySelector('[data-kit-fixed][data-available="false"]')
        );
      }

      // — interação —————————————————————————————————————————————————————

      onClick(event) {
        if (event.target.closest('[data-kit-submit]')) {
          this.onSubmit();
          return;
        }

        const button = event.target.closest('[data-kit-select]');
        if (!button) return;

        const item = button.closest('[data-kit-item]');
        if (!item || item.dataset.available !== 'true') return;

        const slot = item.closest('[data-kit-slot]');
        const current = this.qtyOf(item);
        const room = this.remainingOf(slot);

        if (room > 0) {
          // Ainda há vaga: soma 1 (dá para repetir o mesmo sabor).
          this.setQty(item, current + 1, slot);
        } else if (current > 0) {
          // Etapa cheia: clicar no que já está escolhido libera a vaga.
          item.dataset.qty = 0;
        } else if (this.quantityOf(slot) === 1) {
          // Etapa de 1 item: clicar em outro sabor troca a escolha.
          this.itemsOf(slot).forEach((other) => {
            other.dataset.qty = 0;
          });
          item.dataset.qty = 1;
        }

        this.update();
      }

      onChange(event) {
        if (event.target.matches('[data-kit-variant-select]')) this.update();
      }

      setQty(item, value, slot) {
        let next = Math.max(0, value);

        if (slot && next > this.qtyOf(item)) {
          const max = this.quantityOf(slot);
          const others = this.itemsOf(slot)
            .filter((other) => other !== item)
            .reduce((sum, other) => sum + this.qtyOf(other), 0);
          next = Math.min(next, Math.max(0, max - others));
        }

        item.dataset.qty = next;
      }

      // — render ————————————————————————————————————————————————————————

      update() {
        this.slots.forEach((slot) => this.updateSlot(slot));
        this.updateTotals();
        this.updateSubmit();
        this.showError(false);
      }

      updateSlot(slot) {
        const items = this.itemsOf(slot);
        const max = this.quantityOf(slot);
        const remaining = this.remainingOf(slot);
        const total = max - remaining;

        slot.dataset.complete = remaining === 0 ? 'true' : 'false';
        if (remaining === 0) delete slot.dataset.invalid;

        if (!this.isChoice(slot)) return;

        items.forEach((item) => {
          const qty = this.qtyOf(item);
          const countEl = item.querySelector('[data-kit-count]');

          item.dataset.selected = qty > 0 ? 'true' : 'false';
          item.querySelector('[data-kit-select]')?.setAttribute('aria-pressed', qty > 0 ? 'true' : 'false');

          if (countEl) {
            countEl.textContent = qty;
            countEl.hidden = qty < 2;
          }
        });

        const statusEl = slot.querySelector('[data-kit-status]');
        if (!statusEl) return;

        statusEl.textContent = remaining
          ? (this.dataset.textRemaining || 'Escolha [count] item(ns)')
              .replace('[count]', remaining)
              .replace('[total]', total)
              .replace('[max]', max)
          : (this.dataset.textComplete || '[max] de [max] escolhido(s)')
              .replace('[count]', remaining)
              .replace('[total]', total)
              .replace('[max]', max);
        statusEl.dataset.complete = remaining === 0 ? 'true' : 'false';
      }

      /**
       * Valor cheio do kit: os itens escolhidos valem o próprio preço e as vagas
       * vazias valem o preço de referência da etapa.
       */
      subtotalOf(slot) {
        const chosen = this.itemsOf(slot).reduce(
          (sum, item) => sum + this.priceOf(item) * this.qtyOf(item),
          0
        );
        return chosen + this.remainingOf(slot) * this.placeholderOf(slot);
      }

      updateTotals() {
        const compare = this.slots.reduce((sum, slot) => sum + this.subtotalOf(slot), 0);
        const total =
          this.cartMode === 'page'
            ? this.basePrice
            : Math.round((compare * (100 - this.discount)) / 100);

        if (this.totalEl) this.totalEl.textContent = this.formatMoney(total);

        if (this.compareEl) {
          this.compareEl.textContent = this.formatMoney(compare);
          this.compareEl.hidden = compare <= total;
        }
      }

      updateSubmit() {
        if (!this.submitButton) return;

        const blocked =
          this.soldOutFixed().length > 0 || (this.requireChoice && this.incompleteSlots().length > 0);

        this.submitButton.disabled = blocked;
        this.dataset.complete = blocked ? 'false' : 'true';
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
        const soldOut = this.soldOutFixed()[0];
        if (soldOut) {
          this.showError(
            (this.dataset.textSoldOut || 'O item [slot] está indisponível no momento.').replace(
              '[slot]',
              soldOut.dataset.title || ''
            )
          );
          return;
        }

        const pending = this.incompleteSlots()[0];
        if (this.requireChoice && pending) {
          pending.dataset.invalid = 'true';
          pending.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.showError(
            (this.dataset.textError || 'Escolha os itens de [slot] para continuar.')
              .replace('[slot]', pending.dataset.title || '')
              .replace('[count]', this.remainingOf(pending))
              .replace('[max]', this.quantityOf(pending))
          );
          return;
        }

        const items = this.cartMode === 'page' ? this.pageItems() : this.componentItems();
        if (!items.length) {
          this.showError('Monte o kit para continuar.');
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
            this.showError(data.description || data.message || 'Não foi possível adicionar o kit.');
            return;
          }

          await this.applyDiscount(this.dataset.discountCode);
          await this.afterAdd();
          this.reset();
        } catch (e) {
          console.error('[kit-choice] Erro ao adicionar o kit:', e);
          this.showError('Não foi possível adicionar o kit. Tente novamente.');
        } finally {
          this.setLoading(false);
        }
      }

      /** Cada item do kit vira uma linha do carrinho. */
      componentItems() {
        const kitName = this.dataset.kitName;

        return this.slots.flatMap((slot) =>
          this.linesOf(slot).map(({ id, quantity }) => ({
            id,
            quantity,
            properties: kitName ? { _kit: kitName } : undefined,
          }))
        );
      }

      /** O kit é o próprio produto da página; as escolhas viram propriedades. */
      pageItems() {
        if (!this.variantId) return [];

        const properties = {};

        this.slots.filter((slot) => this.isChoice(slot)).forEach((slot) => {
          const chosen = this.linesOf(slot).map(({ title, quantity }) =>
            quantity > 1 ? `${quantity}x ${title}` : title
          );
          if (!chosen.length) return;

          const label = slot.dataset.title || 'Escolha';
          let key = label;
          let suffix = 2;
          while (key in properties) key = `${label} (${suffix++})`;

          properties[key] = chosen.join(', ');
        });

        return [{ id: this.variantId, quantity: 1, properties }];
      }

      /** Guarda o código de desconto do kit na sessão do checkout. */
      async applyDiscount(code) {
        if (!code) return;

        try {
          await fetch(`/discount/${encodeURIComponent(code)}`, { credentials: 'same-origin' });
        } catch (e) {
          console.error('[kit-choice] Erro ao aplicar o desconto:', e);
        }
      }

      /** Avisa o tema e abre/atualiza o carrinho. */
      async afterAdd() {
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kit-choice' });
        }

        // Brindes (Compre X Leve Y / níveis) vivem em cart-drawer.js.
        if (typeof window.syncCartGifts === 'function') {
          try {
            const cart = await fetch('/cart.js').then((r) => r.json());
            await window.syncCartGifts(cart.items || []);
          } catch (e) {
            console.error('[kit-choice] Erro ao sincronizar brindes:', e);
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
        this.slots.filter((slot) => this.isChoice(slot)).forEach((slot) => {
          this.itemsOf(slot).forEach((item) => {
            item.dataset.qty = 0;
          });
        });
        this.update();
      }
    }
  );
}
