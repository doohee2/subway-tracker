const fs = require('fs');
const path = require('path');

const stationsPath = path.join(__dirname, '../json/stations.json');
const distancesPath = path.join(__dirname, '../json/distances.json');
const aliasesPath = path.join(__dirname, '../json/stations_nm_alias.json');
const adjustPath = path.join(__dirname, '../json/adjust.json');
const outputPath = path.join(__dirname, '../json/subway_data.json');

// Read JSON files
const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8')).DATA;
const distancesData = fs.existsSync(distancesPath)
  ? JSON.parse(fs.readFileSync(distancesPath, 'utf8')).DATA
  : [];
const aliasesData = fs.existsSync(aliasesPath)
  ? JSON.parse(fs.readFileSync(aliasesPath, 'utf8'))
  : [];
const adjustData = fs.existsSync(adjustPath)
  ? JSON.parse(fs.readFileSync(adjustPath, 'utf8'))
  : [];

function normalizeRouteLine(lineName) {
  const match = lineName.match(/(\d+)호선/);
  if (match) {
    return parseInt(match[1], 10).toString();
  }
  return lineName;
}

function isMatch(name1, name2) {
  if (!name1 || !name2) return false;
  const clean1 = name1.replace(/\(.*\)$/, '').replace(/역$/, '');
  const clean2 = name2.replace(/\(.*\)$/, '').replace(/역$/, '');
  return (
    name1 === name2 ||
    clean1 === clean2 ||
    name1.includes(name2) ||
    name2.includes(name1)
  );
}

