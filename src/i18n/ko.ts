/** 한국어 문자열 (기본 로케일). 모든 사용자 대면 카피는 여기서만 정의한다 (brief-3A §4 i18n). */
export const ko = {
  "app.title": "가늠",
  "app.tagline": "당신의 손을 재고, 화면을 당신에게 맞춥니다.",
  "app.skipToContent": "본문으로 건너뛰기",
  "app.back": "뒤로",

  "error.title": "문제가 생겼어요",
  "error.body": "측정을 처리하는 중에 오류가 발생했습니다. 다시 시도해 주세요.",
  "error.retry": "다시 측정",

  "storage.degraded": "저장 공간을 쓸 수 없어 이번 세션에만 기록됩니다.",

  "home.subcopy": "30초. 마우스·트랙패드·터치 모두 가능.",
  "home.start": "측정 시작",
  "home.whatIs": "가늠이란?",
  "home.pastResults": "지난 결과 ({count})",
  "home.calibrationOff": "화면 보정: 안 됨 — 보정하기",
  "home.calibrationOn": "화면 보정됨 ({pxPerMm} px/mm) — 다시",
  "home.calibrationStale": "모니터가 바뀐 것 같아요 — 재보정",
  "home.footer": "Fitts의 법칙 · ISO 9241-411 · WONKYARD",

  "calibrate.title": "화면 보정",
  "calibrate.intro":
    "신용카드나 교통카드를 화면에 대고 아래 상자의 가로 폭을 카드에 맞추세요. 선택 사항이에요.",
  "calibrate.slider": "카드 폭",
  "calibrate.manualLabel": "직접 입력 (px/mm)",
  "calibrate.readout": "지금 화면: 약 {pxPerMm} px/mm · {diagInch}\" 추정",
  "calibrate.save": "이대로 저장",
  "calibrate.skip": "보정 없이 계속",

  "setup.title": "어떻게 잴까요?",
  "setup.quickTitle": "빠른 측정",
  "setup.quickDetail": "약 30초 · 조건 3개",
  "setup.preciseTitle": "정밀 측정",
  "setup.preciseDetail": "약 2분 · 조건 9개",
  "setup.comingSoon": "준비 중",
  "setup.bothHands": "양손 비교 (왼손·오른손 각각 측정)",
  "setup.bothHandsHint": "정밀 측정이 끝나면 반대 손으로 한 번 더 측정합니다.",
  "setup.handLegend": "쓰는 손",
  "setup.handRight": "오른손",
  "setup.handLeft": "왼손",
  "setup.howtoTitle": "이렇게 하세요",
  "setup.howtoBody": "나타나는 원을 최대한 빠르고 정확하게 누르세요. 빗나가도 됩니다.",
  "setup.start": "시작",
  "setup.startHint": "스페이스",
  "setup.calibratePrompt": "화면을 물리 크기에 맞추면 mm 단위 결과를 볼 수 있어요.",
  "setup.calibratePromptYes": "화면 보정하기",
  "setup.calibratePromptNo": "그냥 진행",

  "countdown.announce": "{n}초 후 시작",
  "countdown.go": "시작!",

  "measure.conditionProgress": "조건 {current} / {total}",
  "measure.conditionProgressHand": "{hand} · 조건 {current} / {total}",
  "measure.pointerRequired": "포인터 입력이 필요합니다. 결과 해설은 텍스트로 제공됩니다.",
  "measure.hardestCondition": "이 조건은 일부러 어렵습니다.",
  "measure.abort": "측정 중단",
  "measure.abortConfirm": "측정을 그만둘까요? 진행 중인 기록은 저장되지 않습니다.",
  "measure.abortYes": "그만두기",
  "measure.abortNo": "계속하기",
  "measure.srStatus": "측정 중 — 조건 {current} / {total}",
  "measure.switchHandsTitle": "손을 바꾸세요",
  "measure.switchHandsBody": "이제 {hand}으로 측정할 차례예요. 자세를 편하게 바꾸고 준비되면 시작하세요.",
  "measure.switchHandsContinue": "준비됐어요",
  "measure.switchHandsSr": "첫 번째 손 측정이 끝났습니다. 반대 손으로 바꾸고 계속하세요.",

  "result.title": "가늠 결과",
  "result.throughput": "처리율",
  "result.throughputUnit": "bits/초",
  "result.throughputCaption":
    "ISO 유효 처리율(평균 IDe/MT)입니다. 회귀 기울기의 역수(1/b)와는 다릅니다.",
  "result.chartXAxis": "난이도 (bits)",
  "result.chartYAxis": "이동시간 (ms)",
  "result.regression": "MT = {a} + {b}·ID",
  "result.rSquared": "r² = {value}",
  "result.fitCaption": "{n}개 조건 평균에 대한 적합",
  "result.accuracy": "정확도",
  "result.consistency": "일관성",
  "result.hand": "손",
  "result.handRight": "R",
  "result.handLeft": "L",
  "result.unstable": "측정 불안정",
  "result.disclaimer": "참고용입니다 · 진단이 아닙니다.",
  "result.explainToggle": "이게 무슨 뜻이죠?",
  "result.remeasure": "다시 측정",
  "result.saveCard": "결과 카드 저장",
  "result.adaptSoon": "이 결과로 화면 맞춰보기",
  "result.insufficient": "측정 데이터가 부족합니다. 다시 측정해 주세요.",
  "result.notFound": "결과를 찾을 수 없습니다.",

  "result.comparisonTitle": "회귀선 겹쳐보기",
  "result.comparePrecisionWarn": "이 측정으론 비교가 부정확할 수 있어요.",
  "result.compareRefLabel": "참고",
  "result.compareBandNote": "회색 점선은 발표된 연구값이에요 · 진단이 아닙니다.",
  "result.compareChipMe": "나",
  "result.compareChipYoung": "20대",
  "result.compareChipElderly": "고령",
  "result.compareChipTremor": "손떨림",

  "result.handCompareLabel": "좌우손 비교",
  "result.handCompareValue": "왼손 {left} / 오른손 {right}",
  "result.asymmetryInline": "비대칭 {pct}%",
  "result.asymmetryNone": "비대칭은 양손을 모두 유효하게 측정했을 때만 나옵니다.",
  "result.historyOverlayChip": "지난 측정 ({date})",
  "result.historyDeltaUp": "지난 측정 대비 처리율 +{delta} bits/초 ↑",
  "result.historyDeltaDown": "지난 측정 대비 처리율 −{delta} bits/초 ↓",
  "result.historyDeltaFlat": "지난 측정과 처리율이 거의 같아요 (±{delta} bits/초)",
  "result.historyTrendLabel": "처리율 추이 ({count}회)",
  "result.historyLowConfidence": "회색 점은 신뢰도가 낮은 측정이에요.",
  "result.historyPrevLowConfidence": "직전 측정은 신뢰도가 낮아 비교가 부정확할 수 있어요.",
  "result.historySparklineAlt": "처리율 추이 스파크라인: {from}에서 {to} bits/초, {count}회 측정",

  "rules.lowConfidence":
    "측정 신뢰도가 낮습니다 — 조건을 더 천천히·정확하게 해서 다시 측정해 보세요.",
  "rules.steepSlope":
    "먼 목표일수록 이동 시간이 크게 늘어나는 편이에요(기울기 {b}). 자주 쓰는 버튼을 가까이 모으면 도움이 됩니다.",
  "rules.shallowSlope":
    "목표가 멀어져도 이동 시간이 크게 늘지 않아요. 넓은 화면에서도 비교적 안정적인 편입니다.",
  "rules.highError":
    "빗나간 탭이 조금 있었어요(놓친 타깃 {rate}%). 버튼이 작거나 촘촘하면 특히 불리할 수 있습니다.",
  "rules.lowError": "정확도가 높아요({accuracy}%). 작은 타깃도 비교적 잘 맞히는 편입니다.",
  "rules.unstable":
    "탭 사이 편차가 커서 측정이 다소 불안정했어요. 조용한 환경에서 다시 해보면 더 또렷한 값이 나옵니다.",
  "rules.baseline":
    "이 수치는 오늘의 당신 상태에 대한 기록이에요. 다음에 다시 재면 변화를 견줄 수 있습니다.",

  "card.title": "결과 카드",
  "card.download": "PNG 저장",
  "card.exportJson": "프로파일 JSON 내보내기",
  "card.longPressHint": "이미지를 길게 눌러 저장하세요.",
  "card.throughputLabel": "처리율",
  "card.accuracyLabel": "정확도",
  "card.consistencyLabel": "일관성",
  "card.footer": "가늠 · WONKYARD",
  "card.disclaimer": "참고용 · 진단 아님",

  "theme.toggle": "테마",
  "theme.system": "시스템",
  "theme.light": "밝게",
  "theme.dark": "어둡게",
  "lang.toggle": "언어",

  "adapt.preset.young": "젊은 성인",
  "adapt.preset.elderly": "고령 성인",
  "adapt.preset.tremor": "손떨림 (추정)",
  "adapt.preset.me": "나 (측정값)",

  "adapt.title": "화면을 당신에게 맞추기",
  "adapt.sliderLabel": "손 능력 프리셋",
  "adapt.me": "나",
  "adapt.meDisabledNote": "측정이 불안정해 내 프로파일로는 맞출 수 없어요. 프리셋으로만 미리 볼 수 있어요.",
  "adapt.keypadLabel": "샘플 숫자 키패드",
  "adapt.keypadClear": "모두 지움",
  "adapt.keypadBack": "한 자 지움",
  "adapt.rowHit": "버튼 최소",
  "adapt.rowGap": "버튼 간격",
  "adapt.rowPad": "가장자리 여백",
  "adapt.rowValuePx": "{from} → {to} px",
  "adapt.rowValueMm": "{from} → {to} mm",
  "adapt.rowValueRel": "×{from} → ×{to}",
  "adapt.uncalibratedBadge": "미보정 — 상대 배율로 표시",
  "adapt.flooredNote": "이미 충분히 커서 더 키우지 않았어요.",
  "adapt.clampedNote": "측정이 매우 불안정해 상한까지만 반영했어요.",
  "adapt.whyToggle": "왜 이렇게 바뀌나요?",
  "adapt.whyFormula":
    "권장 크기 W* = 4.11·σ (σ = 유효 너비 ÷ 4.133). ‘축별 예측 오류율 4% 이하’를 만족하는 가장 작은 크기예요.",
  "adapt.why2d": "실제 2차원 버튼에선 약 {pct}% 오류에 해당해요 — 최적해가 아니라 방어 가능한 휴리스틱입니다.",
  "adapt.whyDocLink": "적응 모델 자세히 보기",
  "adapt.feltLegend": "체감 비교",
  "adapt.feltBase": "원래대로",
  "adapt.feltAdapted": "나에게 맞춤",
  "adapt.feltHint": "직접 눌러보세요 — 숫자 키패드가 바뀝니다.",
  "adapt.saveProfile": "내 손 프로파일 저장 (JSON)",
  "adapt.resultCard": "결과 카드",
  "adapt.whyAboutLink": "왜 ‘평균’은 실패하나 — 자세히",

  "adapt.sampleTabsLabel": "샘플 목업 종류",
  "adapt.sampleTab.keypad": "키패드",
  "adapt.sampleTab.login": "로그인 폼",
  "adapt.sampleTab.toolbar": "미디어 툴바",

  "adapt.loginLabel": "샘플 로그인 폼",
  "adapt.loginEmail": "이메일",
  "adapt.loginPassword": "비밀번호",
  "adapt.loginSubmit": "로그인",
  "adapt.loginForgot": "비밀번호 찾기",
  "adapt.loginForgotAck": "샘플이라 실제로 메일은 안 나가요.",
  "adapt.loginSubmitAck": "샘플 로그인 — 서버 호출은 없어요.",

  "adapt.toolbarLabel": "샘플 미디어 툴바",
  "adapt.toolbarPrev": "이전 트랙",
  "adapt.toolbarPlay": "재생",
  "adapt.toolbarPause": "일시정지",
  "adapt.toolbarNext": "다음 트랙",
  "adapt.toolbarVolume": "볼륨",
  "adapt.toolbarMute": "음소거",
  "adapt.toolbarFullscreen": "전체화면",
  "adapt.toolbarAck": "‘{action}’ 눌림",

  "about.title": "가늠이란?",
  "about.lead":
    "가늠은 브라우저에서 당신의 포인팅 능력을 재고, 그 수치에 맞춰 화면의 버튼·간격을 다시 그립니다. 이 페이지는 그 방법과 한계를 설명합니다.",
  "about.tocLabel": "이 문서의 목차",

  "about.s1Title": "1. Fitts의 법칙",
  "about.s1p1":
    "목표를 가리키는 데 걸리는 시간은 목표가 멀수록, 작을수록 늘어납니다. 이 관계를 정량화한 것이 Fitts의 법칙입니다 (Shannon 형식): MT = a + b·log2(A / W + 1). 여기서 A는 이동 거리, W는 목표 너비입니다.",
  "about.s1p2":
    "괄호 안의 값 log2(A / W + 1)을 난이도 지수(ID, bits)라고 부릅니다. a는 시작·정지에 드는 고정 비용, b는 난이도가 1 bit 늘 때마다 더 걸리는 시간입니다.",
  "about.s1p3":
    "아래 위젯에서 목표를 드래그하거나 두 슬라이더로 거리·크기를 바꿔 보세요. 예측 이동시간이 실시간으로 갱신됩니다. (여기 쓰인 a·b는 설명용 예시값입니다.)",
  "about.fittsWidgetAlt": "Fitts의 법칙 인터랙티브 그림: 시작점과 드래그 가능한 원형 목표.",
  "about.fittsTargetHandle": "목표 — 드래그하거나 화살표키로 거리·크기 조절",
  "about.fittsDistance": "이동 거리 A",
  "about.fittsSize": "목표 크기 W",
  "about.fittsReadout": "A = {a} px · W = {w} px · ID = {id} bits · 예측 MT ≈ {mt} ms",

  "about.s2Title": "2. ISO 9241-411 태핑 과제",
  "about.s2p1":
    "가늠의 측정은 국제 표준 ISO 9241-411의 태핑 과제를 따릅니다. 목표를 원형으로 배열하고, 매번 원의 지름 반대편 목표를 누르게 해서(criss-cross 순서) 이동 방향이 한쪽으로 치우치지 않게 합니다.",
  "about.s2p2":
    "각 탭에서 누른 시각과 착지 지점을 기록합니다. 여러 난이도에 걸친 이동시간을 최소제곱으로 적합해 a·b를 얻고, 착지 산포에서 유효 너비 We를 구합니다.",
  "about.s2caption": "8목표 원형 배열과 criss-cross 진행 순서 (축소 삽화).",
  "about.ringAlt": "원형으로 배열된 8개 목표와 지그재그로 이어지는 진행 순서 선.",

  "about.s3Title": "3. 왜 ‘평균’은 실패하나",
  "about.s3p1":
    "‘평균 사용자’에 맞춘 하나의 버튼 크기는 꼬리에 있는 사람에게 실패합니다. 접근성 지침도 이를 반영해 최소 크기를 정합니다 — WCAG 2.5.8은 24 CSS px, 2.5.5(강화)는 44 px를 권고하고, 주요 플랫폼의 터치 타깃 권장값도 44 px 안팎입니다.",
  "about.s3p2":
    "고령·운동 손상 인구에서는 이동시간의 기울기 b가 눈에 띄게 가팔라집니다. 문헌값으로 마우스 포인팅 기준 20대 b ≈ 224 ms/bit, 65세 이상 b ≈ 333 ms/bit(약 49% 가파름), 진전·파킨슨은 그보다 더 느리고 착지 산포가 큽니다 (Hertzum 2010; Keates & Trewin 2005).",
  "about.s3p3":
    "가늠의 적응은 목표 지표를 하나로 고정합니다: 컨트롤을 ‘축별(1차원) 예측 오류율 4% 이하’가 되는 가장 작은 크기로 키웁니다. 닫힌 식 W* = 4.11·σ (σ = 유효 너비 ÷ 4.133)로 계산하며 탐색 루프가 없습니다.",
  "about.s3p4":
    "정직하게 말하면 이 1차원 기준 크기는 실제 2차원 원형 버튼에서는 약 12% 오류율에 해당합니다. 최적해가 아니라 방어 가능한 휴리스틱입니다 — 자세한 수식과 상수는 저장소의 adapt-model 문서에 있습니다.",

  "about.s4Title": "4. 화면 보정은 왜 하나",
  "about.s4p1":
    "화면에서 1 px이 실제로 몇 mm인지는 모니터마다 다릅니다. 신용카드(ISO/IEC 7810, 85.60 × 53.98 mm)를 화면에 대고 상자 폭을 맞추면 px ↔ mm 환산값을 얻습니다. 선택 사항입니다.",
  "about.s4p2":
    "보정하지 않아도 측정과 적응은 그대로 동작합니다 — 다만 결과가 mm 대신 상대 배율(×1.0 → ×1.4)로 표시되고 ‘미보정’ 배지가 붙습니다. 측정 과제의 목표 기하는 항상 화면 CSS px에서만 파생되므로 보정·미보정 세션을 서로 비교할 수 있습니다.",

  "about.s5Title": "5. AI도 서버도 없이 어떻게?",
  "about.s5p1":
    "가늠은 Pointer Events API로 마우스·트랙패드·터치·펜을 통합해 받고, performance.now()로 시각을 재고, 최소제곱 회귀로 a·b를 적합합니다. 전부 브라우저 안에서 순수 함수로 돌아갑니다.",
  "about.s5p2":
    "측정 데이터는 기기 밖으로 나가지 않습니다. 결과 해설은 지금은 규칙 기반이고, 이후(주 7–8) 기기 내 소형 LLM을 선택적으로 얹을 계획입니다 — 그때도 서버 전송은 없습니다.",

  "about.s6Title": "6. 한계",
  "about.s6p1":
    "디스플레이·입력 지연은 모든 탭에 거의 일정한 시간을 더하므로 절편 a를 부풀리고 기울기 b는 거의 건드리지 않습니다. 그래서 가늠은 a의 절대값보다 b와 ‘같은 사람의 이전 측정 대비’ 변화를 앞세웁니다.",
  "about.s6p2":
    "자세, 화면과의 거리·시야각, 기기 폼팩터는 보정하지 않습니다. 인구 프리셋은 데스크톱 마우스 문헌이며 터치스크린을 그대로 대변하지 않습니다.",
  "about.s6p3":
    "겹쳐 보이는 참고 회귀선은 발표된 연구값의 ‘참고 밴드’일 뿐 규범이 아닙니다. 손떨림 프리셋의 a·b는 발표된 회귀가 아니라 방어 가능한 추정치입니다.",
  "about.s6notDiagnosis":
    "가늠은 진단 도구가 아닙니다. 건강 상태를 판정하지 않으며, 의학적 판단은 전문가에게 맡기세요.",

  "about.s7Title": "7. 인용",
  "about.s7intro": "이 페이지가 근거로 삼은 문헌과 표준입니다.",

  "result.explainMore": "가늠이 무엇을 재는지 (Fitts의 법칙) — 자세히",

  "unit.ms": "ms",
  "unit.bitsPerSecond": "bits/초",
} as const;

export type MessageKey = keyof typeof ko;
