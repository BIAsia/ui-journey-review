// A journey is one graph: screenshots, conditions and directed edges.
(() => {
  const data = window.JOURNEY;
  const root = document.getElementById('journey');
  const make = (tag, props = {}, ...children) => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'class') element.className = value;
      else element.setAttribute(key, String(value));
    }
    for (const child of children.flat()) if (child != null) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return element;
  };
  const svg = (tag, props = {}, ...children) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(props)) element.setAttribute(key, String(value));
    element.append(...children);
    return element;
  };
  try {
    if (!data || data.schemaVersion !== 2 || !data.graph?.nodes?.length) throw new Error('Invalid journey');
    const branches = data.branches || [];
    const nodes = [...data.graph.nodes, ...branches.flatMap(branch => branch.nodes)];
    const ids = new Set(nodes.map(node => node.id));
    if (ids.size !== nodes.length || new Set(branches.map(branch => branch.id)).size !== branches.length) throw new Error('Duplicate id');
    for (const branch of branches) {
      if (!data.graph.nodes.some(node => node.id === branch.from) || !branch.nodes.length || !branch.bounds ||
          !['x', 'y', 'width', 'height'].every(key => Number.isFinite(branch.bounds[key])) ||
          branch.bounds.width <= 0 || branch.bounds.height <= 0) throw new Error('Invalid branch');
    }
    for (const node of nodes) {
      if (node.kind === 'screen' && !data.screens[node.screen]) throw new Error('Unknown screenshot');
    }
    for (const edge of [...data.graph.edges, ...branches.flatMap(branch => branch.edges)]) if (!ids.has(edge.from) || !ids.has(edge.to) || edge.points.length < 2) throw new Error('Unknown edge');
  } catch {
    root.append(make('p', {class:'journey-failure'}, 'Journey unavailable'));
    return;
  }
  document.title = data.title;
  const zoomOut = make('button', {class:'control', type:'button', 'aria-label':'Zoom out'}, '−');
  const zoomIn = make('button', {class:'control', type:'button', 'aria-label':'Zoom in'}, '+');
  const zoomValue = make('button', {class:'control zoom-value', type:'button', 'aria-label':'Reset zoom to 100%'}, '100%');
  const fit = make('button', {class:'control', type:'button'}, 'Fit to screen');
  const viewport = make('section', {class:'journey-viewport', tabindex:'0', 'aria-label':'User journey canvas. Drag or scroll to explore.'});
  const stage = make('div', {class:'journey-stage'});
  const canvas = make('div', {class:'journey-canvas'});
  stage.append(canvas); viewport.append(stage);
  const announcement = make('span', {class:'sr-only', 'aria-live':'polite'});
  let theme = 'light';
  try { theme = localStorage.getItem('journey-theme') === 'dark' ? 'dark' : 'light'; } catch {}
  document.documentElement.dataset.theme = theme;
  const themeButtons = [];
  const imageBindings = [];
  let openNode;
  const variantFor = screen => screen.variants?.[theme] || screen;
  function themeButton() {
    const button = make('button', {class:'control theme-toggle', type:'button', role:'switch', 'aria-label':'Dark mode', onClick:() => setTheme(theme === 'light' ? 'dark' : 'light')});
    themeButtons.push(button);
    return button;
  }
  function updateImage(binding) {
    const variant = variantFor(binding.screen);
    binding.button?.removeAttribute('data-failed');
    if (binding.button) {
      binding.button.replaceChildren(binding.image);
      binding.button.setAttribute('aria-label', `Enlarge: ${binding.image.alt}`);
    }
    binding.image.width = variant.width; binding.image.height = variant.height;
    binding.image.src = variant.src;
  }
  function setTheme(next) {
    theme = next;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('journey-theme', theme); } catch {}
    for (const button of themeButtons) {
      button.textContent = theme === 'light' ? 'Light' : 'Dark';
      button.setAttribute('aria-checked', String(theme === 'dark'));
    }
    for (const binding of imageBindings) updateImage(binding);
    if (openNode) fullImage.src = variantFor(data.screens[openNode.screen]).src;
  }
  const headerActions = make('div', {class:'header-actions'});
  const overflow = make('details', {class:'header-overflow'});
  const overflowToggle = make('summary', {class:'control', 'aria-label':'More actions'}, 'More');
  const branchControls = make('div', {class:'branch-controls'});
  overflow.append(overflowToggle);
  headerActions.append(branchControls, overflow, themeButton());
  const header = make('header', {class:'journey-header'}, make('div', {class:'journey-title'}, make('h1', {}, data.title), data.subtitle ? make('span', {}, data.subtitle) : null), headerActions);
  const canvasRegion = make('div', {class:'canvas-region'}, viewport,
    make('div', {class:'zoom-controls', role:'group', 'aria-label':'Canvas zoom'}, zoomOut, zoomValue, zoomIn, fit));
  root.append(header, canvasRegion, announcement);
  // Move the same actions into a native disclosure on compact screens.
  const compact = matchMedia('(max-width: 600px)');
  function placeActions() {
    overflow.open = false;
    if (compact.matches) overflow.append(branchControls);
    else headerActions.prepend(branchControls);
  }
  compact.addEventListener('change', placeActions);
  placeActions();
  document.addEventListener('click', event => { if (!overflow.contains(event.target)) overflow.open = false; });
  overflow.addEventListener('keydown', event => {
    if (event.key === 'Escape') { overflow.open = false; overflowToggle.focus(); }
  });
  const dialogTitle = make('h2', {id:'screen-dialog-title'});
  const dialogStatus = make('p', {class:'dialog-status'});
  const fullImage = make('img', {});
  const dialogActions = make('div', {class:'dialog-actions'});
  const close = make('button', {class:'control', type:'button', 'aria-label':'Close screenshot'}, 'Close ×');
  const dialog = make('dialog', {class:'image-dialog', 'aria-labelledby':'screen-dialog-title'}, make('header', {}, dialogTitle, make('div', {class:'dialog-controls'}, themeButton(), close)), dialogStatus, fullImage, dialogActions);
  document.body.append(dialog);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  let view = data.graph;
  const expanded = new Set();
  const returnViews = new Map();
  function rebuildView() {
    const branches = (data.branches || []).filter(branch => expanded.has(branch.id));
    view = {...data.graph,
      width: Math.max(data.graph.width, ...branches.map(branch => branch.bounds.x + branch.bounds.width)),
      height: Math.max(data.graph.height, ...branches.map(branch => branch.bounds.y + branch.bounds.height)),
      nodes: [...data.graph.nodes, ...branches.flatMap(branch => branch.nodes)],
      edges: [...data.graph.edges, ...branches.flatMap(branch => branch.edges)]};
    overflow.hidden = branches.length === 0;
    branchControls.replaceChildren(...branches.map(branch => make('button', {class:'control', type:'button', onClick:() => toggleBranch(branch, false)}, `Collapse ${branch.title} ×`)));
  }
  function focusBounds(bounds) {
    fitting = false;
    setScale(Math.min(1, (viewport.clientWidth - 48) / bounds.width, (viewport.clientHeight - 48) / bounds.height), false);
    const left = Math.max(0, (bounds.x + bounds.width / 2) * scale - viewport.clientWidth / 2);
    const top = Math.max(0, (bounds.y + bounds.height / 2) * scale - viewport.clientHeight / 2);
    stage.style.width = `${Math.max(view.width * scale, left + viewport.clientWidth)}px`;
    stage.style.height = `${Math.max(view.height * scale, top + viewport.clientHeight)}px`;
    viewport.scrollLeft = left; viewport.scrollTop = top;
  }
  function toggleBranch(branch, show = !expanded.has(branch.id)) {
    overflow.open = false;
    if (dialog.open) dialog.close();
    if (show) {
      returnViews.set(branch.id, {scale, left:viewport.scrollLeft, top:viewport.scrollTop, fitting});
      expanded.add(branch.id);
    } else expanded.delete(branch.id);
    rebuildView(); render();
    if (show) {
      focusBounds(branch.bounds);
      document.getElementById(`node-${branch.nodes[0].id}`).focus({preventScroll:true});
    } else {
      const origin = view.nodes.find(node => node.id === branch.from);
      const previous = returnViews.get(branch.id);
      if (previous) {
        fitting = previous.fitting; setScale(previous.scale, false);
        viewport.scrollTo(previous.left, previous.top); returnViews.delete(branch.id);
      } else focusBounds({x:origin.x - 40, y:origin.y - 40, width:640, height:600});
      document.querySelector(`#node-${branch.from} .branch-trigger`).focus({preventScroll:true});
    }
  }
  function branchButton(branch) {
    return make('button', {class:'control branch-trigger', type:'button', 'aria-expanded':expanded.has(branch.id), onClick:() => toggleBranch(branch)}, `${branch.action} ${expanded.has(branch.id) ? '−' : '+'}`);
  }
  let scale = 1, fitting = true;
  function openScreen(node) {
    const screen = data.screens[node.screen];
    openNode = node;
    dialogTitle.textContent = node.title;
    dialogStatus.textContent = [node.state, screen.historical ? screen.versionLabel : null].filter(Boolean).join(' · ');
    fullImage.src = variantFor(screen).src; fullImage.alt = `${node.title} · ${node.state || screen.title}`;
    dialogActions.replaceChildren(...(data.branches || []).filter(branch => branch.from === node.id).map(branchButton));
    dialog.showModal();
  }
  function setScale(next, preserveCenter = true) {
    const previous = scale;
    const center = [(viewport.scrollLeft + viewport.clientWidth / 2 - stage.offsetLeft) / previous, (viewport.scrollTop + viewport.clientHeight / 2) / previous];
    scale = Math.max(.05, Math.min(1.5, next));
    canvas.style.transform = `scale(${scale})`;
    stage.style.width = `${view.width * scale}px`; stage.style.height = `${view.height * scale}px`;
    zoomValue.textContent = `${Math.round(scale * 100)}%`;
    zoomOut.disabled = scale <= .05; zoomIn.disabled = scale >= 1.5;
    if (preserveCenter) {
      viewport.scrollLeft = center[0] * scale + stage.offsetLeft - viewport.clientWidth / 2;
      viewport.scrollTop = center[1] * scale - viewport.clientHeight / 2;
    }
  }
  function fitCanvas() {
    fitting = true;
    setScale(Math.min(1, (viewport.clientWidth - 24) / view.width, (viewport.clientHeight - 24) / view.height), false);
    viewport.scrollTo(0, 0);
  }
  // Round the authored route without moving its ports or introducing an auto-router.
  function connectorPath(points) {
    let path = `M ${points[0].join(' ')}`;
    for (let i = 1; i < points.length - 1; i++) {
      const [x, y] = points[i];
      const [px, py] = points[i - 1], [nx, ny] = points[i + 1];
      const incoming = Math.hypot(x - px, y - py), outgoing = Math.hypot(nx - x, ny - y);
      const radius = Math.min(16, incoming / 2, outgoing / 2);
      if (!radius) continue;
      const entry = [x + (px - x) * radius / incoming, y + (py - y) * radius / incoming];
      const exit = [x + (nx - x) * radius / outgoing, y + (ny - y) * radius / outgoing];
      path += ` L ${entry.join(' ')} Q ${x} ${y} ${exit.join(' ')}`;
    }
    return `${path} L ${points.at(-1).join(' ')}`;
  }
  function render() {
    imageBindings.length = 0;
    canvas.replaceChildren();
    canvas.style.width = `${view.width}px`; canvas.style.height = `${view.height}px`;
    const edges = svg('svg', {class:'connections', viewBox:`0 0 ${view.width} ${view.height}`, 'aria-hidden':'true'},
      svg('defs', {}, ...['neutral', 'error'].map(tone =>
        svg('marker', {id:`arrow-${tone}`, viewBox:'0 0 8 8', refX:6, refY:4, markerWidth:6, markerHeight:6, markerUnits:'userSpaceOnUse', orient:'auto'},
          svg('path', {class:`arrow-head ${tone}`, d:'M 2 1 L 6 4 L 2 7'})))));
    const labels = [];
    for (const edge of view.edges) {
      const tone = edge.tone === 'error' ? 'error' : 'neutral';
      edges.append(svg('path', {class:`connection ${tone}`, d:connectorPath(edge.points), 'marker-end':`url(#arrow-${tone})`}));
      if (edge.label) labels.push(make('span', {class:'edge-label', style:`left:${edge.labelAt[0]}px;top:${edge.labelAt[1]}px;`}, edge.label));
    }
    canvas.append(edges);
    for (const node of view.nodes) {
      const wrapper = make('article', {class:`journey-node${data.graph.nodes.includes(node) ? '' : ' branch-node'}`, id:`node-${node.id}`, 'data-node':node.id, tabindex:'-1', style:`left:${node.x}px;top:${node.y}px;width:${node.width || 160}px;`});
      if (node.kind === 'screen') {
        const screen = data.screens[node.screen];
        const variant = variantFor(screen);
        const image = make('img', {src:variant.src, alt:node.title, width:variant.width, height:variant.height, decoding:'async'});
        const button = make('button', {class:'screen-button', type:'button', 'aria-label':`Enlarge: ${node.title}`, onClick:() => {
          if (button.hasAttribute('data-failed')) {
            button.removeAttribute('data-failed'); button.replaceChildren(image);
            button.setAttribute('aria-label', `Enlarge: ${node.title}`); image.src = variantFor(screen).src;
          } else openScreen(node);
        }}, image);
        image.addEventListener('error', () => {
          button.dataset.failed = 'true'; button.setAttribute('aria-label', `Retry loading: ${node.title}`);
          button.replaceChildren(document.createTextNode('Screenshot unavailable · Click to retry'));
        });
        imageBindings.push({image, button, screen});
        const frame = make('div', {class:'screen-frame'}, button);
        const branches = (data.branches || []).filter(branch => branch.from === node.id);
        for (const branch of branches) {
          if (branch.hotspot) {
            const [x, y, width, height] = branch.hotspot;
            frame.append(make('button', {class:'screen-hotspot', type:'button', 'aria-label':branch.action, 'aria-expanded':expanded.has(branch.id), style:`left:${x}%;top:${y}%;width:${width}%;height:${height}%;`, onClick:() => toggleBranch(branch)}));
          }
        }
        wrapper.append(make('h2', {class:'screen-title'}, node.title), make('p', {class:'screen-state'}, node.state || '', screen.historical ? ` · ${screen.versionLabel}` : ''), frame, ...branches.map(branchButton));
      } else if (node.kind === 'decision') {
        wrapper.classList.add('decision');
        wrapper.append(svg('svg', {class:'decision-outline', viewBox:'0 0 160 76', preserveAspectRatio:'none', 'aria-hidden':'true'}, svg('polygon', {points:'14,1 146,1 159,38 146,75 14,75 1,38'})), make('span', {}, node.title));
      } else {
        wrapper.classList.add('text-node'); wrapper.append(make('strong', {}, node.title));
        if (node.state) wrapper.append(make('small', {}, node.state));
      }
      const outgoing = view.edges.filter(edge => edge.from === node.id);
      if (outgoing.length) wrapper.append(make('p', {class:'sr-only'}, outgoing.map(edge => `${edge.label || 'Continue'} → ${view.nodes.find(target => target.id === edge.to).title}`).join('; ')));
      canvas.append(wrapper);
    }
    canvas.append(...labels);
    setScale(scale, false);
    announcement.textContent = `${data.title}, complete user journey, ${view.nodes.filter(node => node.kind === 'screen').length} screen states`;
  }
  function locateFromURL() {
    const params = new URLSearchParams(location.search);
    const id = params.get('node');
    const targetID = data.nodeAliases?.[id] || id;
    const branch = (data.branches || []).find(branch => branch.nodes.some(node => node.id === targetID));
    if (branch && !expanded.has(branch.id)) { expanded.add(branch.id); rebuildView(); render(); }
    const node = view.nodes.find(item => item.id === targetID);
    if (!node) { fitCanvas(); return; }
    fitting = false; setScale(1, false);
    viewport.scrollLeft = Math.max(0, node.x - 40);
    viewport.scrollTop = Math.max(0, node.y - 40);
  }
  zoomOut.addEventListener('click', () => { fitting = false; setScale(scale - .1); });
  zoomIn.addEventListener('click', () => { fitting = false; setScale(scale + .1); });
  zoomValue.addEventListener('click', () => { fitting = false; setScale(1); });
  fit.addEventListener('click', fitCanvas);
  new ResizeObserver(() => { if (fitting) fitCanvas(); }).observe(viewport);
  // Blank canvas pans; screenshot buttons keep their native click and focus behavior.
  let pan;
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, a')) return;
    pan = {id:event.pointerId, x:event.clientX, y:event.clientY, left:viewport.scrollLeft, top:viewport.scrollTop, active:false};
  });
  viewport.addEventListener('pointermove', event => {
    if (!pan || pan.id !== event.pointerId) return;
    if (!pan.active && Math.hypot(event.clientX - pan.x, event.clientY - pan.y) < 4) return;
    pan.active = true;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-panning');
    viewport.scrollLeft = pan.left - (event.clientX - pan.x);
    viewport.scrollTop = pan.top - (event.clientY - pan.y);
  });
  const endPan = event => {
    if (!pan || pan.id !== event.pointerId) return;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    pan = null; viewport.classList.remove('is-panning');
  };
  viewport.addEventListener('pointerup', endPan);
  viewport.addEventListener('pointercancel', endPan);
  viewport.addEventListener('lostpointercapture', endPan);
  viewport.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault(); fitting = false;
    const rect = viewport.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const anchor = [(viewport.scrollLeft + x - stage.offsetLeft) / scale, (viewport.scrollTop + y) / scale];
    setScale(scale * Math.exp(-event.deltaY * .008), false);
    viewport.scrollLeft = anchor[0] * scale + stage.offsetLeft - x; viewport.scrollTop = anchor[1] * scale - y;
  }, {passive:false});
  window.addEventListener('popstate', locateFromURL);
  rebuildView(); render(); setTheme(theme); locateFromURL();
})();
