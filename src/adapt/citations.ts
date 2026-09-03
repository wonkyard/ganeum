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
} as const;

export type CitationKey = keyof typeof CITATIONS;
