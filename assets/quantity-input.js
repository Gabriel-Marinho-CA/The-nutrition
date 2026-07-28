// <quantity-input> — usado pelo cart-drawer (portado do Dawn).
// Guardado para não conflitar caso o tema passe a definir o mesmo elemento.
if (!customElements.get('quantity-input')) {
  class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('input');
      this.changeEvent = new Event('change', { bubbles: true });
      this.input.addEventListener('change', this.onInputChange.bind(this));
      this.querySelectorAll('button').forEach((button) =>
        button.addEventListener('click', this.onButtonClick.bind(this))
      );
    }

    quantityUpdateUnsubscriber = undefined;

    connectedCallback() {
      this.validateQtyRules();
      this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
    }

    disconnectedCallback() {
      if (this.quantityUpdateUnsubscriber) {
        this.quantityUpdateUnsubscriber();
      }
    }

    onInputChange(event) {
      this.validateQtyRules();
    }

    onButtonClick(event) {
      event.preventDefault();
      const previousValue = this.input.value;

      if (event.target.name === 'plus') {
        if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
          this.input.value = this.input.dataset.min;
        } else {
          this.input.stepUp();
        }
      } else {
        this.input.stepDown();
      }

      if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

      if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
        this.input.value = parseInt(this.input.min);
      }
    }

    validateQtyRules() {
      const value = parseInt(this.input.value);
      if (this.input.min) {
        const buttonMinus = this.querySelector(".quantity__button[name='minus']");
        if (buttonMinus) buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
      }
      if (this.input.max) {
        const max = parseInt(this.input.max);
        const buttonPlus = this.querySelector(".quantity__button[name='plus']");
        if (buttonPlus) buttonPlus.classList.toggle('disabled', value >= max);
      }
    }
  }

  customElements.define('quantity-input', QuantityInput);
}
