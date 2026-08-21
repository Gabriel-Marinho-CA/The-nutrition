if (!customElements.get("promo-countdown-bar")) {
  customElements.define(
    "promo-countdown-bar",
    class PromoCountdownBar extends HTMLElement {
      constructor() {
        super();
        this.tick = this.tick.bind(this);
      }

      connectedCallback() {
        this.startTs = parseInt(this.dataset.start, 10) * 1000;
        this.endTs = parseInt(this.dataset.end, 10) * 1000;
        this.preview = this.dataset.preview === "true";
        this.showBefore = this.dataset.showBefore === "true";
        this.display = this.querySelector(".wt-promo-bar__timer");
        this.message = this.querySelector(".wt-promo-bar__message");
        this.textActive = this.dataset.textActive || "";
        this.textBefore = this.dataset.textBefore || "";

        // The visitor's clock can be wrong (or set to another timezone). We
        // anchor on the server time rendered by Liquid so everybody sees the
        // promotion open and close at the same absolute instant.
        const serverNow = parseInt(this.dataset.serverNow, 10) * 1000;
        this.skew = serverNow ? serverNow - Date.now() : 0;

        if (!this.startTs || !this.endTs || !this.display) return;
        if (this.dismissed()) return;

        this.setupDismiss();
        this.tick();
        this.interval = setInterval(this.tick, 1000);
      }

      disconnectedCallback() {
        clearInterval(this.interval);
      }

      now() {
        return Date.now() + this.skew;
      }

      dismissKey() {
        return "wt-promo-bar-dismissed:" + this.dataset.sectionId;
      }

      dismissed() {
        if (this.preview) return false;
        try {
          return sessionStorage.getItem(this.dismissKey()) === "1";
        } catch (e) {
          return false;
        }
      }

      setupDismiss() {
        const button = this.querySelector(".wt-promo-bar__close");
        if (!button) return;
        button.addEventListener("click", () => {
          try {
            sessionStorage.setItem(this.dismissKey(), "1");
          } catch (e) {
            /* private mode: just hide for this page view */
          }
          this.hide();
          clearInterval(this.interval);
        });
      }

      show() {
        if (this.hasAttribute("hidden")) this.removeAttribute("hidden");
      }

      hide() {
        if (!this.hasAttribute("hidden")) this.setAttribute("hidden", "");
      }

      tick() {
        const now = this.now();

        if (now >= this.endTs) {
          // Promotion is over — the bar takes itself down.
          this.hide();
          clearInterval(this.interval);
          return;
        }

        let target;
        if (now < this.startTs) {
          // Warm-up phase, counting down to the opening.
          if (!this.showBefore && !this.preview) {
            this.hide();
            return;
          }
          this.setState("before");
          target = this.startTs;
        } else {
          this.setState("active");
          target = this.endTs;
        }

        this.show();
        this.render(target - now);
      }

      setState(state) {
        if (this.state === state) return;
        this.state = state;
        this.dataset.state = state;
        if (this.message) {
          this.message.textContent =
            state === "before" ? this.textBefore : this.textActive;
        }
      }

      render(distance) {
        const days = Math.floor(distance / 86400000);
        const hours = Math.floor((distance % 86400000) / 3600000);
        const minutes = Math.floor((distance % 3600000) / 60000);
        const seconds = Math.floor((distance % 60000) / 1000);

        const parts = [
          [days, this.dataset.labelDays],
          [hours, this.dataset.labelHours],
          [minutes, this.dataset.labelMinutes],
          [seconds, this.dataset.labelSeconds],
        ];

        // Days are noise once the promotion is in its final 24h.
        const visible = days > 0 ? parts : parts.slice(1);

        this.display.innerHTML = visible
          .map(
            ([value, label]) =>
              `<span class="wt-promo-bar__unit">
                 <span class="wt-promo-bar__value">${String(value).padStart(2, "0")}</span>
                 <span class="wt-promo-bar__label">${label}</span>
               </span>`,
          )
          .join('<span class="wt-promo-bar__sep" aria-hidden="true">:</span>');
      }
    },
  );
}
