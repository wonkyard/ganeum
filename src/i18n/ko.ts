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
  "home.calibrationOff": "화면 보정: 안 됨",
  "home.footer": "Fitts의 법칙 · ISO 9241-411 · WONKYARD",

  "setup.title": "어떻게 잴까요?",
  "setup.quickTitle": "빠른 측정",
  "setup.quickDetail": "약 30초 · 조건 3개",
  "setup.preciseTitle": "정밀 측정",
  "setup.preciseDetail": "약 2분 · 조건 9개 · 좌우손 비교",
  "setup.comingSoon": "준비 중",
  "setup.handLegend": "쓰는 손",
  "setup.handRight": "오른손",
  "setup.handLeft": "왼손",
  "setup.howtoTitle": "이렇게 하세요",
  "setup.howtoBody": "나타나는 원을 최대한 빠르고 정확하게 누르세요. 빗나가도 됩니다.",
  "setup.start": "시작",
  "setup.startHint": "스페이스",

  "countdown.announce": "{n}초 후 시작",
  "countdown.go": "시작!",

  "measure.conditionProgress": "조건 {current} / {total}",
  "measure.pointerRequired": "포인터 입력이 필요합니다. 결과 해설은 텍스트로 제공됩니다.",
  "measure.hardestCondition": "이 조건은 일부러 어렵습니다.",
  "measure.abort": "측정 중단",
  "measure.abortConfirm": "측정을 그만둘까요? 진행 중인 기록은 저장되지 않습니다.",
  "measure.abortYes": "그만두기",
  "measure.abortNo": "계속하기",
  "measure.srStatus": "측정 중 — 조건 {current} / {total}",

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
  "result.comparisonReserved": "피험자 내 비교는 다음 업데이트에서 제공됩니다.",
  "result.insufficient": "측정 데이터가 부족합니다. 다시 측정해 주세요.",
  "result.notFound": "결과를 찾을 수 없습니다.",

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

  "unit.ms": "ms",
  "unit.bitsPerSecond": "bits/초",
} as const;

export type MessageKey = keyof typeof ko;
