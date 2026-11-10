/* Джамиль Гаджиев — motion */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const cursor = $(".cursor");
  const ring = $(".cursor-ring");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, cx = mx, cy = my;

  const moveCursor = (e) => {
    mx = e.clientX;
    my = e.clientY;
  };
  window.addEventListener("pointermove", moveCursor, { passive: true });

  const tickCursor = () => {
    cx += (mx - cx) * 0.35;
    cy += (my - cy) * 0.35;
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    if (cursor) cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    if (ring) ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    requestAnimationFrame(tickCursor);
  };
  tickCursor();

  const setHover = (on, view) => {
    cursor?.classList.toggle("is-hover", on && !view);
    cursor?.classList.toggle("is-view", !!view);
  };
  $$("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => setHover(true, el.dataset.cursor === "view"));
    el.addEventListener("pointerleave", () => setHover(false, false));
  });

  $$("[data-magnetic]").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.28}px, ${y * 0.34}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "translate(0,0)";
      btn.style.transition = "transform 0.6s cubic-bezier(0.16,1,0.3,1)";
      setTimeout(() => (btn.style.transition = ""), 600);
    });
  });

  /* WebGL liquid field */
  const canvas = $("#webgl");
  if (canvas && canvas.getContext("webgl")) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    const vert = `
      attribute vec2 a;
      void main(){ gl_Position = vec4(a,0.0,1.0); }
    `;
    const frag = `
      precision highp float;
      uniform vec2 r;
      uniform float t;
      uniform vec2 m;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f *= f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for(int i=0;i<6;i++){ v += a * n(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / r;
        vec2 p = (gl_FragCoord.xy - 0.5 * r) / min(r.x, r.y);
        vec2 mm = (m - 0.5 * r) / min(r.x, r.y);
        p += (mm - p) * 0.08;
        float z = fbm(p * 2.4 + vec2(t * 0.04, t * 0.03));
        float z2 = fbm(p * 3.1 - vec2(t * 0.05, -t * 0.02) + z);
        float v = smoothstep(0.28, 0.82, mix(z, z2, 0.65));
        vec3 gold = vec3(0.79, 0.65, 0.42);
        vec3 mint = vec3(0.49, 0.88, 0.78);
        vec3 ink = vec3(0.025, 0.02, 0.016);
        vec3 col = mix(ink, gold, v);
        col = mix(col, mint, smoothstep(0.55, 1.0, z2) * 0.55);
        col += 0.12 * vec3(v * v);
        float vig = smoothstep(1.15, 0.2, length(uv - 0.5));
        gl_FragColor = vec4(col * vig, 0.92);
      }
    `;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");
    const uM = gl.getUniformLocation(prog, "m");
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 1.75);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    let t0 = performance.now();
    const draw = (now) => {
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      const dpr = canvas.width / canvas.clientWidth;
      gl.uniform2f(uM, mx * dpr, canvas.height - my * dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  const form = $("#visit-form");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    form.querySelector(".form-ok").style.display = "block";
    form.querySelector("button").setAttribute("disabled", "true");
  });

  const boot = async () => {
    const loader = $(".loader");
    const bar = $(".loader-bar span");
    const count = $(".loader-count");
    let n = 0;
    await new Promise((resolve) => {
      const id = setInterval(() => {
        n = Math.min(100, n + (n > 80 ? 1 : 2 + Math.random() * 4));
        const v = Math.floor(n);
        if (count) count.textContent = String(v).padStart(3, "0");
        if (bar) bar.style.width = v + "%";
        if (v >= 100) {
          clearInterval(id);
          resolve();
        }
      }, 28);
    });
    await new Promise((r) => setTimeout(r, 280));

    if (window.gsap) {
      const tl = gsap.timeline();
      tl.to(".loader-inner", { y: -40, opacity: 0, duration: 0.7, ease: "power3.inOut" })
        .to(loader, { yPercent: -100, duration: 1.05, ease: "power4.inOut" }, 0.15)
        .set(loader, { display: "none" });
      gsap.to(".nav", { opacity: 1, duration: 1, delay: 0.7, ease: "power2.out" });
      gsap.from(".hero-kicker", { y: 24, opacity: 0, duration: 1, delay: 0.55, ease: "power3.out" });
      gsap.from(".hero-title .word", {
        yPercent: 120,
        rotateZ: 8,
        duration: 1.35,
        stagger: 0.08,
        delay: 0.45,
        ease: "power4.out",
      });
      gsap.from(".hero-bottom > *", { y: 30, opacity: 0, duration: 1, stagger: 0.1, delay: 0.9, ease: "power3.out" });
      gsap.from(".scroll-hint", { opacity: 0, duration: 1, delay: 1.2 });
    } else if (loader) {
      loader.style.display = "none";
    }

    if (window.Lenis && window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      $$('a[href^="#"]').forEach((a) => {
        a.addEventListener("click", (e) => {
          const id = a.getAttribute("href");
          const t = id && $(id);
          if (!t) return;
          e.preventDefault();
          lenis.scrollTo(t, { offset: -20, duration: 1.4 });
        });
      });

      gsap.utils.toArray(".about-visual img, .g-item img").forEach((img) => {
        gsap.fromTo(img, { scale: 1.22, y: 40 }, {
          scale: 1,
          y: 0,
          ease: "none",
          scrollTrigger: { trigger: img.parentElement, start: "top 90%", end: "bottom top", scrub: true },
        });
      });

      gsap.from(".about-copy > *", {
        y: 40, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: ".about-copy", start: "top 80%" },
      });

      $$(".stat b").forEach((el) => {
        const end = parseInt(el.dataset.count, 10);
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          onEnter: () => {
            gsap.to(obj, {
              v: end,
              duration: 1.8,
              ease: "power2.out",
              onUpdate: () => { el.textContent = Math.floor(obj.v) + (el.dataset.suf || ""); },
            });
          },
        });
      });

      const track = $(".services-track");
      const pin = $(".services-pin");
      if (track && pin) {
        const getScroll = () => track.scrollWidth - window.innerWidth + 36;
        gsap.to(track, {
          x: () => -getScroll(),
          ease: "none",
          scrollTrigger: {
            trigger: pin,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            end: () => "+=" + getScroll(),
            invalidateOnRefresh: true,
          },
        });
      }

      const words = $$(".philo-line .w");
      if (words.length) {
        ScrollTrigger.create({
          trigger: ".philosophy",
          start: "top 70%",
          end: "bottom 55%",
          scrub: true,
          onUpdate: (self) => {
            const i = Math.floor(self.progress * (words.length + 0.01));
            words.forEach((w, k) => w.classList.toggle("is-on", k <= i));
          },
        });
      }

      gsap.utils.toArray(".process-row").forEach((row) => {
        gsap.from(row, {
          y: 36, opacity: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: row, start: "top 86%" },
        });
      });

      gsap.from(".contact h2, .contact .idx, .contact .hero-lead", {
        y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: ".contact", start: "top 75%" },
      });
    }
  };

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
