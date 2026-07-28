import Swiper from "./swiper-bundle.esm.browser.min.js";

class OrderBumpSlider extends HTMLElement {
  connectedCallback() {
    this.initSwiper();
  }

  initSwiper() {
    const swiperEl = this.querySelector(".order-bump__swiper");
    if (!swiperEl || this.swiper) return;

    this.swiper = new Swiper(swiperEl, {
      slidesPerView: 1,
      spaceBetween: 12,
      // loop: true clona os slides (cloneNode), e o constructor do <product-form>
      // lê this.querySelector('form') antes dos filhos do clone existirem, quebrando
      // o botão "Adicionar" nos slides clonados. rewind cicla sem clonar.
      rewind: true,
      autoplay: {
        delay: 3200,
        disableOnInteraction: false,
      },
      navigation: {
        nextEl: this.querySelector(".order-bump__next"),
        prevEl: this.querySelector(".order-bump__prev"),
      },
      breakpoints: {
        750: {
          slidesPerView: 1,
        },
      },
    });
  }
}

if (!customElements.get("order-bump-slider")) {
  customElements.define("order-bump-slider", OrderBumpSlider);
}
