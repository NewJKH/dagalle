import type { AutocompleteOption } from '../components/AutocompleteInput'

export const DEPARTURE_OPTIONS: AutocompleteOption[] = [
  { label: '인천국제공항', value: '인천국제공항', sub: 'ICN · 서울/경기',  flag: '✈️' },
  { label: '김포국제공항', value: '김포국제공항', sub: 'GMP · 서울',        flag: '✈️' },
  { label: '김해국제공항', value: '부산 김해국제공항', sub: 'PUS · 부산',   flag: '✈️' },
  { label: '제주국제공항', value: '제주국제공항', sub: 'CJU · 제주',        flag: '✈️' },
  { label: '대구국제공항', value: '대구국제공항', sub: 'TAE · 대구',        flag: '✈️' },
  { label: '청주국제공항', value: '청주국제공항', sub: 'CJJ · 청주',        flag: '✈️' },
  { label: '무안국제공항', value: '무안국제공항', sub: 'MWX · 전남',        flag: '✈️' },
  { label: '서울',         value: '서울',         sub: '시내 출발',          flag: '🏙️' },
  { label: '부산',         value: '부산',         sub: '시내 출발',          flag: '🏙️' },
]

export const DEST_JP: AutocompleteOption[] = [
  { label: '도쿄',     value: '도쿄',    sub: '나리타공항(NRT) / 하네다공항(HND)', flag: '🗼' },
  { label: '오사카',   value: '오사카',  sub: '간사이국제공항(KIX)',               flag: '🏯' },
  { label: '삿포로',   value: '삿포로',  sub: '신치토세공항(CTS) · 홋카이도',      flag: '⛄' },
  { label: '후쿠오카', value: '후쿠오카',sub: '후쿠오카공항(FUK) · 큐슈',          flag: '🍜' },
  { label: '나고야',   value: '나고야',  sub: '주부국제공항(NGO)',                 flag: '🏰' },
  { label: '오키나와', value: '오키나와',sub: '나하공항(OKA)',                     flag: '🌊' },
  { label: '교토',     value: '교토',    sub: '간사이공항 경유',                   flag: '⛩️' },
  { label: '나라',     value: '나라',    sub: '간사이공항 경유',                   flag: '🦌' },
  { label: '히로시마', value: '히로시마',sub: '히로시마공항(HIJ)',                 flag: '🕊️' },
  { label: '벳푸',     value: '벳푸',    sub: '후쿠오카공항 경유 · 온천',          flag: '♨️' },
  { label: '유후인',   value: '유후인',  sub: '후쿠오카공항 경유 · 료칸',          flag: '🌿' },
  { label: '센다이',   value: '센다이',  sub: '센다이공항(SDJ) · 도호쿠',          flag: '🌸' },
]

export const DEST_KR: AutocompleteOption[] = [
  { label: '부산',  value: '부산',  sub: '김해국제공항(PUS)',    flag: '🌊' },
  { label: '제주',  value: '제주',  sub: '제주국제공항(CJU)',    flag: '🌿' },
  { label: '강릉',  value: '강릉',  sub: '경강선 KTX',           flag: '🏄' },
  { label: '경주',  value: '경주',  sub: '신경주역(KTX)',        flag: '🏛️' },
  { label: '전주',  value: '전주',  sub: 'KTX/버스',             flag: '🥢' },
  { label: '여수',  value: '여수',  sub: '여수공항(RSU)',        flag: '🚢' },
  { label: '속초',  value: '속초',  sub: 'KTX 강릉 경유',       flag: '🏔️' },
  { label: '대구',  value: '대구',  sub: '동대구역(KTX)',        flag: '🍎' },
  { label: '광주',  value: '광주',  sub: '광주공항(KWJ)',        flag: '🎨' },
  { label: '춘천',  value: '춘천',  sub: 'ITX-청춘',             flag: '🦆' },
]

export const ALL_DEST: AutocompleteOption[] = [...DEST_JP, ...DEST_KR]

// 목적지 → 이미지
export const DEST_IMG: Record<string, string> = {
  '도쿄':     'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80',
  '오사카':   'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&q=80',
  '삿포로':   'https://images.unsplash.com/photo-1553697388-94e804e2f0f6?w=400&q=80',
  '후쿠오카': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&q=80',
  '교토':     'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80',
  '오키나와': 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=400&q=80',
  '부산':     'https://images.unsplash.com/photo-1583400212045-a2bde5b5efba?w=400&q=80',
  '제주':     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  '벳푸':     'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&q=80',
}

export const DEST_EMOJI: Record<string, string> = {
  '도쿄':'🗼','오사카':'🏯','삿포로':'⛄','후쿠오카':'🍜','나고야':'🏰',
  '오키나와':'🌊','교토':'⛩️','나라':'🦌','히로시마':'🕊️','벳푸':'♨️','유후인':'🌿',
  '부산':'🌊','제주':'🌿','강릉':'🏄','경주':'🏛️','전주':'🥢',
  '여수':'🚢','속초':'🏔️','대구':'🍎','광주':'🎨','춘천':'🦆',
}
