// GymSidebar.jsx — 오른쪽 주변 헬스장 지도 중심 사이드바 (닫기 버튼 우측 상단 구석 고정 버전)
// - 닫기 버튼(X)이 정보창 오른쪽 중간 애매한 위치에 걸치던 현상을 우측 상단 구석 고정(absolute)으로 완벽 해결
// - 구글 Places API를 이용해 사용자 내 위치 기반 실제 헬스장 실시간 검색 및 마커 매핑
// - 이름/평점 클릭 시 구글 지도 상세 페이지 연동 유지
// - [반응형 동기화 완료] AdSidebar 및 AppLayout의 통합 기준(1200px)과 완벽하게 동기화되어 유연하게 작동

import { useState, useEffect, useRef } from 'react';

// 💡 발급받은 구글 맵 API 키를 여기에 입력하세요.
const GOOGLE_MAPS_API_KEY = 'AIzaSyBGT3DMGsR6UGf8YEvpeQ16VmdoEaHR-Zg';

function GymSidebar() {
  const mapContainerRef = useRef(null);
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 }); // 기본값: 서울시청
  const [locationStatus, setLocationStatus] = useState('loading'); // loading, success, error
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [apiError, setApiError] = useState('');

  // 1. 브라우저 GPS를 이용해 사용자 현재 위치 가져오기
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationStatus('success');
        },
        (error) => {
          console.warn('GPS 위치 획득 실패, 기본 위치로 진행합니다.', error);
          setLocationStatus('error');
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('error');
    }
  }, []);

  // 2. 구글 지도 스크립트 주입 및 주변 헬스장 실시간 검색(Places) 초기화
  useEffect(() => {
    if (locationStatus === 'loading' || !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') return;

    const scriptId = 'google-map-script';
    let script = document.getElementById(scriptId);

    const initGoogleMap = () => {
      if (!mapContainerRef.current || !window.google || !window.google.maps) return;

      try {
        // [지도 초기화]
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: coords.lat, lng: coords.lng },
          zoom: 14,
          disableDefaultUI: false,
        });

        setIsMapLoaded(true);

        // [내 위치 중심 마커 표시]
        new window.google.maps.Marker({
          position: { lat: coords.lat, lng: coords.lng },
          map: map,
          title: '내 위치',
        });

        // 구글 내장 Places Service 객체 생성
        const service = new window.google.maps.places.PlacesService(map);
        let activeInfoWindow = null;

        // 내 위치 기준 검색 요청 조건 설정
        const request = {
          location: new window.google.maps.LatLng(coords.lat, coords.lng),
          radius: '2000', // 반경 2000m (2km) 내 검색
          keyword: '헬스장 피트니스 gym', // 구글맵에 '헬스장' 검색 시 나오는 키워드 맵핑
        };

        // 주변 검색(nearbySearch) 실행
        service.nearbySearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            results.forEach((place) => {
              if (!place.geometry || !place.geometry.location) return;

              // 각 헬스장 마커 생성
              const marker = new window.google.maps.Marker({
                position: place.geometry.location,
                map: map,
                title: place.name,
              });

              // 구글 지도 상세 이동을 위한 URL 조합
              const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;

              // 장소 평점 정보 가공
              const ratingText = place.rating ? `⭐ 평점 ${place.rating}` : '📍 주변 헬스장';

              // 구조 최적화 패치
              const infoContent = `
                <div style="width: 165px; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; display: flex; flex-direction: column; overflow: hidden; margin: -12px; padding: 16px 36px 14px 14px; box-sizing: border-box; background: #fff; position: relative;">
                  <a href="${googleMapsSearchUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #111; display: block;">
                    <div style="font-size: 13px; font-weight: bold; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; width: 115px;">
                      ${place.name}
                    </div>
                  </a>
                  <div style="font-size: 11px; color: #ff5e5e; font-weight: 600; line-height: 1.2;">
                    ${ratingText}
                  </div>
                  
                  <div style="position: absolute; top: 10px; right: 12px; font-size: 16px; color: #999; font-weight: 400; pointer-events: none; line-height: 1; user-select: none;">
                    ×
                  </div>
                </div>
              `;

              const infowindow = new window.google.maps.InfoWindow({
                content: infoContent,
                maxWidth: 210,
              });

              marker.addListener('click', () => {
                if (activeInfoWindow) {
                  activeInfoWindow.close();
                }
                infowindow.open(map, marker);
                activeInfoWindow = infowindow;
              });
            });
          }
        });

      } catch (err) {
        console.error('구글 지도 및 Places 초기화 중 오류 발생:', err);
        setApiError('지도 또는 주변 시설 로드에 실패했습니다.');
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      script.addEventListener('load', initGoogleMap);
      script.addEventListener('error', () => {
        setApiError('구글 지도 스크립트 로드 실패. API 키를 확인하세요.');
      });
    } else {
      if (window.google && window.google.maps && window.google.maps.places) {
        initGoogleMap();
      } else {
        script.addEventListener('load', initGoogleMap);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', initGoogleMap);
      }
    };
  }, [coords, locationStatus]);

  return (
    <aside
      style={{
        width: '100%',             // AppLayout 레이아웃 래퍼(260px) 내부를 유연하게 꽉 채우도록 수치 정형화
        minWidth: '100%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'sticky',
        top: '88px',
        alignSelf: 'flex-start',
        padding: '16px 8px',
        boxSizing: 'border-box',
      }}
      className="gym-sidebar"
    >
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0', color: '#bbb' }}>
          📍 주변 헬스장 지도
        </h3>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '380px',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          border: '1px solid rgba(0,0,0,0.06)',
          background: '#ebebeb',
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {!isMapLoaded && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#ebebeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: '#333',
              textAlign: 'center',
              padding: '0 12px',
              boxSizing: 'border-box',
              zIndex: 10,
            }}
          >
            {apiError ? (
              <span style={{ color: '#d93838', fontWeight: 600 }}>⚠️ {apiError}</span>
            ) : GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY' ? (
              <span style={{ color: '#666' }}>
                🗺️ 구글 지도 연동 준비 완료<br />
                <span style={{ fontSize: '9px', color: '#a0a0a0' }}>
                  코드 상단의 GOOGLE_MAPS_API_KEY에<br />키를 입력하시면 활성화됩니다.
                </span>
              </span>
            ) : (
              <span style={{ color: '#666' }}>구글 지도를 동기화하고 있습니다...</span>
            )}
          </div>
        )}
      </div>

      <style>{`
        /* 구글 기본 말풍선 패딩 강제 제거 및 테두리 정렬 */
        .gm-style-iw-c {
          padding: 0 !important;
          border-radius: 8px !important;
        }
        
        /* 팝업 내부의 스크롤바 생성 차단 */
        .gm-style-iw-d {
          overflow: hidden !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* 구글의 클릭 감지용 투명 X 버튼 레이어도 커스텀 X 위치인 우측 상단 구석으로 정밀 오버랩 시킴 */
        .gm-ui-hover-effect {
          top: 6px !important;
          right: 6px !important;
          margin: 0 !important;
          width: 24px !important;
          height: 24px !important;
          display: block !important;
          position: absolute !important;
          z-index: 9999 !important;
          opacity: 0 !important;
        }

        /* 💡 기존의 독자적인 1400px 분기 제거 완료: 부모 AppLayout.jsx의 통합 미디어 쿼리(1200px)에서 일괄 통제합니다. */
      `}</style>
    </aside>
  );
}

export default GymSidebar;