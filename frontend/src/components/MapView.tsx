import { useEffect, useRef, useState, useMemo, useCallback } from 'react'

export interface MapRoute {
  from: { name: string; lat: number; lng: number; address?: string; description?: string | null }
  to:   { name: string; lat: number; lng: number; address?: string; description?: string | null }
  transport: string
  sequence: number
  day: number
  estimatedCost?: number
  durationMinutes?: number
  note?: string | null
}

interface Props {
  routes: MapRoute[]
  apiKey: string
  highlightDay?: number
}

// ── 색상 ────────────────────────────────────────────
const DAY_COLORS = ['#3B82F6','#F97316','#10B981','#8B5CF6','#EC4899','#EF4444']
const DAY_LIGHT  = ['#DBEAFE','#FFEDD5','#D1FAE5','#EDE9FE','#FCE7F3','#FEE2E2']
const getDayColor = (d: number) => DAY_COLORS[(d-1) % DAY_COLORS.length]
const getDayLight = (d: number) => DAY_LIGHT [(d-1) % DAY_LIGHT.length]

const T_ICON:  Record<string,string> = { CAR:'🚗', WALK:'🚶', SUBWAY:'🚇', BUS:'🚌', TRAIN:'🚄', TAXI:'🚕' }
const T_LABEL: Record<string,string> = { CAR:'자동차', WALK:'도보', SUBWAY:'지하철', BUS:'버스', TRAIN:'기차', TAXI:'택시' }
// Google Maps 스타일 색상
const T_COLOR: Record<string,string> = {
  WALK:   '#34A853',   // 구글 초록 (도보)
  CAR:    '#4285F4',   // 구글 파랑 (자동차)
  TAXI:   '#FBBC04',   // 구글 노랑 (택시)
  BUS:    '#EA4335',   // 구글 빨강 (버스)
  SUBWAY: '#9C27B0',   // 보라 (지하철)
  TRAIN:  '#FF6D00',   // 주황 (기차)
}

// ── Google Maps 교통수단 매핑 ────────────────────────
function getTravelMode(t: string): google.maps.TravelMode {
  if (t === 'WALK') return google.maps.TravelMode.WALKING
  if (t === 'BUS' || t === 'SUBWAY' || t === 'TRAIN') return google.maps.TravelMode.TRANSIT
  return google.maps.TravelMode.DRIVING
}
function getTransitModes(t: string): google.maps.TransitMode[] | undefined {
  if (t === 'BUS')    return [google.maps.TransitMode.BUS]
  if (t === 'SUBWAY') return [google.maps.TransitMode.SUBWAY, google.maps.TransitMode.RAIL]
  if (t === 'TRAIN')  return [google.maps.TransitMode.TRAIN,  google.maps.TransitMode.RAIL]
  return undefined
}

// ── OSRM 폴백 (DirectionsService 실패 시) ────────────
function decodePolyline(enc: string): google.maps.LatLngLiteral[] {
  let i=0, lat=0, lng=0; const pts: google.maps.LatLngLiteral[]=[]
  while(i<enc.length){
    let b,shift=0,res=0
    do{b=enc.charCodeAt(i++)-63;res|=(b&0x1f)<<shift;shift+=5}while(b>=0x20)
    lat+=res&1?~(res>>1):res>>1; shift=0; res=0
    do{b=enc.charCodeAt(i++)-63;res|=(b&0x1f)<<shift;shift+=5}while(b>=0x20)
    lng+=res&1?~(res>>1):res>>1
    pts.push({lat:lat/1e5,lng:lng/1e5})
  }
  return pts
}
// 두 지점을 잇는 부드러운 곡선(2차 베지어) 좌표 생성 — 지하철·기차 역↔역 표현용
function curvePoints(
  from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral, segments = 48
): google.maps.LatLngLiteral[] {
  const { lat: lat1, lng: lng1 } = from
  const { lat: lat2, lng: lng2 } = to
  const mx = (lat1 + lat2) / 2, my = (lng1 + lng2) / 2
  const dx = lat2 - lat1, dy = lng2 - lng1
  // 현(chord)에 수직으로 제어점을 띄워 아치 모양을 만든다 (거리의 18%)
  const cx = mx - dy * 0.18
  const cy = my + dx * 0.18
  const pts: google.maps.LatLngLiteral[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, u = 1 - t
    pts.push({
      lat: u * u * lat1 + 2 * u * t * cx + t * t * lat2,
      lng: u * u * lng1 + 2 * u * t * cy + t * t * lng2,
    })
  }
  return pts
}

