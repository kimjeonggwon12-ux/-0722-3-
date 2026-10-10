// 돋보기(글자 크기) 버튼 끌어서 옮기기 — 홈과 과목 페이지(계시록암기/도통계시록/신학기초), 구역예배·오늘의 양식·진도표가 함께 쓴다.
// 버튼 어디를 잡고 끌어도 움직이고, 옮긴 위치는 localStorage에 저장돼 모든 페이지에서 같은 자리에 뜬다.
// 처음(옮긴 적 없을 때)에는 뒤로가기/홈/로그아웃 버튼이 있는 위쪽을 피해 왼쪽 아래에 둔다.
(function() {
    const POS_KEY = 'sion_font_scale_pos';
    let box = document.getElementById('font-scale-control');

    // 돋보기 버튼이 따로 없는 페이지(구역예배·오늘의 양식·진도표 등)에서는 여기서 버튼과 글자 크기 조절을 직접 만든다.
    // 크기 단계는 다른 페이지와 같은 키(sion_font_scale)를 써서 어디서 바꿔도 모든 페이지에 똑같이 적용된다.
    // 확대할 곳은 <script data-zoom="#선택자">로 정할 수 있고, 없으면 돋보기 버튼만 빼고 화면 전체를 확대한다.
    if (!box) {
        if (!document.body) return;
        const FONT_SCALE_KEY = 'sion_font_scale';
        const FONT_SCALE_MAX = 2;
        const script = document.currentScript;
        const target = (script && script.dataset.zoom) || 'body > *:not(#font-scale-control)';
        const style = document.createElement('style');
        style.textContent = 'body.font-scale-1 ' + target + ' { zoom: 1.15; } body.font-scale-2 ' + target + ' { zoom: 1.3; }' +
            ' @media print { #font-scale-control { display: none !important; } }';
        document.head.appendChild(style);

        function loadFontScaleStage() {
            let n = NaN;
            try { n = parseInt(localStorage.getItem(FONT_SCALE_KEY), 10); } catch (e) { /* 무시 */ }
            return (Number.isInteger(n) && n >= 0 && n <= FONT_SCALE_MAX) ? n : 0;
        }
        function applyFontScaleStage(stage) {
            document.body.classList.remove('font-scale-1', 'font-scale-2');
            if (stage === 1) document.body.classList.add('font-scale-1');
            if (stage === 2) document.body.classList.add('font-scale-2');
        }
        window.changeFontScale = function(delta) {
            const next = Math.max(0, Math.min(FONT_SCALE_MAX, loadFontScaleStage() + delta));
            try { localStorage.setItem(FONT_SCALE_KEY, next); } catch (e) { /* 무시 */ }
            applyFontScaleStage(next);
        };
        window.resetFontScale = function() {
            try { localStorage.setItem(FONT_SCALE_KEY, 0); } catch (e) { /* 무시 */ }
            applyFontScaleStage(0);
        };
        applyFontScaleStage(loadFontScaleStage());

        box = document.createElement('div');
        box.id = 'font-scale-control';
        box.style.cssText = 'position:fixed;left:12px;bottom:16px;z-index:9999;display:flex;align-items:center;gap:5px;padding:5px;border-radius:9999px;' +
            'background:rgba(255,255,255,.96);border:1px solid #e2e8f0;box-shadow:0 6px 16px -4px rgba(0,0,0,.25);';
        [['🔍-', '글자 작게', function() { window.changeFontScale(-1); }],
         ['초기화', '글자 크기 초기화', function() { window.resetFontScale(); }],
         ['🔍+', '글자 크게', function() { window.changeFontScale(1); }]].forEach(function(d) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = d[0];
            btn.setAttribute('aria-label', d[1]);
            btn.style.cssText = 'height:38px;min-width:40px;padding:0 8px;border:0;border-radius:9999px;background:#f1f5f9;font-family:inherit;font-size:13px;font-weight:900;color:#334155;cursor:pointer;';
            btn.addEventListener('click', d[2]);
            box.appendChild(btn);
        });
        document.body.appendChild(box);
    }

    // 끌 수 있다는 걸 알려 주는 ⠿ 손잡이(없으면 맨 앞에 붙인다)
    let handle = box.querySelector('.fs-handle');
    if (!handle) {
        handle = document.createElement('span');
        handle.className = 'fs-handle';
        handle.textContent = '⠿';
        handle.title = '끌어서 옮기기';
        handle.setAttribute('aria-label', '끌어서 옮기기');
        handle.style.cssText = 'width:26px;height:44px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:18px;font-weight:900;';
        box.insertBefore(handle, box.firstChild);
    }
    box.style.touchAction = 'none';
    box.style.userSelect = 'none';
    box.style.webkitUserSelect = 'none';
    box.style.cursor = 'grab';

    function place(left, top) {
        const maxL = window.innerWidth - box.offsetWidth - 4;
        const maxT = window.innerHeight - box.offsetHeight - 4;
        left = Math.max(4, Math.min(maxL, left));
        top = Math.max(4, Math.min(maxT, top));
        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.style.right = 'auto';
        box.style.bottom = 'auto';
    }
    function placeDefault() {
        box.style.left = '12px';
        box.style.top = 'auto';
        box.style.right = 'auto';
        box.style.bottom = '16px';
    }

    // 저장된 자리로 놓는다(화면보다 크면 화면 안으로만 당겨 보여 주고, 저장값은 그대로 둔다)
    function placeSaved() {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(POS_KEY)); } catch (e) { /* 무시 */ }
        if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) place(saved.left, saved.top);
        else placeDefault();
    }
    placeSaved();

    // 손가락이 6px 이상 움직였을 때만 '끌기'로 보고, 그때는 손을 뗄 때 버튼 눌림이 일어나지 않게 막는다.
    let dx = 0, dy = 0, sx = 0, sy = 0, pressing = false, dragging = false, suppressClick = false;
    box.addEventListener('pointerdown', function(e) {
        const r = box.getBoundingClientRect();
        dx = e.clientX - r.left;
        dy = e.clientY - r.top;
        sx = e.clientX;
        sy = e.clientY;
        pressing = true;
        dragging = false;
        if (e.target === handle) e.preventDefault();
    });
    window.addEventListener('pointermove', function(e) {
        if (!pressing) return;
        // 손을 뗐는데 pointerup을 못 받은 경우(페이지 다른 코드가 가로챈 경우 등) 따라다니지 않게
        if (e.buttons === 0) { endDrag(); return; }
        if (!dragging) {
            if (Math.abs(e.clientX - sx) < 6 && Math.abs(e.clientY - sy) < 6) return;
            dragging = true;
            box.style.cursor = 'grabbing';
            box.style.opacity = '.85';
        }
        e.preventDefault();
        place(e.clientX - dx, e.clientY - dy);
    }, { passive: false, capture: true });
    function endDrag() {
        pressing = false;
        if (!dragging) return;
        dragging = false;
        suppressClick = true;
        setTimeout(function() { suppressClick = false; }, 400);
        box.style.cursor = 'grab';
        box.style.opacity = '';
        const r = box.getBoundingClientRect();
        try { localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top })); } catch (e) { /* 무시 */ }
    }
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
    box.addEventListener('click', function(e) {
        if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; }
    }, true);

    // 화면을 돌리거나 주소창·키보드 때문에 잠깐 작아져도 화면 밖으로 나가지 않게 하되,
    // 원래 옮겨 둔 자리는 잊지 않고 화면이 돌아오면 다시 그 자리로 간다.
    window.addEventListener('resize', function() {
        if (!dragging) placeSaved();
    });
})();
