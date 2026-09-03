/**
 * 프리셋 파라미터의 참고문헌 문자열. **번역하지 않으므로** i18n 카탈로그가 아니라
 * 여기 상수로 둔다(brief-3A §8). 심사위원·`docs/adapt-model.md` 가 그대로 인용한다.
 */
export const CITATIONS = {
  hertzum2010:
    "Hertzum, M., Andersen, A., Andersen, V., & Hansen, K. L. (2010). How Age Affects Pointing with Mouse and Touchpad. International Journal of Human-Computer Interaction, 26(8), 703–734.",
  keatesTrewin2005:
    "Keates, S., & Trewin, S. (2005). Effect of Age and Parkinson's Disease on Cursor Positioning Using a Mouse. Proceedings of ASSETS '05, 68–75.",
  soukoreffMackenzie2004:
    "Soukoreff, R. W., & MacKenzie, I. S. (2004). Towards a standard for pointing device evaluation: Perspectives on 27 years of Fitts' law research in HCI. International Journal of Human-Computer Studies, 61(6), 751–789.",
  // 아래 3건은 S6 교육 페이지에서만 인용한다 (프리셋 파라미터 출처가 아니므로
  // `presets.ts` 는 참조하지 않는다). add-only — brief-5-6-a.
  mackenzie1992:
    "MacKenzie, I. S. (1992). Fitts' Law as a Research and Design Tool in Human-Computer Interaction. Human–Computer Interaction, 7(1), 91–139.",
  iso9241411:
    "ISO 9241-411:2012. Ergonomics of human-system interaction — Part 411: Evaluation methods for the design of physical input devices.",
  wcagTargetSize:
    "W3C (2023). Web Content Accessibility Guidelines (WCAG) 2.2 — Success Criteria 2.5.5 Target Size (Enhanced) and 2.5.8 Target Size (Minimum).",
} as const;

export type CitationKey = keyof typeof CITATIONS;

/**
 * 각 참고문헌의 공개 링크 (DOI / ACM DL). 번역 대상이 아니라 여기 상수.
 * `adaptation-presets.md` 에 실린 것과 동일하다.
 */
export const CITATION_URLS: Record<CitationKey, string> = {
  hertzum2010: "https://doi.org/10.1207/s15327590ijhci2608_01",
  keatesTrewin2005: "https://doi.org/10.1145/1090785.1090800",
  soukoreffMackenzie2004: "https://www.yorku.ca/mack/ijhcs2004.pdf",
  mackenzie1992: "https://www.yorku.ca/mack/HCI.html",
  iso9241411: "https://www.iso.org/standard/54106.html",
  wcagTargetSize: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html",
};

/**
 * 이 레포의 공개 주소 (CLAUDE.md 에 명시된 public 레포). 심사위원용 참고 문서
 * 링크를 한 곳에서 파생한다 — GitHub Pages 배포엔 `docs/` 가 안 올라가므로 소스
 * 트리를 가리킨다.
 */
export const REPO_URL = "https://github.com/wonkyard/ganeum";
export const ADAPT_MODEL_DOC_URL = `${REPO_URL}/blob/main/docs/adapt-model.md`;
