// ── 추천 여행 일정 샘플 데이터 ──────────────────────────
// 실제 인터넷 여행 후기/코스 기반으로 구성

export interface SampleLocation {
  name: string
  type: 'RESTAURANT' | 'CAFE' | 'MUSEUM' | 'PARK' | 'HOTEL' | 'STATION' | 'AIRPORT' | 'SHOPPING' | 'ETC'
  lat: number
  lng: number
  description?: string
  address?: string
}

export interface SampleRoute {
  from: SampleLocation
  to: SampleLocation
  transport: 'WALK' | 'SUBWAY' | 'BUS' | 'TRAIN' | 'CAR'
  departureTime: string  // HH:mm
  durationMinutes: number
  estimatedCost: number
  note?: string
}

export interface SampleDay {
  dayNumber: number
  label: string  // "1일차 - 오사카 도착"
  routes: SampleRoute[]
}

export interface SampleItinerary {
  id: string
  title: string
  destination: string
  countryCode: string
  nights: number
  days: number
  imageUrl: string
  tags: string[]
  highlight: string
  estimatedCost: string
  transport: string
  schedule: SampleDay[]
}

// ──────────────────────────────────────────────────────
//  1. 오사카·교토 3박4일
// ──────────────────────────────────────────────────────
const OSAKA_KYOTO: SampleItinerary = {
  id: 'osaka-kyoto-3n4d',
  title: '오사카·교토 클래식 3박4일',
  destination: '오사카·교토',
  countryCode: 'JP',
  nights: 3,
  days: 4,
  imageUrl: 'https://images.unsplash.com/photo-1583400212045-a2bde5b5efba?w=800&q=80',
  tags: ['미식', '역사', '쇼핑', '사찰'],
  highlight: '도톤보리 타코야키 → 아라시야마 대나무숲 → 후시미이나리 천 개의 도리이',
  estimatedCost: '75만원~',
  transport: '대중교통',
  schedule: [
    {
      dayNumber: 1,
      label: '1일차 · 오사카 도착 & 도톤보리',
      routes: [
        {
          from: { name: '간사이 국제공항', type: 'AIRPORT', lat: 34.4347, lng: 135.2440, address: '오사카부 이즈미사노시' },
          to:   { name: '난바역', type: 'STATION', lat: 34.6643, lng: 135.5010, description: '오사카 최대 번화가의 중심역. 하루카 특급 이용 시 약 50분.', address: '오사카시 주오구 난바' },
          transport: 'TRAIN', departureTime: '11:00', durationMinutes: 55, estimatedCost: 13000, note: '하루카 특급 또는 공항급행 이용'
        },
        {
          from: { name: '난바역', type: 'STATION', lat: 34.6643, lng: 135.5010 },
          to:   { name: '도톤보리', type: 'ETC', lat: 34.6687, lng: 135.5013, description: '오사카 최고의 먹자골목. 타코야키, 쿠시카츠, 라멘 등 현지 음식 천국. 글리코상 간판이 상징.', address: '오사카시 주오구 도톤보리' },
          transport: 'WALK', departureTime: '12:10', durationMinutes: 10, estimatedCost: 0
        },
        {
          from: { name: '도톤보리', type: 'ETC', lat: 34.6687, lng: 135.5013 },
          to:   { name: '신사이바시 쇼핑가', type: 'SHOPPING', lat: 34.6749, lng: 135.5008, description: '일본 최대급 아케이드 쇼핑가. 유니클로, 돈키호테, 다이소 등 쇼핑 천국.', address: '오사카시 주오구 신사이바시스지' },
          transport: 'WALK', departureTime: '14:30', durationMinutes: 12, estimatedCost: 0
        },
        {
          from: { name: '신사이바시 쇼핑가', type: 'SHOPPING', lat: 34.6749, lng: 135.5008 },
          to:   { name: '쿠로몬 이치바 시장', type: 'RESTAURANT', lat: 34.6694, lng: 135.5069, description: '오사카의 부엌이라 불리는 전통 시장. 신선한 해산물과 길거리 음식 천국. 굴, 성게, 참치 등 현지 가격에 맛볼 수 있음.', address: '오사카시 주오구 닛폰바시' },
          transport: 'WALK', departureTime: '17:00', durationMinutes: 15, estimatedCost: 0, note: '저녁 식재료 시장 구경 & 간식'
        },
      ]
    },
    {
      dayNumber: 2,
      label: '2일차 · 오사카성 & 우메다 야경',
      routes: [
        {
          from: { name: '난바역 숙소', type: 'HOTEL', lat: 34.6643, lng: 135.5010 },
          to:   { name: '오사카성', type: 'MUSEUM', lat: 34.6873, lng: 135.5262, description: '도요토미 히데요시가 축성한 일본 3대 명성. 천수각 전망대에서 오사카 전경 조망. 벚꽃 시즌엔 최고의 포토스팟.', address: '오사카시 주오구 오사카조' },
          transport: 'SUBWAY', departureTime: '09:00', durationMinutes: 25, estimatedCost: 2400
        },
        {
          from: { name: '오사카성', type: 'MUSEUM', lat: 34.6873, lng: 135.5262 },
          to:   { name: '텐만구 신사', type: 'ETC', lat: 34.6930, lng: 135.5118, description: '학문의 신 스가와라 미치자네를 모시는 신사. 매년 7월 텐진마츠리가 열리는 오사카의 대표 신사.', address: '오사카시 기타구 텐진바시' },
          transport: 'SUBWAY', departureTime: '11:30', durationMinutes: 20, estimatedCost: 2400
        },
        {
          from: { name: '텐만구 신사', type: 'ETC', lat: 34.6930, lng: 135.5118 },
          to:   { name: '우메다 고층빌딩가', type: 'SHOPPING', lat: 34.7046, lng: 135.4965, description: '오사카 최대 비즈니스·쇼핑 지구. 루쿠아 오사카, 그랑프론트 등 최신 쇼핑몰 밀집.', address: '오사카시 기타구 우메다' },
          transport: 'SUBWAY', departureTime: '13:30', durationMinutes: 15, estimatedCost: 2400
        },
        {
          from: { name: '우메다 고층빌딩가', type: 'SHOPPING', lat: 34.7046, lng: 135.4965 },
          to:   { name: '우메다 스카이빌딩 공중정원', type: 'ETC', lat: 34.7056, lng: 135.4902, description: '지상 173m 공중정원 전망대. 오사카 360도 파노라마 야경 명소. 일몰 후 방문 강력 추천.', address: '오사카시 기타구 오요도나카' },
          transport: 'WALK', departureTime: '17:00', durationMinutes: 12, estimatedCost: 2000, note: '야경 감상 최고 포인트, 일몰 30분 전 입장 추천'
        },
      ]
    },
    {
      dayNumber: 3,
      label: '3일차 · 교토 당일 — 아라시야마·청수사·후시미이나리',
      routes: [
        {
          from: { name: '난바역', type: 'STATION', lat: 34.6643, lng: 135.5010 },
          to:   { name: '교토역', type: 'STATION', lat: 34.9858, lng: 135.7588, description: '교토의 관문. 산인 본선, 긴테쓰, 신칸센 모두 이용 가능. 역 내 쇼핑몰도 볼거리.', address: '교토시 시모교구 동시오코지' },
          transport: 'TRAIN', departureTime: '08:30', durationMinutes: 80, estimatedCost: 5600, note: '한큐 교토선 또는 긴테쓰 이용'
        },
        {
          from: { name: '교토역', type: 'STATION', lat: 34.9858, lng: 135.7588 },
          to:   { name: '아라시야마 대나무숲', type: 'PARK', lat: 35.0097, lng: 135.6722, description: '수십 미터 높이의 대나무가 빽빽이 늘어선 신비로운 숲. 이른 아침 방문 시 안개와 어우러진 환상적인 분위기.', address: '교토시 우쿄구 사가오구라야마' },
          transport: 'BUS', departureTime: '09:50', durationMinutes: 50, estimatedCost: 2500, note: '교토 버스 1일권 이용 (700엔)'
        },
        {
          from: { name: '아라시야마 대나무숲', type: 'PARK', lat: 35.0097, lng: 135.6722 },
          to:   { name: '기요미즈데라 (청수사)', type: 'ETC', lat: 34.9949, lng: 135.7851, description: '유네스코 세계문화유산. 절벽 위에 세워진 나무 무대에서 교토 시내 절경 조망. 봄 벚꽃·가을 단풍 시즌엔 특히 아름다움.', address: '교토시 히가시야마구 기요미즈' },
          transport: 'BUS', departureTime: '12:00', durationMinutes: 45, estimatedCost: 2500, note: '기요미즈데라 입장료 500엔 별도'
        },
        {
          from: { name: '기요미즈데라 (청수사)', type: 'ETC', lat: 34.9949, lng: 135.7851 },
          to:   { name: '후시미이나리 신사', type: 'ETC', lat: 34.9671, lng: 135.7727, description: '1만 개 넘는 붉은 도리이가 산길을 따라 이어진 교토 최고 인기 명소. 저녁노을과 도리이의 환상적인 조합. 야간 개장.', address: '교토시 후시미구 후카쿠사야부노우치' },
          transport: 'BUS', departureTime: '15:30', durationMinutes: 25, estimatedCost: 2200, note: '입장 무료, 정상까지 왕복 약 2시간'
        },
      ]
    },
    {
      dayNumber: 4,
      label: '4일차 · 귀국 전 마지막 쇼핑',
      routes: [
        {
          from: { name: '난바역 숙소', type: 'HOTEL', lat: 34.6643, lng: 135.5010 },
          to:   { name: '도톤보리 아침 산책', type: 'ETC', lat: 34.6687, lng: 135.5013, description: '아침 도톤보리는 한산해서 사진 찍기 좋음. 글리코상 앞 인증샷 필수.', address: '오사카시 주오구 도톤보리' },
          transport: 'WALK', departureTime: '09:00', durationMinutes: 8, estimatedCost: 0
        },
        {
          from: { name: '도톤보리 아침 산책', type: 'ETC', lat: 34.6687, lng: 135.5013 },
          to:   { name: '돈키호테 난바점', type: 'SHOPPING', lat: 34.6680, lng: 135.5024, description: '24시간 운영 일본 최대 잡화점. 화장품, 의약품, 과자, 전자제품 면세 쇼핑 천국.', address: '오사카시 주오구 소에몬쵸' },
          transport: 'WALK', departureTime: '10:00', durationMinutes: 5, estimatedCost: 0, note: '면세 쇼핑 필수 방문'
        },
        {
          from: { name: '돈키호테 난바점', type: 'SHOPPING', lat: 34.6680, lng: 135.5024 },
          to:   { name: '난바역', type: 'STATION', lat: 34.6643, lng: 135.5010 },
          transport: 'WALK', departureTime: '12:30', durationMinutes: 8, estimatedCost: 0
        },
        {
          from: { name: '난바역', type: 'STATION', lat: 34.6643, lng: 135.5010 },
          to:   { name: '간사이 국제공항', type: 'AIRPORT', lat: 34.4347, lng: 135.2440, description: '귀국 편 탑승. 출발 2시간 전 도착 권장.', address: '오사카부 이즈미사노시' },
          transport: 'TRAIN', departureTime: '13:30', durationMinutes: 55, estimatedCost: 13000, note: '하루카 특급 이용'
        },
      ]
    },
  ]
}

