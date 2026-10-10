// 합격 공부 진도표 — 12과목(3과목 × 4급수) 계획표 데이터, 진도 저장, 홈 상단 보드, 진도표 화면.
// 루트 index.html(#sion-plan-banner)과 진도표/index.html(#jd-page)이 함께 쓴다.
(function () {
    'use strict';

    const START = '2026-10-15';
    const EXAM = '2026-11-15';
    const STORE_KEY = 'sion_plan_progress';   // { 과목키: { 'YYYY-MM-DD': { 미션id: 완료시각 } } }
    const MY_KEY = 'sion_my_subjects';        // 내가 신청한 과목 ['tongdal-grade1', ...] (오늘의 양식 '내 과목'과 같은 저장소)
    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
    const SUBJECTS = { theology: '초중고 신학', tongdal: '계시록 통달', memo: '계시록 암기' };
    const SUBJECT_ORDER = ['theology', 'tongdal', 'memo'];
    const GRADES = [4, 3, 2, 1];
    const TONES = { indigo: '#4f46e5', teal: '#0d9488', sky: '#0284c7', violet: '#7c3aed', purple: '#9333ea', fuchsia: '#c026d3', rose: '#e11d48', amber: '#d97706', slate: '#64748b' };

    // ---------- 날짜 ----------
    function parseDate(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
    function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function todayStr() { return fmtDate(new Date()); }
    function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); }
    function diffDays(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
    function shortDate(s) { const d = parseDate(s); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WEEKDAYS[d.getDay()] + ')'; }
    function rl(a) {
        if (a.length === 1) return String(a[0]);
        return a.every((c, i) => i === 0 || c === a[i - 1] + 1) ? a[0] + '~' + a[a.length - 1] : a.join('·');
    }
    function chunk(total, n) {   // total개를 n일로 고르게 나눈 [시작, 끝] 목록
        const out = []; let from = 1;
        for (let i = 0; i < n; i++) { const size = Math.ceil((total - from + 1) / (n - i)); out.push([from, from + size - 1]); from += size; }
        return out;
    }

    // ---------- 계획표 만들기 (공통 뼈대: 25일 본 학습 + 5일 매일 모의고사 + 전날 + 시험일) ----------
    const REST = { id: 'rest', label: '일찍 자기', links: [] };
    function mockMission(name, goal, href, auto) {
        return { id: 'mock', isMock: true, goal, auto, label: name + ' 1회' + (goal ? ' (목표 ' + goal + '점)' : ' (출발 점수)'), links: [{ text: '모의고사 풀기', href }] };
    }
    function finish(key, days, o) {
        if (days.length !== 25) console.warn('[진도표] ' + key + ' 본 학습이 25일이 아님: ' + days.length);
        for (let i = 0; i < 5; i++) days.push({ tag: '모의', tone: 'amber', title: '매일 공부할 것', m: o.final });
        days.push({ tag: '마무리', tone: 'slate', title: '가볍게 마무리', m: o.last.concat([REST]) });
        days.push({ tag: '시험', exam: true, title: '시험일', m: [] });
        days.forEach((d, i) => { d.date = addDays(START, i); });
        const [s, g] = key.split('-grade');
        return { key, subject: s, grade: Number(g), name: SUBJECTS[s] + ' ' + g + '급', tip: o.tip, guide: o.guide, days, byDate: Object.fromEntries(days.map(d => [d.date, d])) };
    }

    // ── 계시록 통달 3~1급: 장별 "전체 문답 읽기 → 괄호 넣기", 어제 본 장 다시 풀기 + 자기 전 별표 모음
    const TD = '../도통계시록/index.html#plan:';
    const TD_STAR = { id: 'star', label: '자기 전 별표 모음', links: [{ text: '⭐ 별표 모음', href: TD + 'star' }] };
    const TD_GUIDE = [
        '<b>① 어제 본 장 괄호 넣기 (15분)</b> 가장 먼저 풉니다. 틀린 문답에는 ☆별표를 답니다.',
        '<b>② 오늘 장 전체 문답 읽기 (30~40분)</b> 문답 5개씩 끊어 읽고, 답을 가린 채 입으로 말해 봅니다.',
        '<b>③ 오늘 장 괄호 넣기 (15분)</b> 읽은 직후 한 번 풉니다. 조사(은/는/이/가)는 채점하지 않으니 핵심 낱말만 정확히 씁니다.',
        '<b>④ 자기 전 별표 모음 (10분)</b> 별표한 문답만 다시 봅니다.',
        '<b>모의고사 날</b> 점수보다 틀린 문항이 중요합니다. 목표 점수에 못 미치면 분량을 늘리지 말고 틀린 것만 다시 봅니다.',
        '<b>하루 30분뿐이라면</b> 달력에서 남색(첫 구간) 장만 끝까지 갑니다. 출제 비중이 가장 큰 범위입니다.'
    ];
    function tongdalPlan(grade, o, build) {
        const days = []; let prev = [];
        const chLinks = (chs, mode) => chs.map(c => ({ text: '계 ' + c + '장', href: TD + 'ch' + c + ':' + mode }));
        const mock = goal => mockMission(grade + '급 모의고사', goal, TD + 'mock:grade' + grade, { key: 'sion_tongdal_mockhistory', field: 'gradeKey', value: 'grade' + grade });
        const h = {
            read: (c, note) => ({ id: 'read:' + c, chs: [c], label: c + '장 전체 문답 읽기' + (note ? ' (' + note + ')' : ''), links: chLinks([c], 'answer') }),
            blank: (chs, suffix) => ({ id: 'blank:' + chs.join('_'), chs, isBlank: true, label: rl(chs) + '장 괄호 넣기' + (suffix || ''), links: chLinks(chs, 'blank') }),
            mock,
            day(tag, tone, title, ms) {
                const cur = [], blanks = [];
                ms.forEach(m => { (m.chs || []).forEach(c => { if (!cur.includes(c)) cur.push(c); }); if (m.isBlank) blanks.push(...m.chs); });
                const out = ms.slice();
                // 어제 본 장 다시 풀기: 오늘 괄호 넣기와 같은 장이거나 4개 장 이상이면 생략
                if (prev.length && prev.length <= 3 && !prev.every(c => blanks.includes(c))) out.unshift({ id: 'review', label: '어제 본 ' + rl(prev) + '장 괄호 넣기 다시', links: chLinks(prev, 'blank') });
                out.push(TD_STAR);
                days.push({ tag, tone, title, m: out });
                prev = cur;
            },
            // 한 장을 이틀에(첫째 날 읽기, 둘째 날 괄호 넣기), 문답이 많은 장은 사흘에, 적은 장은 하루에
            chapter(c, n, tone, extra) {
                if (n === 1) return h.day(c + '장', tone, c + '장 · 하루에 끝내기', [h.read(c), h.blank([c])].concat(extra || []));
                if (n === 3) {
                    h.day(c + '장', tone, c + '장 · 첫째 날', [h.read(c, '앞 절반')]);
                    h.day(c + '장', tone, c + '장 · 둘째 날', [h.read(c, '뒤 절반')]);
                    return h.day(c + '장', tone, c + '장 · 셋째 날', [h.blank([c])].concat(extra || []));
                }
                h.day(c + '장', tone, c + '장 · 첫째 날', [h.read(c)]);
                h.day(c + '장', tone, c + '장 · 둘째 날', [h.blank([c])].concat(extra || []));
            },
            fast(chs, tone, word, extra) { h.day(rl(chs) + '장', tone, rl(chs) + '장 ' + word, [h.blank(chs, word === '빠르게' ? ' 먼저, 틀린 것만 읽기' : '')].concat(extra || [])); }
        };
        build(h);
        days[0].m.unshift(mock(0));
        return finish('tongdal-grade' + grade, days, {
            tip: o.tip, guide: TD_GUIDE,
            final: [mock(90), { id: 'wrong', label: '틀린 문항 다시보기', links: [{ text: '응시 기록', href: '../도통계시록/index.html#grade' }] }, TD_STAR],
            last: [{ id: 'star', label: '별표 모음만 가볍게', links: TD_STAR.links }]
        });
    }

    // ── 계시록 통달 4급: 전장 기본 144문항을 하루 2장씩, 세 번 돈다
    function tongdal4Plan() {
        const days = []; let prev = null;
        const study = [{ text: '4급 범위 공부', href: TD + 'g4study' }];
        const mock = goal => mockMission('4급 모의고사', goal, TD + 'mock:grade4', { key: 'sion_tongdal_mockhistory', field: 'gradeKey', value: 'grade4' });
        const exam = { id: 'g4exam', label: '4급 전체 시험(144문항) 1회', links: [{ text: '전체 시험', href: TD + 'g4exam' }] };
        const part = (a, b, tone, word, review) => {
            const m = [{ id: 'g4:' + a, label: '144문항 중 ' + a + '~' + b + '장 ' + word, links: study }];
            if (review && prev) m.unshift({ id: 'review', label: '어제 본 ' + prev + '장 다시 풀기', links: study });
            days.push({ tag: a + '~' + b + '장', tone, title: a + '~' + b + '장 ' + word, m });
            prev = a + '~' + b;
        };
        for (let c = 1; c <= 21; c += 2) part(c, c + 1, 'indigo', '풀기', true);
        [[1, 4], [5, 8], [9, 12], [13, 16], [17, 19], [20, 22]].forEach(r => part(r[0], r[1], 'teal', '두 번째', false));
        days.push({ tag: '전체', tone: 'amber', title: '4급 전체 시험', m: [exam] });
        [[1, 4], [5, 8], [9, 12], [13, 17], [18, 22]].forEach(r => part(r[0], r[1], 'violet', '틀린 것만', false));
        days.push({ tag: '전체', tone: 'amber', title: '4급 전체 시험', m: [exam] });
        days.push({ tag: '모의', tone: 'amber', title: '모의고사로 점검', m: [mock(80), { id: 'wrong', label: '틀린 문항 다시 풀기', links: study }] });
        days[0].m.unshift(mock(0));
        return finish('tongdal-grade4', days, {
            tip: '144문항을 하루 2장씩, 세 번 돕니다.',
            guide: [
                '<b>① 어제 본 2장 다시 풀기 (10분)</b> 답을 가리고 먼저 써 봅니다.',
                '<b>② 오늘 2장 풀기 (20~30분)</b> 성구 본문을 소리 내어 읽고, 괄호에 들어갈 말을 직접 씁니다.',
                '<b>③ 틀린 문항은 그 자리에서 3번</b> 다시 써 보고 넘어갑니다.',
                '<b>두 번째·세 번째</b> 맞힌 문항은 건너뛰고 틀렸던 문항만 봅니다.',
                '<b>전체 시험 날</b> 144문항을 처음부터 끝까지 한 번에 풀고, 틀린 장을 적어 둡니다.'
            ],
            final: [mock(90), { id: 'wrong', label: '틀린 문항 다시 풀기', links: study }],
            last: [{ id: 'light', label: '틀렸던 문항만 가볍게', links: study }]
        });
    }

    // ── 초중고 신학: 제목 → 비유 → 종강 시험 순서로 쌓고, 두 번째는 시험 모드로 안 보고 쓴다
    const TH = '../신학기초/index.html#plan:';
    const TS = {
        elem: ['초등 제목', '초제목', 'teal', 24], mid: ['중등 제목', '중제목', 'sky', 26], high: ['고등 제목', '고제목', 'indigo', 24],
        parable: ['초등 비유', '비유', 'rose', 65], elemFinal: ['초등 종강', '초종강', 'violet', 20], midFinal: ['중등 종강', '중종강', 'purple', 20], totalFinal: ['수료 종합', '수료', 'fuchsia', 40]
    };
    function theologyPlan(grade, o, build) {
        const days = []; let prev = null;
        const link = (sub, text) => [{ text: text || TS[sub][0], href: TH + 'sub:' + sub }];
        const mock = goal => mockMission('신학 ' + grade + '급 모의고사', goal, TH + 'mock:grade' + grade, { key: 'sion_theology_history', field: 'subject', value: 'grade' + grade });
        const h = {
            mock,
            learn(sub, n) {   // 새로 외우기: n일에 나눠서
                chunk(TS[sub][3], n).forEach(([a, b]) => {
                    const m = [{ id: 'new:' + sub + a, label: TS[sub][0] + ' ' + a + '~' + b + '번 외우기', links: link(sub, TS[sub][0] + ' 연습') }];
                    if (prev) m.unshift({ id: 'review', label: '어제 외운 ' + prev.label + ' 다시 쓰기', links: link(prev.sub) });
                    days.push({ tag: TS[sub][1], tone: TS[sub][2], title: TS[sub][0] + ' ' + a + '~' + b + '번', m });
                    prev = { sub, label: TS[sub][0] + ' ' + a + '~' + b + '번' };
                });
            },
            redo(sub, n) {    // 두 번째: 안 보고 쓰기
                chunk(TS[sub][3], n).forEach(([a, b]) => {
                    const all = n === 1;
                    days.push({ tag: TS[sub][1], tone: TS[sub][2], title: TS[sub][0] + (all ? ' 전체' : ' ' + a + '~' + b + '번') + ' 두 번째',
                        m: [{ id: 'redo:' + sub + a, label: TS[sub][0] + (all ? ' 전체' : ' ' + a + '~' + b + '번') + ' 안 보고 쓰기', links: link(sub, TS[sub][0] + ' 시험 모드') }] });
                });
                prev = null;
            },
            test(subs, title) {   // 여러 과목을 시험 모드로 한 번에
                days.push({ tag: '점검', tone: 'amber', title, m: subs.map(sub => ({ id: 'test:' + sub, label: TS[sub][0] + ' 전체 시험 모드', links: link(sub) })) });
                prev = null;
            },
            weak() { days.push({ tag: '점검', tone: 'amber', title: '틀린 것만 다시', m: [{ id: 'weak', label: '틀린 문항·별표만 다시 쓰기', links: [{ text: '신학 공부방', href: '../신학기초/index.html' }] }] }); prev = null; },
            plus(m) { days[days.length - 1].m.push(m); }
        };
        build(h);
        days[0].m.unshift(mock(0));
        return finish('theology-grade' + grade, days, {
            tip: o.tip,
            guide: [
                '<b>① 어제 분량 안 보고 쓰기 (10분)</b> 가장 먼저 합니다. 못 쓴 문항에는 ⭐별표를 답니다.',
                '<b>② 오늘 분량 읽기 (15분)</b> 연습 모드에서 답을 보며 소리 내어 3번 읽습니다.',
                '<b>③ 가리고 쓰기 (20분)</b> 답을 가리고 직접 씁니다. 눈으로 아는 것과 쓸 수 있는 것은 다릅니다.',
                '<b>제목</b>은 "번호 · 제목 · 성구"를 한 묶음으로, <b>종강·수료</b>는 ①②③ 소문항 순서 그대로 외웁니다.',
                '<b>두 번째부터</b>는 시험 모드로 처음부터 안 보고 씁니다.',
                '<b>모의고사 날</b> 틀린 문항이 어느 과목인지 보고, 그 과목만 다시 씁니다.'
            ],
            final: [mock(90), { id: 'wrong', label: '틀린 문항 다시 쓰기', links: [{ text: '응시 기록', href: '../신학기초/index.html#grade' }] }],
            last: [{ id: 'light', label: '틀렸던 문항만 가볍게', links: [{ text: '신학 공부방', href: '../신학기초/index.html' }] }]
        });
    }

    // ── 계시록 암기: 하루 분량의 절을 외우고, 한 장이 끝나면 처음부터 이어 쓴다
    const VERSES = [0, 20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21];
    const MM = '../계시록암기/index.html#plan:ch';
    function memoPlan(grade, o) {
        const days = []; let prev = null;
        const mock = goal => ({ id: 'mock', isMock: true, goal, label: '암기 ' + grade + '급 모의고사 1회 (목표 ' + goal + '점)', links: [{ text: '모의고사 풀기', href: '../index.html#memorize-grade' }] });
        const whole = c => ({ text: '계 ' + c + '장 전체', href: MM + c + ':chapter' });
        o.alloc.forEach(([c, n]) => {
            chunk(VERSES[c], n).forEach(([a, b], i) => {
                const all = n === 1;
                const label = all ? '계 ' + c + '장 전체 ' + VERSES[c] + '절' : '계 ' + c + '장 ' + a + '~' + b + '절';
                const m = [{ id: 'new:' + c + ':' + a, label: label + ' 암송', links: [{ text: '계 ' + c + '장 절별 암송', href: MM + c + ':verse' }] }];
                if (prev) m.unshift({ id: 'review', label: '어제 외운 ' + prev.label + ' 다시 암송', links: [{ text: '계 ' + prev.c + '장', href: MM + prev.c + ':verse' }] });
                if (i === n - 1) m.push({ id: 'whole:' + c, label: '계 ' + c + '장 처음부터 이어 쓰기', links: [whole(c)] });
                days.push({ tag: c + '장', tone: c % 2 ? 'indigo' : 'teal', title: label, m });
                prev = { c, label };
            });
        });
        days[days.length - 1].m.push(mock(60));
        o.wholes.forEach(chs => days.push({ tag: rl(chs) + '장', tone: 'violet', title: rl(chs) + '장 전체 암송', m: [{ id: 'wholes:' + chs[0], label: rl(chs) + '장 장 전체 암송', links: chs.map(whole) }] }));
        days[days.length - 1].m.push(mock(85));
        return finish('memo-grade' + grade, days, {
            tip: o.tip,
            guide: [
                '<b>① 어제 분량 다시 암송 (10분)</b> 가장 먼저 합니다. 막힌 절을 적어 둡니다.',
                '<b>② 오늘 분량 소리 내어 5번 읽기 (10분)</b> 끊어 읽는 자리를 매번 같게 합니다.',
                '<b>③ 한 절씩 가리고 쓰기 (20분)</b> 절별 암송에서 한 절씩 확인합니다.',
                '<b>④ 오늘 분량 이어 쓰기 (10분)</b> 절과 절이 이어지는 첫 낱말을 특히 봅니다.',
                '<b>한 장이 끝나는 날</b> 장 전체 암송으로 처음부터 끝까지 이어 씁니다.',
                '<b>이미 외운 장</b>은 장 전체 암송으로 점검만 하고 넘어갑니다.'
            ],
            final: [mock(90), { id: 'wrong', label: '틀린 절만 다시 암송', links: [{ text: '계시록 암기', href: '../계시록암기/index.html' }] }],
            last: [{ id: 'light', label: '틀렸던 절만 가볍게', links: [{ text: '계시록 암기', href: '../계시록암기/index.html' }] }]
        });
    }
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

    const PLANS = {};
    [
        theologyPlan(4, { tip: '초등 제목 24개 → 초등 종강 20문항 순서로 외웁니다.' }, h => {
            h.learn('elem', 6); h.learn('elemFinal', 7);
            h.test(['elem'], '제목 점검 + 모의고사'); h.plus(h.mock(60));
            h.redo('elem', 2); h.redo('elemFinal', 4);
            h.weak(); h.plus(h.mock(75));
            h.test(['elem'], '제목 전체 점검'); h.redo('elemFinal', 2);
            h.weak(); h.plus(h.mock(85));
        }),
        theologyPlan(3, { tip: '초등 제목 → 비유 65개 → 초등 종강 순서로 외웁니다.' }, h => {
            h.learn('elem', 5); h.learn('parable', 8); h.learn('elemFinal', 5); h.plus(h.mock(60));
            h.test(['elem'], '제목 전체 점검'); h.redo('parable', 2); h.redo('elemFinal', 2);
            h.weak(); h.weak(); h.plus(h.mock(85));
        }),
        theologyPlan(2, { tip: '초·중 제목 → 비유 → 초·중 종강 순서로 외웁니다.' }, h => {
            h.learn('elem', 3); h.learn('mid', 3); h.learn('parable', 6); h.learn('elemFinal', 4); h.learn('midFinal', 4); h.plus(h.mock(65));
            h.test(['elem', 'mid'], '초·중 제목 전체 점검'); h.redo('parable', 1); h.redo('elemFinal', 1); h.redo('midFinal', 1);
            h.weak(); h.plus(h.mock(85));
        }),
        theologyPlan(1, { tip: '제목 3종 → 비유 → 종강 → 수료 종합 순서로 외웁니다.' }, h => {
            h.learn('elem', 2); h.learn('mid', 2); h.learn('high', 2); h.learn('parable', 5);
            h.learn('elemFinal', 3); h.learn('midFinal', 3); h.plus(h.mock(65));
            h.learn('totalFinal', 5); h.plus(h.mock(75));
            h.test(['elem', 'mid', 'high'], '제목 3종 전체 점검'); h.weak(); h.weak(); h.plus(h.mock(85));
        }),
        tongdal4Plan(),
        tongdalPlan(3, { tip: '1~7장을 한 장에 이틀씩(읽기 → 괄호 넣기).' }, h => {
            [[1, 2], [2, 2], [3, 2], [4, 1], [5, 1], [6, 2]].forEach(([c, n]) => h.chapter(c, n, 'indigo'));
            h.chapter(7, 2, 'indigo', [h.mock(60)]);
            [[1], [2], [3], [4, 5], [6]].forEach(chs => h.fast(chs, 'teal', '두 번째'));
            h.fast([7], 'teal', '두 번째', [h.mock(75)]);
            [[1, 2], [3, 4], [5, 6], [7]].forEach(chs => h.fast(chs, 'violet', '세 번째'));
            h.fast([1, 2, 3, 4], 'amber', '전체 점검'); h.fast([5, 6, 7], 'amber', '전체 점검');
            h.day('모의', 'amber', '모의고사로 점검', [h.mock(85)]);
        }),
        tongdalPlan(2, { tip: '모의고사 문항의 80%가 8~15장에서 나옵니다. 8장부터 시작합니다.' }, h => {
            [[8, 2], [9, 2], [10, 1], [11, 3], [12, 2], [13, 2], [14, 2]].forEach(([c, n]) => h.chapter(c, n, 'indigo'));
            h.chapter(15, 1, 'indigo', [h.mock(60)]);
            [[1, 2], [3, 4], [5, 6]].forEach(chs => h.fast(chs, 'teal', '빠르게'));
            h.fast([7], 'teal', '빠르게', [h.mock(75)]);
            [[8, 9], [10, 11], [12, 13], [14, 15]].forEach(chs => h.fast(chs, 'violet', '두 번째'));
            h.fast(range(1, 7), 'amber', '틀린 것 점검');
            h.day('점검', 'amber', '8~15장 전체 점검 + 모의고사', [h.blank(range(8, 15), ' 전체 점검'), h.mock(85)]);
        }),
        tongdalPlan(1, { tip: '50문항 중 30문항이 16~22장. 16장부터 시작합니다.' }, h => {
            [[16, 2], [17, 3], [18, 2], [19, 2], [20, 1], [21, 2]].forEach(([c, n]) => h.chapter(c, n, 'indigo'));
            h.chapter(22, 2, 'indigo', [h.mock(60)]);
            [[1, 2, 3], [4, 5, 6], [7, 8], [9, 10], [11, 12], [13]].forEach(chs => h.fast(chs, 'teal', '빠르게'));
            h.fast([14, 15], 'teal', '빠르게', [h.mock(75)]);
            [[16, 17], [18, 19], [20, 21, 22]].forEach(chs => h.fast(chs, 'violet', '두 번째'));
            h.day('점검', 'amber', '16~22장 전체 점검 + 모의고사', [h.blank(range(16, 22), ' 전체 점검'), h.mock(85)]);
        }),
        memoPlan(4, { tip: '계 1~5장 96절을 하루 5절씩 외웁니다.', alloc: [[1, 4], [2, 6], [3, 4], [4, 2], [5, 3]], wholes: [[1], [2], [3], [4], [5], [1, 2, 3, 4, 5]] }),
        memoPlan(3, { tip: '계 1~10장 175절을 하루 8~10절씩 외웁니다.', alloc: [[1, 2], [2, 3], [3, 3], [4, 1], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 1]], wholes: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]] }),
        memoPlan(2, { tip: '계 1~16장 278절을 하루 반 장~한 장씩 외웁니다.', alloc: [[1, 2], [2, 2], [3, 2], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 2], [10, 1], [11, 1], [12, 1], [13, 1], [14, 2], [15, 1], [16, 2]], wholes: [range(1, 5), range(6, 11), range(12, 16)] }),
        memoPlan(1, { tip: '계 1~22장 404절을 하루 한 장씩 외웁니다.', alloc: range(1, 22).map(c => [c, 1]), wholes: [range(1, 7), range(8, 15), range(16, 22)] })
    ].forEach(p => { PLANS[p.key] = p; });

    // ---------- 저장·집계 ----------
    function loadJson(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
    function loadMy() { const a = loadJson(MY_KEY, []); return Array.isArray(a) ? a.filter(k => PLANS[k]) : []; }
    function toggleMy(key) {
        const raw = loadJson(MY_KEY, []);
        const list = Array.isArray(raw) ? raw : [];
        const next = list.includes(key) ? list.filter(k => k !== key) : list.concat([key]);
        try { localStorage.setItem(MY_KEY, JSON.stringify(next)); } catch (e) { /* 무시 */ }
        return next.includes(key);
    }
    function loadProgress(key) { return loadJson(STORE_KEY, {})[key] || {}; }
    function saveMission(key, date, id, done) {
        const all = loadJson(STORE_KEY, {});
        const day = (all[key] || (all[key] = {}))[date] || (all[key][date] = {});
        if (done) day[id] = Date.now(); else delete day[id];
        try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { /* 무시 */ }
        // 시트 전송 자리: 이 저장소에는 아직 전송 함수가 없다. window.reportProgress가 생기면 그대로 연결된다.
        try { if (typeof window.reportProgress === 'function') window.reportProgress({ plan: key, date, mission: id, done }); } catch (e) { /* 무시 */ }
    }
    // 그날 푼 모의고사 최고 점수(없으면 null) — 풀기만 하면 모의고사 미션이 자동으로 체크된다
    function mockScoreOn(date, auto) {
        if (!auto) return null;
        let best = null;
        loadJson(auto.key, []).forEach(e => {
            if (!e || e[auto.field] !== auto.value || !e.savedAt || (e.mode && e.mode !== 'exam')) return;
            const sc = Number(e.score);
            if (fmtDate(new Date(e.savedAt)) === date && !isNaN(sc) && (best === null || sc > best)) best = sc;
        });
        return best;
    }
    function isDone(progress, date, m) { return !!(progress[date] || {})[m.id] || mockScoreOn(date, m.auto) !== null; }
    function doneCount(progress, day) { return day.m.filter(m => isDone(progress, day.date, m)).length; }
    function isDayDone(progress, day) { return !day.exam && doneCount(progress, day) === day.m.length; }
    function summary(key) {
        const plan = PLANS[key];
        const today = todayStr();
        const progress = loadProgress(key);
        const study = plan.days.filter(d => !d.exam);
        let d = today, streak = 0;
        if (!plan.byDate[d] || !isDayDone(progress, plan.byDate[d])) d = addDays(today, -1);
        while (plan.byDate[d] && isDayDone(progress, plan.byDate[d])) { streak++; d = addDays(d, -1); }
        return {
            plan, today, progress, streak,
            before: today < START, after: today > EXAM, day: plan.byDate[today] || null,
            doneDays: study.filter(x => isDayDone(progress, x)).length, totalDays: study.length,
            lateDays: study.filter(x => x.date < today && !isDayDone(progress, x)).length
        };
    }
    const EXAM_LABEL = (parseDate(EXAM).getMonth() + 1) + '월 ' + parseDate(EXAM).getDate() + '일';
    function ddayText() { const n = diffDays(EXAM, todayStr()); return n > 0 ? 'D-' + n : (n === 0 ? 'D-DAY' : '시험 종료'); }
    function todayLine(s) {
        if (s.after) return '시험이 끝났습니다. 수고하셨습니다!';
        if (s.before) return shortDate(START) + ' 시작';
        if (s.day.exam) return '오늘은 시험일입니다';
        const left = s.day.m.length - doneCount(s.progress, s.day);
        if (left === 0) return '✅ 오늘 미션 클리어' + (s.streak > 1 ? ' · 연속 ' + s.streak + '일' : '');
        return (new Date().getHours() >= 18 ? '🌙 아직 ' + left + '개 남았어요' : '☀️ 오늘 미션 ' + left + '개') + ' · ' + s.day.title;
    }

    // ---------- 스타일 ----------
    const CSS = `
    .jd-board { width: min(100%, 420px); margin: 0 auto 14px; border-radius: 24px; overflow: hidden; background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 18px 36px -18px rgba(13,148,136,.55), 0 2px 6px rgba(15,23,42,.06); text-align: left; }
    .jd-board-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 16px 15px; background: linear-gradient(120deg, #047857 0%, #0d9488 55%, #0891b2 100%); color: #fff; overflow: hidden; }
    .jd-board-head::after { content: ''; position: absolute; right: -34px; top: -46px; width: 150px; height: 150px; border-radius: 50%; background: rgba(255,255,255,.13); pointer-events: none; }
    .jd-board-eyebrow { display: inline-block; background: rgba(255,255,255,.22); border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 900; letter-spacing: -.2px; }
    .jd-board-head b { display: block; white-space: nowrap; font-size: clamp(16px, 5.2vw, 23px); font-weight: 900; line-height: 1.2; letter-spacing: -.6px; margin-top: 6px; text-shadow: 0 2px 8px rgba(4,60,50,.35); word-break: keep-all; }
    .jd-dchip { position: relative; z-index: 1; flex: 0 0 auto; background: #fff; color: #047857; border-radius: 18px; padding: 8px 12px; font-size: 20px; font-weight: 900; line-height: 1; text-align: center; white-space: nowrap; box-shadow: 0 6px 14px rgba(4,60,50,.25); }
    .jd-dchip small { display: block; font-size: 10.5px; font-weight: 900; color: #64748b; margin-bottom: 3px; }
    .jd-board-head::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 45%; background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,.38) 50%, transparent 100%); transform: translateX(-120%) skewX(-12deg); animation: jdShine 3.4s ease-in-out infinite; pointer-events: none; }
    .jd-star { display: inline-block; filter: drop-shadow(0 0 6px rgba(253,224,71,.95)); animation: jdTwinkle 1.7s ease-in-out infinite; }
    .jd-new { display: inline-block; margin-left: 6px; background: #fde047; color: #713f12; border-radius: 999px; padding: 2px 8px; font-size: 10.5px; font-weight: 900; letter-spacing: .4px; vertical-align: 1px; animation: jdBlink 1.4s ease-in-out infinite; }
    .jd-board .jd-dchip { animation: jdFloat 2.6s ease-in-out infinite; }
    @keyframes jdShine { 0%, 55% { transform: translateX(-120%) skewX(-12deg); } 100% { transform: translateX(330%) skewX(-12deg); } }
    @keyframes jdTwinkle { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.28) rotate(18deg); } }
    @keyframes jdBlink { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
    @keyframes jdFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @media (prefers-reduced-motion: reduce) { .jd-board-head::before, .jd-star, .jd-new, .jd-board .jd-dchip { animation: none; } }
    .jd-board-body { padding: 12px 14px 14px; }
    .jd-my { display: flex; align-items: center; gap: 10px; background: #f0fdfa; border: 1.5px solid #99f6e4; border-left: 6px solid #0d9488; border-radius: 14px; padding: 11px 12px; margin-bottom: 8px; color: #0f172a; text-decoration: none; }
    .jd-my b { display: block; font-size: 16px; font-weight: 900; }
    .jd-my span { display: block; font-size: 13px; font-weight: 800; color: #0f766e; margin-top: 2px; word-break: keep-all; }
    .jd-my i { margin-left: auto; font-style: normal; font-size: 22px; font-weight: 900; color: #0d9488; }
    .jd-textbtn { background: none; border: 0; padding: 2px 4px; font-size: 12px; font-weight: 900; color: #64748b; text-decoration: underline; }
    .jd-pick-row { display: grid; grid-template-columns: 76px repeat(4, 1fr); gap: 5px; align-items: center; margin-top: 6px; }
    .jd-pick-row em { font-style: normal; font-size: 13px; font-weight: 900; color: #0f172a; }
    .jd-pick { border: 1.5px solid #cbd5e1; background: #fff; color: #334155; border-radius: 999px; padding: 8px 0; font-size: 13.5px; font-weight: 900; }
    .jd-pick.on { background: #0d9488; border-color: #0d9488; color: #fff; box-shadow: 0 4px 10px rgba(13,148,136,.35); }
    .jd-pick-help { font-size: 13px; font-weight: 900; color: #0f766e; margin-bottom: 4px; }
    .jd-page { max-width: 460px; margin: 0 auto; padding: 10px 14px 28px; }
    .jd-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .jd-back { background: #fff; border: 2px solid #99f6e4; color: #0f766e; border-radius: 999px; padding: 7px 14px; font-size: 14px; font-weight: 900; text-decoration: none; }
    .jd-dday { background: #dc2626; color: #fff; border-radius: 999px; padding: 6px 13px; font-size: 14px; font-weight: 900; }
    .jd-h1 { font-size: 21px; font-weight: 900; color: #0f172a; margin-top: 10px; line-height: 1.25; letter-spacing: -.4px; word-break: keep-all; }
    .jd-sub { font-size: 12.5px; font-weight: 700; color: #64748b; margin-top: 2px; word-break: keep-all; }
    .jd-tabs { display: flex; gap: 6px; overflow-x: auto; margin-top: 8px; }
    .jd-tab { flex: 0 0 auto; border: 1.5px solid #99f6e4; background: #fff; color: #0f766e; border-radius: 999px; padding: 6px 11px; font-size: 12.5px; font-weight: 900; text-decoration: none; }
    .jd-tab.on { background: #0d9488; border-color: #0d9488; color: #fff; }
    .jd-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 10px 0; }
    .jd-stat { background: #fff; border-radius: 12px; padding: 6px 4px; text-align: center; font-size: 11px; font-weight: 800; color: #94a3b8; }
    .jd-stat b { font-size: 16px; font-weight: 900; color: #1e1b4b; margin-right: 3px; }
    .jd-card { background: #fff; border-radius: 20px; border: 3px solid #0f172a; margin-bottom: 14px; overflow: hidden; box-shadow: 0 12px 24px -12px rgba(15,23,42,.6); }
    .jd-day-head { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; }
    .jd-day-date { flex: 0 0 auto; font-size: 38px; font-weight: 900; line-height: 1; color: #5eead4; letter-spacing: -1px; text-align: center; }
    .jd-day-date small { display: block; font-size: 12px; font-weight: 900; color: #fff; letter-spacing: 0; margin-top: 4px; }
    .jd-day-what { flex: 1 1 auto; min-width: 0; }
    .jd-day-when { font-size: 12.5px; font-weight: 900; color: #5eead4; }
    .jd-day-when .jd-textbtn { color: #cbd5e1; }
    .jd-day-title { font-size: 21px; font-weight: 900; line-height: 1.25; word-break: keep-all; margin-top: 2px; }
    .jd-day-count { flex: 0 0 auto; font-size: 15px; font-weight: 900; text-align: center; background: rgba(255,255,255,.14); border-radius: 12px; padding: 6px 10px; white-space: nowrap; }
    .jd-day-body { padding: 4px 14px 8px; }
    .jd-day-body .jd-mission:first-child { border-top: 0; }
    .jd-card.is-done { border-color: #059669; }
    .jd-card.is-done .jd-day-head { background: linear-gradient(135deg, #047857, #10b981); }
    .jd-card.is-late { border-color: #be123c; }
    .jd-card.is-late .jd-day-head { background: linear-gradient(135deg, #9f1239, #e11d48); }
    .jd-card.is-lock { border-color: #64748b; }
    .jd-card.is-lock .jd-day-head { background: linear-gradient(135deg, #475569, #64748b); }
    .jd-card.exam { border-color: #dc2626; }
    .jd-card.exam .jd-day-head { background: #dc2626; }
    .jd-cal-title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 2px 2px 0; }
    .jd-cal-sub { font-size: 11.5px; font-weight: 700; color: #94a3b8; margin: 1px 2px 6px; word-break: keep-all; }
    .jd-note { font-size: 12px; font-weight: 800; border-radius: 10px; padding: 6px 10px; margin: 4px 0; word-break: keep-all; }
    .jd-note.late { background: #fff1f2; color: #be123c; }
    .jd-note.lock { background: #f1f5f9; color: #64748b; }
    .jd-note.info { background: #eef2ff; color: #4338ca; }
    .jd-mission { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid #eef2f7; }
    .jd-check { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%; border: 3px solid #cbd5e1; background: #fff; color: transparent; font-size: 18px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
    .jd-check.on { background: #10b981; border-color: #10b981; color: #fff; animation: jdPop .35s ease; }
    .jd-check[disabled] { background: #f1f5f9; border-color: #e2e8f0; color: #94a3b8; font-size: 14px; }
    .jd-mbody { flex: 1 1 auto; min-width: 0; }
    .jd-mlabel { font-size: 15px; font-weight: 900; color: #1e1b4b; line-height: 1.3; word-break: keep-all; }
    .jd-mission.on .jd-mlabel { color: #94a3b8; text-decoration: line-through; }
    .jd-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
    .jd-chip { background: #f0fdfa; border: 1.5px solid #99f6e4; color: #0f766e; border-radius: 9px; padding: 5px 9px; font-size: 12.5px; font-weight: 900; text-decoration: none; }
    .jd-score { display: inline-block; margin-top: 4px; font-size: 12px; font-weight: 900; border-radius: 999px; padding: 2px 9px; background: #ecfdf5; color: #047857; }
    .jd-score.low { background: #fff7ed; color: #c2410c; }
    .jd-cal { background: #fff; border-radius: 18px; padding: 8px 6px; }
    .jd-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
    .jd-wd { text-align: center; font-size: 10.5px; font-weight: 900; color: #94a3b8; }
    .jd-wd:first-child { color: #f43f5e; }
    .jd-cell { position: relative; height: 62px; border-radius: 9px; border: 2px solid transparent; background: #f8fafc; padding: 2px 0 0; text-align: center; color: #475569; overflow: hidden; }
    .jd-cell.out { background: transparent; color: #cbd5e1; }
    .jd-cell .n { font-size: 11.5px; font-weight: 900; line-height: 1.2; }
    .jd-cell .t { display: block; margin: 2px 1px 0; border-radius: 6px; padding: 2px 0; font-size: 10px; font-weight: 900; line-height: 1.2; letter-spacing: -.6px; white-space: nowrap; color: #fff; }
    .jd-cell .r { display: block; height: 15px; margin-top: 2px; font-size: 10.5px; font-weight: 900; line-height: 15px; letter-spacing: -.4px; color: inherit; }
    .jd-cell .r b { color: #b45309; }
    .jd-cell.done { background: #d1fae5; color: #065f46; }
    .jd-cell.late { background: #ffe4e6; color: #be123c; }
    .jd-cell.exam { background: #dc2626; color: #fff; }
    .jd-cell.exam .t { background: #fff; color: #dc2626; }
    .jd-cell.future .t { opacity: .78; }
    .jd-cell.today { border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15,23,42,.2); }
    .jd-cell.sel { border-color: #0d9488; }
    .jd-cell .dot { position: absolute; top: 2px; right: 2px; width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; }
    .jd-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 10.5px; font-weight: 800; color: #64748b; margin: 6px 4px 10px; }
    .jd-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 3px; vertical-align: -1px; }
    .jd-guide { background: #fff; border-radius: 14px; padding: 9px 12px; font-size: 12.5px; font-weight: 700; color: #475569; line-height: 1.55; word-break: keep-all; }
    .jd-guide summary { font-size: 13px; font-weight: 900; color: #1e1b4b; }
    .jd-guide ul { margin: 6px 0 0 0; list-style: none; padding: 0; }
    .jd-guide li { padding: 5px 0; border-top: 1px solid #eef2f7; }
    .jd-guide b { color: #1e1b4b; }
    .jd-clear { position: fixed; inset: 0; z-index: 10000; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; }
    .jd-clear-box { background: #fff; border-radius: 26px; padding: 26px 30px; text-align: center; animation: jdPop .45s ease; max-width: 80%; }
    .jd-clear-box .e { font-size: 50px; line-height: 1; }
    .jd-clear-box .h { font-size: 25px; font-weight: 900; color: #059669; margin-top: 6px; }
    .jd-clear-box .s { font-size: 14px; font-weight: 800; color: #475569; margin-top: 6px; }
    .jd-conf { position: fixed; top: -30px; font-size: 22px; z-index: 10001; pointer-events: none; animation: jdFall 1.9s linear forwards; }
    @keyframes jdPop { 0% { transform: scale(.6); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
    @keyframes jdFall { to { transform: translateY(110vh) rotate(540deg); opacity: .2; } }
    `;
    (function injectCss() {
        const st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);
    })();

    // ---------- 12과목 고르기 (홈 보드와 진도표 화면 공용) ----------
    function pickerHtml(my) {
        return (my.length ? '' : '<div class="jd-pick-help">내가 신청한 과목·급수를 누르세요. 그 진도표만 보입니다.</div>') +
            SUBJECT_ORDER.map(s => '<div class="jd-pick-row"><em>' + SUBJECTS[s] + '</em>' +
                GRADES.map(g => { const k = s + '-grade' + g; return '<button type="button" class="jd-pick' + (my.includes(k) ? ' on' : '') + '" data-pick="' + k + '">' + g + '급</button>'; }).join('') + '</div>').join('');
    }

    // ---------- 홈 상단 보드: "합격 공부 진도표" ----------
    let boardEditing = false;
    function renderBoard() {
        const host = document.getElementById('sion-plan-banner');
        if (!host) return;
        const base = host.dataset.base || '진도표/';
        const my = loadMy();
        let body = my.map(k => {
            const s = summary(k);
            return '<a class="jd-my" href="' + base + 'index.html?plan=' + k + '"><div><b>' + s.plan.name + '</b><span>' + todayLine(s) + '</span></div><i>›</i></a>';
        }).join('');
        if (!my.length || boardEditing) body += pickerHtml(my);
        if (my.length) body += '<div style="text-align:right"><button type="button" class="jd-textbtn" data-edit="1">' + (boardEditing ? '닫기' : '과목 변경') + '</button></div>';
        host.innerHTML = '<section class="jd-board"><div class="jd-board-head"><div style="position:relative;z-index:1;min-width:0"><span class="jd-board-eyebrow">' + EXAM_LABEL + ' 자격증 시험</span><span class="jd-new">NEW</span><b><span class="jd-star">⭐</span> 합격 공부 진도표</b></div><span class="jd-dchip"><small>시험까지</small>' + ddayText() + '</span></div><div class="jd-board-body">' + body + '</div></section>';
        if (!host.dataset.bound) {
            host.dataset.bound = '1';
            host.addEventListener('click', e => {
                const pick = e.target.closest('[data-pick]');
                if (pick) {
                    const added = toggleMy(pick.dataset.pick);
                    if (added && !boardEditing) { window.location.href = base + 'index.html?plan=' + pick.dataset.pick; return; }
                    renderBoard();
                    return;
                }
                if (e.target.closest('[data-edit]')) { boardEditing = !boardEditing; renderBoard(); }
            });
        }
    }

    // ---------- 진도표 화면 ----------
    let curKey = null, selDate = null, pagePicker = false;
    function missionHtml(s, day, m, locked) {
        const on = isDone(s.progress, day.date, m);
        const sc = mockScoreOn(day.date, m.auto);
        const score = sc === null ? '' : '<br><span class="jd-score' + (m.goal && sc < m.goal ? ' low' : '') + '">' + sc + '점' + (m.goal ? (sc >= m.goal ? ' · 목표 달성' : ' · 목표까지 ' + (m.goal - sc) + '점') : '') + '</span>';
        return '<div class="jd-mission' + (on ? ' on' : '') + '"><button type="button" class="jd-check' + (on ? ' on' : '') + '" data-check="' + m.id + '"' +
            (locked ? ' disabled aria-label="아직 날짜가 안 됐습니다">🔒' : ' aria-label="' + m.label + ' 완료 체크">✓') + '</button>' +
            '<div class="jd-mbody"><div class="jd-mlabel">' + m.label + '</div>' + score +
            (m.links.length ? '<div class="jd-chips">' + m.links.map(l => '<a class="jd-chip" href="' + l.href + '" data-go="1">' + l.text + ' ›</a>').join('') + '</div>' : '') + '</div></div>';
    }
    function cardHtml(s) {
        const day = s.plan.byDate[selDate];
        const dt = parseDate(selDate);
        const isToday = selDate === s.today;
        const locked = selDate > s.today;
        const done = day.exam ? 0 : doneCount(s.progress, day);
        const allDone = !day.exam && done === day.m.length;
        const late = !day.exam && !isToday && !locked && !allDone;
        const when = isToday ? '오늘 꼭 할 공부' : (locked ? '이날 할 공부' : (allDone ? '이날 한 공부' : '밀린 공부'));
        const head = '<div class="jd-day-head"><div class="jd-day-date">' + (dt.getMonth() + 1) + '/' + dt.getDate() + '<small>' + WEEKDAYS[dt.getDay()] + '요일</small></div>' +
            '<div class="jd-day-what"><div class="jd-day-when">' + when + ((!isToday && s.plan.byDate[s.today]) ? ' <button type="button" class="jd-textbtn" data-today="1">오늘로</button>' : '') + '</div>' +
            '<div class="jd-day-title">' + (day.exam ? '🙏 시험일' : day.title) + '</div></div>' +
            (day.exam ? '' : '<div class="jd-day-count">' + (allDone ? '🎉<br>클리어' : done + ' / ' + day.m.length) + '</div>') + '</div>';
        if (day.exam) return '<div class="jd-card exam" id="jd-card">' + head + '<div class="jd-day-body"><div class="jd-note info">그동안 수고하셨습니다. 아는 것부터 차분히 쓰세요.</div></div></div>';
        const note = locked ? '<div class="jd-note lock">미리 공부해도 됩니다. 체크는 그날부터 됩니다.</div>'
            : (late ? '<div class="jd-note late">밀린 날입니다. 지금 하고 체크하면 채워집니다.</div>' : '');
        return '<div class="jd-card' + (allDone ? ' is-done' : (late ? ' is-late' : (locked ? ' is-lock' : ''))) + '" id="jd-card">' + head +
            '<div class="jd-day-body">' + note + day.m.map(m => missionHtml(s, day, m, locked)).join('') + '</div></div>';
    }
    // 달력 칸 맨 아래 줄: 그날 모의고사 점수(있으면)와 미션 진행(예: 2/3)
    function recordHtml(s, day) {
        if (day.exam) return '';
        let score = null;
        day.m.forEach(m => { const sc = mockScoreOn(day.date, m.auto); if (sc !== null && (score === null || sc > score)) score = sc; });
        const done = doneCount(s.progress, day);
        if (score === null && done === 0) return '<span class="r"></span>';
        return '<span class="r">' + (score !== null ? '<b>' + score + '점</b>' : (done === day.m.length ? '완료' : done + '/' + day.m.length)) + '</span>';
    }
    function calendarHtml(s) {
        const first = addDays(START, -parseDate(START).getDay());
        const last = addDays(EXAM, 6 - parseDate(EXAM).getDay());
        let html = '<div class="jd-cal-title">일차별 공부 진도</div><div class="jd-cal-sub">날짜를 누르면 그날 공부가 위에 나옵니다. 칸 맨 아래 줄은 그날 기록입니다.</div><div class="jd-cal"><div class="jd-grid">' + WEEKDAYS.map(w => '<div class="jd-wd">' + w + '</div>').join('');
        for (let d = first, i = 0; d <= last; d = addDays(d, 1), i++) {
            const dt = parseDate(d);
            const num = (i === 0 || dt.getDate() === 1) ? (dt.getMonth() + 1) + '/' + dt.getDate() : dt.getDate();
            const day = s.plan.byDate[d];
            if (!day) { html += '<div class="jd-cell out"><div class="n">' + num + '</div></div>'; continue; }
            const st = day.exam ? 'exam' : (isDayDone(s.progress, day) ? 'done' : (d > s.today ? 'future' : (d === s.today ? '' : 'late')));
            html += '<button type="button" class="jd-cell ' + st + (d === s.today ? ' today' : '') + (d === selDate ? ' sel' : '') + '" data-date="' + d + '" aria-label="' + shortDate(d) + ' ' + day.title + '">' +
                (day.m.some(m => m.isMock) ? '<span class="dot"></span>' : '') + '<div class="n">' + (st === 'done' ? '✓' : '') + num + '</div>' +
                '<span class="t"' + (day.exam ? '' : ' style="background:' + TONES[day.tone] + '"') + '>' + day.tag + '</span>' + recordHtml(s, day) + '</button>';
        }
        return html + '</div></div><div class="jd-legend"><span><i style="background:#d1fae5"></i>완료</span><span><i style="background:#ffe4e6"></i>밀림</span>' +
            '<span><i style="background:#fff;border:2px solid #1e1b4b"></i>오늘</span><span><i style="background:#f59e0b;border-radius:50%"></i>모의고사일</span><span><i style="background:#dc2626"></i>시험일</span></div>';
    }
    function renderPage() {
        const root = document.getElementById('jd-page');
        if (!root) return;
        const my = loadMy();
        if (!curKey || !PLANS[curKey] || !my.includes(curKey)) curKey = my[0] || null;
        const top = '<div class="jd-top"><a class="jd-back" href="../index.html#rooms">‹ 뒤로 가기</a><span class="jd-dday">시험 ' + ddayText() + '</span></div>';
        if (!curKey) {
            root.innerHTML = '<div class="jd-page">' + top + '<div class="jd-sub" style="margin-top:10px">' + EXAM_LABEL + ' 자격증 시험</div><div class="jd-h1" style="margin-top:0"><span class="jd-star">⭐</span> 합격 공부 진도표</div><div class="jd-card" style="margin-top:12px">' + pickerHtml(my) + '</div></div>';
            return;
        }
        try { sessionStorage.setItem('sion_plan_last', curKey); } catch (e) { /* 무시 */ }
        const s = summary(curKey);
        if (!selDate || !s.plan.byDate[selDate]) selDate = s.plan.byDate[s.today] ? s.today : (s.before ? START : EXAM);
        const tabs = '<div class="jd-tabs">' + my.map(k => '<a class="jd-tab' + (k === curKey ? ' on' : '') + '" href="?plan=' + k + '" data-tab="' + k + '">' + PLANS[k].name + '</a>').join('') +
            '<button type="button" class="jd-tab" data-picker="1">' + (pagePicker ? '닫기' : '과목 변경') + '</button></div>';
        root.innerHTML = '<div class="jd-page">' + top +
            '<div class="jd-h1">' + s.plan.name + ' 공부 진도표</div><div class="jd-sub">' + s.plan.tip + '</div>' + tabs +
            (pagePicker ? '<div class="jd-card" style="margin-top:8px">' + pickerHtml(my) + '</div>' : '') +
            '<div class="jd-stats"><div class="jd-stat"><b>🔥 ' + s.streak + '</b>연속 달성 일수</div><div class="jd-stat"><b>' + s.doneDays + '/' + s.totalDays + '</b>완료한 날</div><div class="jd-stat"><b>' + s.lateDays + '</b>밀린 날</div></div>' +
            cardHtml(s) + calendarHtml(s) +
            '<details class="jd-guide"><summary>📖 자세한 공부 방법 (눌러서 보기)</summary><ul>' + s.plan.guide.map(g => '<li>' + g + '</li>').join('') + '<li>늦게 시작해도 됩니다. 밀린 날은 나중에 체크해 채울 수 있습니다.</li></ul></details></div>';
    }
    function showClear(s) {
        const box = document.createElement('div');
        box.className = 'jd-clear';
        box.innerHTML = '<div class="jd-clear-box"><div class="e">🎉</div><div class="h">미션 클리어!</div><div class="s">' + (s.streak > 1 ? '🔥 연속 ' + s.streak + '일째 · ' : '') + '시험 ' + ddayText() + '</div></div>';
        document.body.appendChild(box);
        const conf = ['🎉', '⭐', '✨', '🎊', '💪'].flatMap((p, i) => [0, 1, 2].map(j => {
            const c = document.createElement('span');
            c.className = 'jd-conf'; c.textContent = p;
            c.style.left = (Math.random() * 96) + 'vw'; c.style.animationDelay = ((i + j) * 0.07) + 's';
            document.body.appendChild(c);
            return c;
        }));
        const close = () => { box.remove(); conf.forEach(c => c.remove()); };
        box.addEventListener('click', close);
        setTimeout(close, 2200);
    }
    function onPageClick(e) {
        const check = e.target.closest('[data-check]');
        if (check && !check.disabled) {
            const day = PLANS[curKey].byDate[selDate];
            const m = day.m.find(x => x.id === check.dataset.check);
            const before = loadProgress(curKey);
            const stored = !!(before[selDate] || {})[m.id];
            if (!stored && isDone(before, selDate, m)) return;   // 모의고사를 실제로 풀어 자동 체크된 것은 그대로 둔다
            const wasDone = isDayDone(before, day);
            saveMission(curKey, selDate, m.id, !stored);
            renderPage();
            if (!wasDone && isDayDone(loadProgress(curKey), day)) showClear(summary(curKey));
            return;
        }
        const cell = e.target.closest('[data-date]');
        if (cell) { selDate = cell.dataset.date; renderPage(); const c = document.getElementById('jd-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
        if (e.target.closest('[data-today]')) { selDate = todayStr(); renderPage(); return; }
        if (e.target.closest('[data-picker]')) { pagePicker = !pagePicker; renderPage(); return; }
        const tab = e.target.closest('[data-tab]');
        if (tab) { e.preventDefault(); curKey = tab.dataset.tab; selDate = null; renderPage(); return; }
        const pick = e.target.closest('[data-pick]');
        if (pick) { if (toggleMy(pick.dataset.pick)) { curKey = pick.dataset.pick; selDate = null; pagePicker = false; } renderPage(); return; }
        // 공부 화면으로 넘어갈 때: 그 화면에 "진도표로 돌아가기" 버튼이 뜨도록 표시해 둔다
        if (e.target.closest('[data-go]')) { try { sessionStorage.setItem('sion_plan_from', '1'); } catch (err) { /* 무시 */ } }
    }
    function initPage() {
        const root = document.getElementById('jd-page');
        if (!root) return;
        try { sessionStorage.removeItem('sion_plan_from'); } catch (e) { /* 무시 */ }
        const want = new URLSearchParams(window.location.search).get('plan');
        let last = null;
        try { last = sessionStorage.getItem('sion_plan_last'); } catch (e) { /* 무시 */ }
        if (want && PLANS[want]) { if (!loadMy().includes(want)) toggleMy(want); curKey = want; }
        else if (last && loadMy().includes(last)) curKey = last;
        root.addEventListener('click', onPageClick);
        renderPage();
    }

    initPage();
    renderBoard();
    window.addEventListener('pageshow', () => { renderBoard(); renderPage(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderBoard(); renderPage(); } });

    window.SionPlan = { plans: PLANS, summary, renderBoard };
})();
