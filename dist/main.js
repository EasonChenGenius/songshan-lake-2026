(() => {
  const progress = document.getElementById('scrollProgress');
  const masthead = document.getElementById('masthead');
  const toggle = document.getElementById('chaptersToggle');
  const sheet = document.getElementById('chaptersSheet');
  const current = document.getElementById('mobileCurrent');
  const sections = [...document.querySelectorAll('[data-chapter]')];
  const desktopLinks = [...document.querySelectorAll('.desktop-nav a')];
  const stages = [...document.querySelectorAll('.chapter-stage')];
  const routeGrid = document.querySelector('.route-grid');
  const hero = document.querySelector('.hero');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const names = {0:'序',1:'探测',2:'材料',3:'机器人',4:'生活',5:'人才',6:'结语'};
  let activeChapter = 0;
  let queued = false;
  let previousY = window.scrollY;

  // Progressive enhancement: every piece of copy remains visible if JS is off.
  document.documentElement.classList.add('motion-on');
  const revealTargets = [...stages, document.querySelector('.route-section'), ...document.querySelectorAll('.insight')].filter(Boolean);
  if ('IntersectionObserver' in window) {
    const appearance = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-visible');
          appearance.unobserve(entry.target);
        }
      }
    }, {rootMargin:'0px 0px -9% 0px', threshold:.1});
    revealTargets.forEach(node => appearance.observe(node));
  } else {
    revealTargets.forEach(node => node.classList.add('motion-visible'));
  }

  // The Chapter 04 title film is decorative: muted, seamless, and without controls.
  // Only play while the title is on screen; preserve the still poster for reduced motion.
  const lifeTitleVideo = document.getElementById('chapterLifeBackgroundVideo');
  if (lifeTitleVideo) {
    lifeTitleVideo.muted = true;
    lifeTitleVideo.defaultMuted = true;
    lifeTitleVideo.playsInline = true;
    let lifeTitleIsVisible = false;
    const syncLifeTitleVideo = () => {
      if (motionPreference.matches || document.hidden || !lifeTitleIsVisible) {
        lifeTitleVideo.pause();
      } else {
        const playPromise = lifeTitleVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
      }
    };
    if ('IntersectionObserver' in window) {
      const lifeTitleObserver = new IntersectionObserver(([entry]) => {
        lifeTitleIsVisible = entry.isIntersecting;
        syncLifeTitleVideo();
      }, {threshold:[0, .12]});
      lifeTitleObserver.observe(lifeTitleVideo);
    } else {
      lifeTitleIsVisible = true;
      syncLifeTitleVideo();
    }
    document.addEventListener('visibilitychange', syncLifeTitleVideo);
    if (typeof motionPreference.addEventListener === 'function') motionPreference.addEventListener('change', syncLifeTitleVideo);
  }

  // Replays a short approach when the robotics chapter is visited again.
  // A static, fully visible robot remains the fallback without IntersectionObserver.
  const robotStage = document.querySelector('#chapter-3 .stage-copper');
  if (robotStage && 'IntersectionObserver' in window) {
    robotStage.classList.add('robot-stage-ready');
    let hasEnteredRobotStage = false;
    const robotEntry = new IntersectionObserver(([entry]) => {
      if (!hasEnteredRobotStage && entry.intersectionRatio >= .28) {
        hasEnteredRobotStage = true;
        robotStage.classList.add('robot-approaching');
      } else if (hasEnteredRobotStage && entry.intersectionRatio <= .05) {
        hasEnteredRobotStage = false;
        robotStage.classList.remove('robot-approaching');
      }
    }, {threshold:[0,.05,.28,.6]});
    robotEntry.observe(robotStage);
  }

  const clamp = value => Math.max(0, Math.min(1, value));

  function updateMotion() {
    if (motionPreference.matches) {
      hero.classList.remove('is-scanning');
      stages.forEach(stage => stage.style.removeProperty('--scene-y'));
      routeGrid.style.removeProperty('--route-trace');
      masthead.classList.remove('is-hidden');
      return;
    }

    const vh = window.innerHeight;
    const routeBounds = routeGrid.getBoundingClientRect();
    if (routeBounds.bottom > -50 && routeBounds.top < vh + 50) {
      const progressOnRoute = clamp((vh * .85 - routeBounds.top) / (vh * .65 + routeBounds.height * .55));
      routeGrid.style.setProperty('--route-trace', `${Math.round(progressOnRoute * 1000) / 10}%`);
    }

    const travel = window.innerWidth <= 720 ? 9 : 27;
    for (const stage of stages) {
      const bounds = stage.getBoundingClientRect();
      if (bounds.bottom < -40 || bounds.top > vh + 40) continue;
      const normalized = (vh / 2 - (bounds.top + bounds.height / 2)) / ((vh + bounds.height) / 2);
      stage.style.setProperty('--scene-y', `${(normalized * travel).toFixed(1)}px`);
    }
  }

  function updateScrollUI() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    progress.style.width = `${Math.min(100, Math.max(0, window.scrollY / max * 100))}%`;
    masthead.classList.toggle('scrolled', window.scrollY > 40);
    const marker = window.scrollY + window.innerHeight * 0.48;
    for (const section of sections) {
      if (section.offsetTop <= marker) activeChapter = Number(section.dataset.chapter);
    }
    if (window.scrollY < sections[0].offsetTop - window.innerHeight * .5) activeChapter = 0;
    current.textContent = names[activeChapter] ?? '序';
    desktopLinks.forEach(link => link.classList.toggle('active', link.hash === (activeChapter === 0 ? '#prologue' : activeChapter === 6 ? '#epilogue' : `#chapter-${activeChapter}`)));
    const y = window.scrollY;
    if (!motionPreference.matches && y > window.innerHeight * .8 && y - previousY > 4 && !masthead.matches(':focus-within')) {
      masthead.classList.add('is-hidden');
    } else if (previousY - y > 4 || y < 90) {
      masthead.classList.remove('is-hidden');
    }
    previousY = y;
    updateMotion();
    queued = false;
  }

  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(updateScrollUI); }
  }, {passive:true});
  window.addEventListener('resize', updateScrollUI, {passive:true});
  motionPreference.addEventListener('change', updateScrollUI);
  window.addEventListener('pageshow', updateScrollUI);
  updateScrollUI();

  // One bright optical probe on fine pointers, echoing the report's title.
  // On touch or with reduced motion the hero remains a complete still image.
  let pendingProbe = false;
  let probeX = 0;
  let probeY = 0;
  hero.addEventListener('pointerenter', event => {
    if (finePointer.matches && !motionPreference.matches && event.pointerType === 'mouse') hero.classList.add('is-scanning');
  });
  hero.addEventListener('pointermove', event => {
    if (!finePointer.matches || motionPreference.matches || event.pointerType !== 'mouse') return;
    const bounds = hero.getBoundingClientRect();
    probeX = event.clientX - bounds.left;
    probeY = event.clientY - bounds.top;
    if (!pendingProbe) {
      pendingProbe = true;
      requestAnimationFrame(() => {
        hero.style.setProperty('--lens-x', `${probeX}px`);
        hero.style.setProperty('--lens-y', `${probeY}px`);
        pendingProbe = false;
      });
    }
  }, {passive:true});
  hero.addEventListener('pointerleave', () => hero.classList.remove('is-scanning'));

  function closeSheet() {
    sheet.hidden = true;
    toggle.setAttribute('aria-expanded','false');
  }
  toggle.addEventListener('click', () => {
    const willOpen = sheet.hidden;
    sheet.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
  sheet.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSheet));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSheet(); });
  document.addEventListener('click', event => {
    if (!event.target.closest('.mobile-chapter-nav') && !sheet.hidden) closeSheet();
  });

  // Chapter 03: silent looping when the clip enters view, with quiet controls.
  // Native video controls remain available when scripting is disabled.
  const fieldMedia = document.getElementById('xbotparkMedia');
  const fieldClip = document.getElementById('xbotparkVideo');
  const fieldPlayback = document.getElementById('xbotparkPlayback');
  const fieldAudio = document.getElementById('xbotparkAudio');
  if (fieldMedia && fieldClip && fieldPlayback && fieldAudio) {
    fieldClip.controls = false;
    fieldClip.loop = true;
    fieldClip.muted = true;
    fieldMedia.classList.add('is-enhanced');
    let fieldInView = false;
    let manuallyPaused = false;

    function updateFieldControls() {
      const paused = fieldClip.paused;
      const playbackLabel = paused ? '播放视频' : '暂停视频';
      const audioLabel = fieldClip.muted ? '开启现场声音' : '关闭现场声音';
      fieldPlayback.dataset.state = paused ? 'play' : 'pause';
      fieldPlayback.setAttribute('aria-label', playbackLabel);
      fieldPlayback.title = playbackLabel;
      fieldAudio.dataset.state = fieldClip.muted ? 'muted' : 'audible';
      fieldAudio.setAttribute('aria-label', audioLabel);
      fieldAudio.title = audioLabel;
      fieldAudio.setAttribute('aria-pressed', String(!fieldClip.muted));
    }

    function playFieldAutomatically() {
      if (!fieldInView || manuallyPaused || motionPreference.matches || navigator.connection?.saveData || document.hidden) return;
      fieldClip.muted = true;
      const started = fieldClip.play();
      if (started?.catch) started.catch(updateFieldControls);
    }

    if ('IntersectionObserver' in window) {
      const fieldObserver = new IntersectionObserver(([entry]) => {
        const isVisible = entry.intersectionRatio >= .45;
        if (isVisible && !fieldInView) {
          fieldInView = true;
          playFieldAutomatically();
        } else if (!isVisible && fieldInView) {
          fieldInView = false;
          fieldClip.pause();
          fieldClip.muted = true;
        }
        updateFieldControls();
      }, {threshold:[0, .45, .75]});
      fieldObserver.observe(fieldMedia);
    } else {
      fieldInView = true;
      playFieldAutomatically();
    }

    fieldPlayback.addEventListener('click', () => {
      if (fieldClip.paused) {
        manuallyPaused = false;
        const started = fieldClip.play();
        if (started?.catch) started.catch(updateFieldControls);
      } else {
        manuallyPaused = true;
        fieldClip.pause();
      }
      updateFieldControls();
    });

    fieldAudio.addEventListener('click', () => {
      fieldClip.muted = !fieldClip.muted;
      updateFieldControls();
    });

    fieldClip.addEventListener('play', updateFieldControls);
    fieldClip.addEventListener('pause', updateFieldControls);
    fieldClip.addEventListener('volumechange', updateFieldControls);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) fieldClip.pause();
      else playFieldAutomatically();
    });
    motionPreference.addEventListener('change', () => {
      if (motionPreference.matches) fieldClip.pause();
      else playFieldAutomatically();
    });
    updateFieldControls();
  }

  // Numbered field-photo galleries: a shared three-second interval, cycling only while visible.
  // The same motion and controls keep the photo essays visually consistent.
  const gallerySequences = [
    {id:'neutronGallery', entries:[
      {title:'站在门前，\n也站在问题的起点。', description:'第一张 · 研究所门前的一张合影，为这次参访留下坐标。'},
      {title:'有人专注倾听，\n有人举起镜头。', description:'第二张 · 讲解声里，学员用笔记与影像留住稍纵即逝的细节。'},
      {title:'一方沙盘之上，\n铺开研究的空间。', description:'第三张 · 在展厅沙盘前，原本陌生的科研设施渐渐有了轮廓。'}
    ]},
    {id:'materialsGallery', entries:[
      {title:'从一件展品，\n追问材料的另一面。', description:'第一张 · 非晶材料展区里，讲解与提问从一件件展品展开。'},
      {title:'隔着玻璃，\n看见实验留下的痕迹。', description:'第二张 · 研究人员指向展柜，解释样品背后的研究。'},
      {title:'问题在交谈中，\n生出新的问题。', description:'第三张 · 围着展柜的交流，让抽象材料有了可以追问的细节。'},
      {title:'把微观世界，\n带进一堂现场课。', description:'第四张 · 材料微观结构的讲解，为学员打开观察的另一种尺度。'}
    ]},
    {id:'huaweiGallery', entries:[
      {title:'从一扇门出发，\n走近运动的另一面。', description:'第一张 · 实验室入口的一张合影，是这天参访的开场。'},
      {title:'数据的背后，\n是关于身体的提问。', description:'第二张 · 跟随讲解，从运动体验走向研究方法。'},
      {title:'一边听，\n一边记下新的疑问。', description:'第三张 · 在华为标识前，学员认真听讲，也留下自己的观察。'},
      {title:'从设备细节里，\n寻找可靠的答案。', description:'第四张 · 运动测试区域的讲解，让技术有了可以触及的细节。'},
      {title:'当身体参与其中，\n理解便多了一层。', description:'第五张 · 羽毛球体验区里，运动不再只是纸面上的指标。'}
    ]},
    {id:'kayakingGallery', entries:[
      {title:'挥挥手，\n向湖面出发。', description:'第一张 · 湖边举起的手，留住了出发前轻松的一刻。'},
      {title:'救生衣穿好，\n把期待带上船。', description:'第二张 · 出发前的合影里，每个人都已做好下水准备。'},
      {title:'夕阳把湖面，\n写成一片金色。', description:'第三张 · 双人皮划艇划过落日余晖，桨叶轻触水面。'}
    ]},
    {id:'talentGallery', entries:[
      {title:'人群汇聚之处，\n故事有了新的主角。', description:'第一张 · 大湾区人才活动标识前，校媒学员留下合影。'},
      {title:'年轻的面孔，\n与一座新校园相遇。', description:'第二张 · 学员在大湾区大学的活动布景前记录当天。'},
      {title:'暮色落在校名石上，\n校园渐渐安静下来。', description:'第三张 · 大湾区大学校名石与校园建筑在同一幅画面中。'},
      {title:'从城市的一角，\n窥见产业的脉络。', description:'第四张 · 东莞主题展台，把城市故事和科技产品并置。'},
      {title:'机器出现在展台，\n未来暂时有了形状。', description:'第五张 · 人形机器人亮相活动展区，吸引观众驻足。'},
      {title:'镜头对着现场，\n也对着时代的提问。', description:'第六张 · 学员与媒体工作者举起设备，记录当天活动。'}
    ]}
  ];

  for (const {id, entries} of gallerySequences) {
    const gallery = document.getElementById(id);
    if (!gallery) continue;
    const frames = [...gallery.querySelectorAll('.health-gallery-slide')];
    const indicators = [...gallery.querySelectorAll('.health-gallery-progress span')];
    const counter = gallery.querySelector('.health-gallery-image-count strong');
    const totalCount = gallery.querySelector('.health-gallery-image-count span');
    const headline = gallery.querySelector('.health-gallery-story h3');
    const description = gallery.querySelector('.health-gallery-story p');
    const announcement = gallery.querySelector('.health-gallery-sr-only');
    const [previous, next] = gallery.querySelectorAll('.health-gallery-actions button');
    // The standard timing for this and all future photo galleries is 3 seconds.
    const duration = 3000;
    gallery.style.setProperty('--gallery-duration', `${duration}ms`);
    gallery.style.setProperty('--gallery-count', String(frames.length));
    if (totalCount) totalCount.textContent = `/ ${String(frames.length).padStart(2, '0')}`;
    let photoIndex = 0;
    let timer = null;
    let timerStarted = 0;
    let remaining = duration;
    let inView = false;
    let autoplayRequested = !motionPreference.matches && !navigator.connection?.saveData;

    function stopGalleryTimer() {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(150, remaining - (performance.now() - timerStarted));
    }

    function syncGalleryPlayback() {
      const shouldPlay = autoplayRequested && inView && !document.hidden;
      gallery.classList.toggle('is-paused', !shouldPlay);

      if (!shouldPlay) {
        stopGalleryTimer();
      } else if (timer === null) {
        timerStarted = performance.now();
        timer = setTimeout(() => {
          timer = null;
          showGalleryPhoto(photoIndex + 1);
        }, remaining);
      }
    }

    function showGalleryPhoto(nextIndex, manuallySelected = false) {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      remaining = duration;
      photoIndex = (nextIndex + frames.length) % frames.length;
      frames.forEach((photo, index) => {
        const selected = index === photoIndex;
        photo.classList.toggle('is-current', selected);
        photo.setAttribute('aria-hidden', String(!selected));
      });
      indicators.forEach((indicator, index) => {
        indicator.classList.toggle('is-current', index === photoIndex);
        indicator.classList.toggle('is-complete', index < photoIndex);
      });
      counter.textContent = String(photoIndex + 1).padStart(2, '0');
      headline.textContent = entries[photoIndex].title;
      description.textContent = entries[photoIndex].description;
      if (manuallySelected) announcement.textContent = `第 ${photoIndex + 1} 张，共 ${frames.length} 张。${entries[photoIndex].description}`;
      syncGalleryPlayback();
    }

    previous.addEventListener('click', () => showGalleryPhoto(photoIndex - 1, true));
    next.addEventListener('click', () => showGalleryPhoto(photoIndex + 1, true));
    gallery.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); showGalleryPhoto(photoIndex - 1, true); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); showGalleryPhoto(photoIndex + 1, true); }
    });

    if ('IntersectionObserver' in window) {
      const galleryObserver = new IntersectionObserver(([entry]) => {
        inView = entry.intersectionRatio >= .3;
        syncGalleryPlayback();
      }, {threshold:[0, .3, .6]});
      galleryObserver.observe(gallery);
    } else {
      inView = true;
    }
    document.addEventListener('visibilitychange', syncGalleryPlayback);
    motionPreference.addEventListener('change', () => {
      if (motionPreference.matches) autoplayRequested = false;
      syncGalleryPlayback();
    });
    syncGalleryPlayback();
  }
})();
