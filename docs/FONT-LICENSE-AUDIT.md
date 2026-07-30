# 폰트 라이선스 감사 — self-host 근거 (germ-warfare)

> 조사일: 2026-07-30. **관련 결정**: [[decisions/ADR-011-font-self-host]].
> 이 문서는 게임 내 Credits 화면에서 링크되며, 이 리포(공개) 어디서든 외부인이
> 아래 커맨드를 그대로 실행해 모든 주장을 직접 재현·검증할 수 있다.

## 요약

| 폰트 | 원 저작권자 | 라이선스 | RFN(예약명) | self-host 파일 | CSS 상 이름 |
|---|---|---|---|---|---|
| Dongle | The Dongle Project Authors | SIL OFL 1.1 | 없음 | `Dongle-{Light,Regular,Bold}.woff2` | `Dongle` (원명 유지) |
| Gugi | TAE System & Typefaces Co. | SIL OFL 1.1 | 없음 | `Gugi-Regular.woff2` | `Gugi` (원명 유지) |
| Orbitron | The Orbitron Project Authors (디자이너: Matt McInerney, The League of Moveable Type) | SIL OFL 1.1 | **있음 — "Orbitron"** | `GW-Orbitron.woff2` | **`GW Orbitron` (내부 개명)** |

세 폰트 전부 원본은 Google Fonts 를 통해 배포되지만, **저작권자는 Google 이 아니다.** 이 리포는
Google Fonts CDN 을 거치지 않고 `google/fonts` GitHub 리포(각 폰트 저작권자가 OFL 로 공개한
1차 소스)에서 직접 원본 `.ttf` 를 받아, **글리프·OpenType 기능 전량 보존한 무손실 포맷 변환**
(ttf→woff2, 서브셋 없음)만 수행했다.

## 1. 왜 Google 의 서브셋 woff2 를 그대로 쓰지 않았는가

Google Fonts API 가 주는 woff2 는 브라우저 UA 별 `unicode-range` 분할 서브셋이다. 실측:

```
분할 서브셋 전량   376 파일, 2,433,088 B  (Dongle 285 / Gugi 87 / Orbitron 4)
업스트림 무손실 변환   5 파일,   918,392 B  (분할본보다 오히려 작음 — 파일당 헤더/사전 중복 제거)
```

또한 SIL OFL-FAQ(openfontlicense.org/documents/OFL-FAQ.txt) 2.6:

> "Subsetting a webfont... is considered modification. This is permitted by the OFL but
> would not normally allow the use of RFNs."

즉 **글리프를 잘라내는 서브셋은 예약명(RFN) 보유 폰트의 이름을 못 쓰게 만들 수 있다.** 업스트림
원본을 그대로(글리프 무손실) 컨테이너 포맷만 바꾸는 쪽이 더 작고, 더 안전하다.

## 2. 라이선스 원문 — 1차 출처 직접 확인

재현 커맨드(누구나 그대로 실행 가능):

```bash
curl -sSf https://raw.githubusercontent.com/google/fonts/main/ofl/dongle/OFL.txt   | head -1
curl -sSf https://raw.githubusercontent.com/google/fonts/main/ofl/gugi/OFL.txt     | head -1
curl -sSf https://raw.githubusercontent.com/google/fonts/main/ofl/orbitron/OFL.txt | head -1
```

결과(2026-07-30 확인):

```
Copyright 2021 The Dongle Project Authors (https://github.com/yangheeryu/Dongle)
Copyright (c) 2017 by TAE System & Typefaces Co.. All rights reserved.
Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron"
```

세 파일의 라이선스 본문(조항 부분)은 SIL OFL 1.1 표준 텍스트와 diff 결과 100% 동일 — 변형·추가
조항 없음(직접 diff 로 확인, 아래 §5 재현 절차 참조).

**"Reserved Font Name" 정의**(OFL 1.1 본문, DEFINITIONS):

> "Reserved Font Name" refers to any names specified as such after the copyright statement(s).

→ Dongle·Gugi 저작권 줄엔 그런 이름이 전혀 없음(위 출력 확인) = **이 두 폰트는 RFN 자체가 없다.**
개명 없이 원래 이름 그대로 self-host 해도 라이선스 조항 위반 자체가 성립하지 않는다.

## 3. Orbitron — RFN 조항과 실제로 취한 조치

OFL 1.1 본문 PERMISSION & CONDITIONS 3항(원문):

> "No Modified Version of the Font Software may use the Reserved Font Name(s) unless
> explicit written permission is granted by the corresponding Copyright Holder. This
> restriction only applies to the primary font name as presented to the users."

그리고 DEFINITIONS:

> "'Modified Version' refers to any derivative made by adding to, deleting, or substituting
> ... any of the components of the Original Version, **by changing formats** or by porting
> the Font Software to a new environment."

**포맷 변환(ttf→woff2) 자체가 이 라이선스의 정의상 "Modified Version"을 만든다** — 글리프를
하나도 안 건드려도 그렇다. SIL 자체 FAQ(2.7/2.8)는 "Functional Equivalence"(글리프·기능·품질·
저작권고지 전량 보존) 를 지키면 RFN 을 계속 쓸 수 있다는 **해석 가이드**를 제공하지만, 이건
본문 3항이 명시한 "저작권자의 서면 허가"를 대신하는 게 아니다 — SIL(라이선스 제정 기관)의
권위 있는 해석일 뿐, 본문 자체가 준 예외는 아니다.

