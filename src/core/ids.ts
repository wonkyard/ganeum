/**
 * ID 생성. 프로파일 ID 는 시간순 정렬이 가능하도록 앞에 base36 타임스탬프를 붙인다.
 * `crypto.randomUUID` 가 있으면 쓰고, 없으면 `getRandomValues` 폴백, 그것도 없으면
 * `Math.random` — core 를 어떤 런타임(Node/브라우저/테스트)에서도 돌릴 수 있게.
 */

function randomHex(bytes: number): string {
  const g = globalThis as { crypto?: Crypto };
  if (g.crypto?.getRandomValues) {
    const buf = new Uint8Array(bytes);
    g.crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  let out = "";
  for (let i = 0; i < bytes; i++) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

/** 프로파일 ID: `<base36 ms>-<8 hex>` — 사전순 정렬 = 생성순 정렬. */
export function newProfileId(now: number = Date.now()): string {
  return `${Math.floor(now).toString(36)}-${randomHex(4)}`;
}

/** 조건 ID: 진폭/너비로부터 결정적으로. 같은 (A, W) 는 같은 ID. */
export function conditionId(amplitude: number, width: number): string {
  return `c-${Math.round(amplitude)}x${Math.round(width)}`;
}
