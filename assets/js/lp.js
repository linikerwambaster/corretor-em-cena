/* Corretor em Cena · comportamento da LP */
(function () {
  'use strict';

  // ===== CONFIGURAÇÃO (trocar aqui) =====
  var CONFIG = {
    checkout: 'https://pay.cakto.com.br/fa5ner5_1336227',
    preco: 97,
    pixelId: '' // ID do Pixel da Meta. Vazio = não carrega o Pixel.
  };

  var BASE_JS = (document.currentScript && document.currentScript.src) || location.href;
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // ---------- rastreio: UTMs repassadas ao checkout ----------
  var CHAVES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck', 'fbclid'];
  function lerGuardado() { try { return JSON.parse(localStorage.getItem('cec_utm') || '{}'); } catch (e) { return {}; } }
  var guardado = lerGuardado();
  var qs = new URLSearchParams(location.search);
  CHAVES.forEach(function (k) { if (qs.get(k)) guardado[k] = qs.get(k); });
  try { localStorage.setItem('cec_utm', JSON.stringify(guardado)); } catch (e) { /* sem armazenamento */ }

  function urlCheckout() {
    var u = new URL(CONFIG.checkout);
    Object.keys(guardado).forEach(function (k) { if (guardado[k]) u.searchParams.set(k, guardado[k]); });
    return u.toString();
  }
  $$('[data-cta]').forEach(function (a) {
    a.href = urlCheckout();
    a.addEventListener('click', function () {
      if (window.fbq) window.fbq('track', 'InitiateCheckout', { value: CONFIG.preco, currency: 'BRL', content_name: 'Corretor em Cena' });
    });
  });

  // ---------- Pixel: só com ID e só depois do "Aceitar" dos cookies ----------
  function carregaPixel() {
    if (!CONFIG.pixelId || window.fbq) return;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', CONFIG.pixelId); window.fbq('track', 'PageView');
  }
  var escolha = null; try { escolha = localStorage.getItem('cec_cookies'); } catch (e) { /* sem armazenamento */ }
  var aviso = $('#cookies');
  if (escolha === 'sim') carregaPixel();
  else if (!escolha && aviso) {
    aviso.hidden = false;
    document.body.classList.add('com-aviso');
    $$('[data-cookie]', aviso).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.cookie; try { localStorage.setItem('cec_cookies', v); } catch (e) { /* ok */ }
        aviso.hidden = true; document.body.classList.remove('com-aviso');
        if (v === 'sim') carregaPixel();
      });
    });
  }

  // ---------- topo e barra fixa ----------
  var topo = $('#topo'), barra = $('#barraCta'), hero = $('.hero');
  var escuros = $$('.demo, .obra, .final, .rodape');
  function aoRolar() {
    var y = window.scrollY;
    topo.classList.toggle('solido', y > 30);
    var meio = 40, sobreEscuro = false;
    escuros.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= meio && r.bottom > meio) sobreEscuro = true; });
    topo.classList.toggle('escuro', sobreEscuro);
    var hb = hero.getBoundingClientRect().bottom;
    var noFim = $('.final').getBoundingClientRect().top < window.innerHeight * .7;
    var mostra = hb < 0 && !noFim;
    barra.classList.toggle('on', mostra);
    barra.setAttribute('aria-hidden', mostra ? 'false' : 'true');
    $$('a', barra).forEach(function (a) { a.tabIndex = mostra ? 0 : -1; });
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  // ---------- timecode do visor ----------
  var tc = $('#tc'), t0 = performance.now();
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function relogio() {
    var s = (performance.now() - t0) / 1000;
    var f = Math.floor((s % 1) * 30);
    tc.textContent = '00:' + pad(Math.floor(s / 60) % 60) + ':' + pad(Math.floor(s) % 60) + ':' + pad(f);
    if (!reduz) requestAnimationFrame(relogio);
  }
  relogio();

  // ---------- faixa que corre com a rolagem ----------
  var faixa = $('#faixa'), fx = 0, ultimoY = window.scrollY, vel = 0;
  function faixaLoop() {
    var y = window.scrollY; vel += (y - ultimoY) * 0.04; ultimoY = y; vel *= 0.9;
    fx -= 0.6 + Math.abs(vel);
    var metade = faixa.scrollWidth / 2;
    if (-fx > metade) fx += metade;
    faixa.style.transform = 'translate3d(' + fx + 'px,0,0)';
    requestAnimationFrame(faixaLoop);
  }
  if (!reduz) faixaLoop();

  // ---------- revelar ao rolar ----------
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          io.unobserve(e.target);
          $$('[data-conta]', e.target).forEach(contar);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-rev]').forEach(function (el, i) {
      var irmaos = el.parentElement ? $$(':scope > [data-rev]', el.parentElement) : [];
      var k = irmaos.indexOf(el);
      if (k > 0) el.style.transitionDelay = Math.min(k * 0.08, 0.4) + 's';
      io.observe(el);
    });
  } else { $$('[data-rev]').forEach(function (el) { el.classList.add('on'); }); }

  function contar(el) {
    var alvo = +el.dataset.conta, pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    if (reduz) { el.textContent = pre + alvo + suf; return; }
    var ini = performance.now(), dur = 1400;
    (function passo(t) {
      var k = Math.min(1, (t - ini) / dur), v = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
      el.textContent = pre + v + suf;
      if (k < 1) requestAnimationFrame(passo);
    })(ini);
  }

  // ---------- vídeos: carregam perto da tela e pausam fora dela ----------
  var vids = $$('video.lazyv');
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px', threshold: 0.25 });
    vids.forEach(function (v) { vio.observe(v); });
  }

  // som da demonstração
  var vdemo = $('#vdemo'), som = $('#som');
  som.addEventListener('click', function () {
    if (!vdemo.src) { vdemo.src = vdemo.dataset.src; vdemo.load(); }
    var ligar = vdemo.muted;
    vdemo.muted = !ligar;
    if (ligar) vdemo.currentTime = 0;
    var p = vdemo.play(); if (p && p.catch) p.catch(function () {});
    som.setAttribute('aria-pressed', ligar ? 'true' : 'false');
    $('.som-txt', som).textContent = ligar ? 'Som ligado' : 'Ativar o som';
  });

  // ---------- calculadora ----------
  var qtd = $('#qtd'), val = $('#val');
  var brl = function (n) { return 'R$ ' + n.toLocaleString('pt-BR'); };
  function pinta(inp) { var p = (inp.value - inp.min) / (inp.max - inp.min) * 100; inp.style.setProperty('--p', p + '%'); }
  function calcula() {
    var q = +qtd.value, v = +val.value, mes = q * v;
    $('#oQtd').textContent = q;
    $('#oVal').textContent = brl(v);
    $('#rMes').textContent = brl(mes);
    $('#rAno').textContent = brl(mes * 12) + ' em 12 meses';
    var frase;
    if (v >= CONFIG.preco) frase = 'Menos do que 1 vídeo com editor';
    else frase = 'O mesmo que ' + (CONFIG.preco / v).toFixed(1).replace('.', ',') + ' vídeos com editor';
    $('#rFrase').textContent = frase;
    pinta(qtd); pinta(val);
  }
  qtd.addEventListener('input', calcula); val.addEventListener('input', calcula); calcula();
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { $('#conta').classList.add('vista'); cio.disconnect(); } }, { threshold: 0.4 });
    cio.observe($('.calc'));
  }

  // ---------- obra 3D ----------
  var palco = $('#obraPalco'), etapas = $$('.etapa'), pct = $('#obraPct'), barraObra = $('#obraBarra');
  var LIMITES = [0, 0.18, 0.40, 0.62, 0.80];
  window.__obraP = 0;
  function progressoObra() {
    var r = palco.getBoundingClientRect(), total = r.height - window.innerHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    window.__obraP = p;
    var i = 0; for (var k = 0; k < LIMITES.length; k++) if (p >= LIMITES[k]) i = k;
    etapas.forEach(function (e, j) { e.classList.toggle('on', j === i); });
    pct.textContent = Math.round(p * 100) + '%';
    barraObra.style.transform = 'scaleX(' + p + ')';
  }
  window.addEventListener('scroll', progressoObra, { passive: true });
  window.addEventListener('resize', progressoObra);
  progressoObra();

  function temWebGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  var carregou = false;
  function carrega3D() {
    if (carregou) return; carregou = true;
    import(new URL('casa3d.js', BASE_JS).href).then(function (m) {
      m.iniciarCasa($('#casa3d'), function () { return window.__obraP; }, $('#obra'));
    }).catch(function (err) {
      console.warn('3D indisponível', err);
      $('#obra').classList.add('sem3d');
    });
  }
  if (!temWebGL()) { $('#obra').classList.add('sem3d'); }
  else if ('IntersectionObserver' in window) {
    var oio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { carrega3D(); oio.disconnect(); } }, { rootMargin: '150% 0px' });
    oio.observe($('#obra'));
  } else carrega3D();
})();
