# XREAL CV · AI Agent Community — 3주 강의 사이트

GitHub Pages용 정적 사이트입니다. 빌드 과정이 없습니다.

```
index.html            코스 홈 (1~3주차 카드, 진도 표시)
week1/index.html      1주차: LLM의 역사와 작동 원리, 그리고 레드티밍 (인터랙티브)
week1/week1.js        1주차 인터랙션
week1/animations.html 32개 장면 애니메이션 (원본)
week1/slides-v0.4.pdf 장표 PDF (원본)
week2/, week3/        공개 예정 페이지
assets/               공통 CSS·JS, Pretendard 폰트 (SIL OFL 1.1)
```

## 배포 (도메인: https://xreal-cv-ai-agent-community.github.io)

1. GitHub에 `xreal-cv-ai-agent-community` 이름으로 **Organization**을 만든다.
2. 그 안에 `xreal-cv-ai-agent-community.github.io` 저장소를 만들고 이 폴더 내용을 push한다.
3. Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)`.

Organization을 만들지 않으면 개인 계정에 `xreal-cv-ai-agent-community` 저장소를 만들어
`https://<계정>.github.io/xreal-cv-ai-agent-community/` 주소로 배포할 수 있다. 모든 링크가 상대 경로라 그대로 동작한다.

## 2·3주차 열기

`week2/index.html`을 강의 페이지로 바꾸고, `index.html`의 WEEK 02 카드에서 `lock` 클래스를 지운 뒤
`<div class="card">`를 `<a class="card" href="week2/">`로 바꾼다.
