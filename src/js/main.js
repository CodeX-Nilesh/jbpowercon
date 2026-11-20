(function () {
  "use strict";

  var preloader = document.getElementById("preloader");
  if (preloader) {
    var hidePreloader = function () {
      preloader.classList.add("is-hidden");
      setTimeout(function () {
        preloader.style.display = "none";
      }, 450);
    };
    if (document.readyState === "complete") hidePreloader();
    else window.addEventListener("load", hidePreloader, { once: true });
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) {
        preloader.classList.add("is-hidden");
        preloader.style.display = "none";
      }
    });
  }

  var fadeSections = document.querySelectorAll("main > section:not(.hero)");
  if (fadeSections.length && "IntersectionObserver" in window) {
    var pendingFirstView = [];
    var fadeInReady = false;

    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionObs.unobserve(entry.target);
        if (fadeInReady) entry.target.classList.add("in-view");
        else pendingFirstView.push(entry.target);
      });
    }, { threshold: 0.1 });

    fadeSections.forEach(function (s) {
      sectionObs.observe(s);
    });

    var releaseFirstView = function () {
      fadeInReady = true;
      pendingFirstView.forEach(function (el) {
        el.classList.add("in-view");
      });
      pendingFirstView = [];
    };

    if (document.readyState === "complete") releaseFirstView();
    else window.addEventListener("load", releaseFirstView, { once: true });
  }

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

  var path = location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll(".main-nav__list a, .mobile-nav__list a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === path) a.setAttribute("aria-current", "page");
  });

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

  document.querySelectorAll("[data-marquee]").forEach(function (marquee) {
    var toggle = marquee.querySelector("[data-marquee-toggle]");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var paused = marquee.classList.toggle("is-paused");
      toggle.setAttribute("aria-pressed", String(paused));
    });
  });

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

  var orgBoxes = document.querySelectorAll("[data-org-box]");
  if (orgBoxes.length) {
    var isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    var openOrgBox = null;
    var orgPopIdCounter = 0;

    var closeOrgPopover = function (box) {
      var pop = box.querySelector("[data-org-popover]");
      if (pop) pop.classList.remove("is-open");
      box.classList.remove("is-open");
      if (openOrgBox === box) openOrgBox = null;
    };

    var positionOrgPopover = function (box, pop) {
      pop.classList.remove("org-popover--flip-left");
      var margin = 16;
      var boxRect = box.getBoundingClientRect();
      var popRect = pop.getBoundingClientRect();
      var top = boxRect.top + boxRect.height / 2 - popRect.height / 2;
      top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));
      var left = boxRect.right + 8;
      if (left + popRect.width > window.innerWidth - margin) {
        left = boxRect.left - popRect.width - 8;
        pop.classList.add("org-popover--flip-left");
      }
      left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));
      pop.style.left = left + "px";
      pop.style.top = top + "px";
    };

    var openOrgPopover = function (box) {
      if (openOrgBox && openOrgBox !== box) closeOrgPopover(openOrgBox);
      var pop = box.querySelector("[data-org-popover]");
      if (!pop) return;
      box.classList.add("is-open");
      pop.classList.add("is-open");
      openOrgBox = box;
      positionOrgPopover(box, pop);
    };

    orgBoxes.forEach(function (box) {
      var pop = box.querySelector("[data-org-popover]");
      if (pop) {
        orgPopIdCounter++;
        var id = "org-pop-" + orgPopIdCounter;
        pop.id = id;
        box.setAttribute("aria-describedby", id);
      }

      box.addEventListener("focus", function () {
        openOrgPopover(box);
      });
      box.addEventListener("blur", function () {
        closeOrgPopover(box);
      });

      if (isCoarsePointer) {
        box.addEventListener("click", function (e) {
          e.preventDefault();
          if (box.classList.contains("is-open")) closeOrgPopover(box);
          else openOrgPopover(box);
        });
      } else {
        box.addEventListener("mouseenter", function () {
          openOrgPopover(box);
        });
        box.addEventListener("mouseleave", function () {
          closeOrgPopover(box);
        });
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openOrgBox) {
        var box = openOrgBox;
        closeOrgPopover(box);
        box.blur();
      }
    });

    document.addEventListener(
      "click",
      function (e) {
        if (openOrgBox && !openOrgBox.contains(e.target)) closeOrgPopover(openOrgBox);
      },
      true
    );

    window.addEventListener(
      "scroll",
      function () {
        if (openOrgBox) closeOrgPopover(openOrgBox);
      },
      { passive: true, capture: true }
    );
  }

  var waForm = document.getElementById("whatsapp-form");
  if (waForm) {
    waForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = waForm.querySelector("#f-name");
      var phone = waForm.querySelector("#f-phone");
      var product = waForm.querySelector("#f-product");
      var quantity = waForm.querySelector("#f-quantity");
      var message = waForm.querySelector("#f-message");
      var recipient = waForm.dataset.recipient;
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
      var url = "https://wa.me/" + recipient + "?text=" + encodeURIComponent(text);
      status.textContent = "Opening WhatsApp…";
      status.dataset.state = "success";
      window.open(url, "_blank", "noopener");
    });
  }

  var credGrid = document.querySelector("[data-credentials-grid]");
  var credLightbox = document.getElementById("credential-lightbox");
  if (credGrid && credLightbox) {
    var credCards = Array.prototype.slice.call(credGrid.querySelectorAll("[data-credential-item]"));
    var credImage = credLightbox.querySelector("[data-lightbox-image]");
    var credTitle = credLightbox.querySelector("[data-lightbox-title]");
    var credDesc = credLightbox.querySelector("[data-lightbox-desc]");
    var credIndex = 0;

    function showCredential(i) {
      credIndex = (i + credCards.length) % credCards.length;
      var card = credCards[credIndex];
      credImage.src = card.dataset.image || "";
      credImage.alt = card.dataset.title || "";
      credTitle.textContent = card.dataset.title || "";
      credDesc.textContent = card.dataset.description || "";
    }

    credCards.forEach(function (card, i) {
      card.addEventListener("click", function () {
        showCredential(i);
        if (typeof credLightbox.showModal === "function") credLightbox.showModal();
      });
    });

    credLightbox.querySelectorAll("[data-lightbox-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        credLightbox.close();
      });
    });
    credLightbox.querySelectorAll("[data-lightbox-prev]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showCredential(credIndex - 1);
      });
    });
    credLightbox.querySelectorAll("[data-lightbox-next]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showCredential(credIndex + 1);
      });
    });
    credLightbox.addEventListener("click", function (e) {
      if (e.target === credLightbox) credLightbox.close();
    });
    credLightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") showCredential(credIndex - 1);
      if (e.key === "ArrowRight") showCredential(credIndex + 1);
    });
  }

  var productLightbox = document.getElementById("product-lightbox");
  if (productLightbox) {
    var prodImage = productLightbox.querySelector("[data-lightbox-image]");
    var prodTitle = productLightbox.querySelector("[data-lightbox-title]");
    document.querySelectorAll("[data-product-zoom]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        prodImage.src = btn.dataset.zoomSrc || "";
        prodImage.alt = btn.dataset.zoomTitle || "";
        prodTitle.textContent = btn.dataset.zoomTitle || "";
        if (typeof productLightbox.showModal === "function") productLightbox.showModal();
      });
    });
    productLightbox.querySelectorAll("[data-lightbox-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        productLightbox.close();
      });
    });
    productLightbox.addEventListener("click", function (e) {
      if (e.target === productLightbox) productLightbox.close();
    });
  }

  var testLightbox = document.getElementById("test-lightbox");
  if (testLightbox) {
    var testImage = testLightbox.querySelector("[data-lightbox-image]");
    var testTitle = testLightbox.querySelector("[data-lightbox-title]");
    document.querySelectorAll("[data-test-zoom]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        testImage.src = btn.dataset.zoomSrc || "";
        testImage.alt = btn.dataset.zoomTitle || "";
        testTitle.textContent = btn.dataset.zoomTitle || "";
        if (typeof testLightbox.showModal === "function") testLightbox.showModal();
      });
    });
    testLightbox.querySelectorAll("[data-lightbox-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        testLightbox.close();
      });
    });
    testLightbox.addEventListener("click", function (e) {
      if (e.target === testLightbox) testLightbox.close();
    });
  }
})();
