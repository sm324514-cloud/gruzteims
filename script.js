(function () {
  "use strict";

  const PHONE_DIGIT_MIN = 12;
  const quizState = {
    step: 1,
    totalSteps: 4,
    demolitionType: "",
    trashRemoval: ""
  };

  const form = document.getElementById("quiz-form");
  const message = document.getElementById("quiz-message");
  const prevButton = document.getElementById("quiz-prev");
  const nextButton = document.getElementById("quiz-next");
  const submitButton = document.getElementById("quiz-submit");
  const progress = document.getElementById("quiz-progress");
  const stepLabel = document.getElementById("quiz-step-label");
  const percentLabel = document.getElementById("quiz-percent-label");
  const phoneInput = document.getElementById("phone");
  const contactForm = document.getElementById("contact-form");
  const contactPhoneInput = document.getElementById("contact-phone");
  const contactSubmitButton = document.getElementById("contact-submit");
  const contactMessage = document.getElementById("contact-message");

  function scrollToTarget(hash) {
    const target = document.querySelector(hash);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setMessage(text, type) {
    message.textContent = text || "";
    message.classList.toggle("success", type === "success");
  }

  function setContactMessage(text, type) {
    contactMessage.textContent = text || "";
    contactMessage.classList.toggle("success", type === "success");
  }

  function updateQuizView() {
    document.querySelectorAll(".quiz-step").forEach((step) => {
      step.classList.toggle("hidden", Number(step.dataset.step) !== quizState.step);
    });

    const percent = Math.round((quizState.step / quizState.totalSteps) * 100);
    stepLabel.textContent = `Шаг ${quizState.step} из ${quizState.totalSteps}`;
    percentLabel.textContent = `${percent}% завершено`;
    progress.style.width = `${percent}%`;
    prevButton.classList.toggle("hidden", quizState.step === 1);
    nextButton.classList.toggle("hidden", quizState.step === quizState.totalSteps);
    submitButton.classList.toggle("hidden", quizState.step !== quizState.totalSteps);
    setMessage("");
  }

  function validateCurrentStep() {
    if (quizState.step === 1 && !quizState.demolitionType) {
      setMessage("Выберите, что нужно демонтировать.");
      return false;
    }
    return true;
  }

  function onlyDigits(value) {
    return (value || "").replace(/\D/g, "");
  }

  function formatBelarusPhone(value) {
    let digits = onlyDigits(value);
    if (!digits) {
      return "";
    }

    if (digits.startsWith("80")) {
      digits = `375${digits.slice(2)}`;
    } else if (digits.startsWith("0")) {
      digits = `375${digits.slice(1)}`;
    } else if (!digits.startsWith("375")) {
      digits = `375${digits}`;
    }

    digits = digits.slice(0, 12);
    const operator = digits.slice(3, 5);
    const first = digits.slice(5, 8);
    const second = digits.slice(8, 10);
    const third = digits.slice(10, 12);

    let formatted = "+375";
    if (operator) {
      formatted += ` (${operator}`;
      if (operator.length === 2) {
        formatted += ")";
      }
    }
    if (first) {
      formatted += ` ${first}`;
    }
    if (second) {
      formatted += `-${second}`;
    }
    if (third) {
      formatted += `-${third}`;
    }
    return formatted;
  }

  function validateSubmission() {
    if (!quizState.demolitionType) {
      quizState.step = 1;
      updateQuizView();
      setMessage("Выберите, что нужно демонтировать.");
      return false;
    }

    const digits = onlyDigits(phoneInput.value);
    if (!digits) {
      setMessage("Укажите телефон, чтобы мы могли связаться с вами.");
      phoneInput.focus();
      return false;
    }
    if (digits.length < PHONE_DIGIT_MIN) {
      setMessage("Проверьте номер телефона: он выглядит слишком коротким.");
      phoneInput.focus();
      return false;
    }
    return true;
  }

  function getUtmData() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    params.forEach((value, key) => {
      if (key.toLowerCase().startsWith("utm_")) {
        utm[key] = value;
      }
    });
    return utm;
  }

  function buildPayload() {
    const formData = new FormData(form);
    return {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      demolitionType: quizState.demolitionType,
      location: String(formData.get("location") || "").trim(),
      trashRemoval: quizState.trashRemoval,
      deadline: String(formData.get("deadline") || "").trim(),
      contactMethod: String(formData.get("contactMethod") || "").trim(),
      page: window.location.href,
      utm: getUtmData(),
      requestedAt: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Minsk" })
    };
  }

  function buildContactPayload() {
    const formData = new FormData(contactForm);
    return {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      demolitionType: String(formData.get("demolitionType") || "").trim(),
      location: "Не указано",
      trashRemoval: "Не указано",
      deadline: "Не указано",
      contactMethod: "Позвонить",
      page: window.location.href,
      utm: getUtmData(),
      requestedAt: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Minsk" })
    };
  }

  function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Отправляем..." : "Отправить заявку";
  }

  function setContactSubmitting(isSubmitting) {
    contactSubmitButton.disabled = isSubmitting;
    contactSubmitButton.textContent = isSubmitting ? "Отправляем..." : "Отправить заявку";
  }

  async function sendPayload(payload) {
    const response = await fetch("send.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "Request failed");
    }
    return result;
  }

  async function submitQuiz(event) {
    event.preventDefault();
    setMessage("");

    if (!validateSubmission()) {
      return;
    }

    setSubmitting(true);
    try {
      await sendPayload(buildPayload());
      form.reset();
      quizState.step = 1;
      quizState.demolitionType = "";
      quizState.trashRemoval = "";
      document.querySelectorAll(".choice-card").forEach((button) => {
        button.classList.remove("active-ring");
        const icon = button.querySelector(".material-symbols-outlined");
        if (icon) {
          icon.textContent = "radio_button_unchecked";
        }
      });
      updateQuizView();
      setMessage("Спасибо! Заявка отправлена. Мы свяжемся с вами в ближайшее время.", "success");
    } catch (error) {
      setMessage("Не удалось отправить заявку. Попробуйте еще раз или позвоните нам.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitContactForm(event) {
    event.preventDefault();
    setContactMessage("");

    const phone = contactPhoneInput.value;
    const demolitionType = String(new FormData(contactForm).get("demolitionType") || "").trim();
    if (!onlyDigits(phone)) {
      setContactMessage("Укажите телефон, чтобы мы могли связаться с вами.");
      contactPhoneInput.focus();
      return;
    }
    if (onlyDigits(phone).length < PHONE_DIGIT_MIN) {
      setContactMessage("Проверьте номер телефона: он выглядит слишком коротким.");
      contactPhoneInput.focus();
      return;
    }
    if (!demolitionType) {
      setContactMessage("Выберите, что нужно демонтировать.");
      document.getElementById("contact-object").focus();
      return;
    }

    setContactSubmitting(true);
    try {
      await sendPayload(buildContactPayload());
      contactForm.reset();
      setContactMessage("Спасибо! Заявка отправлена. Мы свяжемся с вами в ближайшее время.", "success");
    } catch (error) {
      setContactMessage("Не удалось отправить заявку. Попробуйте еще раз или позвоните нам.");
    } finally {
      setContactSubmitting(false);
    }
  }

  function initChoices() {
    document.querySelectorAll("[data-choice-group]").forEach((group) => {
      group.addEventListener("click", (event) => {
        const button = event.target.closest(".choice-card");
        if (!button) {
          return;
        }

        const key = group.dataset.choiceGroup;
        quizState[key] = button.dataset.value;
        group.querySelectorAll(".choice-card").forEach((card) => {
          const isActive = card === button;
          card.classList.toggle("active-ring", isActive);
          const icon = card.querySelector(".material-symbols-outlined");
          if (icon) {
            icon.textContent = isActive ? "check_circle" : "radio_button_unchecked";
          }
        });
        setMessage("");
      });
    });
  }

  function initQuiz() {
    if (!form) {
      return;
    }

    initChoices();
    updateQuizView();

    nextButton.addEventListener("click", () => {
      if (!validateCurrentStep()) {
        return;
      }
      quizState.step = Math.min(quizState.step + 1, quizState.totalSteps);
      updateQuizView();
    });

    prevButton.addEventListener("click", () => {
      quizState.step = Math.max(quizState.step - 1, 1);
      updateQuizView();
    });

    form.addEventListener("submit", submitQuiz);

    phoneInput.addEventListener("input", () => {
      const formatted = formatBelarusPhone(phoneInput.value);
      phoneInput.value = formatted;
    });
  }

  function initContactForm() {
    if (!contactForm) {
      return;
    }

    contactPhoneInput.addEventListener("input", () => {
      contactPhoneInput.value = formatBelarusPhone(contactPhoneInput.value);
    });
    contactForm.addEventListener("submit", submitContactForm);
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const hash = anchor.getAttribute("href");
        if (!hash || hash === "#") {
          return;
        }
        event.preventDefault();
        scrollToTarget(hash);
      });
    });
  }

  function openModal(modal) {
    if (!modal) {
      return;
    }
    modal.classList.remove("hidden");
    const closeButton = modal.querySelector("[data-close-modal]");
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeModal(modal) {
    if (!modal) {
      return;
    }
    modal.classList.add("hidden");
  }

  function initModals() {
    const leadPopup = document.getElementById("lead-popup");
    const exitPopup = document.getElementById("exit-popup");

    window.setTimeout(() => {
      if (!sessionStorage.getItem("leadPopupClosed")) {
        openModal(leadPopup);
        sessionStorage.setItem("leadPopupClosed", "1");
      }
    }, 24000);

    document.addEventListener("mouseleave", (event) => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktop || event.clientY > 10 || sessionStorage.getItem("exitPopupClosed")) {
        return;
      }
      openModal(exitPopup);
      sessionStorage.setItem("exitPopupClosed", "1");
    });

    document.querySelectorAll(".offer-popup").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        const closeTrigger = event.target.closest("[data-close-modal]");
        if (closeTrigger) {
          closeModal(modal);
          if (closeTrigger && closeTrigger.getAttribute("href") === "#quiz") {
            window.setTimeout(() => scrollToTarget("#quiz"), 20);
          }
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      document.querySelectorAll(".offer-popup:not(.hidden)").forEach(closeModal);
    });
  }

  function initStickyCta() {
    const stickyCta = document.querySelector(".mobile-sticky-cta");
    const trustBadges = document.querySelector(".trust-badges");
    const hero = document.querySelector("main > section:first-child");
    if (!stickyCta || !hero) {
      return;
    }

    const updateStickyState = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const heroPassed = hero.getBoundingClientRect().bottom <= 96;
      stickyCta.classList.toggle("is-visible", isMobile && heroPassed);
      if (trustBadges) {
        trustBadges.classList.toggle("is-visible", !isMobile && heroPassed);
      }
    };

    updateStickyState();
    window.addEventListener("scroll", updateStickyState, { passive: true });
    window.addEventListener("resize", updateStickyState);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSmoothScroll();
    initQuiz();
    initContactForm();
    initModals();
    initStickyCta();
  });
})();
