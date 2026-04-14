// 나중에 테마를 바꿀 때 이 파일 하나만 수정하면 됨
// 사용법: import { colors } from '../styles/colors.js';

// colors 객체: 역할별로 이름을 붙인 색상값 (HEX 코드)
export const colors = {
  // ── 배경 ──
  bg: 'var(--theme-bg)',

  // ── 카드·표면 ──
  card: 'var(--theme-card)',

  // ── 테두리 ──
  border: 'var(--theme-border)',

  // ── 주요 강조색 (파랑-보라 계열) ──
  primary: 'var(--theme-primary)',
  primaryLight: 'var(--theme-primary-light)',

  // ── 성공·긍정 (초록 계열) ──
  success: 'var(--theme-success)',
  successLight: 'var(--theme-success-light)',

  // ── 경고·주의 (주황 계열) ──
  warning: 'var(--theme-warning)',
  warningLight: 'var(--theme-warning-light)',

  // ── 위험·부정 (빨강 계열) ──
  danger: 'var(--theme-danger)',
  dangerLight: 'var(--theme-danger-light)',

  // ── 텍스트 ──
  text: 'var(--theme-text)',
  sub: 'var(--theme-sub)',
  muted: 'var(--theme-muted)',

  // ── AI 관련 (보라 계열) ──
  aiTag: 'var(--theme-ai)',
  aiTagLight: 'var(--theme-ai-light)',
};