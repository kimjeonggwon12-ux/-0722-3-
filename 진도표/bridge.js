// 진도표 → 공부방 연결. 세 공부방(계시록 통달·초중고 신학·계시록 암기)이 함께 쓴다.
// 진도표의 미션 버튼은 '#plan:...' 주소로 들어오고, 여기서 그 화면을 바로 열어 준다.
// 진도표에서 넘어온 동안에는 화면 아래에 "진도표로 돌아가기" 버튼을 띄운다.
(function () {
    'use strict';

    function openTarget(target) {
        const p = target.split(':');
        // 계시록 통달
        if (/^ch\d+$/.test(p[0]) && typeof window.openChapterStudy === 'function') return window.openChapterStudy(p[0], p[1] === 'blank' ? 'blank' : 'answer');
        if (p[0] === 'star' && typeof window.openStarredBank === 'function') return window.openStarredBank();
        if (p[0] === 'g4study' && typeof startGrade4Study === 'function') return startGrade4Study();
        if (p[0] === 'g4exam' && typeof startGrade4Exam === 'function') return startGrade4Exam();
        if (p[0] === 'mock' && typeof startGradeMock === 'function') return startGradeMock(p[1]);
        // 초중고 신학
        if (p[0] === 'sub' && window.app && typeof window.app.selectSubject === 'function') return window.app.selectSubject(p[1]);
        if (p[0] === 'mock' && window.app && typeof window.app.selectGrade === 'function') return window.app.selectGrade(p[1]);
        // 계시록 암기: 장 선택 상자와 모드 버튼을 대신 눌러 준다
        const sel = document.getElementById('chapter-select');
        if (/^ch\d+$/.test(p[0]) && sel) {
            const btn = document.getElementById(p[1] === 'chapter' ? 'chapter-mode-btn' : 'verse-mode-btn');
            if (btn) btn.click();
            sel.value = p[0].slice(2);
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function showReturnButton() {
        if (document.getElementById('sion-plan-return')) return;
        const a = document.createElement('a');
        a.id = 'sion-plan-return';
        a.href = '../진도표/index.html';
        a.textContent = '📅 진도표로 돌아가기';
        a.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9998;background:#0f172a;color:#5eead4;' +
            'border-radius:999px;padding:10px 18px;font-size:14px;font-weight:900;text-decoration:none;box-shadow:0 8px 20px rgba(15,23,42,.4);white-space:nowrap;';
        document.body.appendChild(a);
    }

    window.addEventListener('load', () => {
        let from = false;
        try { from = sessionStorage.getItem('sion_plan_from') === '1'; } catch (e) { /* 무시 */ }
        const hash = decodeURIComponent(window.location.hash || '');
        if (hash.indexOf('#plan:') === 0) {
            from = true;
            try { sessionStorage.setItem('sion_plan_from', '1'); } catch (e) { /* 무시 */ }
            if (localStorage.getItem('sion_auth') === '2') {
                try { openTarget(hash.slice(6)); } catch (e) { console.error('진도표 연결 실패', e); }
            }
            try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* 무시 */ }
        }
        if (from) showReturnButton();
    });
})();
