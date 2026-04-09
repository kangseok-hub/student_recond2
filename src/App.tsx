/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import Markdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  FileText, 
  Upload, 
  BarChart3, 
  TableProperties,
  ClipboardCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  FileUp,
  X,
  Download,
  Printer,
  RotateCcw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// Use the worker from the package instead of a CDN to avoid dynamic import errors
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { cn } from './lib/utils';

// --- Types ---

interface CompetencyHighlights {
  academic: string;
  career: string;
  community: string;
}

interface YearHighlights {
  y1: CompetencyHighlights;
  y2: CompetencyHighlights;
  y3: CompetencyHighlights;
}

interface YearData {
  y1: string;
  y2: string;
  y3: string;
}

interface CategoryGrades {
  s1_1: number | null;
  s1_2: number | null;
  s2_1: number | null;
  s2_2: number | null;
  s3_1: number | null;
  avg: number | null;
}

interface GradeMatrix {
  korean: CategoryGrades;
  math: CategoryGrades;
  english: CategoryGrades;
  social: CategoryGrades;
  science: CategoryGrades;
  others: CategoryGrades;
  total: CategoryGrades;
}

interface AnalysisResult {
  report: string;
  scores: {
    academic: number;
    career: number;
    community: number;
  };
  grades: GradeMatrix;
  groupAverages: {
    all: number | null;
    kems: number | null;
    kemSo: number | null;
    kemSc: number | null;
  };
  summaryHighlights: {
    academic: string;
    career: string;
    community: string;
  };
  futureStrategy: {
    deepDive: string;
    subjects: string;
  };
  highlights: {
    changche: {
      individual: YearHighlights;
      club: YearHighlights;
      career_act: YearHighlights;
    };
    curriculum: {
      korean: YearHighlights;
      math: YearHighlights;
      english: YearHighlights;
      social: YearHighlights;
      science: YearHighlights;
      liberal: YearHighlights;
      arts_phys: YearHighlights;
    };
    behavior: YearHighlights;
  };
  structuredData: {
    changche: {
      individual: YearData;
      club: YearData;
      career_act: YearData;
    };
    curriculum: {
      korean: YearData;
      math: YearData;
      english: YearData;
      social: YearData;
      science: YearData;
      liberal: YearData;
      arts_phys: YearData;
    };
    behavior: YearData;
  };
}

// --- Constants ---

