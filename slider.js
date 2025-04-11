document.addEventListener('DOMContentLoaded', () => {
    // السلايدر الرئيسي
    const mainSlider = document.querySelector('.slider-container .slider');
    if (mainSlider) {
        const mainSlides = mainSlider.querySelectorAll('.slide');
        const mainDotsContainer = mainSlider.querySelector('.slider-dots');
        const pauseButton = mainSlider.querySelector('.pause-slider');
        let mainIndex = 0;
        let autoSlide = true;
        let slideInterval;

        // إنشاء النقاط
        mainSlides.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `الشريحة ${i + 1}`);
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                mainIndex = i;
                showMainSlide();
            });
            mainDotsContainer.appendChild(dot);
        });

        function showMainSlide() {
            mainSlides.forEach((slide, i) => {
                slide.classList.toggle('active', i === mainIndex);
                slide.setAttribute('aria-hidden', i !== mainIndex);
            });
            mainDotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === mainIndex);
                dot.setAttribute('aria-selected', i === mainIndex);
            });
        }

        function startAutoSlide() {
            if (autoSlide) {
                slideInterval = setInterval(() => {
                    mainIndex = (mainIndex + 1) % mainSlides.length;
                    showMainSlide();
                }, 5000);
            }
        }

        function stopAutoSlide() {
            clearInterval(slideInterval);
        }

        pauseButton.addEventListener('click', () => {
            autoSlide = !autoSlide;
            pauseButton.textContent = autoSlide ? '⏸' : '▶';
            if (autoSlide) {
                startAutoSlide();
            } else {
                stopAutoSlide();
            }
        });

        startAutoSlide();
    }

    // السلايدر الثانوي
    const secondarySlider = document.querySelector('#coming-events .secondary-slider');
    if (secondarySlider) {
        const secondarySlides = secondarySlider.querySelectorAll('.slide');
        let secondaryIndex = 0;

        function showSecondarySlide() {
            secondarySlides.forEach((slide, i) => {
                slide.classList.toggle('active', i === secondaryIndex);
                slide.setAttribute('aria-hidden', i !== secondaryIndex);
            });
        }

        setInterval(() => {
            secondaryIndex = (secondaryIndex + 1) % secondarySlides.length;
            showSecondarySlide();
        }, 4000);
    }

    // نموذج التواصل
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formMessage = contactForm.querySelector('.form-message');
            const name = contactForm.querySelector('#name').value;
            const email = contactForm.querySelector('#email').value;
            const message = contactForm.querySelector('#message').value;

            if (name && email && message) {
                formMessage.textContent = document.documentElement.lang === 'ar' ? 'تم إرسال رسالتك بنجاح!' : 'Your message has been sent successfully!';
                formMessage.classList.remove('error');
                contactForm.reset();
            } else {
                formMessage.textContent = document.documentElement.lang === 'ar' ? 'يرجى ملء جميع الحقول.' : 'Please fill in all fields.';
                formMessage.classList.add('error');
            }
        });
    }

    // تبديل اللغة
    const languageSwitcher = document.querySelector('#language-switcher');
    languageSwitcher.addEventListener('change', (e) => {
        const lang = e.target.value;
        document.documentElement.lang = lang;
        document.body.style.direction = lang === 'ar' ? 'rtl' : 'ltr';
        
        // تغيير النصوص
        document.querySelectorAll('[data-lang-ar]').forEach(element => {
            const key = lang === 'ar' ? 'data-lang-ar' : 'data-lang-en';
            element.textContent = element.getAttribute(key);
        });

        // تغيير العناوين
        document.querySelectorAll('title[data-lang-ar]').forEach(title => {
            const key = lang === 'ar' ? 'data-lang-ar' : 'data-lang-en';
            title.textContent = title.getAttribute(key);
        });

        // تغيير placeholders
        document.querySelectorAll('input[data-lang-ar-placeholder], textarea[data-lang-ar-placeholder]').forEach(input => {
            const key = lang === 'ar' ? 'data-lang-ar-placeholder' : 'data-lang-en-placeholder';
            input.placeholder = input.getAttribute(key);
        });

        // تغيير اتجاه السلايدر
        document.querySelectorAll('.slide-caption').forEach(caption => {
            caption.style.textAlign = lang === 'ar' ? 'right' : 'left';
            caption.style.right = lang === 'ar' ? '60px' : 'unset';
            caption.style.left = lang === 'ar' ? 'unset' : '60px';
        });

        // تغيير اتجاه النقاط
        document.querySelectorAll('.slider-dots').forEach(dots => {
            dots.style.right = lang === 'ar' ? '50%' : 'unset';
            dots.style.left = lang === 'ar' ? 'unset' : '50%';
            dots.style.transform = lang === 'ar' ? 'translateX(50%)' : 'translateX(-50%)';
        });

        // تغيير اتجاه نموذج التواصل
        document.querySelectorAll('.form-group').forEach(group => {
            group.style.textAlign = lang === 'ar' ? 'right' : 'left';
        });
    });
});