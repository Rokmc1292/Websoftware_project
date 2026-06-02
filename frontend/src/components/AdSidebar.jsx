// AdSidebar.jsx — 왼쪽 광고 사이드바
// - 총 10개 상품 중 3개가 1분 간격으로 교체됨
// - 탭 이동(라우트 변경)에도 상태 유지 (AppLayout에서 렌더링하므로 자동 유지)
// - 화면 크기에 따라 반응형으로 숨김/표시됨

import { useState, useEffect } from 'react';

// ────────────────────────────────────────────────────────────
// 광고 상품 목록 (10개)
// 이미지와 링크를 여기에 채워 넣으세요.
//
// [가이드]
// - image : '/images/ad/상품명.jpg' 형식으로 작성
//           실제 이미지 파일은 frontend/public/images/ad/ 폴더에 저장하세요.
//           외부 URL도 사용 가능합니다 (예: 'https://example.com/img.jpg')
// - url   : 클릭 시 이동할 외부 링크를 입력하세요 (예: 'https://coupang.com/...')
// - alt   : 이미지 대체 텍스트 (SEO·접근성용) — 상품명을 적어주세요
// ────────────────────────────────────────────────────────────
const AD_PRODUCTS = [
  {
    id: 1,
    image: '/images/ad/product1.jpg', // ← 여기에 이미지 경로 입력
    url: 'https://www.coupang.com/vp/products/8349565659?itemId=24120506329&vendorItemId=91314834719&q=%ED%81%AC%EB%A0%88%EC%95%84%ED%8B%B4&searchId=7321e8725826514&sourceType=search&itemsCount=60&searchRank=1&rank=1&traceId=mpwin2bf', // ← 여기에 이동할 URL 입력
    alt: '익스트림 모노크레아틴 플러스',                        // ← 여기에 상품명 입력
  },
  {
    id: 2,
    image: '/images/ad/product2.jpg',
    url: 'https://www.coupang.com/vp/products/1262145649?itemId=2263362040&vendorItemId=70260622381&sourceType=srp_product_ads&clickEventId=dbb89050-5e70-11f1-b6dc-3754ca95632a&korePlacement=15&koreSubPlacement=1&clickEventId=dbb89050-5e70-11f1-b6dc-3754ca95632a&korePlacement=15&koreSubPlacement=1',
    alt: '하빈져 헬스 가죽 벨트 스탠다드 핏',
  },
  {
    id: 3,
    image: '/images/ad/product3.jpg',
    url: 'https://www.coupang.com/vp/products/2270488247?itemId=24741065401&vendorItemId=76864668317&pickType=COU_PICK&q=%EC%8A%A4%ED%8A%B8%EB%9E%A9&searchId=6b4a57685843270&sourceType=search&itemsCount=60&searchRank=1&rank=1&traceId=mpwiofk6',
    alt: '제로투히어로 리프팅 프로 그립 일체형 헬스 스트랩',
  },
  {
    id: 4,
    image: '/images/ad/product4.jpg',
    url: 'https://www.coupang.com/vp/products/6573832879?itemId=18711626712&vendorItemId=3180840758&q=%EC%8B%A0%ED%83%806&searchId=4f9404f72943512&sourceType=search&itemsCount=60&searchRank=0&rank=0&traceId=mpwip0ww',
    alt: '신타-6 프로틴 파우더 드링크 믹스 단백질 보충제 초콜릿 밀크셰이크',
  },
  {
    id: 5,
    image: '/images/ad/product5.jpg',
    url: 'https://www.coupang.com/vp/products/7821106059?itemId=21244482032&vendorItemId=3000085957&q=%EC%98%A4%EB%A9%94%EA%B0%803&searchId=a5fb2ffa5681055&sourceType=search&itemsCount=60&searchRank=1&rank=1&traceId=mpwipn10',
    alt: '뉴트리디데이 프리미엄 오메가3 골드 1100',
  },
  {
    id: 6,
    image: '/images/ad/product6.jpg',
    url: 'https://www.coupang.com/vp/products/9004086293?itemId=13686357072&vendorItemId=85947995647&sourceType=srp_product_ads&clickEventId=2d110990-5e72-11f1-8e4f-310a5de142c7&korePlacement=15&koreSubPlacement=1&clickEventId=2d110990-5e72-11f1-8e4f-310a5de142c7&korePlacement=15&koreSubPlacement=1&traceId=mpwj0ol6',
    alt: '센트룸 맨 멀티비타민 미네랄',
  },
  {
    id: 7,
    image: '/images/ad/product7.jpg',
    url: 'https://www.coupang.com/vp/products/227331483?itemId=720227345&vendorItemId=4822351124&pickType=COU_PICK&q=%ED%95%98%EB%A6%BC+%EB%8B%AD%EA%B0%80%EC%8A%B4%EC%82%B4&searchId=64d6ab8e5714579&sourceType=search&itemsCount=55&searchRank=0&rank=0&traceId=mpwir68p',
    alt: '하림 IFF 닭가슴살 (냉동)',
  },
  {
    id: 8,
    image: '/images/ad/product8.jpg',
    url: 'https://www.coupang.com/vp/products/8472770041?itemId=26570882242&vendorItemId=94432994963&sourceType=srp_product_ads&clickEventId=4cb0da10-5e71-11f1-a6f9-591fe00aa231&korePlacement=15&koreSubPlacement=1&clickEventId=4cb0da10-5e71-11f1-a6f9-591fe00aa231&korePlacement=15&koreSubPlacement=1&traceId=mpwirsb5',
    alt: '리얼메디온 식물성 멜라토닌',
  },
  {
    id: 9,
    image: '/images/ad/product9.jpg',
    url: 'https://www.coupang.com/vp/products/7990431578?itemId=23878712231&vendorItemId=88480071289&q=%EC%95%84%EB%AF%B8%EB%85%B8%EC%82%B0&searchId=a85f58702861856&sourceType=search&itemsCount=60&searchRank=1&rank=1&traceId=mpwisca0',
    alt: '뉴티엠 뉴티365 근합성 아미노산 류신',
  },
  {
    id: 10,
    image: '/images/ad/product10.jpg',
    url: 'https://www.coupang.com/vp/products/8211145897?itemId=23568804582&vendorItemId=90594756356&q=%EB%B6%80%EC%8A%A4%ED%84%B0&searchId=9cb2ca6b3047853&sourceType=search&itemsCount=60&searchRank=6&rank=6&traceId=mpwj25gq',
    alt: '삼대오백 헬스부스터 프리워크아웃 월드클래스 포도',
  },
];

