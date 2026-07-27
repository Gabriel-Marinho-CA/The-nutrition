if (!customElements.get("video-reels")) {
  customElements.define(
    "video-reels",
    class VideoReels extends HTMLElement {
      constructor() {
        super();
        this.activeClass = "active";
        this.swiper = this.querySelector(".wt-slider__container");
      }

      connectedCallback() {
        this._sectionObserver = null;
        this.init();
      }

      disconnectedCallback() {
        if (this._sectionObserver) {
          this._sectionObserver.disconnect();
          this._sectionObserver = null;
        }
        if (this.checkInterval) clearInterval(this.checkInterval);
      }

      observeSection() {
        const observerOptions = {
          root: null,
          rootMargin: "0px",
          threshold: 0.1,
        };

        const sectionObserver = new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              const video = this.querySelector(".swiper-slide-active video");

              if (video) {
                if (entry.isIntersecting) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            });
          },
          observerOptions,
        );

        sectionObserver.observe(this);
        this._sectionObserver = sectionObserver;
      }

      hardStopAllExceptActive(swiper) {
        const active = swiper.slides[swiper.activeIndex];
        swiper.slides.forEach((slide) => {
          const video = slide.querySelector("video");
          if (!video) return;

          //Stop and mute all except active
          if (slide !== active) {
            video.pause();
            video.muted = true;
            video.removeAttribute("autoplay"); // avoid Safari storms
            video.autoplay = false;
          }
        });
      }

      handleSoundToggle(swiper) {
        swiper.slides.forEach((slide) => {
          const button = slide.querySelector(".wt-video__sound-toggle");
          if (!button || button._bound) return; // bind only once
          button._bound = true;

          button.addEventListener(
            "click",
            () => {
              const activeSlide = swiper.slides[swiper.activeIndex];
              const activeVideo = activeSlide?.querySelector("video");
              if (!activeVideo) return;

              // stop and mute everything except active
              this.hardStopAllExceptActive(swiper);

              // toggle global state and apply ONLY to active video
              const soundOn = swiper.el.dataset.sound === "on";
              const nextSoundOn = !soundOn;
              swiper.el.dataset.sound = nextSoundOn ? "on" : "off";
              activeVideo.muted = !nextSoundOn;

              // inline playback hints for Safari/iOS
              activeVideo.setAttribute("playsinline", "");
              activeVideo.setAttribute("webkit-playsinline", "");
              activeVideo.removeAttribute("autoplay");
              activeVideo.autoplay = false;

              // (re)play only the active one; tiny delay helps Safari
              setTimeout(() => {
                activeVideo.play().catch(() => {});
              }, 80);
            },
            { passive: true },
          );
        });
      }

      sanitizeVideosOnce() {
        if (this._sanitized) return;
        this._sanitized = true;
        this.querySelectorAll("video").forEach((video) => {
          video.pause();
          video.muted = true;
          video.removeAttribute("autoplay");
          video.autoplay = false;
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          video.preload = "metadata";
        });
      }

      playVideoInActiveSlide(swiper) {
        const sound = swiper.el.dataset.sound;
        const activeSlideVideo =
          this.findActiveSlide(swiper)?.querySelector("video");
        if (activeSlideVideo) {
          activeSlideVideo.muted = sound !== "on"; // if sound !== "on", keep it muted

          setTimeout(() => {
            activeSlideVideo.play().catch((err) => {
              console.warn("Autoplay was prevented:", err);
            });
          }, 100);
        }
      }

      findActiveSlide(swiper) {
        const activeSlide = swiper.slides[swiper.activeIndex];
        return activeSlide;
      }

      toggleActiveClass(swiper) {
        const activeSlide = this.findActiveSlide(swiper);
        swiper.slides.forEach((slide) => {
          slide.classList.remove(this.activeClass);

          if (activeSlide === slide) {
            slide.classList.add(this.activeClass);
          }
        });
      }

      handleSlideChange(swiper) {
        this.hardStopAllExceptActive(swiper);
        this.toggleActiveClass(swiper);
        this.playVideoInActiveSlide(swiper);
      }

      addVideoEventHandlers(swiper) {
        this._onSlideChange = () => this.handleSlideChange(swiper);
        swiper.on("slideChange", this._onSlideChange);
        swiper.on("slidesLengthChange", () => this.handleSoundToggle(swiper));
        swiper.on("update", () => this.handleSoundToggle(swiper));
      }

      checkSwiperInitialization() {
        const swiperContainer = this.swiper;
        const mySwiperInstance = swiperContainer?.swiper;

        if (
          swiperContainer?.classList.contains("swiper-initialized") &&
          mySwiperInstance
        ) {
          if (!this.swiper?.dataset.sound) {
            this.swiper.dataset.sound = "off";
          }
          this.sanitizeVideosOnce();
          this.addVideoEventHandlers(mySwiperInstance);
          this.handleSlideChange(mySwiperInstance);
          this.handleSoundToggle(mySwiperInstance);
          this.observeSection();
          clearInterval(this.checkInterval);
        }
      }

      init() {
        this.checkInterval = setInterval(
          this.checkSwiperInitialization.bind(this),
          250,
        );
      }
    },
  );
}
