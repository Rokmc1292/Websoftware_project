import { useEffect, useMemo, useRef, useState } from "react";
import { colors } from "../../styles/colors.js";

const defaultWakeGoals = [
  "물마시기",
  "푸쉬업 20회",
  "스쿼트 20회",
  "창문 열기",
  "가벼운 스트레칭",
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toMinutes(hour, minute) {
  return hour * 60 + minute;
}

function parseLocalDate(dateString) {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function calculateSleepHours(bedHour, bedMinute, wakeHour, wakeMinute) {
  const bed = toMinutes(bedHour, bedMinute);
  let wake = toMinutes(wakeHour, wakeMinute);

  if (wake <= bed) wake += 24 * 60;

  return Number(((wake - bed) / 60).toFixed(1));
}

function getSleepQualityScore(hours, satisfaction, memo) {
  let score = 50;
  const normalizedMemo = memo.replace(/\s+/g, "").toLowerCase();

  if (hours >= 7 && hours <= 8.5) score += 20;
  else if (hours >= 6 && hours < 7) score += 10;
  else if (hours > 8.5 && hours <= 9.5) score += 12;
  else score -= 8;

  score += satisfaction * 8;

  if (
    normalizedMemo.includes("자주깸") ||
    normalizedMemo.includes("깼음") ||
    normalizedMemo.includes("깨서") ||
    normalizedMemo.includes("중간에깸") ||
    normalizedMemo.includes("계속깸")
  ) {
    score -= 8;
  }

  if (
    normalizedMemo.includes("뒤척") ||
    normalizedMemo.includes("설침") ||
    normalizedMemo.includes("선잠") ||
    normalizedMemo.includes("얕은잠")
  ) {
    score -= 6;
  }

  if (
    normalizedMemo.includes("악몽") ||
    normalizedMemo.includes("무서운꿈") ||
    normalizedMemo.includes("꿈많이") ||
    normalizedMemo.includes("꿈을많이")
  ) {
    score -= 5;
  }

  if (
    normalizedMemo.includes("개운") ||
    normalizedMemo.includes("상쾌") ||
    normalizedMemo.includes("푹잠") ||
    normalizedMemo.includes("숙면") ||
    normalizedMemo.includes("잘잠")
  ) {
    score += 6;
  }

  return clamp(Math.round(score), 0, 100);
}

function getFreshnessScore(hours, satisfaction, memo) {
  let score = 45 + satisfaction * 9;
  const normalizedMemo = memo.replace(/\s+/g, "").toLowerCase();

  if (hours >= 7 && hours <= 8.5) score += 18;
  else if (hours < 6) score -= 12;
  else if (hours > 9) score -= 6;

  if (
    normalizedMemo.includes("개운") ||
    normalizedMemo.includes("상쾌") ||
    normalizedMemo.includes("푹잠") ||
    normalizedMemo.includes("숙면")
  ) {
    score += 10;
  }

  if (
    normalizedMemo.includes("피곤") ||
    normalizedMemo.includes("몸이무거") ||
    normalizedMemo.includes("몽롱") ||
    normalizedMemo.includes("졸림") ||
    normalizedMemo.includes("못일어나")
  ) {
    score -= 10;
  }

  if (
    normalizedMemo.includes("자주깸") ||
    normalizedMemo.includes("깼음") ||
    normalizedMemo.includes("깨서") ||
    normalizedMemo.includes("중간에깸") ||
    normalizedMemo.includes("계속깸")
  ) {
    score -= 8;
  }

  return clamp(Math.round(score), 0, 100);
}

function getGrowthScore(hours, sleepQuality) {
  let score = 40;

  if (hours >= 7.5 && hours <= 9) score += 28;
  else if (hours >= 6.5) score += 16;
  else score -= 8;

  score += Math.round((sleepQuality - 50) * 0.35);

  return clamp(score, 0, 100);
}

function getMissionRate(goals) {
  if (!goals.length) return 0;
  const checked = goals.filter((goal) => goal.done).length;
  return Math.round((checked / goals.length) * 100);
}

function getKoreanDayLabel(date) {
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

function buildWeeklySleepData(records, baseDateString) {
  const baseDate = parseLocalDate(baseDateString);
  const result = [];

  const startOfWeek = new Date(baseDate);
  const day = startOfWeek.getDay(); // 일요일 시작
  startOfWeek.setDate(startOfWeek.getDate() - day);

  for (let i = 0; i < 7; i += 1) {
    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + i);

    const dateKey = formatLocalDate(targetDate);
    const found = records.find((record) => record.date === dateKey);

    result.push({
      day: getKoreanDayLabel(targetDate),
      hours: found ? Number(found.sleepHours || 0) : 0,
      date: dateKey,
    });
  }

  return result;
}

function buildCoachComment({
  sleepHours,
  satisfaction,
  memo,
  missionRate,
  sleepQuality,
  freshness,
  growth,
}) {
  let comment = "";
  const normalizedMemo = memo.replace(/\s+/g, "").toLowerCase();
  let memoAnalysis = "";

  if (sleepHours < 6) {
    comment += `오늘 수면 시간은 ${sleepHours}시간으로 부족한 편이에요. `;
  } else if (sleepHours >= 7 && sleepHours <= 8.5) {
    comment += `수면 시간은 ${sleepHours}시간으로 비교적 안정적인 편이에요. `;
  } else {
    comment += `수면 시간은 충분하지만 일정한 패턴을 유지하는 것이 더 중요해요. `;
  }

  if (satisfaction >= 4) {
    comment += `수면 만족도도 높아서 전반적인 회복 상태는 좋은 편이에요. `;
  } else if (satisfaction <= 2.5) {
    comment += `수면 만족도가 낮아 실제 회복감은 부족했을 가능성이 있어요. `;
  }

  const hasFragmentedSleep =
    normalizedMemo.includes("자주깸") ||
    normalizedMemo.includes("깼음") ||
    normalizedMemo.includes("깨서") ||
    normalizedMemo.includes("중간에깸") ||
    normalizedMemo.includes("중간에몇번") ||
    normalizedMemo.includes("자다깸") ||
    normalizedMemo.includes("계속깸");

  const hasRestlessSleep =
    normalizedMemo.includes("뒤척") ||
    normalizedMemo.includes("설침") ||
    normalizedMemo.includes("선잠") ||
    normalizedMemo.includes("얕은잠");

  const hasBadDream =
    normalizedMemo.includes("악몽") ||
    normalizedMemo.includes("무서운꿈") ||
    normalizedMemo.includes("꿈많이") ||
    normalizedMemo.includes("꿈을많이");

  const hasTiredWake =
    normalizedMemo.includes("피곤") ||
    normalizedMemo.includes("몸이무거") ||
    normalizedMemo.includes("몽롱") ||
    normalizedMemo.includes("졸림") ||
    normalizedMemo.includes("졸렸다") ||
    normalizedMemo.includes("개운하지않") ||
    normalizedMemo.includes("못일어나");

  const hasGoodWake =
    normalizedMemo.includes("개운") ||
    normalizedMemo.includes("상쾌") ||
    normalizedMemo.includes("잘잠") ||
    normalizedMemo.includes("푹잠") ||
    normalizedMemo.includes("숙면");

  const hasLateSleep =
    normalizedMemo.includes("늦게잠") ||
    normalizedMemo.includes("늦잠") ||
    normalizedMemo.includes("늦게잤") ||
    normalizedMemo.includes("새벽에잠");

  if (memo.trim()) {
    if (hasFragmentedSleep) {
      memoAnalysis +=
        "수면 중간에 여러 번 깬 흔적이 있어서 수면의 연속성이 떨어졌을 가능성이 있어요. ";
    }

    if (hasRestlessSleep) {
      memoAnalysis +=
        "뒤척이거나 얕게 잔 느낌이 있었다면 깊은 수면 비중이 부족했을 수 있어요. ";
    }

    if (hasBadDream) {
      memoAnalysis +=
        "꿈이 많거나 악몽이 있었다면 실제 수면 시간보다 더 피곤하게 느껴질 수 있어요. ";
    }

    if (hasTiredWake) {
      memoAnalysis +=
        "기상 후에도 피곤함이나 몽롱함이 남아 있었다면 회복 효율이 충분하지 않았을 가능성이 커요. ";
    }

    if (hasGoodWake) {
      memoAnalysis +=
        "반대로 개운함이나 상쾌함이 있었다면 전반적인 수면 질은 비교적 괜찮았던 편이에요. ";
    }

    if (hasLateSleep) {
      memoAnalysis +=
        "취침이 늦어졌다면 생체 리듬이 밀려 다음날 컨디션에도 영향을 줄 수 있어요. ";
    }

    if (!memoAnalysis) {
      memoAnalysis +=
        "메모에 적은 내용을 보면 오늘 수면 상태에 개인적인 변동 요인이 있었던 것으로 보여요. ";
    }

    comment += memoAnalysis;
  }

  if (missionRate >= 70) {
    comment += `기상 미션 수행률이 ${missionRate}%로 높아 아침 루틴이 잘 형성되고 있어요. `;
  } else {
    comment += `기상 미션 수행률은 ${missionRate}%로, 내일은 하나라도 확실히 완료하는 것이 중요해요. `;
  }

  comment += `종합적으로 수면 질 ${sleepQuality}점, 개운함 ${freshness}점, 회복 기여도 ${growth}점 수준입니다. `;
  comment += "내일은 취침 시간을 일정하게 유지하는 것에 집중해보세요.";

  return comment;
}

function StarRating({ value, onChange, disabled = false }) {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = hoverValue ?? value;

  const getFill = (index) => {
    if (displayValue >= index + 1) return "100%";
    if (displayValue >= index + 0.5) return "50%";
    return "0%";
  };

  const getValueFromPointer = (index, e) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const pointerX = e.clientX - left;
    const isHalf = pointerX < width / 2;
    return index + (isHalf ? 0.5 : 1);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          onMouseMove={
            disabled
              ? undefined
              : (e) => setHoverValue(getValueFromPointer(index, e))
          }
          onMouseLeave={disabled ? undefined : () => setHoverValue(null)}
          onClick={
            disabled
              ? undefined
              : (e) => onChange(getValueFromPointer(index, e))
          }
          style={{
            position: "relative",
            width: 30,
            height: 30,
            cursor: disabled ? "default" : "pointer",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "#d1d5db",
              fontSize: 30,
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            ★
          </span>
          <span
            style={{
              color: "#f5b301",
              fontSize: 30,
              lineHeight: 1,
              position: "absolute",
              top: 0,
              left: 0,
              width: getFill(index),
              overflow: "hidden",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            ★
          </span>
        </div>
      ))}

      <span
        style={{
          marginLeft: 8,
          fontSize: 14,
          fontWeight: 700,
          color: colors.text,
          minWidth: 36,
        }}
      >
        {value === 0 ? "-" : value}
      </span>
    </div>
  );
}

function TimeSelect({
  value,
  onChange,
  options,
  unit = "시",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          height: 42,
          border: `1px solid ${open ? colors.aiTag : colors.border}`,
          borderRadius: 8,
          padding: "0 12px",
          background: colors.background || "#fff",
          color: colors.text,
          fontSize: 14,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "default" : "pointer",
          boxSizing: "border-box",
          transition: "all 0.2s ease",
          boxShadow: open ? `0 0 0 3px ${colors.aiTagLight}` : "none",
        }}
      >
        <span>
          {String(value).padStart(2, "0")}
          {unit}
        </span>
        <span
          style={{
            fontSize: 12,
            color: colors.sub,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 0,
            right: 0,
            maxHeight: 168,
            overflowY: "auto",
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            background: colors.background || "#fff",
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            zIndex: 100,
            padding: 4,
            boxSizing: "border-box",
          }}
        >
          {options.map((option) => {
            const isSelected = option === value;
            const isHovered = hoveredValue === option;

            return (
              <div
                key={option}
                onMouseEnter={() => setHoveredValue(option)}
                onMouseLeave={() => setHoveredValue(null)}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={{
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isSelected
                    ? colors.aiTag
                    : isHovered
                      ? colors.aiTagLight
                      : "transparent",
                  color: isSelected ? "#fff" : colors.text,
                  fontSize: 14,
                  fontWeight: isSelected ? 700 : 500,
                  transition: "all 0.15s ease",
                  userSelect: "none",
                }}
              >
                {String(option).padStart(2, "0")}
                {unit}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RadarChart({ data }) {
  const size = 260;
  const center = size / 2;
  const radius = 82;
  const levels = 5;

  const [displayData, setDisplayData] = useState(data);
  const prevDataRef = useRef(data);
  const firstRenderRef = useRef(true);

  const dataSignature = useMemo(() => {
    return data.map((item) => `${item.label}:${item.value}`).join("|");
  }, [data]);

  useEffect(() => {
    const end = data;
    const start = firstRenderRef.current
      ? end.map((item) => ({ ...item, value: 0 }))
      : prevDataRef.current;

    firstRenderRef.current = false;

    let frame = 0;
    const totalFrames = 24;
    let rafId;

    const animate = () => {
      frame += 1;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);

      const interpolated = start.map((item, i) => ({
        ...item,
        value: item.value + (end[i].value - item.value) * eased,
      }));

      setDisplayData(interpolated);

      if (frame < totalFrames) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayData(end);
        prevDataRef.current = end;
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [dataSignature, data]);

  const axisData = useMemo(() => {
    return displayData.map((item, index) => {
      const angle = (Math.PI * 2 * index) / displayData.length - Math.PI / 2;

      const axisX = center + Math.cos(angle) * radius;
      const axisY = center + Math.sin(angle) * radius;

      const valueRadius = (item.value / 100) * radius;
      const pointX = center + Math.cos(angle) * valueRadius;
      const pointY = center + Math.sin(angle) * valueRadius;

      const labelRadius = radius + 26;
      const labelX = center + Math.cos(angle) * labelRadius;
      const labelY = center + Math.sin(angle) * labelRadius;

      return {
        ...item,
        axisX,
        axisY,
        pointX,
        pointY,
        labelX,
        labelY,
      };
    });
  }, [displayData, center, radius]);

  const polygonPoints = axisData
    .map((point) => `${point.pointX},${point.pointY}`)
    .join(" ");

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={260} height={260} style={{ overflow: "visible" }}>
        {[...Array(levels)].map((_, levelIndex) => {
          const r = (radius / levels) * (levelIndex + 1);

          const points = axisData
            .map((_, index) => {
              const angle =
                (Math.PI * 2 * index) / axisData.length - Math.PI / 2;
              return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
            })
            .join(" ");

          return (
            <polygon
              key={levelIndex}
              points={points}
              fill="none"
              stroke={colors.border}
              strokeWidth="1"
            />
          );
        })}

        {axisData.map((item) => (
          <line
            key={item.label}
            x1={center}
            y1={center}
            x2={item.axisX}
            y2={item.axisY}
            stroke={colors.border}
            strokeWidth="1"
          />
        ))}

        <polygon
          points={polygonPoints}
          fill={colors.aiTag}
          fillOpacity={0.28}
          stroke={colors.aiTag}
          strokeWidth="2"
        />

        {axisData.map((item) => (
          <circle
            key={item.label}
            cx={item.pointX}
            cy={item.pointY}
            r="4"
            fill={colors.aiTag}
          />
        ))}

        {axisData.map((item) => (
          <g key={`label-${item.label}`}>
            <text
              x={item.labelX}
              y={item.labelY}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={colors.text}
            >
              {item.label}
            </text>
            <text
              x={item.labelX}
              y={item.labelY + 14}
              textAnchor="middle"
              fontSize="10"
              fill={colors.sub}
            >
              {Math.round(item.value)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function WeeklyBarChart({ data }) {
  const [displayData, setDisplayData] = useState(data);
  const [hoveredDay, setHoveredDay] = useState(null);
  const prevDataRef = useRef(data);
  const firstRenderRef = useRef(true);

  const dataSignature = useMemo(() => {
    return data.map((item) => `${item.date}:${item.hours}`).join("|");
  }, [data]);

  useEffect(() => {
    const end = data;
    const start = firstRenderRef.current
      ? end.map((item) => ({ ...item, hours: 0 }))
      : prevDataRef.current;

    firstRenderRef.current = false;

    let frame = 0;
    const totalFrames = 24;
    let rafId;

    const animate = () => {
      frame += 1;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);

      const interpolated = start.map((item, i) => ({
        ...item,
        hours: item.hours + (end[i].hours - item.hours) * eased,
      }));

      setDisplayData(interpolated);

      if (frame < totalFrames) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayData(end);
        prevDataRef.current = end;
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [dataSignature, data]);

  const maxBarArea = 190;
  const maxHours = Math.max(...displayData.map((d) => d.hours), 1);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 14,
          padding: "4px 4px 0",
        }}
      >
        {displayData.map((item) => {
          const barHeight =
            item.hours === 0
              ? 4
              : Math.max(12, (item.hours / maxHours) * maxBarArea);
          const isHovered = hoveredDay === item.date;

          return (
            <div
              key={item.date}
              onMouseEnter={() => setHoveredDay(item.date)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: isHovered ? colors.text : colors.sub,
                  fontWeight: isHovered ? 700 : 400,
                  transition: "all 0.2s ease",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {item.hours.toFixed(1)}h
              </span>

              <div
                style={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 38,
                    height: barHeight,
                    background: colors.aiTag,
                    opacity: isHovered ? 0.45 : 0.25,
                    border: `1px solid ${colors.aiTag}`,
                    borderRadius: 10,
                    transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: isHovered
                      ? `0 8px 18px ${colors.aiTagLight}`
                      : "none",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          height: 1,
          background: colors.border,
          opacity: 0.8,
          margin: "8px 4px 8px",
          flexShrink: 0,
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "0 4px",
          flexShrink: 0,
        }}
      >
        {displayData.map((item) => {
          const isHovered = hoveredDay === item.date;

          return (
            <div
              key={`${item.date}-label`}
              onMouseEnter={() => setHoveredDay(item.date)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isHovered ? colors.aiTag : colors.text,
                  transition: "color 0.2s ease",
                  lineHeight: 1,
                }}
              >
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SleepPage() {
  const [selectedDate, setSelectedDate] = useState(() =>
    formatLocalDate(new Date()),
  );

  const [bedHour, setBedHour] = useState(23);
  const [bedMinute, setBedMinute] = useState(30);
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMinute, setWakeMinute] = useState(30);
  const [satisfaction, setSatisfaction] = useState(0);
  const [memo, setMemo] = useState("");
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");
  const [goals, setGoals] = useState(
    defaultWakeGoals.map((goal) => ({ text: goal, done: false })),
  );
  const [sleepRecords, setSleepRecords] = useState([]);
  const [aiCoachComment, setAiCoachComment] = useState("");
  const [aiCoachData, setAiCoachData] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [wearableStatus, setWearableStatus] = useState("미연동");

  const sleepHours = useMemo(
    () => calculateSleepHours(bedHour, bedMinute, wakeHour, wakeMinute),
    [bedHour, bedMinute, wakeHour, wakeMinute],
  );

  const missionRate = useMemo(() => getMissionRate(goals), [goals]);

  const sleepQuality = useMemo(
    () => getSleepQualityScore(sleepHours, satisfaction, memo),
    [sleepHours, satisfaction, memo],
  );

  const freshness = useMemo(
    () => getFreshnessScore(sleepHours, satisfaction, memo),
    [sleepHours, satisfaction, memo],
  );

  const growth = useMemo(
    () => getGrowthScore(sleepHours, sleepQuality),
    [sleepHours, sleepQuality],
  );

  const radarData = useMemo(
    () => [
      { label: "수면 질", value: sleepQuality },
      { label: "근성장", value: growth },
      { label: "개운함", value: freshness },
      { label: "기상미션", value: missionRate },
      {
        label: "수면시간",
        value: clamp(Math.round((sleepHours / 8) * 100), 0, 100),
      },
    ],
    [sleepQuality, growth, freshness, missionRate, sleepHours],
  );

  const localCoachComment = useMemo(
    () =>
      buildCoachComment({
        sleepHours,
        satisfaction,
        memo,
        missionRate,
        sleepQuality,
        freshness,
        growth,
      }),
    [
      sleepHours,
      satisfaction,
      memo,
      missionRate,
      sleepQuality,
      freshness,
      growth,
    ],
  );

  const weeklyChartData = useMemo(
    () => buildWeeklySleepData(sleepRecords, selectedDate),
    [sleepRecords, selectedDate],
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const cardStyle = {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 16,
    minWidth: 0,
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 8,
    display: "block",
  };

  const getIntensityBadgeStyle = (intensity) => {
    switch (intensity) {
      case "매우 낮음":
        return {
          background: "#f3f4f6",
          color: "#6b7280",
          border: "1px solid #d1d5db",
        };
      case "낮음":
        return {
          background: "#eff6ff",
          color: "#2563eb",
          border: "1px solid #bfdbfe",
        };
      case "중간":
        return {
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
        };
      case "중간 이상":
        return {
          background: "#fffbeb",
          color: "#d97706",
          border: "1px solid #fde68a",
        };
      case "높음":
        return {
          background: "#fef2f2",
          color: "#dc2626",
          border: "1px solid #fecaca",
        };
      default:
        return {
          background: colors.aiTagLight,
          color: colors.aiTag,
          border: `1px solid ${colors.border}`,
        };
    }
  };

  const getWeekRangeLabel = (dateString) => {
    const baseDate = parseLocalDate(dateString);
    const startOfWeek = new Date(baseDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const format = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${mm}.${dd}`;
    };

    return `${format(startOfWeek)} ~ ${format(endOfWeek)}`;
  };

  useEffect(() => {
    const fetchSleepRecords = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/sleep-records");
        const data = await response.json();

        if (data.success && Array.isArray(data.records)) {
          const normalized = data.records.map((record) => ({
            ...record,
            sleepHours: Number(record.sleepHours || 0),
            satisfaction: Number(record.satisfaction || 0),
            bedHour: Number(record.bedHour || 0),
            bedMinute: Number(record.bedMinute || 0),
            wakeHour: Number(record.wakeHour || 0),
            wakeMinute: Number(record.wakeMinute || 0),
            goals: Array.isArray(record.goals) ? record.goals : [],
          }));

          setSleepRecords(normalized);
        }
      } catch (error) {
        console.error("sleep records fetch error:", error);
      }
    };

    fetchSleepRecords();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const resetFormForEmptyDate = () => {
      if (isCancelled) return;

      setBedHour(23);
      setBedMinute(30);
      setWakeHour(7);
      setWakeMinute(30);
      setSatisfaction(0);
      setMemo("");
      setGoals(defaultWakeGoals.map((goal) => ({ text: goal, done: false })));
    };

    const fetchRecordByDate = async () => {
      setIsLoadingRecord(true);

      try {
        const response = await fetch(
          `http://localhost:5000/api/sleep-records/${selectedDate}`,
        );
        const data = await response.json();

        if (isCancelled) return;

        if (response.ok && data.success && data.record) {
          const record = data.record;

          setBedHour(Number(record.bedHour ?? 23));
          setBedMinute(Number(record.bedMinute ?? 30));
          setWakeHour(Number(record.wakeHour ?? 7));
          setWakeMinute(Number(record.wakeMinute ?? 30));
          setSatisfaction(Number(record.satisfaction ?? 0));
          setMemo(record.memo || "");
          setGoals(
            Array.isArray(record.goals) && record.goals.length
              ? record.goals
              : defaultWakeGoals.map((goal) => ({ text: goal, done: false })),
          );
        } else {
          resetFormForEmptyDate();
        }
      } catch (error) {
        console.error("date record fetch error:", error);
        resetFormForEmptyDate();
      } finally {
        if (!isCancelled) {
          setIsLoadingRecord(false);
        }
      }
    };

    if (selectedDate) {
      fetchRecordByDate();
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  const handleSaveRecord = async () => {
    const payload = {
      date: selectedDate,
      bedHour,
      bedMinute,
      wakeHour,
      wakeMinute,
      sleepHours,
      satisfaction,
      memo,
      sleepQuality,
      freshness,
      growth,
      missionRate,
      goals,
    };

    const response = await fetch("http://localhost:5000/api/sleep-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "수면 기록 저장 실패");
    }

    const savedRecord = {
      ...data.record,
      date: data.record.date,
      sleepHours: Number(data.record.sleepHours || 0),
      satisfaction: Number(data.record.satisfaction || 0),
      bedHour: Number(data.record.bedHour || 0),
      bedMinute: Number(data.record.bedMinute || 0),
      wakeHour: Number(data.record.wakeHour || 0),
      wakeMinute: Number(data.record.wakeMinute || 0),
      goals: Array.isArray(data.record.goals) ? data.record.goals : [],
    };

    setSleepRecords((prev) => {
      const filtered = prev.filter(
        (record) => record.date !== savedRecord.date,
      );
      return [...filtered, savedRecord].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    });

    return savedRecord;
  };

  const handleAddGoal = () => {
    const trimmed = newGoalText.trim();
    if (!trimmed) return;

    setGoals((prev) => [...prev, { text: trimmed, done: false }]);
    setNewGoalText("");
  };

  const handleDeleteGoal = (indexToDelete) => {
    setGoals((prev) => prev.filter((_, index) => index !== indexToDelete));
  };

  const handleNewGoalKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddGoal();
    }
  };

  const handleWearableSync = () => {
    setWearableStatus("연동 준비중");
  };

  const handleAnalyzeWithAI = async () => {
    try {
      setHasAnalyzed(true);
      setIsAnalyzing(true);
      setAiCoachData(null);
      setAiCoachComment("");

      await handleSaveRecord();

      const response = await fetch("http://localhost:5000/api/sleep-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sleepHours,
          satisfaction,
          memo,
          missionRate,
          sleepQuality,
          freshness,
          growth,
          bedHour,
          bedMinute,
          wakeHour,
          wakeMinute,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAiCoachComment(data.coachComment || "");
        setAiCoachData(data.coachData || null);
      } else {
        setAiCoachData(null);
        setAiCoachComment(
          "현재 AI API 사용이 불가능해서 기본 분석 결과를 보여드려요.\n\n" +
            localCoachComment,
        );
      }
    } catch (error) {
      console.error(error);
      setAiCoachData(null);
      setAiCoachComment(
        "현재 AI API 연결이 불가능해서 기본 분석 결과를 보여드려요.\n\n" +
          localCoachComment,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isFormDisabled = isLoadingRecord || isAnalyzing;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: colors.text,
          }}
        >
          수면관리
        </h2>
        <span
          style={{
            background: colors.aiTagLight,
            color: colors.aiTag,
            borderRadius: 6,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          ✦ AI 분석 포함
        </span>
      </div>

      <p
        style={{
          margin: "0 0 20px",
          color: colors.sub,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        취침·기상 시간, 수면 만족도, 특이사항 메모, 기상 미션 수행률을 바탕으로
        오늘의 수면 상태를 종합 분석합니다.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.35fr 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 0,
          }}
        >
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: colors.text,
                  }}
                >
                  수면 기록
                </h3>
                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: 13,
                    color: colors.sub,
                  }}
                >
                  총 수면 시간 {sleepHours}시간
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: `1px solid ${colors.border}`,
                    background:
                      wearableStatus === "미연동" ? "#fff" : colors.aiTagLight,
                    color:
                      wearableStatus === "미연동" ? colors.sub : colors.aiTag,
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {wearableStatus}
                </span>

                <button
                  type="button"
                  onClick={handleWearableSync}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background || "#fff",
                    color: colors.text,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  ⌚ 웨어러블 연동
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 1fr 1fr",
                gap: 14,
                marginBottom: 16,
                alignItems: "end",
              }}
            >
              <div>
                <label style={labelStyle}>날짜</label>
                <input
                  type="date"
                  value={selectedDate}
                  disabled={isLoadingRecord}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: "0 10px",
                    fontSize: 14,
                    color: colors.text,
                    background: colors.background || "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                    opacity: isLoadingRecord ? 0.7 : 1,
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>취침 시간</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  <TimeSelect
                    value={bedHour}
                    onChange={setBedHour}
                    options={hours}
                    unit="시"
                    disabled={isFormDisabled}
                  />
                  <TimeSelect
                    value={bedMinute}
                    onChange={setBedMinute}
                    options={minutes}
                    unit="분"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>기상 시간</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  <TimeSelect
                    value={wakeHour}
                    onChange={setWakeHour}
                    options={hours}
                    unit="시"
                    disabled={isFormDisabled}
                  />
                  <TimeSelect
                    value={wakeMinute}
                    onChange={setWakeMinute}
                    options={minutes}
                    unit="분"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>수면 만족도</label>
              <StarRating
                value={satisfaction}
                onChange={setSatisfaction}
                disabled={isFormDisabled}
              />
            </div>

            <div>
              <label style={labelStyle}>메모</label>
              <textarea
                value={memo}
                disabled={isFormDisabled}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 중간에 두 번 깼음, 꿈을 많이 꿈, 아침에 몸이 무거웠음, 평소보다 개운했음"
                style={{
                  width: "100%",
                  minHeight: 110,
                  resize: "none",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 14,
                  color: colors.text,
                  background: colors.background || "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                  lineHeight: 1.6,
                  opacity: isFormDisabled ? 0.7 : 1,
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: colors.sub,
                    lineHeight: 1.4,
                    flex: 1,
                  }}
                >
                  여기에 적은 수면 세부사항은 AI 코치 분석에 반영됩니다.
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleAnalyzeWithAI}
                    disabled={isFormDisabled}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: colors.aiTag,
                      color: "#fff",
                      fontWeight: 700,
                      cursor: isFormDisabled ? "default" : "pointer",
                      opacity: isFormDisabled ? 0.7 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isAnalyzing
                      ? "저장 및 AI 분석 중..."
                      : isLoadingRecord
                        ? "기록 불러오는 중..."
                        : "저장 후 AI 분석하기"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.1fr",
              gap: 12,
              alignItems: "start",
              minWidth: 0,
            }}
          >
            <div
              style={{
                ...cardStyle,
                height: 320,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 12,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: colors.text,
                  }}
                >
                  주간 수면 그래프
                </h3>

                <span
                  style={{
                    fontSize: 12,
                    color: colors.sub,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {getWeekRangeLabel(selectedDate)}
                </span>
              </div>

              <WeeklyBarChart data={weeklyChartData} />
            </div>

            <div
              style={{
                ...cardStyle,
                height: 320,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  gap: 8,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: colors.text,
                  }}
                >
                  기상 목표
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingGoals((prev) => !prev)}
                  disabled={isFormDisabled}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background || "#fff",
                    color: colors.text,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: isFormDisabled ? "default" : "pointer",
                    flexShrink: 0,
                    opacity: isFormDisabled ? 0.7 : 1,
                  }}
                >
                  {isEditingGoals ? "완료" : "수정"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  overflowY: "auto",
                  paddingRight: 4,
                  minHeight: 0,
                }}
              >
                {goals.map((goal, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isEditingGoals
                        ? "20px 1fr 64px"
                        : "20px 1fr",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                      opacity: isFormDisabled ? 0.7 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled={isFormDisabled}
                      checked={goal.done}
                      onChange={() => {
                        const next = [...goals];
                        next[index] = {
                          ...next[index],
                          done: !next[index].done,
                        };
                        setGoals(next);
                      }}
                    />

                    <div style={{ width: "100%", minWidth: 0 }}>
                      {isEditingGoals ? (
                        <input
                          type="text"
                          disabled={isFormDisabled}
                          value={goal.text}
                          onChange={(e) => {
                            const next = [...goals];
                            next[index] = {
                              ...next[index],
                              text: e.target.value,
                            };
                            setGoals(next);
                          }}
                          style={{
                            width: "100%",
                            height: 36,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            padding: "0 10px",
                            fontSize: 14,
                            color: colors.text,
                            background: colors.background || "#fff",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            fontSize: 15,
                            fontWeight: 700,
                            color: colors.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {goal.text}
                        </div>
                      )}
                    </div>

                    {isEditingGoals && (
                      <button
                        type="button"
                        disabled={isFormDisabled}
                        onClick={() => handleDeleteGoal(index)}
                        style={{
                          height: 36,
                          borderRadius: 8,
                          border: `1px solid ${colors.border}`,
                          background: "#fff",
                          color: "#e14b4b",
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: isFormDisabled ? "default" : "pointer",
                          flexShrink: 0,
                          opacity: isFormDisabled ? 0.7 : 1,
                        }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}

                {isEditingGoals && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 64px",
                      gap: 10,
                      marginTop: 4,
                    }}
                  >
                    <input
                      type="text"
                      disabled={isFormDisabled}
                      value={newGoalText}
                      onChange={(e) => setNewGoalText(e.target.value)}
                      onKeyDown={handleNewGoalKeyDown}
                      placeholder="새 기상 목표 추가"
                      style={{
                        width: "100%",
                        height: 36,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        padding: "0 10px",
                        fontSize: 14,
                        color: colors.text,
                        background: colors.background || "#fff",
                        outline: "none",
                        boxSizing: "border-box",
                        opacity: isFormDisabled ? 0.7 : 1,
                      }}
                    />

                    <button
                      type="button"
                      disabled={isFormDisabled}
                      onClick={handleAddGoal}
                      style={{
                        height: 36,
                        borderRadius: 8,
                        border: "none",
                        background: colors.aiTag,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: isFormDisabled ? "default" : "pointer",
                        opacity: isFormDisabled ? 0.7 : 1,
                      }}
                    >
                      추가
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignSelf: "start",
            minWidth: 0,
          }}
        >
          <div style={cardStyle}>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: 16,
                fontWeight: 800,
                color: colors.text,
              }}
            >
              오늘의 총정리
            </h3>
            <RadarChart data={radarData} />
          </div>

          <div
            style={{
              ...cardStyle,
              height: 441,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <h3
              style={{
                margin: "0 0 14px",
                fontSize: 16,
                fontWeight: 800,
                color: colors.text,
              }}
            >
              AI 코치 분석
            </h3>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 16,
                background: colors.background || "#fff",
                color: colors.text,
                fontSize: 14,
                lineHeight: 1.8,
                wordBreak: "keep-all",
                overflowWrap: "break-word",
              }}
            >
              {!hasAnalyzed ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: colors.sub,
                    padding: "0 12px",
                  }}
                >
                  저장 후 AI 분석하기 버튼을 누르면 오늘 수면 상태를 바탕으로
                  운동 강도, 추천 운동, 수면 피드백을 분석해드려요.
                </div>
              ) : isAnalyzing ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: colors.sub,
                  }}
                >
                  AI 코치가 오늘의 수면 데이터를 분석하고 있어요...
                </div>
              ) : aiCoachData ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.sub,
                        marginBottom: 6,
                      }}
                    >
                      오늘 상태 요약
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: colors.text,
                      }}
                    >
                      {aiCoachData.summary}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.sub,
                        marginBottom: 8,
                      }}
                    >
                      추천 운동 강도
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 800,
                        ...getIntensityBadgeStyle(
                          aiCoachData.exercise_intensity,
                        ),
                      }}
                    >
                      {aiCoachData.exercise_intensity}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.sub,
                        marginBottom: 8,
                      }}
                    >
                      추천 운동
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {aiCoachData.recommended_workout?.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: colors.background || "#fff",
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>🏃</span>
                          <span style={{ flex: 1 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.sub,
                        marginBottom: 8,
                      }}
                    >
                      피해야 할 운동
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {aiCoachData.avoid_workout?.length ? (
                        aiCoachData.avoid_workout.map((item, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              padding: "10px 12px",
                              borderRadius: 10,
                              background: colors.background || "#fff",
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            <span style={{ fontSize: 14 }}>⚠️</span>
                            <span style={{ flex: 1 }}>{item}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: colors.sub }}>
                          특별히 제한할 운동은 없어요.
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.sub,
                        marginBottom: 6,
                      }}
                    >
                      수면 피드백
                    </div>
                    <div style={{ color: colors.text }}>
                      {aiCoachData.sleep_feedback}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.sub,
                        marginBottom: 6,
                      }}
                    >
                      코치 한마디
                    </div>
                    <div style={{ color: colors.text, fontWeight: 700 }}>
                      {aiCoachData.coach_message}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: colors.aiTagLight,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.sub,
                        marginBottom: 6,
                      }}
                    >
                      오늘 실천할 것
                    </div>
                    <div style={{ color: colors.text, fontWeight: 800 }}>
                      {aiCoachData.today_action}
                    </div>
                  </div>

                  {aiCoachData.warning_note ? (
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        color: "#9a3412",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          marginBottom: 6,
                          fontWeight: 700,
                        }}
                      >
                        주의
                      </div>
                      <div>{aiCoachData.warning_note}</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ whiteSpace: "pre-line", color: colors.text }}>
                  {aiCoachComment || localCoachComment}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SleepPage;