const SYSTEM_INSTRUCTION = `
당신은 고등학교 생활기록부(생기부)를 정밀하게 분석하여 학생의 역량과 성취를 추출하는 '생기부 분석 전문 AI'입니다.
본 분석은 학생의 생활기록부를 바탕으로 학업 역량, 진로 역량, 공동체 역량을 평가합니다.

**[중요 지시]**
본 분석은 입학사정관의 시각에서 매우 **비판적이고 객관적인 관점**으로 진행되어야 합니다. 단순히 활동을 나열하거나 칭찬하는 것에 그치지 말고, 학생의 역량이 실제로 어떻게 증명되었는지, 부족한 점은 무엇인지 날카롭게 지적해 주세요.

입력된 데이터를 바탕으로 반드시 아래의 [Output Format] 형태를 엄격히 지켜서 출력해 주세요.

[Output Format]
1. 먼저 텍스트 기반의 요약 리포트를 Markdown 형식으로 작성하세요. 제목은 '# 📝 심층 분석 리포트'로 시작하세요.
   - 제목 바로 아래에 다음 주의사항을 반드시 포함하세요:
     *(본 심층 리포트는 한 평가자의 비판적 관점(강조)에 기반한 평가 결과이며, 대학 및 학과별 평가 기준과 방향에 따라 결과는 달라질 수 있음을 알려드립니다.)*
   - 리포트 구성 시 각 항목(학업, 진로, 공동체) 내에서 반드시 다음의 **[가독성 구조]**를 엄격히 지키세요:
     *주의: 리포트 최상단에 불필요한 기호(예: **, --- 등)를 절대 넣지 마세요.*
     1. 소제목은 '## 1. 학업 역량 (Academic Competency)'와 같이 작성하세요.
     2. 그 바로 아래에 '**우수한 점(Good)**'을 굵게 표시하고 반드시 한 줄을 띄우세요.
     3. 그 아래에 구체적인 사례들을 리스트(-) 형식으로 나열하세요. (리스트 아이템들 사이에는 빈 줄을 넣지 마세요.)
     4. 리스트가 끝나면 한 줄을 띄우고 '**개선 및 보완점(Improvement)**'을 굵게 표시하고 한 줄을 띄우세요.
     5. 그 아래에 보완점들을 리스트(-) 형식으로 나열하세요.
   - 리포트 마지막 섹션인 '향후 전략 및 제언'에서는 반드시 **지원 학과와 연계된 구체적인 교과목(선택 과목 등)**을 언급하고, **앞으로 탐구할 수 있는 구체적인 심화 주제 3가지 이상**을 포함하여 **대략 5줄 정도로 상세히 기술**하세요.
   - **[심화 주제 작성 형식 - 가독성 극대화]**
     각 주제는 반드시 아래 형식을 따라야 하며, 주제 간에는 충분한 간격을 두어야 합니다:
     1. 주제 제목은 **[과목명] 주제 명칭** 형식으로 작성하고 굵게(**) 표시하세요.
     2. 제목 바로 다음 줄에 상세 설명을 작성하세요. (제목과 설명 사이에 줄바꿈 하나)
     3. 주제와 주제 사이에는 반드시 두 번의 줄바꿈(\n\n)을 넣어 명확히 구분하세요.
     예시:
     - **[화학Ⅱ/생명과학Ⅱ] 효소 반응 속도론을 이용한 특정 질환 치료제의 저해제 설계 탐구**
       미카엘리스-멘텐 식을 활용하여 특정 효소의 활성을 억제하는 약물의 효율성을 수리적으로 분석하는 보고서 작성.
2. 그 다음, 반드시 아래 JSON 형식을 포함하여 상세 데이터를 구조화해 주세요.

※ 분석 및 평가 핵심 기준 (입학사정관 관점):
- **자기주도적 탐구 과정:** 학생 스스로 호기심을 가지고 질문을 던지며 주제를 선정하여 탐구한 과정이 드러나는가? (단순 나열이 아닌 교사의 평가적 기술 중요)
- **학업 역량 및 주도성:** 성적뿐만 아니라 특정 분야에 대한 심화 탐구, 자발적 연구, 문제 해결 사례가 있는가?
- **기록의 구체성 및 차별성:** 독창적인 사례와 구체적인 성취가 기술되어 있는가?
- **성장 및 변화 과정:** 활동의 목적, 배운 점, 진로와의 연계성, 그리고 시간이 흐름에 따른 학생의 성장이 보이는가?
- **협업 및 사회적 책임:** 팀 프로젝트나 봉사 활동에서 협업 능력과 기여도가 구체적으로 드러나는가?
- **진로 일관성:** 활동이 진로와 밀접하게 연결되어 있으며, 진로 변경 시 논리적인 설명이 있는가?
- **창의성 및 문제 해결:** 스스로 문제를 발견하고 창의적으로 해결한 경험이 있는가?
- **글의 구조와 명확성:** 간결하고 명확한 문장(명사형 표현 등)으로 핵심 역량이 잘 전달되는가?

JSON 구조 설명:
- changche: 창의적 체험활동 (자율활동, 동아리활동, 진로활동을 각각 1, 2, 3학년별로 원본 텍스트 전체 추출)
- curriculum: 교과 학습 발달 상황 (국어, 수학, 영어, 사회, 과학, 교양, 예체능을 각각 1, 2, 3학년별로 원본 텍스트 전체 추출)
- behavior: 행동특성 및 종합의견 (1, 2, 3학년별 원본 텍스트 전체 추출)
- grades: 성적 매트릭스 데이터 (국어, 수학, 영어, 사회, 과학, 기타 계열별로 1-1, 1-2, 2-1, 2-2, 3-1 학기별 평균 및 계열별 전체 평균 추출)
- scores: 역량 점수 (academic: 학업 역량, career: 진로 역량, community: 공동체 역량)
- highlights: 각 항목별/학년별 핵심 역량 요약 (academic: 학업역량 요약, career: 진로역량 요약, community: 공동체역량 요약 - **각 역량별로 대략 5줄 정도로 상세히 기술**)

\`\`\`json
{
  "scores": {
    "academic": 72,
    "career": 75,
    "community": 68
  },
  "summaryHighlights": {
    "academic": "통합과학의 매 단원 핵심 개념을 스스로 노트에 정리하는 자기주도적 학습 습관이 매우 견고하게 형성되어 있습니다...",
    "career": "신소재(그래핀)와 생명공학(DNA 시퀀싱) 등 첨단 과학 분야에 대한 폭넓은 탐구 의지가 돋보입니다...",
    "community": "멸종 위기 생물 보호 활동을 통해 인간의 이기심이 생태계에 미치는 영향을 성찰하고..."
  },
  "futureStrategy": {
    "deepDive": "그래핀의 '2차원 구조'에 대한 호기심을 확장하여, '탄소 나노 튜브'나 '풀러렌'과의 구조적 차이 및 응용 분야 비교 보고서 작성 추천.",
    "subjects": "공학 계열 희망 시 [물리학Ⅰ, 화학Ⅰ], 바이오 계열 희망 시 [생명과학Ⅰ, 화학Ⅰ]의 세부능력 및 특기사항에서 실험 설계의 정밀도를 높이는 기록 확보 필요."
  },
  "grades": {
    "korean": { "s1_1": 2.0, "s1_2": 2.5, "s2_1": 2.0, "s2_2": 1.5, "s3_1": 1.0, "avg": 1.8 },
    "math": { "s1_1": 3.0, "s1_2": 3.0, "s2_1": 2.5, "s2_2": 2.0, "s3_1": 1.5, "avg": 2.4 },
    "english": { "s1_1": 2.5, "s1_2": 2.0, "s2_1": 2.0, "s2_2": 1.5, "s3_1": 1.0, "avg": 1.8 },
    "social": { "s1_1": 2.0, "s1_2": 2.0, "s2_1": 1.5, "s2_2": 1.0, "s3_1": 1.0, "avg": 1.5 },
    "science": { "s1_1": 3.5, "s1_2": 3.0, "s2_1": 2.5, "s2_2": 2.0, "s3_1": 1.5, "avg": 2.5 },
    "others": { "s1_1": 2.0, "s1_2": 2.0, "s2_1": 2.0, "s2_2": 2.0, "s3_1": 2.0, "avg": 2.0 },
    "total": { "s1_1": 2.5, "s1_2": 2.4, "s2_1": 2.1, "s2_2": 1.7, "s3_1": 1.3, "avg": 2.0 }
  },
  "groupAverages": {
    "all": 2.05,
    "kems": 2.12,
    "kemSo": 1.95,
    "kemSc": 2.21
  },
  "highlights": {
    "changche": {
      "individual": {
        "y1": { "academic": "...", "career": "...", "community": "..." },
        "y2": { "academic": "...", "career": "...", "community": "..." },
        "y3": { "academic": "...", "career": "...", "community": "..." }
      },
      "club": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } },
      "career_act": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } }
    },
    "curriculum": {
      "korean": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } },
      "math": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } },
      "english": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } },
      "social": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } },
      "science": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } },
      "liberal": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } },
      "arts_phys": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } }
    },
    "behavior": { "y1": { "academic": "...", "career": "...", "community": "..." }, "y2": { "academic": "...", "career": "...", "community": "..." }, "y3": { "academic": "...", "career": "...", "community": "..." } }
  },
  "structuredData": {
    "changche": {
      "individual": { "y1": "...", "y2": "...", "y3": "..." },
      "club": { "y1": "...", "y2": "...", "y3": "..." },
      "career_act": { "y1": "...", "y2": "...", "y3": "..." }
    },
    "curriculum": {
      "korean": { "y1": "...", "y2": "...", "y3": "..." },
      "math": { "y1": "...", "y2": "...", "y3": "..." },
      "english": { "y1": "...", "y2": "...", "y3": "..." },
      "social": { "y1": "...", "y2": "...", "y3": "..." },
      "science": { "y1": "...", "y2": "...", "y3": "..." },
      "liberal": { "y1": "...", "y2": "...", "y3": "..." },
      "arts_phys": { "y1": "...", "y2": "...", "y3": "..." }
    },
    "behavior": { "y1": "...", "y2": "...", "y3": "..." }
  }
}
\`\`\`

※ 분석 가이드:
- 모든 항목은 학년별(y1, y2, y3)로 구분하여 분석하세요.
- **[절대 필수] 창체(자율, 동아리, 진로), 교과(국어, 수학, 영어, 사회, 과학, 교양, 예체능), 행동특성 및 종합의견의 각 학년별 상세 내용은 생기부 원본의 내용을 절대로 요약하거나 생략하지 마세요. 원본 텍스트를 토씨 하나 틀리지 않고 그대로(또는 누락 없이 전체 내용을) 추출하여 보여주세요. 텍스트에 불필요한 공백이 있더라도 내용은 모두 포함되어야 합니다.**
- **[성적 분석 지시] 생기부의 '교과학습발달상황' 섹션에서 성적 정보를 정밀하게 분석하여 grades 매트릭스를 채워주세요. 국어, 수학, 영어, 사회, 과학, 기타 계열별로 1-1, 1-2, 2-1, 2-2, 3-1 학기별 평균(단위수 가중 평균)을 계산하고, 각 계열의 전체 평균과 모든 과목의 학기별 전체 평균(total 행)을 소수점 첫째 자리까지 산출하세요. 성적이 없는 과목은 제외합니다.**
- **[추가 지시] 주요 교과 그룹별 최종 평균 등급(groupAverages)을 산출하세요. 'all'(전과목), 'kems'(국영수사과), 'kemSo'(국영수사), 'kemSc'(국영수과) 각각의 전체 평균 등급을 소수점 둘째 자리까지 계산하여 포함하세요.**
- **[추가 지시] 생기부 전체 내용을 종합하여 '핵심 역량 하이라이트(summaryHighlights)'를 작성하세요. 학업역량, 진로역량, 공동체역량 각각에 대해 약 300바이트(한글 100~150자) 내외로 구체적인 근거와 함께 분석하고, 강점과 보완점을 비판적으로 서술하세요.**
- **[추가 지시] '향후 전략 제언(futureStrategy)'을 작성하세요. 학생의 현재 활동을 바탕으로 더 깊이 있게 탐구할 수 있는 '심화 탐구 제안(deepDive)'과 지원 학과와 관련된 '연계 과목(subjects)'을 구체적으로 제시하세요.**
- **[추가 지시] 각 항목별/학년별 상세 내용을 바탕으로 '핵심 역량 하이라이트'를 추출하세요. 이는 해당 텍스트에서 학업역량, 진로역량, 공동체역량에 해당하는 핵심 문구들을 요약하여 highlights 필드에 담아주세요. 만약 해당 역량과 관련된 내용이 없다면 "관련 내용 없음"으로 표시하세요.**
- **[중요] 교과(curriculum) 섹션에서 새로운 과목이 시작될 때는 반드시 과목명을 굵게 표시하고, 과목 사이에는 한 줄을 띄워 구분하세요. (예: '**통합과학**: ...내용...\n\n**과학탐구실험**: ...내용...')**
- 단순 나열이 아닌, 학생의 구체적인 활동 내용, 역할, 성취, 변화 과정이 잘 드러나도록 문장형으로 작성하세요. (원본이 문장형이 아닌 경우에도 내용을 누락 없이 문장으로 구성하세요.)
- 데이터가 없는 학년은 "해당 없음" 또는 빈 문자열로 처리하세요.
- 학생의 강점이 잘 드러나도록 구체적인 사례를 중심으로 요약하세요.
- **역량 점수(scores) 산출 시, 매우 엄격하고 냉철한 기준을 적용하세요.**
- **전반적인 평균 점수가 70~75점 내외가 되도록 변별력을 극대화하여 점수를 부여하세요. (90점 이상은 전국 최상위권 수준일 때만 부여)**
`;

