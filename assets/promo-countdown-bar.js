if (!customElements.get("promo-countdown-bar")) {
  customElements.define(
    "promo-countdown-bar",
    class PromoCountdownBar extends HTMLElement {
      constructor() {
        super();
        this.tick = this.tick.bind(this);
      }

      // "2026-08-20 00:01" -> timestamp no fuso do próprio navegador.
      // A troca de "-" por "/" é o que faz o Safari aceitar o formato.
      static parseDate(value) {
        if (!value) return NaN;
        return new Date(String(value).trim().replace(/-/g, "/")).getTime();
      }

      connectedCallback() {
        this.startTs = PromoCountdownBar.parseDate(this.dataset.start);
        this.endTs = PromoCountdownBar.parseDate(this.dataset.end);
        this.preview = this.dataset.preview === "true";
        this.showBefore = this.dataset.showBefore === "true";
        this.mode = this.dataset.mode || "window";
        this.forceState = this.dataset.forceState || "auto";
        this.display = this.querySelector(".wt-promo-bar__timer");
        this.message = this.querySelector(".wt-promo-bar__message");
        this.textActive = this.dataset.textActive || "";
        this.textBefore = this.dataset.textBefore || "";

        if (!this.display) return;

        if (isNaN(this.startTs) || isNaN(this.endTs) || this.endTs <= this.startTs) {
          this.reportBadDates();
          return;
        }

        if (this.dismissed()) return;

        this.setupDismiss();
        this.tick();
        this.interval = setInterval(this.tick, 1000);
      }

      disconnectedCallback() {
        clearInterval(this.interval);
      }

      now() {
        return Date.now();
      }

      // Só aparece no editor de tema, onde o Liquid rendeu o container.
      reportBadDates() {
        const box = document.querySelector(
          '[data-promo-bar-error="' + this.dataset.sectionId + '"]',
        );
        if (!box) return;
        box.textContent =
          "Barra promocional: datas inválidas. Use AAAA-MM-DD HH:MM e garanta que o fim seja depois do início.";
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

      // Visibility is driven by an explicit inline display, so it wins over any
      // theme CSS and is readable in devtools. The stylesheet starts the element
      // at display:none so nothing flashes before this script runs.
      show() {
        this.style.display = "block";
      }

      hide() {
        this.style.display = "none";
      }

      // Which of the three phases we are in: before / active / ended.
      phaseFor(now) {
        if (this.forceState !== "auto") return this.forceState;
        if (now < this.startTs) return "before";
        if (now < this.endTs) return "active";
        return "ended";
      }

      tick() {
        const now = this.now();
        const phase = this.phaseFor(now);
        this.setPhase(phase);

        if (phase === "ended") {
          // Promotion is over — display:none and stop ticking for good.
          if (this.mode === "always") {
            this.show();
            this.render(0);
          } else {
            this.hide();
          }
          clearInterval(this.interval);
          return;
        }

        if (phase === "before") {
          // Warm-up phase. Stay at display:none unless the merchant asked for
          // the teaser — but keep ticking so we flip to block at the start.
          if (!this.showBefore && this.mode !== "always") {
            this.hide();
            return;
          }
          this.show();
          this.render(Math.max(this.startTs - now, 0));
          return;
        }

        this.show();
        this.render(Math.max(this.endTs - now, 0));
      }

      setPhase(phase) {
        if (this.phase === phase) return;
        this.phase = phase;
        this.dataset.state = phase;
        if (this.message) {
          this.message.textContent =
            phase === "before" ? this.textBefore : this.textActive;
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