async function fetchOsrm(
  from:{lat:number;lng:number}, to:{lat:number;lng:number},
  t:string, signal:AbortSignal
): Promise<google.maps.LatLngLiteral[]> {
  const profile = t==='WALK' ? 'walking' : 'driving'
  const url=`https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`
  const res=await fetch(url,{signal})
  if(!res.ok) throw new Error(`OSRM ${res.status}`)
  const data=await res.json()
  if(data.code!=='Ok'||!data.routes?.[0]?.geometry) throw new Error('no route')
  return decodePolyline(data.routes[0].geometry)
}

// ── 경로 결과 타입 ────────────────────────────────────
interface RouteInfo {
  route: MapRoute
  duration: string | null   // "25분"
  distance: string | null   // "3.2 km"
  via: string | null        // "1호선 → 2호선" 등
  polylinePts: google.maps.LatLngLiteral[] | null  // OSRM 폴백용
  usedDirections: boolean
}

// ── Google Maps 로드 ──────────────────────────────────
declare global { interface Window { google: typeof google; initDagalleMap?:()=>void } }
let gmapsPromise: Promise<void> | null = null
function loadGoogleMaps(apiKey:string): Promise<void> {
  if(window.google?.maps) return Promise.resolve()
  if(gmapsPromise) return gmapsPromise
  if(document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
    gmapsPromise=new Promise(r=>{ const c=setInterval(()=>{if(window.google?.maps){clearInterval(c);r()}},100) })
    return gmapsPromise
  }
  gmapsPromise=new Promise((resolve,reject)=>{
    window.initDagalleMap=()=>resolve()
    const s=document.createElement('script')
    s.src=`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initDagalleMap&language=ko`
    s.async=true; s.onerror=(e)=>{gmapsPromise=null;reject(e)}
    document.head.appendChild(s)
  })
  return gmapsPromise
}