// --- Components ---

export default function App() {
  const [inputText, setInputText] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');
  const [studentName, setStudentName] = useState('');
  const [targetMajor, setTargetMajor] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'report' | 'interactive'>('report');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- Persistence Logic ---
  // Load data from localStorage on initial mount
  useEffect(() => {
    const savedData = localStorage.getItem('sengibu_analysis_v2');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.inputText) setInputText(parsed.inputText);
        if (parsed.checklistText) setChecklistText(parsed.checklistText);
        if (parsed.schoolName) setSchoolName(parsed.schoolName);
        if (parsed.grade) setGrade(parsed.grade);
        if (parsed.studentName) setStudentName(parsed.studentName);
        if (parsed.targetMajor) setTargetMajor(parsed.targetMajor);
        if (parsed.result) setResult(parsed.result);
        if (parsed.activeTab) setActiveTab(parsed.activeTab);
      } catch (e) {
        console.error("Failed to restore data from localStorage", e);
      }
    }
  }, []);

  // Save data to localStorage whenever relevant state changes
  useEffect(() => {
    const dataToSave = {
      inputText,
      checklistText,
      schoolName,
      grade,
      studentName,
      targetMajor,
      result,
      activeTab
    };
    localStorage.setItem('sengibu_analysis_v2', JSON.stringify(dataToSave));
  }, [inputText, checklistText, schoolName, grade, studentName, targetMajor, result, activeTab]);

  const handleReset = () => {
    setInputText('');
    setChecklistText('');
    setSchoolName('');
    setGrade('');
    setStudentName('');
    setTargetMajor('');
    setResult(null);
    setError(null);
    setUploadSuccess(false);
    setSelectedCategory(null);
    setActiveTab('report');
    setShowResetConfirm(false);
    localStorage.removeItem('sengibu_analysis_v2');
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    const element = document.getElementById('pdf-report-content');
    if (!element) {
      console.error('PDF content element not found');
      setIsGeneratingPDF(false);
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const margin = 20; // 20mm margin
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pdfWidth - (margin * 2);
      
      // Get the header and the prose content
      const header = element.children[0] as HTMLElement;
      const prose = element.children[1] as HTMLElement;
      
      // Flatten all children to capture them individually
      // This ensures that we can avoid splitting a paragraph across pages
      const elementsToCapture: HTMLElement[] = [];
      elementsToCapture.push(header);
      
      Array.from(prose.children).forEach(child => {
        const htmlChild = child as HTMLElement;
        if (htmlChild.tagName === 'UL' || htmlChild.tagName === 'OL') {
          // For lists, we capture each LI individually to prevent long lists from being cut
          Array.from(htmlChild.children).forEach(li => {
            elementsToCapture.push(li as HTMLElement);
          });
        } else {
          elementsToCapture.push(htmlChild);
        }
      });
      
      let currentY = margin;

      for (let i = 0; i < elementsToCapture.length; i++) {
        const el = elementsToCapture[i];
        
        // Skip hidden or empty elements
        if (el.offsetHeight === 0) continue;

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794, // Ensure consistent width for rendering
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

        // Get computed margins to preserve spacing
        const style = window.getComputedStyle(el);
        const marginTop = parseFloat(style.marginTop) * (25.4 / 96); // px to mm
        const marginBottom = parseFloat(style.marginBottom) * (25.4 / 96); // px to mm

        // Add top margin spacing
        currentY += marginTop;

        // If element doesn't fit on current page, move to next page
        // But only if we are not already at the top of a page
        if (currentY + imgHeight > pdfHeight - margin && currentY > margin + marginTop) {
          pdf.addPage();
          currentY = margin + marginTop;
        }

        pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight, undefined, 'FAST');
        
        // Move Y position for next element
        currentY += imgHeight + marginBottom;
      }

      // Save the PDF
      pdf.save(`심층분석_리포트_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      setError('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatContent = (text: string) => {
    if (!text) return text;
    // Regex to find subject names (e.g., "Subject Name:")
    // Looking for patterns like "Subject:" or "Subject :"
    const parts = text.split(/(\b[^:\n]+:)/g);
    return parts.map((part, index) => {
      if (part.endsWith(':')) {
        return (
          <span key={index} className="font-black text-blue-700 bg-blue-50/50 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('생기부 내용을 입력하거나 파일을 업로드해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setUploadSuccess(false);
    setActiveTab('report'); // Reset to report tab on new analysis

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: `희망 학과: ${targetMajor || '미정'}\n\n생기부 데이터: \n${inputText}\n\n평가 체크리스트: \n${checklistText || '기본 학생부종합전형 평가 기준 적용'}` }
            ]
          }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
// ... (rest of handleAnalyze logic)

      const text = response.text;
      
      // Extract JSON data
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      let scores = { academic: 0, career: 0, community: 0 };
      let grades: GradeMatrix = {
        korean: { s1_1: null, s1_2: null, s2_1: null, s2_2: null, s3_1: null, avg: null },
        math: { s1_1: null, s1_2: null, s2_1: null, s2_2: null, s3_1: null, avg: null },
        english: { s1_1: null, s1_2: null, s2_1: null, s2_2: null, s3_1: null, avg: null },
        social: { s1_1: null, s1_2: null, s2_1: null, s2_2: null, s3_1: null, avg: null },
        science: { s1_1: null, s1_2: null, s2_1: null, s2_2: null, s3_1: null, avg: null },
        others: { s1_1: null, s1_2: null, s2_1: null, s2_2: null, s3_1: null, avg: null },
        total: { s1_1: null, s1_2: null, s2_1: null, s2_2: null, s3_1: null, avg: null }
      };
      let groupAverages = { all: null, kems: null, kemSo: null, kemSc: null };
      
      let summaryHighlights = { academic: '', career: '', community: '' };
      let futureStrategy = { deepDive: '', subjects: '' };
      
      const emptyYearHighlights: YearHighlights = {
        y1: { academic: '', career: '', community: '' },
        y2: { academic: '', career: '', community: '' },
        y3: { academic: '', career: '', community: '' }
      };

      let highlights: AnalysisResult['highlights'] = {
        changche: {
          individual: { ...emptyYearHighlights },
          club: { ...emptyYearHighlights },
          career_act: { ...emptyYearHighlights }
        },
        curriculum: {
          korean: { ...emptyYearHighlights },
          math: { ...emptyYearHighlights },
          english: { ...emptyYearHighlights },
          social: { ...emptyYearHighlights },
          science: { ...emptyYearHighlights },
          liberal: { ...emptyYearHighlights },
          arts_phys: { ...emptyYearHighlights }
        },
        behavior: { ...emptyYearHighlights }
      };

      let structuredData: AnalysisResult['structuredData'] = {
        changche: {
          individual: { y1: '', y2: '', y3: '' },
          club: { y1: '', y2: '', y3: '' },
          career_act: { y1: '', y2: '', y3: '' }
        },
        curriculum: {
          korean: { y1: '', y2: '', y3: '' },
          math: { y1: '', y2: '', y3: '' },
          english: { y1: '', y2: '', y3: '' },
          social: { y1: '', y2: '', y3: '' },
          science: { y1: '', y2: '', y3: '' },
          liberal: { y1: '', y2: '', y3: '' },
          arts_phys: { y1: '', y2: '', y3: '' }
        },
        behavior: { y1: '', y2: '', y3: '' }
      };
      let cleanReport = text;

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          scores = parsed.scores || scores;
          grades = parsed.grades || grades;
          groupAverages = parsed.groupAverages || groupAverages;
          summaryHighlights = parsed.summaryHighlights || summaryHighlights;
          futureStrategy = parsed.futureStrategy || futureStrategy;
          highlights = parsed.highlights || highlights;
          structuredData = parsed.structuredData || structuredData;
          cleanReport = text.replace(jsonMatch[0], '');
        } catch (e) {
          console.error("Failed to parse JSON", e);
        }
      }

      setResult({
        report: cleanReport,
        scores,
        grades,
        groupAverages,
        summaryHighlights,
        futureStrategy,
        highlights,
        structuredData
      });
      setActiveTab('interactive'); // Automatically switch to interactive tab after analysis
    } catch (err: any) {
      console.error(err);
      setError('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
      });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      if (!fullText.trim()) {
        throw new Error('PDF에서 텍스트를 추출할 수 없습니다. (이미지 기반 PDF일 수 있습니다)');
      }
      
      return fullText;
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      throw new Error(err.message || 'PDF 파일을 읽는 중 오류가 발생했습니다.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setError(null);
    setUploadSuccess(false);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
      }

      if (text.trim()) {
        // Append to existing text if any
        setInputText(prev => prev ? `${prev}\n\n[추가된 파일 내용]\n${text}` : text);
        setUploadSuccess(true);
      } else {
        throw new Error('파일에서 텍스트를 추출할 수 없습니다.');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || '파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      setIsParsingFile(false);
      // Clear input value so same file can be uploaded again if needed
      if (e.target) e.target.value = '';
    }
  };

  const chartData = result ? [
    { subject: '공동체역량', A: result.scores.community, fullMark: 100 },
    { subject: '진로역량', A: result.scores.career, fullMark: 100 },
    { subject: '학업역량', A: result.scores.academic, fullMark: 100 },
  ] : [];

  const getGrade = (scores: { academic: number; career: number; community: number }) => {
    const avg = (scores.academic + scores.career + scores.community) / 3;
    if (avg >= 90) return '1++';
    if (avg >= 80) return '1+';
    if (avg >= 70) return '1';
    if (avg >= 60) return '2';
    return '3';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#212529] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <ClipboardCheck className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">생기부 분석 보고서</h1>
            </div>
            <span className="text-[10px] text-gray-400 font-medium ml-9">제작 : 숭신고등학교 진로전담교사 김강석</span>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <button 
              onClick={() => {
                const hasInput = inputText.trim() || schoolName || studentName || targetMajor || result;
                if (hasInput) {
                  setShowResetConfirm(true);
                } else {
                  handleReset();
                }
              }}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 px-2 md:px-3 py-1.5 rounded-lg transition-all font-bold text-xs md:text-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 md:w-4 h-4" />
              <span className="hidden sm:inline">새로 시작하기</span>
              <span className="sm:hidden">초기화</span>
            </button>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
              <span 
                onClick={() => setShowGuide(true)}
                className="hover:text-blue-600 cursor-pointer transition-colors"
              >
                분석 가이드
              </span>
              <span 
                onClick={() => setShowCriteria(true)}
                className="hover:text-blue-600 cursor-pointer transition-colors"
              >
                평가 기준
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
              <h3 className="text-lg font-bold">분석 가이드</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">1</span>
                  데이터 입력
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed pl-8">
                  생활기록부 텍스트를 직접 입력하거나 PDF 파일을 업로드하세요. 창체, 세특, 행특 내용이 모두 포함될수록 정확도가 높아집니다.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">2</span>
                  희망 학과 설정
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed pl-8">
                  희망하는 학과나 계열을 입력하면 해당 분야의 인재상에 맞춘 맞춤형 역량 분석을 제공합니다.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">3</span>
                  결과 확인 및 활용
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed pl-8">
                  종합 리포트에서 전체적인 흐름을 파악하고, 인터렉티브 분석 탭에서 학년별 상세 활동 내용을 확인하여 본인의 강점을 정리하세요.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowGuide(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showCriteria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="text-lg font-bold">평가 기준</h3>
              <button onClick={() => setShowCriteria(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-1">학업 역량</h4>
                  <p className="text-xs text-blue-800/70">학업 태도, 지적 호기심, 교과 성취도 및 탐구 능력</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-1">진로 역량</h4>
                  <p className="text-xs text-indigo-800/70">전공 관련 활동의 구체성, 전공 적합성, 진로 탐색 노력</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-900 mb-1">공동체 역량</h4>
                  <p className="text-xs text-emerald-800/70">협업 능력, 나눔과 배려, 리더십, 성실성 및 도덕성</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900">평가 등급 안내</h4>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { g: '1++', l: '최상위' },
                    { g: '1+', l: '우수' },
                    { g: '1', l: '보통' },
                    { g: '2', l: '미흡' },
                    { g: '3', l: '매우미흡' },
                  ].map((item) => (
                    <div key={item.g} className="text-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="text-sm font-black text-gray-900">{item.g}</div>
                      <div className="text-[10px] text-gray-400">{item.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowCriteria(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <RotateCcw className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">새로 시작하시겠습니까?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  현재 입력된 모든 내용과 분석 결과가 삭제됩니다.<br />이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                새로 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h2 className="font-semibold text-gray-800">학생 정보 및 목표</h2>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 ml-1">학교명</label>
                    <input 
                      type="text" 
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="OO고등학교"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 ml-1">학년</label>
                    <input 
                      type="text" 
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="N학년"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 ml-1">학생 성명</label>
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="홍길동"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 ml-1">희망 학과 / 계열</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={targetMajor}
                      onChange={(e) => setTargetMajor(e.target.value)}
                      placeholder="예: 컴퓨터공학과, 의예과, 경영학과 등"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <ChevronRight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h2 className="font-semibold text-gray-800">생기부 데이터 입력</h2>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingFile}
                  className={cn(
                    "text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md transition-all",
                    isParsingFile 
                      ? "text-gray-400 bg-gray-100 cursor-not-allowed" 
                      : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  )}
                >
                  {isParsingFile ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  {isParsingFile ? '파일 읽는 중...' : '파일 업로드'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".txt,.md,.pdf"
                />
              </div>
              <div className="p-5 space-y-4">
                {uploadSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <p>파일 내용이 성공적으로 추가되었습니다.</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    생활기록부 텍스트
                  </label>
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="학생의 생활기록부 내용을 복사하여 붙여넣으세요..."
                    className="w-full h-64 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    평가 체크리스트 (선택)
                  </label>
                  <textarea 
                    value={checklistText}
                    onChange={(e) => setChecklistText(e.target.value)}
                    placeholder="대학별 평가 기준이나 체크리스트가 있다면 입력하세요..."
                    className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
                  />
                </div>
                
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isParsingFile}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                    (isAnalyzing || isParsingFile)
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      데이터 분석 중...
                    </>
                  ) : isParsingFile ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      파일 읽는 중...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      AI 분석 리포트 생성
                    </>
                  )}
                </button>
              </div>
            </section>

            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-blue-900 text-sm">분석 팁</h3>
              </div>
              <ul className="space-y-2 text-xs text-blue-800/80 leading-relaxed list-disc pl-4">
                <li>PDF, TXT 파일을 업로드하거나 텍스트를 직접 입력할 수 있습니다.</li>
                <li>생기부의 '창체', '세특', '행특' 내용을 모두 포함하면 더 정확한 분석이 가능합니다.</li>
                <li>특정 학과를 지망한다면 체크리스트에 해당 학과의 인재상을 입력해보세요.</li>
                <li>개인정보(이름, 주민번호 등)는 마스킹 처리 후 입력하는 것을 권장합니다.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-7">
            {!result && !isAnalyzing ? (
              <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="bg-gray-50 p-6 rounded-full mb-6">
                  <ClipboardCheck className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">분석 결과가 여기에 표시됩니다</h3>
                <p className="text-gray-400 max-w-xs mx-auto text-sm">
                  왼쪽 폼에 생기부 내용을 입력하고 분석 버튼을 눌러 리포트를 생성하세요.
                </p>
              </div>
            ) : isAnalyzing ? (
              <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-gray-200">
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">AI가 생기부를 정밀 분석 중입니다</h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm">
                  데이터 구조화, 역량 추출, 시각화 지표 산출을 진행하고 있습니다. 잠시만 기다려주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Score Summary Card */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <h2 className="font-bold text-gray-800">생기부 핵심 역량 분석</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                          <PolarGrid stroke="#E5E7EB" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            name="역량 함량"
                            dataKey="A"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-10 bg-blue-600 rounded-full"></div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">종합 평가 등급</p>
                            <p className="text-2xl font-black text-gray-900">{getGrade(result.scores)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">평균 점수</p>
                          <p className="text-2xl font-black text-blue-600">
                            {((result.scores.academic + result.scores.career + result.scores.community) / 3).toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                          <p className="text-[10px] font-bold text-red-400 uppercase mb-1">학업</p>
                          <p className="text-lg font-black text-red-600">{result.scores.academic}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                          <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">진로</p>
                          <p className="text-lg font-black text-blue-600">{result.scores.career}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-center">
                          <p className="text-[10px] font-bold text-green-400 uppercase mb-1">공동체</p>
                          <p className="text-lg font-black text-green-600">{result.scores.community}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Core Competency Highlights Section */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                    <h2 className="font-bold text-gray-800">핵심 역량 하이라이트</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-red-50/50 rounded-2xl border border-red-100/50">
                      <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                        학업역량 (Academic Competency)
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {result.summaryHighlights.academic}
                      </p>
                    </div>

                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <h3 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        진로역량 (Career Competency)
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {result.summaryHighlights.career}
                      </p>
                    </div>

                    <div className="p-5 bg-green-50/50 rounded-2xl border border-green-100/50">
                      <h3 className="text-sm font-bold text-green-600 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        공동체역량 (Community Competency)
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {result.summaryHighlights.community}
                      </p>
                    </div>
                  </div>

                  {/* Future Strategy Section */}
                  <div className="mt-8 p-6 bg-gray-900 rounded-2xl text-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-blue-400" />
                      <h3 className="font-bold text-lg">향후 전략 제언</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="shrink-0 w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                        <div>
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">심화 탐구 제안</p>
                          <p className="text-sm text-gray-300 leading-relaxed">{result.futureStrategy.deepDive}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="shrink-0 w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                        <div>
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">연계 과목</p>
                          <p className="text-sm text-gray-300 leading-relaxed">{result.futureStrategy.subjects}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Grade Analysis Card */}
                {result && result.grades && (
                  <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-center gap-2">
                      <TableProperties className="w-5 h-5 text-indigo-600" />
                      <h2 className="font-bold text-gray-800">성적 분석 매트릭스</h2>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 border border-gray-100 text-left">계열</th>
                            <th className="px-2 py-3 border border-gray-100">1-1</th>
                            <th className="px-2 py-3 border border-gray-100">1-2</th>
                            <th className="px-2 py-3 border border-gray-100">2-1</th>
                            <th className="px-2 py-3 border border-gray-100">2-2</th>
                            <th className="px-2 py-3 border border-gray-100">3-1</th>
                            <th className="px-4 py-3 border border-gray-100 bg-blue-50/50 text-blue-600">전체 평균</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {[
                            { key: 'korean', label: '국어계열' },
                            { key: 'math', label: '수학계열' },
                            { key: 'english', label: '영어계열' },
                            { key: 'social', label: '사회계열' },
                            { key: 'science', label: '과학계열' },
                            { key: 'others', label: '기타계열' },
                            { key: 'total', label: '전체 평균', isTotal: true }
                          ].map((row) => {
                            const data = result.grades[row.key as keyof GradeMatrix];
                            return (
                              <tr key={row.key} className={cn(
                                "hover:bg-gray-50/50 transition-colors",
                                row.isTotal ? "bg-blue-50/30 font-bold" : ""
                              )}>
                                <td className={cn(
                                  "px-4 py-3 border border-gray-100 text-left font-bold",
                                  row.isTotal ? "text-blue-700" : "text-gray-700"
                                )}>
                                  {row.label}
                                </td>
                                {[data.s1_1, data.s1_2, data.s2_1, data.s2_2, data.s3_1].map((val, i) => (
                                  <td key={i} className="px-2 py-3 border border-gray-100 text-gray-600">
                                    {val ? `${val}` : '-'}
                                  </td>
                                ))}
                                <td className={cn(
                                  "px-4 py-3 border border-gray-100 font-black",
                                  row.isTotal ? "text-blue-700 bg-blue-50/50" : "text-blue-600 bg-blue-50/20"
                                )}>
                                  {data.avg ? `${data.avg}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Group Averages Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">전과목 평균</p>
                        <p className="text-2xl font-black">{result.groupAverages.all || '-'}</p>
                      </div>
                      <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">국영수사과</p>
                        <p className="text-2xl font-black">{result.groupAverages.kems || '-'}</p>
                      </div>
                      <div className="p-4 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-600/20">
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">국영수사</p>
                        <p className="text-2xl font-black">{result.groupAverages.kemSo || '-'}</p>
                      </div>
                      <div className="p-4 bg-purple-600 rounded-2xl text-white shadow-lg shadow-purple-600/20">
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">국영수과</p>
                        <p className="text-2xl font-black">{result.groupAverages.kemSc || '-'}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 text-right italic">
                      * 단위수 가중 평균 기준
                    </p>
                  </section>
                )}

                {/* Report Content */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                        <h2 className="text-xl font-black text-gray-900">심층 분석 리포트</h2>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {activeTab === 'report' && (
                          <button 
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                            className={cn(
                              "px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all",
                              isGeneratingPDF && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {isGeneratingPDF ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            PDF 저장
                          </button>
                        )}
                        <button 
                          onClick={() => setActiveTab('report')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === 'report' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          )}
                        >
                          종합 리포트
                        </button>
                        <button 
                          onClick={() => setActiveTab('interactive')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === 'interactive' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          )}
                        >
                          인터렉티브 분석
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 px-4 py-3 rounded-xl border border-amber-100/50">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        <span className="text-amber-600 font-bold">※ 주의:</span> 본 심층 리포트는 한 평가자의 <span className="text-red-600 font-bold underline">비판적 관점</span>에 기반한 평가 결과이며, 대학 및 학과별 평가 기준과 방향에 따라 결과는 달라질 수 있음을 알려드립니다.
                      </p>
                    </div>
                  </div>

                  {activeTab === 'report' ? (
                    <div className="p-10 prose prose-slate max-w-none prose-headings:font-black prose-h1:hidden prose-h2:text-2xl prose-h2:border-b-2 prose-h2:border-blue-100 prose-h2:pb-3 prose-h2:mt-16 prose-h3:text-xl prose-h3:text-blue-800 prose-p:leading-relaxed prose-p:text-gray-700 prose-li:leading-relaxed prose-li:text-gray-700 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <Markdown>
                        {result?.report
                          ?.replace(/^#+ .*\n?/, '')
                          ?.replace(/\(본 심층 리포트는.*알려드립니다\.\)/g, '')
                          ?.replace(/^[\s\n*]+/, '')
                          ?.trim()}
                      </Markdown>
                    </div>
                  ) : (
                    <div className="p-6 space-y-8">
                      {/* Interactive Categories */}
                      <div className="space-y-6">
                        {/* 창체 Section */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">창의적 체험활동 (창체)</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { id: 'individual', label: '자율활동', icon: '👤', section: 'changche' },
                              { id: 'club', label: '동아리활동', icon: '🤝', section: 'changche' },
                              { id: 'career_act', label: '진로활동', icon: '🚀', section: 'changche' },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                  "p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3",
                                  selectedCategory === cat.id 
                                    ? "border-blue-600 bg-blue-50 shadow-sm" 
                                    : "border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50"
                                )}
                              >
                                <span className="text-2xl">{cat.icon}</span>
                                <span className="font-bold text-gray-800">{cat.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 교과 Section */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">교과 학습 발달 상황</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {[
                              { id: 'korean', label: '국어', icon: '📖', section: 'curriculum' },
                              { id: 'math', label: '수학', icon: '📐', section: 'curriculum' },
                              { id: 'english', label: '영어', icon: '🔤', section: 'curriculum' },
                              { id: 'social', label: '사회', icon: '🌍', section: 'curriculum' },
                              { id: 'science', label: '과학', icon: '🧪', section: 'curriculum' },
                              { id: 'liberal', label: '교양', icon: '🎨', section: 'curriculum' },
                              { id: 'arts_phys', label: '예체능', icon: '🏀', section: 'curriculum' },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                  "p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-1",
                                  selectedCategory === cat.id 
                                    ? "border-blue-600 bg-blue-50 shadow-sm" 
                                    : "border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50"
                                )}
                              >
                                <span className="text-xl">{cat.icon}</span>
                                <span className="font-bold text-xs text-gray-800">{cat.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 행특 Section */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">행동특성 및 종합의견</h3>
                          <button
                            onClick={() => setSelectedCategory('behavior')}
                            className={cn(
                              "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3",
                              selectedCategory === 'behavior' 
                                ? "border-blue-600 bg-blue-50 shadow-sm" 
                                : "border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50"
                            )}
                          >
                            <span className="text-2xl">📝</span>
                            <span className="font-bold text-gray-800">행동특성 및 종합의견</span>
                          </button>
                        </div>
                      </div>

                      {/* Content Display */}
                      {selectedCategory && (
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 animate-in fade-in zoom-in-95 duration-300">
                          <h3 className="font-black text-xl mb-6 text-gray-800 flex items-center gap-2">
                            <ChevronRight className="w-6 h-6 text-blue-600" />
                            {(() => {
                              const allCats = [
                                { id: 'individual', label: '자율활동' },
                                { id: 'club', label: '동아리활동' },
                                { id: 'career_act', label: '진로활동' },
                                { id: 'korean', label: '국어' },
                                { id: 'math', label: '수학' },
                                { id: 'english', label: '영어' },
                                { id: 'social', label: '사회' },
                                { id: 'science', label: '과학' },
                                { id: 'liberal', label: '교양' },
                                { id: 'arts_phys', label: '예체능' },
                                { id: 'behavior', label: '행동특성 및 종합의견' },
                              ];
                              return allCats.find(c => c.id === selectedCategory)?.label + ' 학년별 상세';
                            })()}
                          </h3>
                          
                          <div className="grid grid-cols-1 gap-6">
                            {[1, 2, 3].map((year) => {
                              const key = `y${year}` as keyof YearData;
                              let content = '';
                              let yearHighlight: CompetencyHighlights | null = null;
                              
                              if (selectedCategory === 'behavior') {
                                content = result.structuredData.behavior[key];
                                yearHighlight = result.highlights.behavior[key];
                              } else if (['individual', 'club', 'career_act'].includes(selectedCategory)) {
                                content = result.structuredData.changche[selectedCategory as keyof typeof result.structuredData.changche][key];
                                yearHighlight = result.highlights.changche[selectedCategory as keyof typeof result.structuredData.changche][key];
                              } else {
                                content = result.structuredData.curriculum[selectedCategory as keyof typeof result.structuredData.curriculum][key];
                                yearHighlight = result.highlights.curriculum[selectedCategory as keyof typeof result.structuredData.curriculum][key];
                              }

                              return (
                                <div key={year} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-6">
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full">{year}학년</span>
                                    <div className="h-px flex-1 bg-gray-100"></div>
                                  </div>

                                  {/* 핵심 역량 하이라이트 */}
                                  {yearHighlight && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                                        <h4 className="text-sm font-black text-gray-800">핵심 역량 하이라이트</h4>
                                      </div>
                                      <div className="flex flex-col gap-3">
                                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                                          <div className="text-xs font-black text-rose-500 mb-2">학업역량</div>
                                          <p className="text-sm text-rose-700 leading-relaxed font-medium">
                                            {yearHighlight.academic || '관련 내용 없음'}
                                          </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                          <div className="text-xs font-black text-blue-500 mb-2">진로역량</div>
                                          <p className="text-sm text-blue-700 leading-relaxed font-medium">
                                            {yearHighlight.career || '관련 내용 없음'}
                                          </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                          <div className="text-xs font-black text-emerald-500 mb-2">공동체역량</div>
                                          <p className="text-sm text-emerald-700 leading-relaxed font-medium">
                                            {yearHighlight.community || '관련 내용 없음'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-1 h-4 bg-gray-300 rounded-full"></div>
                                      <h4 className="text-sm font-black text-gray-800">상세 내용</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                      {content ? formatContent(content) : '해당 학년의 기록이 분석되지 않았습니다.'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-12 border-t border-gray-200 mt-12 text-center text-gray-400 text-sm">
        <p>© 2026 생기부 분석 보고서. All rights reserved.</p>
        <p className="mt-1">본 분석 결과는 참고용이며, 실제 입시 결과와는 다를 수 있습니다.</p>
      </footer>

      {/* Hidden PDF Content */}
      {result && (
        <div id="pdf-report-content-wrapper" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div 
            id="pdf-report-content" 
            className="bg-white text-gray-900" 
            style={{ 
              width: '170mm', 
              backgroundColor: 'white',
              padding: '0'
            }}
          >
            <div className="pb-6 mb-8" style={{ borderBottom: '4px solid #2563eb' }}>
              <h1 className="text-3xl font-black mb-4" style={{ color: '#111827' }}>📝 생기부 심층 분석 리포트</h1>
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-700 font-bold">
                    <span style={{ backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{schoolName || '미입력 학교'}</span>
                    <span style={{ backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{grade || '-'}학년</span>
                    <span style={{ color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>{studentName || '학생'} 귀하</span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#6b7280' }}>희망 학과: {targetMajor || '미지정'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>분석 일자: {new Date().toLocaleDateString('ko-KR')}</p>
                  <p className="text-sm font-bold" style={{ color: '#4b5563' }}>출처 : 숭신고등학교 진로전담교사 김강석</p>
                </div>
              </div>
            </div>

            <div className="prose prose-slate max-w-none prose-headings:font-black prose-h1:hidden prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-h3:text-lg prose-p:text-sm prose-li:text-sm" style={{ color: '#374151' }}>
              <p className="text-xs italic mb-8" style={{ color: '#6b7280' }}>
                (본 심층 리포트는 한 평가자의 비판적 관점에 기반한 평가 결과이며, 대학 및 학과별 평가 기준과 방향에 따라 결과는 달라질 수 있음을 알려드립니다.)
              </p>
              
              {(() => {
                const cleanReport = result.report
                  .replace(/^#+ .*\n?/, '')
                  .replace(/\(본 심층 리포트는.*알려드립니다\.\)/g, '')
                  .replace(/^[\s\n*]+/, '')
                  .trim();
                return (
                  <>
                    <Markdown>{cleanReport}</Markdown>
                    <div className="mt-12 pt-8 border-t border-gray-100 text-right">
                      <p className="text-sm font-bold" style={{ color: '#9ca3af' }}>출처 : 숭신고등학교 진로전담교사 김강석</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
  </div>
);
}