function hmToSeconds(hm) {
  if (!hm || !hm.includes(':')) return 0;
  const parts = hm.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function secondsToHm(seconds) {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}:${rs.toString().padStart(2, '0')}`;
}

function compareFrCode(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * 노선별 급행 정차역 목록 (역명 기준)
 */
const EXPRESS_STOP_NAMES = {
  '01호선': new Set([
    // 경원선 급행 (동두천~광운대)
    '동두천', '동두천중앙', '지행', '덕정', '양주', '의정부', '회룡', '도봉산', '창동', '광운대',
    // 서울 도심 및 경인·경부 공통
    '청량리', '제기동', '신설동', '동묘앞', '동대문', '종로5가', '종로3가', '종각', '시청', '서울역',
    '용산', '노량진', '대방', '신길', '영등포', '신도림', '구로',
    // 경인선 급행 (구로~동인천)
    '개봉', '역곡', '부천', '송내', '부평', '동암', '주안', '제물포', '동인천', '인천',
    // 경부선 급행 (구로~천안/신창)
    '가산디지털단지', '금천구청', '안양', '금정', '군포', '의왕', '성균관대', '수원', '병점', '오산',
    '서정리', '평택지제', '평택', '성환', '두정', '천안', '아산', '온양온천', '신창'
  ]),
  '04호선': new Set([
    // 과천·안산선 급행 (금정~오이도) 및 서울 본선 연결
    '금정', '산본', '상록수', '중앙', '초지', '안산', '정왕', '오이도',
    '범계', '평촌', '인덕원', '정부과천청사', ' 과천', '사당', '동작', '이촌', '서울역', '명동', '충무로', '동대문역사문화공원', '동대문', '혜화', '성신여대입구', '길음', '미아사거리', '창동', '노원', '상계', '당고개'
  ]),
  '09호선': new Set([
    '김포공항', '마곡나루', '가양', '염창', '당산', '여의도', '노량진', '동작',
    '고속터미널', '신논현', '선정릉', '봉은사', '종합운동장', '석촌', '올림픽공원', '중앙보훈병원'
  ]),
  '경의선': new Set([
    '문산', '금촌', '금릉', '운정', '야당', '탄현', '일산', '백마', '대곡', '행신',
    '디지털미디어시티', '가좌', '홍대입구', '공덕', '용산', '신촌', '서울역',
    '이촌', '옥수', '왕십리', '청량리', '회기', '상봉', '구리', '도농', '덕소', '도심', '양수', '양평', '용문'
  ]),
  '경춘선': new Set([
    '청량리', '회기', '상봉', '별내', '퇴계원', '사릉', '평내호평', '마석', '청평', '가평', '강촌', '남춘천', '춘천'
  ]),
  '공항철도': new Set([
    '서울역', '인천공항1터미널', '인천공항2터미널'
  ]),
  '수인분당선': new Set([
    // 왕십리~죽전(전역) + 죽전~수원 급행 + 수원~오이도(수인선 급행) + 오이도~인천
    '청량리', '왕십리', '서울숲', '압구정로데오', '강남구청', '선정릉', '선릉', '한티', '도곡', '구룡', '개포동', '대모산입구', '수서', '복정', '가천대', '태평', '모란', '야탑', '이매', '서현', '수내', '정자', '미금', '오리',
    '죽전', '기흥', '망포', '수원시청', '수원', '고색', '한대앞', '중앙', '초지', '안산', '정왕', '오이도',
    '소래포구', '인천논현', '원인재', '연수', '인하대', '인천'
  ])
};

function isExpressStation(line, stationName) {
  const set = EXPRESS_STOP_NAMES[line];
  if (!set) return true; // 급행 미운행 노선은 전역 정차로 간주
  const clean = stationName.replace(/\(.*\)$/, '').replace(/역$/, '').trim();
  return set.has(clean) || set.has(stationName);
}

// Map aliases by station name
const aliasMap = {};
stationsData.forEach((st) => {
  const nm = st.station_nm;
  if (!aliasMap[nm]) aliasMap[nm] = new Set();
});

aliasesData.forEach((item) => {
  const statnNm = item.STATN_NM;
  const statnAlias = item.STATN_ALIAS;

  Object.keys(aliasMap).forEach((nm) => {
    if (statnNm === nm || statnAlias === nm || statnNm.startsWith(nm + '(')) {
      if (statnNm !== nm) aliasMap[nm].add(statnNm);
      if (statnAlias !== nm) aliasMap[nm].add(statnAlias);
    }
  });
});

// Group stations by line_num
const lines = {};
stationsData.forEach((station) => {
  const line = station.line_num;
  if (!lines[line]) lines[line] = [];
  lines[line].push(station);
});

/**
 * 노선별 분기·순환·특수 코드 정렬을 반영하여 세그먼트(연속된 fr_code 배열) 목록을 반환합니다.
 */
function buildLineSegments(line, lineStations) {
  const codeSet = new Set(lineStations.map((s) => s.fr_code));
  const has = (c) => codeSet.has(c);

  if (line === '01호선') {
    const gyeongwonNorth = ['100-3', '100-2', '100-1'].filter(has);
    const mainGyeongin = [...codeSet]
      .filter((c) => /^\d+$/.test(c))
      .sort(compareFrCode);
    const seg1 = [...gyeongwonNorth, ...mainGyeongin];

    const gyeongbuMain = [...codeSet]
      .filter((c) => /^P\d+$/.test(c))
      .sort(compareFrCode);
    const seg2 = ['141', ...gyeongbuMain].filter(has);

    const seg3 = ['P144', 'P144-1'].filter(has);
    const seg4 = ['P157', 'P157-1'].filter(has);

    return [{ codes: seg1 }, { codes: seg2 }, { codes: seg3 }, { codes: seg4 }];
  }

  if (line === '02호선') {
    const mainLoop = [...codeSet]
      .filter((c) => /^\d+$/.test(c))
      .sort(compareFrCode);
    const segMain = [...mainLoop, mainLoop[0]];
    const seongsu = ['211', ...[...codeSet].filter((c) => c.startsWith('211-')).sort(compareFrCode)];
    const sinjeong = ['234', ...[...codeSet].filter((c) => c.startsWith('234-')).sort(compareFrCode)];
    return [{ codes: segMain }, { codes: seongsu }, { codes: sinjeong }];
  }

  if (line === '05호선') {
    const mainHanam = [...codeSet]
      .filter((c) => /^\d+$/.test(c))
      .sort(compareFrCode);
    const macheon = ['548', ...[...codeSet].filter((c) => c.startsWith('P5')).sort(compareFrCode)];
    return [{ codes: mainHanam }, { codes: macheon }];
  }

  if (line === '06호선') {
    const eungamLoop = ['610', '611', '612', '613', '614', '615', '610'].filter(has);
    const mainLine = ['610', ...[...codeSet].filter((c) => parseInt(c, 10) >= 616).sort(compareFrCode)].filter(has);
    return [{ codes: eungamLoop, oneWay: true }, { codes: mainLine }];
  }

  if (line === '경의선') {
    const gyeonguiWest = [...codeSet]
      .filter((c) => /^K3\d+$/.test(c))
      .sort(compareFrCode)
      .reverse();
    const jungangEast = [...codeSet]
      .filter((c) => /^K1\d+$/.test(c))
      .sort(compareFrCode);
    const mainSeg = [...gyeonguiWest, ...(has('K826') ? ['K826'] : []), ...jungangEast];
    const seoulBranch = ['K315', 'P312', 'P313'].filter(has);
    return [{ codes: mainSeg }, { codes: seoulBranch }];
  }

  if (line === '경춘선') {
    const mainSeg = [...codeSet]
      .filter((c) => c !== 'P116')
      .sort(compareFrCode);
    const gwangundaeBranch = ['P116', 'P120'].filter(has);
    return [{ codes: mainSeg }, { codes: gwangundaeBranch }];
  }

  if (line === '공항철도') {
    const ordered = [
      'A01', 'A02', 'A03', 'A04', 'A042', 'A05',
      'A06', 'A07', 'A071', 'A072', 'A08', 'A09', 'A10', 'A11'
    ].filter(has);
    return [{ codes: ordered }];
  }

  const sorted = [...codeSet].sort(compareFrCode);
  return [{ codes: sorted }];
}

function findBaseDistanceSeconds(line, stA, stB, lineDistances) {
  if (!stA || !stB) return 0;

  if (
    line === '05호선' &&
    ((stA.fr_code === '548' && stB.fr_code === 'P549') ||
      (stA.fr_code === 'P549' && stB.fr_code === '548'))
  ) {
    const dunchon = lineDistances.find((d) => isMatch(d.sbwy_stns_nm, '둔촌동'));
    return dunchon ? hmToSeconds(dunchon.hm) : 0;
  }

  for (let k = 0; k < lineDistances.length - 1; k++) {
    const currD = lineDistances[k];
    const nextD = lineDistances[k + 1];
    if (isMatch(currD.sbwy_stns_nm, stA.station_nm) && isMatch(nextD.sbwy_stns_nm, stB.station_nm)) {
      const sec = hmToSeconds(nextD.hm);
      if (sec > 0) return sec;
    }
    if (isMatch(currD.sbwy_stns_nm, stB.station_nm) && isMatch(nextD.sbwy_stns_nm, stA.station_nm)) {
      const sec = hmToSeconds(nextD.hm);
      if (sec > 0) return sec;
    }
  }
  return 0;
}

function findShortestPathCodes(stationMap, adjMap, startName, endName) {
  const stations = Object.values(stationMap);
  const startNode = stations.find((s) => isMatch(s.station_name, startName));
  const endNode = stations.find((s) => isMatch(s.station_name, endName));
  if (!startNode || !endNode) return null;

  const queue = [[startNode.fr_code]];
  const visited = new Set([startNode.fr_code]);

  while (queue.length > 0) {
    const pathCodes = queue.shift();
    const curr = pathCodes[pathCodes.length - 1];
    if (curr === endNode.fr_code) return pathCodes;

    const neighbors = adjMap.get(curr) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push([...pathCodes, edge.to]);
      }
    }
  }
  return null;
}

const unifiedData = [];

for (const line in lines) {
  const rawStations = lines[line];
  const routLn = normalizeRouteLine(line);
  const lineDistances = distancesData.filter((d) => d.sbwy_rout_ln === routLn);

  const segments = buildLineSegments(line, rawStations);
  const orderedCodes = [];
  const seenCodes = new Set();
  segments.forEach((seg) => {
    seg.codes.forEach((c) => {
      if (!seenCodes.has(c)) {
        seenCodes.add(c);
        orderedCodes.push(c);
      }
    });
  });
  rawStations.forEach((s) => {
    if (!seenCodes.has(s.fr_code)) {
      seenCodes.add(s.fr_code);
      orderedCodes.push(s.fr_code);
    }
  });

  const rawByCode = {};
  rawStations.forEach((s) => {
    rawByCode[s.fr_code] = s;
  });

  const stationMap = {};
  const adjMap = new Map();

  orderedCodes.forEach((code) => {
    const st = rawByCode[code];
    if (!st) return;
    const aliases = aliasMap[st.station_nm] || new Set();
    const aliasesWithYeok = aliasMap[st.station_nm + '역'] || new Set();
    const allAliases = [...new Set([...aliases, ...aliasesWithYeok])];

    stationMap[code] = {
      line_num: st.line_num,
      station_name: st.station_nm,
      station_alias: allAliases,
      station_cd: st.station_cd,
      fr_code: st.fr_code,
      is_express: isExpressStation(line, st.station_nm),
      hm: '0:00',
      hm2: '0:00',
      adj_hm: '0:00',
      adj_hm2: '0:00',
      edges: [],
    };
    adjMap.set(code, []);
  });

  const addDirectedEdge = (fromCode, toCode) => {
    if (!stationMap[fromCode] || !stationMap[toCode]) return;
    const list = adjMap.get(fromCode);
    if (list.some((e) => e.to === toCode)) return;

    const baseSec = findBaseDistanceSeconds(
      line,
      rawByCode[fromCode],
      rawByCode[toCode],
      lineDistances
    );

    list.push({
      to: toCode,
      baseSec,
      sec: baseSec > 0 ? baseSec + 30 : 0,
      express_sec: 0,
    });
  };

  segments.forEach((seg) => {
    const { codes, oneWay } = seg;
    for (let i = 0; i < codes.length - 1; i++) {
      const u = codes[i];
      const v = codes[i + 1];
      addDirectedEdge(u, v);
      if (!oneWay) {
        addDirectedEdge(v, u);
      }
    }
  });

  // 1) 완행 adjust.json 적용 (!adj.is_express)
  const normalAdjusts = adjustData.filter((a) => a.line_num === line && !a.is_express);
  normalAdjusts.forEach((adj) => {
    const pathCodes = findShortestPathCodes(
      stationMap,
      adjMap,
      adj.station_name_start,
      adj.station_name_end
    );
    if (!pathCodes || pathCodes.length < 2) return;

    const segmentCount = pathCodes.length - 1;
    let totalBaseSec = 0;
    let hasZero = false;

    for (let i = 0; i < segmentCount; i++) {
      const u = pathCodes[i];
      const v = pathCodes[i + 1];
      const edge = (adjMap.get(u) || []).find((e) => e.to === v);
      const bSec = edge ? edge.baseSec : 0;
      totalBaseSec += bSec;
      if (bSec === 0) hasZero = true;
    }

    const totSec = hmToSeconds(adj.tot_hm);
    for (let i = 0; i < segmentCount; i++) {
      const u = pathCodes[i];
      const v = pathCodes[i + 1];
      const forwardEdge = (adjMap.get(u) || []).find((e) => e.to === v);
      const backwardEdge = (adjMap.get(v) || []).find((e) => e.to === u);

      let calcSec = 0;
      if (hasZero || totalBaseSec === 0) {
        calcSec = Math.round(totSec / segmentCount);
      } else {
        const bSec = forwardEdge ? forwardEdge.baseSec : 0;
        calcSec = Math.round(bSec * (totSec / totalBaseSec));
      }

      if (forwardEdge && forwardEdge.sec === 0) {
        forwardEdge.sec = calcSec;
      } else if (forwardEdge && (line === '02호선' || line === '수인분당선' || line === '신분당선')) {
        forwardEdge.sec = calcSec;
      }

      if (backwardEdge && backwardEdge.sec === 0) {
        backwardEdge.sec = calcSec;
      } else if (backwardEdge && (line === '02호선' || line === '수인분당선' || line === '신분당선')) {
        backwardEdge.sec = calcSec;
      }
    }
  });

  // 완행 Fallback (120초) 및 Step A: 물리 공식 기반 기본 express_sec 계산
  for (const [, edgeList] of adjMap.entries()) {
    edgeList.forEach((edge) => {
      if (!edge.sec || edge.sec <= 0) {
        edge.sec = 120;
      }
      const targetSt = stationMap[edge.to];
      if (targetSt && targetSt.is_express) {
        // 급행 정차역 도착: 정차시간(30초) 유지, 주행 가속분 15초 단축
        edge.express_sec = Math.max(60, edge.sec - 15);
      } else {
        // 급행 통과역 무정차 통과: 정차시간(30초) + 가감속 손실(15초) = 45초 단축
        edge.express_sec = Math.max(45, edge.sec - 45);
      }
    });
  }

  // 2) Step B: adjust.json의 급행 구간(adj.is_express === true) 총 소요시간 비례 배분 우선 적용!
  const expressAdjusts = adjustData.filter((a) => a.line_num === line && a.is_express === true);
  expressAdjusts.forEach((adj) => {
    const pathCodes = findShortestPathCodes(
      stationMap,
      adjMap,
      adj.station_name_start,
      adj.station_name_end
    );
    if (!pathCodes || pathCodes.length < 2) return;

    const segmentCount = pathCodes.length - 1;
    let totalDefaultExpressSec = 0;

    for (let i = 0; i < segmentCount; i++) {
      const u = pathCodes[i];
      const v = pathCodes[i + 1];
      const forwardEdge = (adjMap.get(u) || []).find((e) => e.to === v);
      totalDefaultExpressSec += forwardEdge ? forwardEdge.express_sec : 90;
    }

    const totExpressSec = hmToSeconds(adj.tot_hm);
    if (totExpressSec <= 0 || totalDefaultExpressSec <= 0) return;

    for (let i = 0; i < segmentCount; i++) {
      const u = pathCodes[i];
      const v = pathCodes[i + 1];
      const forwardEdge = (adjMap.get(u) || []).find((e) => e.to === v);
      const backwardEdge = (adjMap.get(v) || []).find((e) => e.to === u);

      if (forwardEdge) {
        forwardEdge.express_sec = Math.max(
          30,
          Math.round(forwardEdge.express_sec * (totExpressSec / totalDefaultExpressSec))
        );
      }
      if (backwardEdge) {
        backwardEdge.express_sec = Math.max(
          30,
          Math.round(backwardEdge.express_sec * (totExpressSec / totalDefaultExpressSec))
        );
      }
    }
  });

  // 최종 edges 배열 직렬화
  for (const [code, edgeList] of adjMap.entries()) {
    const stObj = stationMap[code];
    stObj.edges = edgeList.map((e) => ({
      to: e.to,
      sec: e.sec,
      express_sec: e.express_sec,
    }));
  }

  // 하위 호환성을 위해 orderedCodes 기준 인접 역의 hm / hm2 / adj_hm / adj_hm2 채우기
  for (let i = 0; i < orderedCodes.length; i++) {
    const currCode = orderedCodes[i];
    const stObj = stationMap[currCode];
    const edgeList = adjMap.get(currCode) || [];

    if (i < orderedCodes.length - 1) {
      const nextCode = orderedCodes[i + 1];
      const nextEdge = edgeList.find((e) => e.to === nextCode) || edgeList[0];
      if (nextEdge) {
        if (nextEdge.baseSec > 0) {
          stObj.hm = secondsToHm(nextEdge.baseSec);
        }
        stObj.adj_hm = secondsToHm(nextEdge.sec);
      }
    }

    if (i > 0) {
      const prevCode = orderedCodes[i - 1];
      const prevEdges = adjMap.get(prevCode) || [];
      const fromPrevEdge = prevEdges.find((e) => e.to === currCode) || edgeList[0];
      if (fromPrevEdge) {
        if (fromPrevEdge.baseSec > 0) {
          stObj.hm2 = secondsToHm(fromPrevEdge.baseSec);
        }
        stObj.adj_hm2 = secondsToHm(fromPrevEdge.sec);
      }
    }

    unifiedData.push(stObj);
  }
}

fs.writeFileSync(outputPath, JSON.stringify(unifiedData, null, 2));
console.log(`Successfully generated graph+express subway_data.json with ${unifiedData.length} stations.`);