// ──────────────────────────────────────────────────────
//  2. 도쿄 4박5일
// ──────────────────────────────────────────────────────
const TOKYO: SampleItinerary = {
  id: 'tokyo-4n5d',
  title: '도쿄 핵심 탐방 4박5일',
  destination: '도쿄',
  countryCode: 'JP',
  nights: 4,
  days: 5,
  imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
  tags: ['쇼핑', '야경', '문화', '미식'],
  highlight: '시부야 스크램블 → 아사쿠사 센소지 → 스카이트리 360도 야경',
  estimatedCost: '110만원~',
  transport: '대중교통',
  schedule: [
    {
      dayNumber: 1,
      label: '1일차 · 도쿄 도착 & 신주쿠·시부야',
      routes: [
        {
          from: { name: '나리타 국제공항', type: 'AIRPORT', lat: 35.7769, lng: 140.3929, address: '치바현 나리타시' },
          to:   { name: '신주쿠역', type: 'STATION', lat: 35.6896, lng: 139.7006, description: '도쿄 최대 터미널역. 1일 환승객 세계 1위. 동쪽 출구엔 쇼핑, 서쪽엔 고층빌딩가.', address: '신주쿠구 신주쿠' },
          transport: 'TRAIN', departureTime: '11:30', durationMinutes: 85, estimatedCost: 31000, note: '나리타 익스프레스(N\'EX) 이용'
        },
        {
          from: { name: '신주쿠역', type: 'STATION', lat: 35.6896, lng: 139.7006 },
          to:   { name: '이세탄 백화점', type: 'SHOPPING', lat: 35.6919, lng: 139.7060, description: '일본 최고급 백화점. 지하 식품관에서 도쿄 최고 디저트·음식 쇼핑.', address: '신주쿠구 신주쿠3초메' },
          transport: 'WALK', departureTime: '13:30', durationMinutes: 10, estimatedCost: 0
        },
        {
          from: { name: '이세탄 백화점', type: 'SHOPPING', lat: 35.6919, lng: 139.7060 },
          to:   { name: '시부야 스크램블 교차로', type: 'ETC', lat: 35.6595, lng: 139.7005, description: '세계 최대 스크램블 교차로. 한 번에 3,000명이 건넌다. 스크램블 스퀘어 위에서 내려다보면 장관.', address: '시부야구 도겐자카' },
          transport: 'SUBWAY', departureTime: '15:30', durationMinutes: 12, estimatedCost: 1800, note: '야마노테선 시부야역 하차'
        },
        {
          from: { name: '시부야 스크램블 교차로', type: 'ETC', lat: 35.6595, lng: 139.7005 },
          to:   { name: '시부야 스카이 전망대', type: 'ETC', lat: 35.6584, lng: 139.7026, description: '스크램블 스퀘어 45~47층 전망대. 도쿄 타워·도쿄 스카이트리가 동시에 보이는 360도 야경 명소. 노을+야경 강추.', address: '시부야구 시부야2초메' },
          transport: 'WALK', departureTime: '18:00', durationMinutes: 5, estimatedCost: 21000, note: '사전 예약 필수! 노을~야경 시간대 추천'
        },
      ]
    },
    {
      dayNumber: 2,
      label: '2일차 · 메이지신궁·오모테산도·롯폰기',
      routes: [
        {
          from: { name: '신주쿠 숙소', type: 'HOTEL', lat: 35.6896, lng: 139.7006 },
          to:   { name: '메이지 신궁', type: 'ETC', lat: 35.6763, lng: 139.6993, description: '울창한 숲 속에 자리한 도쿄 최대 신사. 메이지 천황을 모심. 이른 아침 방문 시 조용하고 신비로운 분위기.', address: '시부야구 요요기카미조노쵸' },
          transport: 'WALK', departureTime: '08:30', durationMinutes: 20, estimatedCost: 0
        },
        {
          from: { name: '메이지 신궁', type: 'ETC', lat: 35.6763, lng: 139.6993 },
          to:   { name: '다케시타 거리', type: 'SHOPPING', lat: 35.6696, lng: 139.7031, description: '하라주쿠 크레이프와 패션 문화의 성지. 원색 컨셉 카페, 아이돌 굿즈샵, 독특한 패션 스트리트.', address: '시부야구 진구마에' },
          transport: 'WALK', departureTime: '10:30', durationMinutes: 15, estimatedCost: 0
        },
        {
          from: { name: '다케시타 거리', type: 'SHOPPING', lat: 35.6696, lng: 139.7031 },
          to:   { name: '오모테산도 카페거리', type: 'CAFE', lat: 35.6654, lng: 139.7124, description: '파리의 샹젤리제라 불리는 도쿄 감성 최고봉. 브랜드 플래그십 스토어와 인스타 감성 카페 밀집.', address: '미나토구 기타아오야마' },
          transport: 'WALK', departureTime: '12:00', durationMinutes: 12, estimatedCost: 0
        },
        {
          from: { name: '오모테산도 카페거리', type: 'CAFE', lat: 35.6654, lng: 139.7124 },
          to:   { name: '롯폰기 힐즈 전망대', type: 'ETC', lat: 35.6604, lng: 139.7292, description: '모리 타워 52층 도쿄 시티 뷰. 도쿄 타워를 가장 가까이서 볼 수 있는 전망대. 현대 미술관도 함께.', address: '미나토구 롯폰기6초메' },
          transport: 'SUBWAY', departureTime: '16:00', durationMinutes: 18, estimatedCost: 1800, note: '히비야선 롯폰기역 하차'
        },
      ]
    },
    {
      dayNumber: 3,
      label: '3일차 · 아사쿠사·스카이트리·긴자',
      routes: [
        {
          from: { name: '신주쿠 숙소', type: 'HOTEL', lat: 35.6896, lng: 139.7006 },
          to:   { name: '아사쿠사 센소지', type: 'ETC', lat: 35.7147, lng: 139.7967, description: '도쿄 최고(最古) 사찰. 가미나리몬(우레이 문)과 나카미세 상점가가 유명. 인력거 체험과 전통 기념품 쇼핑.', address: '다이토구 아사쿠사2초메' },
          transport: 'SUBWAY', departureTime: '09:00', durationMinutes: 35, estimatedCost: 2600, note: '긴자선 아사쿠사역 하차'
        },
        {
          from: { name: '아사쿠사 센소지', type: 'ETC', lat: 35.7147, lng: 139.7967 },
          to:   { name: '도쿄 스카이트리', type: 'ETC', lat: 35.7100, lng: 139.8107, description: '세계 2위 자립탑 (634m). 350m 전망 덱과 450m 전망 회랑. 스미다강과 도쿄 시내 전경이 압도적.', address: '스미다구 오시아게1초메' },
          transport: 'WALK', departureTime: '11:30', durationMinutes: 18, estimatedCost: 0, note: '도보 18분 또는 아사쿠사역에서 1정거장'
        },
        {
          from: { name: '도쿄 스카이트리', type: 'ETC', lat: 35.7100, lng: 139.8107 },
          to:   { name: '긴자 쇼핑가', type: 'SHOPPING', lat: 35.6717, lng: 139.7640, description: '도쿄 최고급 쇼핑 거리. 루이비통, 샤넬, 에르메스 플래그십. 긴자 식스에서 루프탑 무료 개방.', address: '주오구 긴자' },
          transport: 'SUBWAY', departureTime: '14:30', durationMinutes: 25, estimatedCost: 2800, note: '아사쿠사선→긴자선 환승'
        },
        {
          from: { name: '긴자 쇼핑가', type: 'SHOPPING', lat: 35.6717, lng: 139.7640 },
          to:   { name: '하마리큐 정원', type: 'PARK', lat: 35.6614, lng: 139.7631, description: '에도 시대 장군 별장이었던 해수 정원. 도쿄만을 배경으로 300년 된 소나무가 즐비. 다실에서 말차 체험 가능.', address: '주오구 하마리큐테이엔' },
          transport: 'WALK', departureTime: '17:30', durationMinutes: 15, estimatedCost: 3000
        },
      ]
    },
    {
      dayNumber: 4,
      label: '4일차 · 우에노·아키하바라',
      routes: [
        {
          from: { name: '신주쿠 숙소', type: 'HOTEL', lat: 35.6896, lng: 139.7006 },
          to:   { name: '우에노 공원', type: 'PARK', lat: 35.7148, lng: 139.7737, description: '벚꽃 명소 1위 공원. 도쿄국립박물관, 국립서양미술관, 우에노동물원 모두 이 공원 안에. 도쿄의 문화 집약지.', address: '다이토구 우에노공원' },
          transport: 'SUBWAY', departureTime: '09:30', durationMinutes: 20, estimatedCost: 2000, note: '긴자선 우에노역 하차'
        },
        {
          from: { name: '우에노 공원', type: 'PARK', lat: 35.7148, lng: 139.7737 },
          to:   { name: '아메요코 시장', type: 'SHOPPING', lat: 35.7091, lng: 139.7749, description: '우에노역 앞 골목 시장. 건어물, 의류, 향신료, 저렴한 과일 등. 서울 광장시장 분위기.', address: '다이토구 우에노6초메' },
          transport: 'WALK', departureTime: '11:00', durationMinutes: 10, estimatedCost: 0
        },
        {
          from: { name: '아메요코 시장', type: 'SHOPPING', lat: 35.7091, lng: 139.7749 },
          to:   { name: '아키하바라 전자상가', type: 'SHOPPING', lat: 35.7022, lng: 139.7742, description: '세계 최대 전자제품·애니메이션 성지. 요도바시카메라, 빌라인 등. 피규어·굿즈 쇼핑 천국.', address: '치요다구 소토칸다' },
          transport: 'WALK', departureTime: '13:00', durationMinutes: 25, estimatedCost: 0
        },
        {
          from: { name: '아키하바라 전자상가', type: 'SHOPPING', lat: 35.7022, lng: 139.7742 },
          to:   { name: '도쿄역 앞 마루노우치', type: 'ETC', lat: 35.6812, lng: 139.7671, description: '붉은 벽돌 도쿄역이 상징. 마루노우치 브릭 스퀘어, 키테 건물 옥상 정원에서 도쿄역 전경 무료 감상.', address: '치요다구 마루노우치' },
          transport: 'SUBWAY', departureTime: '16:30', durationMinutes: 18, estimatedCost: 1800
        },
      ]
    },
    {
      dayNumber: 5,
      label: '5일차 · 귀국',
      routes: [
        {
          from: { name: '신주쿠 숙소', type: 'HOTEL', lat: 35.6896, lng: 139.7006 },
          to:   { name: '신주쿠 마이시티 기념품', type: 'SHOPPING', lat: 35.6895, lng: 139.7012, description: '귀국 전 마지막 쇼핑. 신주쿠 루미네, 마이시티에서 과자·화장품 기념품 구입.', address: '신주쿠구 신주쿠' },
          transport: 'WALK', departureTime: '09:00', durationMinutes: 5, estimatedCost: 0
        },
        {
          from: { name: '신주쿠 마이시티 기념품', type: 'SHOPPING', lat: 35.6895, lng: 139.7012 },
          to:   { name: '나리타 국제공항', type: 'AIRPORT', lat: 35.7769, lng: 140.3929, description: '귀국 편 탑승. 출발 2시간 전 도착 권장.', address: '치바현 나리타시' },
          transport: 'TRAIN', departureTime: '11:00', durationMinutes: 85, estimatedCost: 31000, note: 'N\'EX 나리타 익스프레스 이용'
        },
      ]
    },
  ]
}

