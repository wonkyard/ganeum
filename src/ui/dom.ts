/** 프레임워크 없는 DOM 헬퍼. `el()` 로 요소를 만든다 (스펙 §8: 런타임 의존성 0). */

export type Attrs = Record<string, string | number | boolean | undefined | null>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.append(c);
  }
  return node;
}

/** SVG 요소용 (`el` 은 HTML 네임스페이스 전용). */
export function svgEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** 포커스 트랩 대상이 되는, 탭 가능한 요소 셀렉터. */
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
