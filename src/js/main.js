(function () {
  "use strict";

  // ---- Session loader ----
  var loader = document.querySelector("[data-loader]");
  if (loader) {
    try {
      if (sessionStorage.getItem("jbp-loader-seen")) {
        loader.remove();
      } else {
        sessionStorage.setItem("jbp-loader-seen", "1");
        var hide = function () {
          loader.classList.add("is-hidden");
          setTimeout(function () {
            loader.remove();
          }, 400);
        };
        if (document.readyState === "complete") hide();
        else window.addEventListener("load", hide, { once: true });
        setTimeout(hide, 600);
      }
    } catch (e) {
      loader.remove();
    }
  }

  // ---- Mobile nav dialog ----
  var nav = document.getElementById("mobile-nav");
  document.querySelectorAll("[data-menu-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (nav && typeof nav.showModal === "function") nav.showModal();
    });
  });
  document.querySelectorAll("[data-menu-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      nav && nav.close();
    });
  });
  if (nav) {
    nav.addEventListener("click", function (e) {
      if (e.target === nav) nav.close();
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.close();
      });
    });
  }

  // ---- Privacy dialog (content fetched lazily, once) ----
  var privacyDialog = document.getElementById("privacy-dialog");
  var privacyBody = document.querySelector("[data-privacy-body]");
  var privacyLoaded = false;
  document.querySelectorAll("[data-privacy-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!privacyDialog) return;
      if (!privacyLoaded) {
        privacyLoaded = true;
        fetch("/partials/privacy-dialog.html")
          .then(function (r) {
            return r.text();
          })
          .then(function (html) {
            privacyBody.innerHTML = html;
          })
          .catch(function () {
            privacyBody.innerHTML = "<p>Could not load. Email jbpowercon@gmail.com.</p>";
          });
      }
      if (typeof privacyDialog.showModal === "function") privacyDialog.showModal();
    });
  });
  document.querySelectorAll("[data-privacy-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      privacyDialog && privacyDialog.close();
    });
  });
  if (privacyDialog) {
    privacyDialog.addEventListener("click", function (e) {
      if (e.target === privacyDialog) privacyDialog.close();
    });
  }

  // ---- aria-current on active nav link ----
  var path = location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll(".main-nav__list a, .mobile-nav__list a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === path) a.setAttribute("aria-current", "page");
  });

  // ---- Scroll reveal ----
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealItems = document.querySelectorAll(".reveal");
  if (!prefersReduced && "IntersectionObserver" in window) {
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      group.querySelectorAll(".reveal").forEach(function (el, i) {
        el.style.transitionDelay = i * 60 + "ms";
      });
    });
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealItems.forEach(function (el) {
      obs.observe(el);
    });
  } else {
    revealItems.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  // ---- Testimonial slider controls ----
  document.querySelectorAll("[data-slider]").forEach(function (slider) {
    var track = slider.querySelector("[data-slider-track]");
    var prev = slider.querySelector("[data-slider-prev]");
    var next = slider.querySelector("[data-slider-next]");
    if (!track) return;
    function scrollByCard(dir) {
      var card = track.querySelector(".testimonial-slider__item");
      var amount = card ? card.getBoundingClientRect().width + 24 : track.clientWidth;
      track.scrollBy({ left: dir * amount, behavior: prefersReduced ? "auto" : "smooth" });
    }
    prev && prev.addEventListener("click", function () { scrollByCard(-1); });
    next && next.addEventListener("click", function () { scrollByCard(1); });
  });

  // ---- Portfolio filter + detail dialog ----
  var portfolioGrid = document.querySelector("[data-portfolio-grid]");
  if (portfolioGrid) {
    var portfolioCards = Array.prototype.slice.call(portfolioGrid.querySelectorAll("[data-portfolio-item]"));
    var portfolioEmpty = document.querySelector("[data-portfolio-empty]");
    var filterBar = document.querySelector("[data-portfolio-filters]");

    if (filterBar) {
      filterBar.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;
        filterBar.querySelectorAll(".filter-btn").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        var filter = btn.dataset.filter;
        var visibleCount = 0;
        portfolioCards.forEach(function (card) {
          var match = filter === "all" || card.dataset.category === filter;
          card.hidden = !match;
          if (match) visibleCount++;
        });
        if (portfolioEmpty) portfolioEmpty.hidden = visibleCount !== 0;
      });
    }

    var portfolioDialog = document.getElementById("portfolio-dialog");
    if (portfolioDialog) {
      var dTitle = portfolioDialog.querySelector("[data-portfolio-dialog-title]");
      var dImage = portfolioDialog.querySelector("[data-portfolio-dialog-image]");
      var dMeta = portfolioDialog.querySelector("[data-portfolio-dialog-meta]");
      var dSummary = portfolioDialog.querySelector("[data-portfolio-dialog-summary]");

      portfolioCards.forEach(function (card) {
        card.addEventListener("click", function () {
          dTitle.textContent = card.dataset.title || "";
          dImage.src = card.dataset.image || "";
          dImage.alt = card.dataset.title || "";
          dMeta.textContent = [card.dataset.client, card.dataset.location, card.dataset.year].filter(Boolean).join(" · ");
          dSummary.textContent = card.dataset.summary || "";
          if (typeof portfolioDialog.showModal === "function") portfolioDialog.showModal();
        });
      });

      portfolioDialog.querySelectorAll("[data-portfolio-dialog-close]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          portfolioDialog.close();
        });
      });
      portfolioDialog.addEventListener("click", function (e) {
        if (e.target === portfolioDialog) portfolioDialog.close();
      });
    }
  }

  // ---- WhatsApp enquiry form ----
  var waForm = document.getElementById("whatsapp-form");
  if (waForm) {
    waForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = waForm.querySelector("#f-name");
      var phone = waForm.querySelector("#f-phone");
      var product = waForm.querySelector("#f-product");
      var quantity = waForm.querySelector("#f-quantity");
      var message = waForm.querySelector("#f-message");
      var recipient = waForm.querySelector('input[name="recipient"]:checked');
      var status = waForm.querySelector("[data-form-status]");
      var hasError = false;

      [
        [name, "name"],
        [phone, "phone"],
        [product, "product"],
        [quantity, "quantity"],
      ].forEach(function (pair) {
        var field = pair[0];
        var wrap = field.closest(".field");
        var valid = field.value.trim().length > 0 && field.checkValidity();
        wrap.classList.toggle("has-error", !valid);
        if (!valid) hasError = true;
      });

      status.dataset.state = "";
      status.textContent = "";

      if (!recipient) {
        hasError = true;
        status.textContent = "Please choose who to send this to.";
        status.dataset.state = "error";
      }

      if (hasError) {
        if (!status.textContent) {
          status.textContent = "Please fix the highlighted fields.";
          status.dataset.state = "error";
        }
        return;
      }

      var text =
        "Enquiry from website\nName: " +
        name.value.trim() +
        "\nPhone: " +
        phone.value.trim() +
        "\nProduct: " +
        product.value.trim() +
        "\nQuantity: " +
        quantity.value.trim() +
        (message.value.trim() ? "\nMessage: " + message.value.trim() : "");
      var url = "https://wa.me/" + recipient.value + "?text=" + encodeURIComponent(text);
      status.textContent = "Opening WhatsApp…";
      status.dataset.state = "success";
      window.open(url, "_blank", "noopener");
    });
  }
})();