export default function MapView({ routes, apiKey, highlightDay }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapInst    = useRef<google.maps.Map|null>(null)
  const markers    = useRef<google.maps.Marker[]>([])
  const renderers  = useRef<google.maps.DirectionsRenderer[]>([])
  const polylines  = useRef<google.maps.Polyline[]>([])
  const activeIW   = useRef<google.maps.InfoWindow|null>(null)
  const lastBounds = useRef<google.maps.LatLngBounds|null>(null)

  const [mapReady,       setMapReady]       = useState(false)
  const [loadingCount,   setLoadingCount]   = useState(0)
  const [transportFilter,setTransportFilter]= useState<string|null>(null)
  const [selectedIdx,    setSelectedIdx]    = useState<number|null>(null)
  const [routeInfos,     setRouteInfos]     = useState<RouteInfo[]>([])
  const [panelOpen,      setPanelOpen]      = useState(true)

  // 필터된 routes
  const visible = useMemo(()=>
    transportFilter ? routes.filter(r=>r.transport===transportFilter) : routes,
    [routes, transportFilter])

  // 비용 요약
  const costSummary = useMemo(()=>{
    const g: Record<string,{count:number;cost:number}>= {}
    visible.forEach(r=>{ if(!g[r.transport]) g[r.transport]={count:0,cost:0}; g[r.transport].count++; g[r.transport].cost+=r.estimatedCost??0 })
    return g
  }, [visible])
  const totalCost = useMemo(()=>Object.values(costSummary).reduce((s,v)=>s+v.cost,0),[costSummary])

  // ── Google Maps 초기화 ──────────────────────────────
  useEffect(()=>{
    if(!apiKey) return
    loadGoogleMaps(apiKey).then(()=>{
      if(!mapRef.current||mapInst.current) return
      mapInst.current=new window.google.maps.Map(mapRef.current,{
        zoom:13, center:{lat:35.6812,lng:139.7671},
        mapTypeControl:false, streetViewControl:false, fullscreenControl:false,
        gestureHandling:'greedy',
        // 잡다한 POI·라벨을 죽여 경로선이 도드라지게 (가시성)
        styles:[
          { featureType:'poi',            elementType:'labels', stylers:[{visibility:'off'}] },
          { featureType:'poi.business',                          stylers:[{visibility:'off'}] },
          { featureType:'transit',        elementType:'labels', stylers:[{visibility:'off'}] },
          { featureType:'road',           elementType:'labels.icon', stylers:[{visibility:'off'}] },
          { featureType:'administrative', elementType:'labels', stylers:[{lightness:20}] },
        ],
      })
      setMapReady(true)
      const ro=new ResizeObserver(entries=>{
        for(const e of entries){
          if(e.contentRect.width>0&&e.contentRect.height>0&&mapInst.current){
            google.maps.event.trigger(mapInst.current,'resize')
            if(lastBounds.current) mapInst.current.fitBounds(lastBounds.current,60)
          }
        }
      })
      ro.observe(mapRef.current)
      return ()=>ro.disconnect()
    }).catch(()=>console.warn('Google Maps 로드 실패'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[apiKey])

  // ── 경로 그리기 ──────────────────────────────────────
  useEffect(()=>{
    if(!mapReady||!mapInst.current||!visible.length) return
    const map=mapInst.current
    const ac=new AbortController()
    google.maps.event.trigger(map,'resize')

    // 이전 오버레이 제거
    markers.current.forEach(m=>m.setMap(null)); markers.current=[]
    renderers.current.forEach(r=>r.setMap(null)); renderers.current=[]
    polylines.current.forEach(p=>p.setMap(null)); polylines.current=[]
    activeIW.current?.close()
    setRouteInfos([])

    const bounds=new window.google.maps.LatLngBounds()
    visible.forEach(r=>{ bounds.extend({lat:r.from.lat,lng:r.from.lng}); bounds.extend({lat:r.to.lat,lng:r.to.lng}) })
    lastBounds.current=bounds
    map.fitBounds(bounds,60)

    setLoadingCount(visible.length)
    const infos: RouteInfo[] = visible.map(r=>({
      route:r, duration:null, distance:null, via:null, polylinePts:null, usedDirections:false
    }))
    setRouteInfos([...infos])

    const dsvc=new google.maps.DirectionsService()
    const drawn=new Set<string>()

    visible.forEach((route,idx)=>{
      const t       = route.transport
      const tColor  = T_COLOR[t]??'#4285F4'
      const isDimmed= !transportFilter && highlightDay!==undefined && highlightDay!==route.day
      const opacity = isDimmed ? 0.18 : 1.0
      const color   = isDimmed ? '#94A3B8' : tColor
      const weight  = transportFilter ? 8 : 6

      const isTransit = (t==='SUBWAY'||t==='BUS'||t==='TRAIN')

      if(isTransit){
        // 지하철·기차·버스: 실제 노선 데이터가 없으므로 역↔역을 부드러운 점선 곡선으로 표현
        const pts = curvePoints(
          { lat:route.from.lat, lng:route.from.lng },
          { lat:route.to.lat,   lng:route.to.lng   }
        )
        drawTransitCurve(pts, color, weight, opacity, map)
        infos[idx]={route, duration:`약 ${route.durationMinutes??'?'}분`, distance:null, via:null, polylinePts:pts, usedDirections:false}
        setRouteInfos([...infos])
        setLoadingCount(c=>Math.max(0,c-1))
      } else {
        // 도보·자동차: 실제 경로가 의미 있으므로 구글 → OSRM → 직선 순으로 도로를 따라 그린다.
        const renderer=new google.maps.DirectionsRenderer({
          map,
          suppressMarkers:true,
          suppressInfoWindows:true,
          preserveViewport:true,
          polylineOptions:{
            strokeColor: color,
            strokeWeight: weight,
            strokeOpacity: t==='WALK' ? 0 : opacity,   // 도보는 점선 따로 그림
            zIndex: isDimmed ? 1 : 5,
            icons: t==='WALK' ? [{
              icon:{ path:google.maps.SymbolPath.CIRCLE, scale:3, fillColor:color, fillOpacity:opacity, strokeOpacity:0 } as google.maps.Symbol,
              offset:'0', repeat:'10px',
            }] : [{
              icon:{ path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale:4, strokeColor:'#fff', strokeWeight:1.5, fillColor:color, fillOpacity:opacity } as google.maps.Symbol,
              repeat:'80px', offset:'50%',
            }],
          },
        })
        renderers.current.push(renderer)

        const request: google.maps.DirectionsRequest = {
          origin:      { lat:route.from.lat, lng:route.from.lng },
          destination: { lat:route.to.lat,   lng:route.to.lng   },
          travelMode:  getTravelMode(t),
        }

        const handleSuccess=(result: google.maps.DirectionsResult)=>{
          if(ac.signal.aborted) return
          renderer.setDirections(result)
          const leg=result.routes[0]?.legs[0]
          infos[idx]={
            route, duration:leg?.duration?.text??null,
            distance:leg?.distance?.text??null, via:null,
            polylinePts:null, usedDirections:true,
          }
          setRouteInfos([...infos])
          setLoadingCount(c=>Math.max(0,c-1))
        }

        const handleFallback=()=>{
          if(ac.signal.aborted) return
          renderer.setMap(null)   // DirectionsRenderer 제거하고 직접 그리기
          fetchOsrm(route.from, route.to, t, ac.signal)
            .then(pts=>{
              if(ac.signal.aborted) return
              drawFallbackLine(pts, color, weight, opacity, t, map)
              infos[idx]={route, duration:`약 ${route.durationMinutes??'?'}분`, distance:null, via:null, polylinePts:pts, usedDirections:false}
              setRouteInfos([...infos])
            })
            .catch(()=>{
              if(ac.signal.aborted) return
              const pts=[{lat:route.from.lat,lng:route.from.lng},{lat:route.to.lat,lng:route.to.lng}]
              drawFallbackLine(pts, color, weight, opacity, t, map)
              infos[idx]={route, duration:`약 ${route.durationMinutes??'?'}분`, distance:null, via:null, polylinePts:pts, usedDirections:false}
              setRouteInfos([...infos])
            })
            .finally(()=>{ if(!ac.signal.aborted) setLoadingCount(c=>Math.max(0,c-1)) })
        }

        dsvc.route(request, (result, status)=>{
          if(ac.signal.aborted) return
          if(status===google.maps.DirectionsStatus.OK && result) handleSuccess(result)
          else handleFallback()
        })
      }

      // ── 마커 ────────────────────────────────────────
      const fromKey=`${route.day}-${route.from.lat.toFixed(5)}-${route.from.lng.toFixed(5)}`
      if(!drawn.has(fromKey)){
        drawn.add(fromKey)
        const mColor=isDimmed?'#CBD5E1':getDayColor(route.day)
        const m=new google.maps.Marker({
          position:{lat:route.from.lat,lng:route.from.lng}, map,
          zIndex: isDimmed ? 1 : 10,
          icon:{
            path:google.maps.SymbolPath.CIRCLE,
            scale: transportFilter ? 18 : 15,
            fillColor:mColor, fillOpacity:1,
            strokeColor:'#fff', strokeWeight:2.5,
          },
          label:{text:String(route.sequence),color:'#fff',fontWeight:'bold',fontSize: transportFilter?'13px':'11px'},
          title:route.from.name,
        })
        if(route.sequence===1&&!isDimmed){
          markers.current.push(new google.maps.Marker({
            position:{lat:route.from.lat,lng:route.from.lng}, map, zIndex:20,
            icon:{
              url:`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="22"><rect rx="6" ry="6" width="40" height="22" fill="${getDayColor(route.day)}"/><text x="20" y="15" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="sans-serif">D${route.day}</text></svg>`
              )}`,
              scaledSize:new google.maps.Size(40,22),
              anchor:new google.maps.Point(20,36),
            },
          }))
        }
        const iw=new google.maps.InfoWindow({content:makeInfoContent(route,false)})
        m.addListener('click',()=>{ activeIW.current?.close(); iw.open(map,m); activeIW.current=iw; setSelectedIdx(idx) })
        markers.current.push(m)
      }

      const isDayLast=idx===visible.length-1||visible[idx+1]?.day!==route.day
      if(isDayLast){
        const toKey=`${route.day}-${route.to.lat.toFixed(5)}-${route.to.lng.toFixed(5)}`
        if(!drawn.has(toKey)){
          drawn.add(toKey)
          const fm=new google.maps.Marker({
            position:{lat:route.to.lat,lng:route.to.lng}, map,
            zIndex: isDimmed?1:10,
            icon:{path:google.maps.SymbolPath.CIRCLE, scale: transportFilter?18:15, fillColor:isDimmed?'#CBD5E1':getDayColor(route.day), fillOpacity:1, strokeColor:'#fff', strokeWeight:2.5},
            label:{text:'🏁', fontSize: transportFilter?'15px':'13px'},
            title:route.to.name,
          })
          const iw2=new google.maps.InfoWindow({content:makeInfoContent(route,true)})
          fm.addListener('click',()=>{ activeIW.current?.close(); iw2.open(map,fm); activeIW.current=iw2 })
          markers.current.push(fm)
        }
      }
    })

    function drawFallbackLine(
      pts:google.maps.LatLngLiteral[], color:string,
      weight:number, opacity:number, t:string, map:google.maps.Map
    ) {
      if((t==='SUBWAY'||t==='TRAIN')&&opacity>0.5){
        const out=new google.maps.Polyline({path:pts,zIndex:3,strokeColor:'#fff',strokeOpacity:opacity*0.8,strokeWeight:weight+4})
        out.setMap(map); polylines.current.push(out)
      }
      const poly=new google.maps.Polyline({
        path:pts, zIndex:4,
        strokeColor:color,
        strokeOpacity: t==='WALK'?0:opacity,
        strokeWeight:weight,
        icons: t==='WALK'?[{icon:{path:google.maps.SymbolPath.CIRCLE,scale:3,fillColor:color,fillOpacity:opacity,strokeOpacity:0} as google.maps.Symbol,offset:'0',repeat:'10px'}]:
               t==='BUS'?[{icon:{path:'M 0,-2 0,2',strokeOpacity:opacity,strokeColor:color,scale:3} as google.maps.Symbol,offset:'0',repeat:'14px'}]:
               [{icon:{path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:4,strokeColor:'#fff',strokeWeight:1.5,fillColor:color,fillOpacity:opacity} as google.maps.Symbol,repeat:'80px',offset:'50%'}],
      })
      poly.setMap(map); polylines.current.push(poly)
    }

    // 지하철·기차: 역↔역을 부드러운 점선 곡선으로 그린다 (흰 아웃라인으로 가독성 확보)
    function drawTransitCurve(
      pts:google.maps.LatLngLiteral[], color:string,
      weight:number, opacity:number, map:google.maps.Map
    ) {
      if(opacity>0.5){
        const out=new google.maps.Polyline({ path:pts, zIndex:3, strokeColor:'#fff', strokeOpacity:0.9, strokeWeight:weight+4 })
        out.setMap(map); polylines.current.push(out)
      }
      const dash=new google.maps.Polyline({
        path:pts, zIndex:4, strokeColor:color, strokeOpacity:0, strokeWeight:weight,
        icons:[{ icon:{ path:'M 0,-1 0,1', strokeColor:color, strokeOpacity:opacity, strokeWeight:weight, scale:2 } as google.maps.Symbol, offset:'0', repeat:'16px' }],
      })
      dash.setMap(map); polylines.current.push(dash)
    }

    return ()=>{ ac.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mapReady, visible, highlightDay, transportFilter])

  // 패널에서 클릭 → 지도 포커스
  const focusRoute=useCallback((info:RouteInfo)=>{
    if(!mapInst.current) return
    const b=new google.maps.LatLngBounds()
    b.extend({lat:info.route.from.lat,lng:info.route.from.lng})
    b.extend({lat:info.route.to.lat,  lng:info.route.to.lng})
    mapInst.current.fitBounds(b,100)
  },[])

  if(!routes.length) return (
    <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#F1F5F9',borderRadius:16,color:'var(--text3)',fontSize:'0.9rem'}}>
      🗺️ 일정을 먼저 생성해주세요
    </div>
  )

  const days=Array.from(new Set(routes.map(r=>r.day))).sort()
  const transports=Array.from(new Set(routes.map(r=>r.transport)))

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',gap:6}}>

      {/* ── 상단 컨트롤 바 ── */}
      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        {/* Day 범례 */}
        {days.map(day=>(
          <div key={day} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:getDayLight(day),border:`1.5px solid ${getDayColor(day)}33`,opacity:highlightDay!==undefined&&highlightDay!==day?0.35:1,transition:'opacity 0.2s'}}>
            <div style={{width:9,height:9,borderRadius:'50%',background:getDayColor(day)}}/>
            <span style={{fontSize:'0.72rem',fontWeight:700,color:getDayColor(day)}}>{day}일차</span>
          </div>
        ))}

        {/* 교통수단 필터 */}
        <div style={{display:'flex',alignItems:'center',gap:1,background:'#F1F5F9',borderRadius:22,padding:3,marginLeft:4}}>
          <button onClick={()=>setTransportFilter(null)} style={{padding:'4px 13px',borderRadius:19,border:'none',cursor:'pointer',background:!transportFilter?'#fff':'transparent',color:!transportFilter?'#1D4ED8':'var(--text3)',fontWeight:700,fontSize:'0.72rem',boxShadow:!transportFilter?'0 1px 4px rgba(0,0,0,0.12)':'none',transition:'all 0.15s'}}>전체</button>
          {transports.map(t=>{
            const active=transportFilter===t
            const c=T_COLOR[t]??'#888'
            return(
              <button key={t} onClick={()=>setTransportFilter(active?null:t)} style={{padding:'4px 11px',borderRadius:19,border:'none',cursor:'pointer',background:active?c:'transparent',color:active?'#fff':c,fontWeight:700,fontSize:'0.72rem',boxShadow:active?`0 2px 8px ${c}55`:'none',transition:'all 0.15s'}}>
                {T_ICON[t]} {T_LABEL[t]??t}
              </button>
            )
          })}
        </div>

        {loadingCount>0&&(
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.7rem',color:'var(--text3)',marginLeft:'auto'}}>
            <span style={{width:11,height:11,border:'2px solid var(--border)',borderTopColor:'var(--sky)',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>
            경로 계산 중...
          </div>
        )}
      </div>

      {/* ── 메인 영역: 패널 + 지도 ── */}
      <div style={{display:'flex',flex:1,gap:8,minHeight:0}}>

        {/* 좌측 내비게이션 패널 */}
        <div style={{
          width: panelOpen ? 280 : 36,
          flexShrink:0,
          display:'flex',flexDirection:'column',
          background:'#fff',borderRadius:14,
          border:'1px solid var(--border-lt)',
          boxShadow:'0 2px 12px rgba(0,0,0,0.07)',
          overflow:'hidden',
          transition:'width 0.2s ease',
        }}>
          {/* 패널 헤더 */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #F1F5F9',flexShrink:0}}>
            {panelOpen&&<span style={{fontSize:'0.75rem',fontWeight:800,color:'#111',whiteSpace:'nowrap'}}>🗺️ 경로 상세</span>}
            <button onClick={()=>setPanelOpen(p=>!p)} style={{width:24,height:24,borderRadius:8,border:'none',cursor:'pointer',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'12px',color:'var(--text3)',marginLeft:panelOpen?'auto':0}}>
              {panelOpen?'◀':'▶'}
            </button>
          </div>

          {/* 경로 목록 */}
          {panelOpen&&(
            <div style={{overflowY:'auto',flex:1,padding:'8px 6px'}}>
              {visible.map((route,idx)=>{
                const info=routeInfos[idx]
                const t=route.transport
                const c=T_COLOR[t]??'#4285F4'
                const isSelected=selectedIdx===idx
                const dayC=getDayColor(route.day)
                return(
                  <div key={idx}>
                    {/* 출발지 노드 */}
                    {idx===0||visible[idx-1]?.from.name!==route.from.name?(
                      <div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'6px 8px',cursor:'pointer'}} onClick={()=>{setSelectedIdx(idx);info&&focusRoute(info)}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                          <div style={{width:20,height:20,borderRadius:'50%',background:dayC,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'10px',fontWeight:800}}>{route.sequence}</div>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'0.78rem',fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{route.from.name}</div>
                          {route.from.address&&<div style={{fontSize:'0.64rem',color:'var(--text3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:1}}>{route.from.address}</div>}
                        </div>
                      </div>
                    ):null}

                    {/* 이동 구간 카드 */}
                    <div
                      onClick={()=>{setSelectedIdx(idx);info&&focusRoute(info)}}
                      style={{
                        display:'flex',alignItems:'stretch',gap:0,margin:'2px 0',
                        cursor:'pointer',borderRadius:10,
                        background: isSelected?`${c}10`:'transparent',
                        border:`1.5px solid ${isSelected?c:'transparent'}`,
                        transition:'all 0.15s',
                      }}
                    >
                      {/* 세로선 (타임라인) */}
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'4px 8px',width:36,flexShrink:0}}>
                        <div style={{width:2,flex:1,background:`${c}40`}}/>
                        <div style={{width:26,height:26,borderRadius:'50%',background:c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0,zIndex:1}}>
                          {T_ICON[t]??'🚀'}
                        </div>
                        <div style={{width:2,flex:1,background:`${c}40`}}/>
                      </div>

                      {/* 이동 정보 */}
                      <div style={{flex:1,padding:'8px 8px 8px 4px',minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                          <span style={{fontSize:'0.7rem',fontWeight:800,color:c,background:`${c}15`,padding:'1px 7px',borderRadius:10}}>{T_LABEL[t]??t}</span>
                          {info?.duration&&<span style={{fontSize:'0.68rem',color:'var(--text3)'}}>⏱ {info.duration}</span>}
                          {info?.distance&&<span style={{fontSize:'0.68rem',color:'var(--text3)'}}>• {info.distance}</span>}
                        </div>
                        {info?.via&&(
                          <div style={{fontSize:'0.65rem',color:c,background:`${c}08`,borderRadius:6,padding:'2px 6px',marginBottom:3,fontWeight:600}}>🔄 {info.via}</div>
                        )}
                        {route.note&&(
                          <div style={{fontSize:'0.65rem',color:'#6B7280',lineHeight:1.4,whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{route.note}</div>
                        )}
                        {(route.estimatedCost??0)>0&&(
                          <div style={{fontSize:'0.65rem',color:'#6B7280',marginTop:2}}>💰 {route.estimatedCost!.toLocaleString()}원</div>
                        )}
                      </div>
                    </div>

                    {/* 마지막 도착지 */}
                    {(idx===visible.length-1||visible[idx+1]?.from.name!==route.to.name)&&(
                      <div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'6px 8px'}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                          <div style={{width:20,height:20,borderRadius:'50%',background:dayC,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px'}}>🏁</div>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'0.78rem',fontWeight:700,color:'#111',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{route.to.name}</div>
                          {route.to.address&&<div style={{fontSize:'0.64rem',color:'var(--text3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:1}}>{route.to.address}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 비용 요약 */}
              {Object.keys(costSummary).length>0&&(
                <div style={{marginTop:10,padding:'10px 10px',background:'#F8FAFC',borderRadius:10,border:'1px solid var(--border-lt)'}}>
                  <div style={{fontSize:'0.68rem',fontWeight:700,color:'var(--text3)',marginBottom:6}}>이동 비용 합계</div>
                  {Object.entries(costSummary).map(([t,{count,cost}])=>(
                    <div key={t} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:'0.7rem',color:T_COLOR[t]??'#555'}}>{T_ICON[t]} {T_LABEL[t]} ×{count}</span>
                      <span style={{fontSize:'0.7rem',fontWeight:700,color:'#374151'}}>{cost===0?'무료':`${cost.toLocaleString()}원`}</span>
                    </div>
                  ))}
                  {totalCost>0&&(
                    <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border-lt)',paddingTop:6,marginTop:4}}>
                      <span style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text3)'}}>합계</span>
                      <span style={{fontSize:'0.8rem',fontWeight:800,color:'var(--sky-dk)'}}>{totalCost.toLocaleString()}원</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 우측 지도 */}
        <div ref={mapRef} style={{flex:1,borderRadius:16,overflow:'hidden',border:'1px solid var(--border-lt)',boxShadow:'0 2px 12px rgba(0,0,0,0.08)',minHeight:300}}/>
      </div>
    </div>
  )
}

// ── InfoWindow 콘텐츠 ──────────────────────────────────
function makeInfoContent(route: MapRoute, isEnd: boolean) {
  const loc  = isEnd ? route.to : route.from
  const dayC = getDayColor(route.day)
  const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address?`${loc.name} ${loc.address}`:loc.name)}`
  return `
    <div style="font-family:sans-serif;min-width:210px;max-width:290px;padding:4px 2px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="background:${dayC};color:#fff;border-radius:6px;padding:2px 9px;font-size:11px;font-weight:700">${route.day}일차</span>
        <span style="font-size:11px;color:#888">${isEnd?'최종 도착':`${route.sequence}번 출발`}</span>
      </div>
      <div style="font-weight:800;font-size:14px;color:#111;margin-bottom:${loc.description?7:4}px;line-height:1.3">${loc.name}</div>
      ${loc.description?`<div style="font-size:12px;color:#374151;line-height:1.55;background:#F9FAFB;border-left:3px solid ${dayC};border-radius:0 6px 6px 0;padding:7px 10px;margin-bottom:9px">${loc.description}</div>`:''}
      ${(route.estimatedCost??0)>0&&!isEnd?`<div style="font-size:11px;color:#6B7280;margin-bottom:9px">💰 이 구간 ${route.estimatedCost!.toLocaleString()}원</div>`:''}
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
        style="display:inline-flex;align-items:center;gap:6px;padding:7px 13px;background:#4285F4;color:#fff;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        구글 지도에서 보기
      </a>
    </div>
  `
}
