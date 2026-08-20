/**
 * <kit-builder> — "Monte seu kit" da página de produto.
 *
 * Cada linha (`[data-kit-item]`) é uma variante vinda do metafield
 * `custom.produtos_kit`. O componente soma as quantidades, libera o botão de
 * adicionar ao carrinho quando o mínimo do bloco é atingido e envia todas as
 * linhas de uma vez em `/cart/add.js` (`items: [...]`).
 *
 * A markup vive em `snippets/kit-builder.liquid`.
 */
if (!customElements.get('kit-builder')) {
  customElements.define(
    'kit-builder',
    class KitBuilder extends HTMLElement {
      connectedCallback() {
        this.min = parseInt(this.dataset.min, 10) || 1;
        // 0 = sem teto de quantidade.
        this.max = parseInt(this.dataset.max, 10) || 0;
        // Quantos sabores diferentes precisam estar no kit (0 = não exige).
        this.minFlavors = parseInt(this.dataset.minFlavors, 10) || 0;

        this.items = Array.from(this.querySelectorAll('[data-kit-item]'));
        this.submitButton = this.querySelector('[data-kit-submit]');
        this.statusEl = this.querySelector('[data-kit-status]');
        this.progressEl = this.querySelector('[data-kit-progress]');
        this.totalEl = this.querySelector('[data-kit-total]');
        this.errorEl = this.querySelector('[data-kit-error]');
        this.spinner = this.querySelector('.loading-overlay__spinner');

        this.addEventListener('click', this.onClick.bind(this));
        this.addEventListener('input', this.onInput.bind(this));
        this.addEventListener('change', this.onInput.bind(this));

        this.update();
      }

      // — estado ————————————————————————————————————————————————————————

      /** Quantidade atual de uma linha, já saneada. */
      qtyOf(item) {
        const input = item.querySelector('[data-kit-qty]');
        const value = parseInt(input?.value, 10);
        return Number.isFinite(value) && value > 0 ? value : 0;
      }

      get selection() {
        return this.items
          .filter((item) => item.dataset.available === 'true' && this.qtyOf(item) > 0)
          .map((item) => ({
            id: Number(item.dataset.variantId),
            quantity: this.qtyOf(item),
            price: parseInt(item.dataset.price, 10) || 0,
          }));
      }

      get totalQuantity() {
        return this.selection.reduce((sum, line) => sum + line.quantity, 0);
      }

      // — interação —————————————————————————————————————————————————————

      onClick(event) {
        const decrease = event.target.closest('[data-kit-decrease]');
        const increase = event.target.closest('[data-kit-increase]');
        const submit = event.target.closest('[data-kit-submit]');

        if (decrease || increase) {
          const item = (decrease || increase).closest('[data-kit-item]');
          const input = item.querySelector('[data-kit-qty]');
          const next = this.qtyOf(item) + (increase ? 1 : -1);
          input.value = Math.max(0, next);
          this.update();
          return;
        }

        if (submit) this.onSubmit();
      }

      onInput(event) {
        if (!event.target.matches('[data-kit-qty]')) return;
        this.update();
      }

      // — render ————————————————————————————————————————————————————————

      update() {
        const selection = this.selection;
        const total = selection.reduce((sum, line) => sum + line.quantity, 0);
        const flavors = selection.length;
        const atMax = this.max > 0 && total >= this.max;

        // Sanea os inputs e não deixa estourar o teto do kit.
        this.items.forEach((item) => {
          const input = item.querySelector('[data-kit-qty]');
          if (!input || input.disabled) return;

          const qty = this.qtyOf(item);
          if (String(qty) !== input.value) input.value = qty;

          item.dataset.selected = qty > 0 ? 'true' : 'false';
          item.querySelector('[data-kit-decrease]').disabled = qty === 0;
          item.querySelector('[data-kit-increase]').disabled = atMax;
        });

        const missing = Math.max(0, this.min - total);
        const missingFlavors = Math.max(0, this.minFlavors - flavors);
        const complete = missing === 0 && missingFlavors === 0;

        this.dataset.complete = complete ? 'true' : 'false';

        if (this.progressEl) {
          const ratio = this.min > 0 ? Math.min(total / this.min, 1) : 1;
          this.progressEl.style.width = `${ratio * 100}%`;
        }

        if (this.statusEl) {
          this.statusEl.textContent = this.statusText({ total, missing, missingFlavors, atMax });
        }

        if (this.totalEl) {
          const amount = selection.reduce((sum, line) => sum + line.price * line.quantity, 0);
          this.totalEl.textContent = this.formatMoney(amount);
        }

        if (this.submitButton) this.submitButton.disabled = !complete;
        if (complete) this.showError(false);
      }

      statusText({ total, missing, missingFlavors, atMax }) {
        const template = (key, fallback) => this.dataset[key] || fallback;

        if (missing > 0) {
          return template('textIncomplete', 'Selecione mais [count] item(ns) para continuar')
            .replace('[count]', missing)
            .replace('[total]', total)
            .replace('[min]', this.min);
        }

        if (missingFlavors > 0) {
          return `Escolha pelo menos ${this.minFlavors} sabores diferentes (faltam ${missingFlavors}).`;
        }

        if (atMax) {
          return template('textMax', 'Kit completo — máximo de [max] itens atingido.')
            .replace('[max]', this.max)
            .replace('[total]', total);
        }

        return template('textComplete', 'Kit liberado! Adicione ao carrinho.')
          .replace('[count]', total)
          .replace('[total]', total)
          .replace('[min]', this.min);
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
        const selection = this.selection;
        const total = selection.reduce((sum, line) => sum + line.quantity, 0);

        if (total < this.min || selection.length < this.minFlavors) {
          const message = this.dataset.textError || 'Monte um kit com pelo menos [min] itens.';
          this.showError(
            message
              .replace('[min]', this.min)
              .replace('[max]', this.max)
              .replace('[count]', Math.max(0, this.min - total))
              .replace('[total]', total)
          );
          return;
        }

        this.showError(false);
        this.setLoading(true);

        const kitName = this.dataset.kitName;
        const items = selection.map(({ id, quantity }) => ({
          id,
          quantity,
          properties: kitName ? { _kit: kitName } : undefined,
        }));

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

          await this.afterAdd();
          this.reset();
        } catch (e) {
          console.error('[kit-builder] Erro ao adicionar o kit:', e);
          this.showError('Não foi possível adicionar o kit. Tente novamente.');
        } finally {
          this.setLoading(false);
        }
      }

      /** Avisa o tema e abre/atualiza o carrinho. */
      async afterAdd() {
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'kit-builder' });
        }

        // Brindes (Compre X Leve Y / níveis) vivem em cart-drawer.js.
        if (typeof window.syncCartGifts === 'function') {
          try {
            const cart = await fetch('/cart.js').then((r) => r.json());
            await window.syncCartGifts(cart.items || []);
          } catch (e) {
            console.error('[kit-builder] Erro ao sincronizar brindes:', e);
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
        this.items.forEach((item) => {
          const input = item.querySelector('[data-kit-qty]');
          if (input) input.value = 0;
        });
        this.update();
      }
    }
  );
}
