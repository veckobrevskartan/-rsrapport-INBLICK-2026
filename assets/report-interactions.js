/* Interaktioner för sannolikhetsmätare och kapitelvisualiseringar. */
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const meters = Array.from(document.querySelectorAll('.chapter-meter-range[data-fill]'));

  function fillMeter(target) {
    const circle = target.matches && target.matches('.chapter-meter-range')
      ? target
      : target.querySelector('.chapter-meter-range[data-fill]');
    if (!circle || circle.dataset.animated === 'true') return;
    circle.dataset.animated = 'true';
    const fill = Math.max(0, Math.min(100, Number(circle.getAttribute('data-fill')) || 0));
    circle.style.strokeDasharray = '0 100';
    if (reduceMotion) {
      circle.style.strokeDasharray = fill + ' 100';
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        circle.style.strokeDasharray = fill + ' 100';
      });
    });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) fillMeter(entry.target); });
    }, { threshold:.08, rootMargin:'0px' });
    meters.forEach(function (circle) { observer.observe(circle.closest('.chapter-meter') || circle); });
  } else {
    meters.forEach(fillMeter);
  }

  const root = document.querySelector('#hormuz-marknadsbild');
  if (!root) return;
  const svg = root.querySelector('[data-hormuz-chart]');
  const pane = root.querySelector('#hormuz-chart-pane');
  const readout = root.querySelector('[data-hormuz-readout]');
  const note = root.querySelector('[data-hormuz-note]');
  const tabs = Array.from(root.querySelectorAll('[data-hormuz-mode]'));
  const controlGroups = Array.from(root.querySelectorAll('[data-hormuz-controls]'));
  if (!svg || !pane || !readout) return;

  const series = {
    brent: {
      name:'Brentolja', unit:'USD/fat', color:'#e5c85d', mode:'prices',
      labels:['Kv 4 2025','Kv 1 2026','Kv 2 2026','Juli 2026','Augusti 2026','September 2026','Oktober 2026'],
      values:[63.7,80.5,104.4,83.4,90.9,116.8,125.0], base:63.7
    },
    gas: {
      name:'Europeisk TTF-gas', unit:'USD/MMBtu', color:'#65b8c7', mode:'prices',
      labels:['Kv 4 2025','Kv 1 2026','Kv 2 2026','Juli 2026','Augusti 2026','September 2026','Oktober 2026'],
      values:[10.26,13.63,15.58,18.06,21.11,25.42,28.50], base:10.26
    },
    'oil-total': {
      name:'Olja totalt', unit:'mn fat/dag', color:'#e5c85d', mode:'flows',
      labels:['Kv 1 2025','Kv 2 2025','Kv 3 2025','Kv 4 2025','Kv 1 2026','Kv 2 2026'],
      values:[20.9,21.0,21.3,21.6,14.9,4.9], base:20.9
    },
    crude: {
      name:'Råolja och kondensat', unit:'mn fat/dag', color:'#d48854', mode:'flows',
      labels:['Kv 1 2025','Kv 2 2025','Kv 3 2025','Kv 4 2025','Kv 1 2026','Kv 2 2026'],
      values:[14.8,14.9,15.0,15.9,10.9,3.7], base:14.8
    },
    products: {
      name:'Oljeprodukter', unit:'mn fat/dag', color:'#9d86d8', mode:'flows',
      labels:['Kv 1 2025','Kv 2 2025','Kv 3 2025','Kv 4 2025','Kv 1 2026','Kv 2 2026'],
      values:[6.2,6.2,6.3,5.7,4.0,1.1], base:6.2
    },
    lng: {
      name:'LNG', unit:'miljarder kubikfot/dag', color:'#65b8c7', mode:'flows',
      labels:['Kv 1 2025','Kv 2 2025','Kv 3 2025','Kv 4 2025','Kv 1 2026','Kv 2 2026'],
      values:[11.7,11.0,10.9,10.5,7.4,0.8], base:11.7
    }
  };
  const ns = 'http://www.w3.org/2000/svg';
  const make = function (tag, attrs, value) {
    const element = document.createElementNS(ns, tag);
    Object.keys(attrs || {}).forEach(function (key) { element.setAttribute(key, attrs[key]); });
    if (value !== undefined) element.textContent = value;
    return element;
  };
  function activeMode() {
    const selected = tabs.find(function (tab) { return tab.getAttribute('aria-selected') === 'true'; });
    return selected ? selected.getAttribute('data-hormuz-mode') : 'prices';
  }
  function selectedSeries(mode) {
    const active = root.querySelector('[data-hormuz-controls="' + mode + '"]');
    return active ? Array.from(active.querySelectorAll('[data-hormuz-series]'))
      .filter(function (button) { return button.getAttribute('aria-pressed') === 'true'; })
      .map(function (button) { return button.getAttribute('data-hormuz-series'); }) : [];
  }
  function setReadout(id, index) {
    const item = series[id];
    const actual = item.values[index];
    const normalized = Math.round(actual / item.base * 100);
    const suffix = item.mode === 'prices' ? ' · index Q4 2025 = 100' : ' · index Q1 2025 = 100';
    readout.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = item.name + ' · ' + item.labels[index] + ': ';
    readout.appendChild(strong);
    readout.appendChild(document.createTextNode('index ' + normalized + suffix + ' · faktiskt värde ' +
      actual.toLocaleString('sv-SE', { minimumFractionDigits:actual % 1 ? 1 : 0, maximumFractionDigits:2 }) + ' ' + item.unit + '.'));
  }
  function render() {
    const mode = activeMode();
    const ids = selectedSeries(mode);
    const definitions = mode === 'prices'
      ? [{ id:'brent' },{ id:'gas' }]
      : [{ id:'oil-total' },{ id:'crude' },{ id:'products' },{ id:'lng' }];
    const labels = series[definitions[0].id].labels;
    const width = 820, height = 400, left = 68, right = 24, top = 28, bottom = 72;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const maxIndex = ids.reduce(function (max, id) {
      return Math.max(max, ...series[id].values.map(function (value) { return value / series[id].base * 100; }));
    }, 100);
    const step = mode === 'prices' ? 50 : 20;
    const yMax = Math.ceil((maxIndex + 2) / step) * step;
    svg.replaceChildren();
    svg.appendChild(make('title', { id:'hormuz-chart-svg-title' }, mode === 'prices' ? 'Index för olje- och gaspriser' : 'Index för leveranser genom Hormuzsundet'));
    svg.appendChild(make('desc', { id:'hormuz-chart-svg-desc' }, mode === 'prices'
      ? 'Brentolja och europeisk naturgas, indexerade med fjärde kvartalet 2025 som 100. Punktvärden visar faktiska priser.'
      : 'Olja och flytande naturgas, indexerade med första kvartalet 2025 som 100. Punktvärden visar faktiska transportvolymer.'));
    const grid = make('g', { 'aria-hidden':'true' });
    for (let value = 0; value <= yMax; value += step) {
      const y = top + plotHeight * (1 - value / yMax);
      grid.appendChild(make('line', { x1:left, y1:y, x2:width-right, y2:y, class:'chart-grid' }));
      grid.appendChild(make('text', { x:left-12, y:y+4, 'text-anchor':'end', class:'chart-axis' }, String(value)));
    }
    grid.appendChild(make('line', { x1:left, y1:top+plotHeight, x2:width-right, y2:top+plotHeight, class:'chart-grid' }));
    svg.appendChild(grid);
    const x = function (index) { return left + (labels.length === 1 ? 0 : plotWidth * index / (labels.length - 1)); };
    labels.forEach(function (_, index) {
      const shortLabel = mode === 'prices'
        ? ['Q4 25','Q1 26','Q2 26','Jul 26','Aug 26','Sep 26','Okt 26'][index]
        : ['Q1 25','Q2 25','Q3 25','Q4 25','Q1 26','Q2 26'][index];
      svg.appendChild(make('text', { x:x(index), y:height-40, 'text-anchor':'middle', class:'chart-axis-strong' }, shortLabel));
    });
    svg.appendChild(make('text', { x:left, y:height-12, class:'chart-axis' },
      mode === 'prices' ? 'Index (Q4 2025 = 100)' : 'Index (Q1 2025 = 100)'));
    if (!ids.length) {
      svg.appendChild(make('text', { x:width/2, y:top+plotHeight/2, 'text-anchor':'middle', class:'chart-axis-strong' }, 'Välj minst en serie'));
      return;
    }
    ids.forEach(function (id) {
      const item = series[id];
      const values = item.values.map(function (value) { return value / item.base * 100; });
      const coords = values.map(function (value, index) {
        return [x(index), top + plotHeight * (1 - value / yMax)];
      });
      const path = coords.map(function (coord, index) {
        return (index ? 'L' : 'M') + coord[0].toFixed(1) + ' ' + coord[1].toFixed(1);
      }).join(' ');
      const group = make('g', { style:'--series-color:' + item.color, 'aria-label':item.name });
      group.appendChild(make('path', { d:path, class:'chart-line' }));
      coords.forEach(function (coord, index) {
        const circle = make('circle', {
          cx:coord[0], cy:coord[1], r:5.5, class:'chart-point', tabindex:'0',
          role:'button', 'aria-label':item.name + ', ' + item.labels[index] + ', index ' + Math.round(values[index])
        });
        circle.addEventListener('click', function () { setReadout(id, index); });
        circle.addEventListener('focus', function () { setReadout(id, index); });
        circle.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setReadout(id, index);
          }
        });
        group.appendChild(circle);
      });
      svg.appendChild(group);
    });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const mode = tab.getAttribute('data-hormuz-mode');
      tabs.forEach(function (item) {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.setAttribute('tabindex', active ? '0' : '-1');
      });
      pane.setAttribute('aria-labelledby', tab.id);
      controlGroups.forEach(function (group) { group.hidden = group.getAttribute('data-hormuz-controls') !== mode; });
      readout.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = mode === 'prices' ? 'Prisindex: ' : 'Flödesindex: ';
      readout.append(strong, document.createTextNode(mode === 'prices'
        ? 'Q4 2025 = 100. Välj en punkt för månad och faktiskt pris.'
        : 'Q1 2025 = 100. Välj en punkt för kvartal och faktisk volym.'));
      note.textContent = mode === 'prices'
        ? 'Priser: index Q4 2025 = 100, månadsdata till oktober 2026. Tabellen visar de faktiska priserna.'
        : 'Flöden: index Q1 2025 = 100, kvartalsdata till Q2 2026. Olja och LNG har olika måttenheter; punkterna visar faktiska volymer.';
      render();
    });
  });
  controlGroups.forEach(function (group) {
    group.querySelectorAll('[data-hormuz-series]').forEach(function (button) {
      button.addEventListener('click', function () {
        button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        render();
      });
    });
  });
  render();
})();

