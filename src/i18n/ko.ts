/** 한국어 문자열 (기본 로케일). 모든 UI 카피는 여기서만 정의한다. */
export const ko = {
  "app.title": "가늠",
  "app.tagline": "당신의 손을 재고, 화면을 당신에게 맞춥니다.",
  "app.skipToContent": "본문으로 건너뛰기",

  "home.subcopy": "30초. 마우스·트랙패드·터치 모두 가능.",
  "home.start": "측정 시작",
  "home.whatIs": "가늠이란?",
  "home.pastResults": "지난 결과",
  "home.footer": "Fitts의 법칙 · ISO 9241-411 · WONKYARD",

  "measure.conditionProgress": "조건 {current} / {total}",
  "measure.instruction": "나타나는 원을 최대한 빠르고 정확하게 누르세요. 빗나가도 됩니다.",
  "measure.next": "다음",
  "measure.abortConfirm": "측정을 그만둘까요?",
  "measure.abortYes": "그만두기",
  "measure.abortNo": "계속하기",
  "measure.pointerRequired": "포인터 입력이 필요합니다. 결과 해설은 텍스트로 제공됩니다.",

  "result.title": "가늠 결과",
  "result.throughput": "처리율",
  "result.throughputUnit": "bits/초",
  "result.regression": "MT = {a} + {b}·ID",
  "result.rSquared": "r² = {value}",
  "result.accuracy": "정확도",
  "result.consistency": "일관성",
  "result.hand": "손",
  "result.disclaimer": "참고 밴드는 발표된 연구값 · 진단 아님",
  "result.remeasure": "다시 측정",

  "theme.toggle": "테마 전환",
  "lang.toggle": "언어 전환",

  "unit.ms": "ms",
  "unit.bitsPerSecond": "bits/초",
} as const;

export type MessageKey = keyof typeof ko;
