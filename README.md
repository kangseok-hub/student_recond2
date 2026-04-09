# 생기부 분석 AI 리포트

고등학교 생활기록부(생기부)를 업로드하면 **대학 입학사정관 관점**에서 핵심 역량을 구조화하고 시각화해주는 AI 분석 도구입니다.

## 주요 기능

- 📄 **PDF 생기부 파싱** — 업로드한 생기부에서 텍스트를 자동 추출
- 🤖 **Gemini AI 분석** — 학업, 진로, 공동체 역량을 입학사정관 관점으로 분석
- 📊 **시각화 리포트** — 역량 레이더 차트, 연도별 성장 그래프 등 제공
- 📥 **PDF 내보내기** — 분석 결과를 PDF로 저장

## 기술 스택

- **React 19** + **TypeScript**
- **Vite 6** (빌드 도구)
- **Tailwind CSS v4**
- **Google Gemini API** (`@google/genai`)
- **Recharts** (차트)
- **pdf.js** (PDF 파싱)
- **jsPDF + html2canvas** (PDF 내보내기)

## 로컬 실행 방법

### 사전 요구사항

- Node.js 18 이상
- [Google AI Studio](https://ai.studio)에서 발급한 Gemini API 키

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 GEMINI_API_KEY에 발급받은 키를 입력하세요

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 빌드

```bash
npm run build
```

## 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API 키 | ✅ |
| `APP_URL` | 배포 시 앱 URL (로컬 실행 시 불필요) | ❌ |

> ⚠️ `.env.local` 파일은 절대 커밋하지 마세요. `.gitignore`에 이미 포함되어 있습니다.

## 배포

Vercel, Netlify 등 정적 호스팅 서비스에 배포 가능합니다.
빌드 명령어: `npm run build` / 출력 디렉토리: `dist`

배포 시 플랫폼의 환경변수 설정에서 `GEMINI_API_KEY`를 등록하세요.

## 라이선스

Apache-2.0