**따라서 이 리포는 해석에 기대지 않고, 리스크 자체를 없애는 쪽을 택했다**: Orbitron 의
"primary font name as presented to the users"(3항이 명시한, 규제되는 대상 그 자체)를
`public/assets/fonts/GW-Orbitron.woff2` 내부 name 테이블에서 전면 `GW Orbitron` 으로
치환했다 — CSS `font-family`, 폰트 파일의 Family/Full name/PostScript name/가변폰트
named-instance 이름 전부. 3항은 "이름"에만 걸리는 조건이므로, 이름을 바꾸면 조건 자체가
미적용된다 — 도안(글리프) 사용 권한은 라이선스 첫 문단에서 이미 무조건 부여돼 있고
("...to use, study, copy, merge, embed, modify, redistribute, and sell modified and
unmodified copies of the Font Software..."), 3항은 그 권한에 뚫린 구멍이 아니라 완전히
별개의 조건(브랜드명 통제) 이기 때문이다.

**보존한 것** — 라이선스 2항(저작권고지 동봉 의무)·4항(저작자 인정 허용)을 지키기 위해 다음은
그대로 유지:
- 폰트 파일 name 테이블 nameID 0(저작권 + RFN 선언문 원문, "with Reserved Font Name" 포함) — 그대로.
- nameID 13/14(라이선스 문구/URL), nameID 8/9(제작사/디자이너) — 그대로.
- `public/assets/fonts/Orbitron-OFL.txt` — 원본 라이선스 전문 동봉.
- 이 문서 + Credits 화면의 출처 표기("Orbitron 원작 기반, OFL, self-hosted as GW Orbitron").

## 4. 기술 검증 — 무손실 변환 실측

```bash
# 테이블(OpenType 기능) 보존 여부
python3 -c "
from fontTools.ttLib import TTFont
o = TTFont('Orbitron-var.ttf'); c = TTFont('GW-Orbitron.woff2')
print(set(o.keys()) - set(c.keys()))"
# → {'DSIG'} 만 — 디지털 서명 테이블은 재포장 시 무효화되므로 웹폰트 변환의 표준 관행상 제거됨.
# fvar(가변폰트 축)·GSUB/GPOS(합자·커닝 등 스마트폰트 기능) 전량 유지 확인.
```

실측 결과(2026-07-30):

| 항목 | 결과 |
|---|---|
| Orbitron 테이블 diff | `DSIG` 만 제거(표준 관행), `fvar`/`GSUB`/`GPOS` 등 전량 보존 |
| Orbitron nameID 0(저작권+RFN 선언문) | 원문 그대로 보존 확인 |
| Dongle 실사용 글리프 커버리지 | 12,494 자 중 이 프로젝트 실사용분 100% 커버(누락 0) |
| Gugi 실사용 글리프 커버리지 | 기존 Google CDN 버전과 동일하게 5자(`·×—…→`) 누락 — **회귀 아님** |
| Orbitron(라틴/숫자 전용) 글리프 | 실사용 라틴/숫자 100% 커버(한글은 원래 미지원 서체) |

## 5. 기타 에셋 — Kenney/ambientCG (CC0, 리스크 없음)

`docs/LICENSES.md` 기준 게임 내 이미지 에셋은 전부 **CC0**(Kenney.nl, ambientCG) — 퍼블릭
도메인과 동등한 라이선스로, 출처 표기 의무조차 없다(감사 차원에서 표기 중). Service Worker
전량 precache(ADR-010)로 재배포되는 것에 아무 제약이 없다 — 확인만 하고 별도 조치 불필요.

## 6. 재현 절차 (외부 검증용)

```bash
git clone https://github.com/hwanyong/germ-warfare.git && cd germ-warfare

# 1) 원본 라이선스 원문 확인
curl -sSf https://raw.githubusercontent.com/google/fonts/main/ofl/dongle/OFL.txt
curl -sSf https://raw.githubusercontent.com/google/fonts/main/ofl/gugi/OFL.txt
curl -sSf https://raw.githubusercontent.com/google/fonts/main/ofl/orbitron/OFL.txt

# 2) 리포에 동봉된 라이선스 사본과 대조
diff <(curl -sSf https://raw.githubusercontent.com/google/fonts/main/ofl/orbitron/OFL.txt) \
     public/assets/fonts/Orbitron-OFL.txt

# 3) 실제 배포 폰트의 내부 이름표 확인 (Orbitron 개명 여부)
pip install fonttools
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('public/assets/fonts/GW-Orbitron.woff2')
for r in f['name'].names:
    if r.nameID in (0,1,4,6): print(r.nameID, r.toUnicode())"
```

## 결론

- Dongle·Gugi: RFN 없음 → self-host·개명 여부 무관 완전 자유. 조항 위반 리스크 없음.
- Orbitron: RFN 있으나, "이름이 규제 대상"이라는 조항 성격상 **개명으로 조건 자체를 해소**.
  도안·글리프·스마트폰트 기능·저작권 고지는 전량 무손실 보존. 저작자 인정은 Credits +
  이 문서 + 동봉 OFL.txt 로 이행.
- 기타 에셋(CC0): 리스크 없음, 별도 조치 불필요.