// 슬라이드 표시 개수 (한 번에 3개 표시)
const VISIBLE_COUNT = 3;
// 자동 교체 간격: 60,000ms = 1분
const ROTATE_INTERVAL_MS = 60_000;

function AdSidebar() {
  // 현재 표시 중인 첫 번째 상품의 인덱스
  const [startIndex, setStartIndex] = useState(0);
  // 페이드 애니메이션 트리거용 키
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStartIndex((prev) => (prev + VISIBLE_COUNT) % AD_PRODUCTS.length);
      setFadeKey((k) => k + 1);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // 현재 표시할 3개 상품 — 배열 끝에서 처음으로 wrap-around
  const visibleAds = Array.from({ length: VISIBLE_COUNT }, (_, i) => {
    const idx = (startIndex + i) % AD_PRODUCTS.length;
    return AD_PRODUCTS[idx];
  });

  return (
    <aside
      style={{
        width: '180px',
        minWidth: '180px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',   // 카드를 가로 중앙 정렬
        gap: '24px',            // 카드 간격 넉넉하게
        position: 'sticky',
        top: '88px',
        alignSelf: 'flex-start',
        padding: '16px 8px',
      }}
      className="ad-sidebar"
    >
      <p
        style={{
          fontSize: '10px',
          color: '#bbb',
          textAlign: 'center',
          margin: 0,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        AD
      </p>

      {visibleAds.map((ad) => (
        <a
          key={`${fadeKey}-${ad.id}`}
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer"
          title={ad.alt}
          style={{
            display: 'block',
            width: '148px',       // 사이드바 안에서 좌우 여백 확보
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 3px 12px rgba(0,0,0,0.13)',
            transition: 'transform 0.22s, box-shadow 0.22s',
            animation: 'adFadeIn 0.5s ease',
            cursor: 'pointer',
            textDecoration: 'none',
            border: '1px solid rgba(0,0,0,0.07)',
            background: '#ebebeb',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.22)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.13)';
          }}
        >
          <img
            src={ad.image}
            alt={ad.alt}
            style={{
              width: '100%',
              aspectRatio: '1 / 1.3',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              e.currentTarget.style.background = '#d5d5d5';
              e.currentTarget.style.minHeight = '140px';
              e.currentTarget.src = '';
            }}
          />
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#444',
              textAlign: 'center',
              padding: '10px 8px',
              background: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {ad.alt}
          </div>
        </a>
      ))}

      <CountdownTimer intervalMs={ROTATE_INTERVAL_MS} fadeKey={fadeKey} />

      <style>{`
        @keyframes adFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* 1150px 이하: 사이드바 숨김 */
        @media (max-width: 1150px) {
          .ad-sidebar { display: none !important; }
        }
      `}</style>
    </aside>
  );
}

// 다음 교체까지 남은 시간을 표시하는 서브 컴포넌트
function CountdownTimer({ intervalMs, fadeKey }) {
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(intervalMs / 1000));

  useEffect(() => {
    setSecondsLeft(Math.floor(intervalMs / 1000));
  }, [fadeKey, intervalMs]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [fadeKey]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <p
      style={{
        fontSize: '10px',
        color: '#bbb',
        textAlign: 'center',
        margin: 0,
      }}
    >
      다음 교체 {mins}:{secs}
    </p>
  );
}

export default AdSidebar;
