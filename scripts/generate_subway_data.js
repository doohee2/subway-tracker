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
 * 각 세그먼트는 { codes: string[], oneWay?: boolean } 형태입니다.
 */
function buildLineSegments(line, lineStations) {
  const codeSet = new Set(lineStations.map((s) => s.fr_code));
  const has = (c) => codeSet.has(c);

  if (line === '01호선') {
    // 1) 연천(100-3) -> 소요산(100) -> 구로(141) -> 인천(161)
    const gyeongwonNorth = ['100-3', '100-2', '100-1'].filter(has);
    const mainGyeongin = [...codeSet]
      .filter((c) => /^\d+$/.test(c))
      .sort(compareFrCode);
    const seg1 = [...gyeongwonNorth, ...mainGyeongin];

    // 2) 구로(141) -> 가산디지털단지(P142) ~ 신창(P177) (단, P144-1 광명, P157-1 서동탄 제외)
    const gyeongbuMain = [...codeSet]
      .filter((c) => /^P\d+$/.test(c))
      .sort(compareFrCode);
    const seg2 = ['141', ...gyeongbuMain].filter(has);

    // 3) 금천구청(P144) -> 광명(P144-1)
    const seg3 = ['P144', 'P144-1'].filter(has);

    // 4) 병점(P157) -> 서동탄(P157-1)
    const seg4 = ['P157', 'P157-1'].filter(has);

    return [{ codes: seg1 }, { codes: seg2 }, { codes: seg3 }, { codes: seg4 }];
  }

  if (line === '02호선') {
    const mainLoop = [...codeSet]
      .filter((c) => /^\d+$/.test(c))
      .sort(compareFrCode);
    // 순환선: 충정로(243) <-> 시청(201) 연결
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
    // 응암 루프(610 -> 611 -> 612 -> 613 -> 614 -> 615 -> 610)는 단방향 운행
    const eungamLoop = ['610', '611', '612', '613', '614', '615', '610'].filter(has);
    const mainLine = ['610', ...[...codeSet].filter((c) => parseInt(c, 10) >= 616).sort(compareFrCode)].filter(has);
    return [{ codes: eungamLoop, oneWay: true }, { codes: mainLine }];
  }

  if (line === '경의선') {
    // 임진강(K337) ~ 가좌(K315) ~ 공덕(K312) -> 효창공원앞(K826) -> 용산(K110) ~ 지평(K138)
    const gyeonguiWest = [...codeSet]
      .filter((c) => /^K3\d+$/.test(c))
      .sort(compareFrCode)
      .reverse(); // K337(임진강) -> K312(공덕)
    const jungangEast = [...codeSet]
      .filter((c) => /^K1\d+$/.test(c))
      .sort(compareFrCode); // K110(용산) -> K138(지평)
    const mainSeg = [...gyeonguiWest, ...(has('K826') ? ['K826'] : []), ...jungangEast];
    // 가좌(K315) -> 신촌(P312) -> 서울역(P313)
    const seoulBranch = ['K315', 'P312', 'P313'].filter(has);
    return [{ codes: mainSeg }, { codes: seoulBranch }];
  }

  if (line === '경춘선') {
    // 청량리(P117) ~ 상봉(P120) ~ 춘천(P140)
    const mainSeg = [...codeSet]
      .filter((c) => c !== 'P116')
      .sort(compareFrCode);
    // 광운대(P116) <-> 상봉(P120)
    const gwangundaeBranch = ['P116', 'P120'].filter(has);
    return [{ codes: mainSeg }, { codes: gwangundaeBranch }];
  }

  if (line === '공항철도') {
    // A042(마곡나루)는 A04~A05 사이, A071(청라)·A072(영종)는 A07~A08 사이에 위치
    const ordered = [
      'A01', 'A02', 'A03', 'A04', 'A042', 'A05',
      'A06', 'A07', 'A071', 'A072', 'A08', 'A09', 'A10', 'A11'
    ].filter(has);
    return [{ codes: ordered }];
  }

  const sorted = [...codeSet].sort(compareFrCode);
  return [{ codes: sorted }];
}

/**
 * distances.json에서 두 역(stA, stB) 사이의 기준 주행시간(초)을 양방향으로 탐색합니다.
 */
function findBaseDistanceSeconds(line, stA, stB, lineDistances) {
  if (!stA || !stB) return 0;

  // 5호선 강동(548) <-> 둔촌동(P549) 분기점 특수 처리
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
    // 정방향 (stA -> stB)
    if (isMatch(currD.sbwy_stns_nm, stA.station_nm) && isMatch(nextD.sbwy_stns_nm, stB.station_nm)) {
      const sec = hmToSeconds(nextD.hm);
      if (sec > 0) return sec;
    }
    // 역방향 (stB -> stA): distances.json이 역순으로 기록된 노선(예: 1호선 서울역->청량리) 대응
    if (isMatch(currD.sbwy_stns_nm, stB.station_nm) && isMatch(nextD.sbwy_stns_nm, stA.station_nm)) {
      const sec = hmToSeconds(nextD.hm);
      if (sec > 0) return sec;
    }
  }
  return 0;
}

/**
 * 그래프 내에서 시작역 이름과 종료역 이름으로 최단 경로(fr_code 배열)를 찾습니다 (BFS).
 */
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

  // 세그먼트 생성 및 대표 정렬 순서 구성
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
  // 혹시 누락된 역이 있으면 뒤에 추가
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
      baseSec, // distances.json 순수 주행 시간 (없으면 0)
      sec: baseSec > 0 ? baseSec + 30 : 0, // 정차시간 30초 포함 실소요시간
    });
  };

  // 세그먼트별 간선 연결
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

  // adjust.json 적용 (그래프 최단 경로 기반)
  const adjusts = adjustData.filter((a) => a.line_num === line);
  adjusts.forEach((adj) => {
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
        // 기존 adjust.json에 있던 보정 노선은 보정값 우선 적용
        forwardEdge.sec = calcSec;
      }

      if (backwardEdge && backwardEdge.sec === 0) {
        backwardEdge.sec = calcSec;
      } else if (backwardEdge && (line === '02호선' || line === '수인분당선' || line === '신분당선')) {
        backwardEdge.sec = calcSec;
      }
    }
  });

  // Fallback: 여전히 sec === 0 인 간선은 표준 역간 소요시간(120초 = 주행 90초 + 정차 30초) 부여
  for (const [code, edgeList] of adjMap.entries()) {
    edgeList.forEach((edge) => {
      if (!edge.sec || edge.sec <= 0) {
        edge.sec = 120;
      }
    });

    const stObj = stationMap[code];
    stObj.edges = edgeList.map((e) => ({
      to: e.to,
      sec: e.sec,
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
console.log(`Successfully generated graph-based subway_data.json with ${unifiedData.length} stations.`);