// ──────────────────────────────────────────────────────
//  3. 후쿠오카·유후인·벳푸 3박4일
// ──────────────────────────────────────────────────────
const FUKUOKA_YUFUIN: SampleItinerary = {
  id: 'fukuoka-yufuin-3n4d',
  title: '후쿠오카·유후인·벳푸 온천 3박4일',
  destination: '후쿠오카·유후인',
  countryCode: 'JP',
  nights: 3,
  days: 4,
  imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
  tags: ['온천', '힐링', '미식', '자연'],
  highlight: '유노츠보 가도 산책 → 킨린코 호수 → 벳푸 지옥 온천 순례',
  estimatedCost: '68만원~',
  transport: '대중교통',
  schedule: [
    {
      dayNumber: 1,
      label: '1일차 · 후쿠오카 도착 & 하카타 미식투어',
      routes: [
        {
          from: { name: '후쿠오카 공항', type: 'AIRPORT', lat: 33.5903, lng: 130.4508, address: '후쿠오카시 하카타구 시모오이즈미' },
          to:   { name: '하카타역', type: 'STATION', lat: 33.5902, lng: 130.4204, description: '후쿠오카의 중심 터미널역. 지하철로 공항에서 단 2정거장. 아뮤플라자 쇼핑몰 연결.', address: '후쿠오카시 하카타구 하카타역중앙가' },
          transport: 'SUBWAY', departureTime: '11:00', durationMinutes: 10, estimatedCost: 2600
        },
        {
          from: { name: '하카타역', type: 'STATION', lat: 33.5902, lng: 130.4204 },
          to:   { name: '캐널시티 하카타', type: 'SHOPPING', lat: 33.5894, lng: 130.4115, description: '운하를 끼고 있는 대형 쇼핑몰. 분수 쇼가 1시간마다 진행되며, 애니메이션 굿즈샵·영화관 완비.', address: '후쿠오카시 하카타구 스미요시' },
          transport: 'WALK', departureTime: '12:00', durationMinutes: 15, estimatedCost: 0
        },
        {
          from: { name: '캐널시티 하카타', type: 'SHOPPING', lat: 33.5894, lng: 130.4115 },
          to:   { name: '텐진 지하상가', type: 'SHOPPING', lat: 33.5898, lng: 130.3990, description: '600m 지하 상점가. 600개 이상의 부티크·음식점. 비 오는 날도 쾌적하게 쇼핑 가능한 후쿠오카 명물.', address: '후쿠오카시 주오구 텐진' },
          transport: 'SUBWAY', departureTime: '14:30', durationMinutes: 12, estimatedCost: 2100
        },
        {
          from: { name: '텐진 지하상가', type: 'SHOPPING', lat: 33.5898, lng: 130.3990 },
          to:   { name: '나카스 야타이 포장마차', type: 'RESTAURANT', lat: 33.5960, lng: 130.4088, description: '일본 3대 야타이(포장마차) 명소. 강가를 따라 펼쳐진 야외 포장마차에서 하카타 라멘, 모츠나베, 야키토리를 안주 삼아 생맥주 한 잔.', address: '후쿠오카시 하카타구 나카스' },
          transport: 'WALK', departureTime: '19:00', durationMinutes: 20, estimatedCost: 0, note: '저녁 필수 코스! 일몰 후 분위기 최고'
        },
      ]
    },
    {
      dayNumber: 2,
      label: '2일차 · 유후인 — 온천 마을 힐링',
      routes: [
        {
          from: { name: '하카타역', type: 'STATION', lat: 33.5902, lng: 130.4204 },
          to:   { name: '유후인역', type: 'STATION', lat: 33.2512, lng: 131.3637, description: '유후인으로 가는 관문역. 목조 구조의 아기자기한 역사. 역 앞부터 이미 시골 온천 마을 분위기.', address: '오이타현 유후시 유후인초' },
          transport: 'TRAIN', departureTime: '08:30', durationMinutes: 140, estimatedCost: 42000, note: 'JR 유후인노모리 특급 열차 (예약 필수, 관광열차)'
        },
        {
          from: { name: '유후인역', type: 'STATION', lat: 33.2512, lng: 131.3637 },
          to:   { name: '유노츠보 가도', type: 'ETC', lat: 33.2561, lng: 131.3762, description: '유후인의 메인 상점가. 유명 빵집, 금상 고로케, 벌꿀 아이스크림, 유제품 카페 즐비. 걷는 것 자체가 행복한 거리.', address: '오이타현 유후시 유후인초 가와카미' },
          transport: 'WALK', departureTime: '11:00', durationMinutes: 12, estimatedCost: 0
        },
        {
          from: { name: '유노츠보 가도', type: 'ETC', lat: 33.2561, lng: 131.3762 },
          to:   { name: '킨린코 호수', type: 'PARK', lat: 33.2571, lng: 131.3804, description: '유후다케 산을 배경으로 펼쳐진 신비로운 호수. 이른 아침엔 온천 수증기가 피어올라 몽환적인 분위기. 석양 무렵도 환상적.', address: '오이타현 유후시 유후인초' },
          transport: 'WALK', departureTime: '13:30', durationMinutes: 15, estimatedCost: 0
        },
        {
          from: { name: '킨린코 호수', type: 'PARK', lat: 33.2571, lng: 131.3804 },
          to:   { name: '유후인 료칸 온천', type: 'HOTEL', lat: 33.2550, lng: 131.3720, description: '노천탕이 있는 유후인 료칸에서 온천 체험. 미리 예약 필수. 당일 온천 입욕도 가능한 료칸 多.', address: '오이타현 유후시 유후인초' },
          transport: 'WALK', departureTime: '15:30', durationMinutes: 10, estimatedCost: 10000, note: '당일 온천 입욕 요금 1,000엔 전후'
        },
      ]
    },
    {
      dayNumber: 3,
      label: '3일차 · 벳푸 지옥 온천 순례',
      routes: [
        {
          from: { name: '유후인역', type: 'STATION', lat: 33.2512, lng: 131.3637 },
          to:   { name: '벳푸역', type: 'STATION', lat: 33.2842, lng: 131.4917, description: '온천 수증기 도시 벳푸의 관문. 역 광장에서부터 온천 연기가 피어오르는 독특한 경관.', address: '오이타현 벳푸시 에키마에초' },
          transport: 'TRAIN', departureTime: '10:00', durationMinutes: 45, estimatedCost: 8000
        },
        {
          from: { name: '벳푸역', type: 'STATION', lat: 33.2842, lng: 131.4917 },
          to:   { name: '벳푸 지옥 온천 (우미지고쿠)', type: 'ETC', lat: 33.3028, lng: 131.4943, description: '코발트블루 색깔의 온천. 98°C의 뜨거운 온천수가 끓어오르는 장관. \'지옥\' 7곳 공통권으로 모두 관람 가능.', address: '오이타현 벳푸시 묘반' },
          transport: 'BUS', departureTime: '11:00', durationMinutes: 25, estimatedCost: 2200, note: '가마도지고쿠, 치노이케지고쿠 등 7곳 공통권 2,200엔'
        },
        {
          from: { name: '벳푸 지옥 온천 (우미지고쿠)', type: 'ETC', lat: 33.3028, lng: 131.4943 },
          to:   { name: '유케무리 전망대', type: 'PARK', lat: 33.3100, lng: 131.4920, description: '벳푸 시내 곳곳에서 피어오르는 온천 연기를 한눈에 조망. 특히 석양 무렵 역광으로 보이는 수증기가 장관.', address: '오이타현 벳푸시 에이와초' },
          transport: 'BUS', departureTime: '15:00', durationMinutes: 20, estimatedCost: 2200, note: '무료 입장, 일몰 시간 맞춰 방문 추천'
        },
        {
          from: { name: '유케무리 전망대', type: 'PARK', lat: 33.3100, lng: 131.4920 },
          to:   { name: '하카타역', type: 'STATION', lat: 33.5902, lng: 130.4204, description: '하카타 귀환. 최후의 하카타 라멘 또는 모츠나베로 마무리.', address: '후쿠오카시 하카타구' },
          transport: 'TRAIN', departureTime: '17:30', durationMinutes: 110, estimatedCost: 30000, note: '특급 소닉 이용'
        },
      ]
    },
    {
      dayNumber: 4,
      label: '4일차 · 하카타 마지막 맛집 & 귀국',
      routes: [
        {
          from: { name: '하카타역 숙소', type: 'HOTEL', lat: 33.5902, lng: 130.4204 },
          to:   { name: '이치란 라멘 본점', type: 'RESTAURANT', lat: 33.5894, lng: 130.4197, description: '1인용 칸막이 좌석으로 유명한 하카타 라멘 원조. 돈코츠 육수 농도, 면 굵기, 파 양 등 세세하게 커스텀 가능.', address: '후쿠오카시 하카타구 나카가와' },
          transport: 'WALK', departureTime: '09:00', durationMinutes: 8, estimatedCost: 9800, note: '하카타 마지막 라멘! 줄 서기 감안해 일찍 출발'
        },
        {
          from: { name: '이치란 라멘 본점', type: 'RESTAURANT', lat: 33.5894, lng: 130.4197 },
          to:   { name: '하카타역 기념품 쇼핑', type: 'SHOPPING', lat: 33.5902, lng: 130.4204, description: '아뮤플라자, 데이토스 B1~B2에서 하카타 명란젓, 히요코 만쥬, 모츠나베 재료 등 귀국 선물 구입.', address: '후쿠오카시 하카타구 하카타역중앙가' },
          transport: 'WALK', departureTime: '10:30', durationMinutes: 8, estimatedCost: 0
        },
        {
          from: { name: '하카타역 기념품 쇼핑', type: 'SHOPPING', lat: 33.5902, lng: 130.4204 },
          to:   { name: '후쿠오카 공항', type: 'AIRPORT', lat: 33.5903, lng: 130.4508, description: '귀국 편 탑승. 하카타역에서 지하철 2정거장으로 공항 접근성 일본 최고.', address: '후쿠오카시 하카타구' },
          transport: 'SUBWAY', departureTime: '12:00', durationMinutes: 10, estimatedCost: 2600, note: '공항 국제선 터미널까지 버스 이동 10분 추가'
        },
      ]
    },
  ]
}

export const SAMPLE_ITINERARIES: SampleItinerary[] = [
  OSAKA_KYOTO,
  TOKYO,
  FUKUOKA_YUFUIN,
]
