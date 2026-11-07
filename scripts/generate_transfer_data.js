const fs = require('fs');
const path = require('path');

function getLatestTransferInfoFile() {
  const jsonDir = path.join(__dirname, '../json');
  if (!fs.existsSync(jsonDir)) {
    throw new Error(`[generate_transfer_data] json 디렉토리를 찾을 수 없습니다: ${jsonDir}`);
  }

  // subway_transfer_info_v{N}.json 파일들을 검색하여 가장 높은 버전(v4 > v3 > v2 ...) 자동 선택
  const matchedFiles = fs.readdirSync(jsonDir)
    .filter(file => /^subway_transfer_info_v\d+\.json$/.test(file))
    .sort((a, b) => {
      const verA = parseInt(a.match(/v(\d+)\.json$/)[1], 10);
      const verB = parseInt(b.match(/v(\d+)\.json$/)[1], 10);
      return verB - verA;
    });

  if (matchedFiles.length > 0) {
    return path.join(jsonDir, matchedFiles[0]);
  }

  const fallback = path.join(jsonDir, 'subway_transfer_info.json');
  if (fs.existsSync(fallback)) return fallback;

  throw new Error(`[generate_transfer_data] 환승 원본 JSON 파일(subway_transfer_info_v*.json)을 찾을 수 없습니다.`);
}

const srcPath = getLatestTransferInfoFile();
const outPath = path.join(__dirname, '../json/subway_transfer_data.json');

const rawData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// 1. 노선명 정규화 매핑
function normalizeLine(name) {
  if (!name) return '';
  const trimmed = name.trim();
  const cleaned = trimmed.replace(/\(.*?\)/g, '').trim();
  const map = {
    'GTX': 'GTX-A',
    '인천 1호선': '인천1호선',
    '인천 2호선': '인천2호선',
    '경의·중앙선': '경의중앙선',
    '경의중앙': '경의중앙선',
    '수인·분당선': '수인분당선',
    '수인분당': '수인분당선',
    '의정부 경전철': '의정부경전철',
    '용인 에버라인': '용인경전철',
    '우이신설선': '우이신설선',
    '김포 골드라인': '김포골드라인',
    '신분당선': '신분당선',
    '경강선': '경강선',
    '서해선': '서해선',
    '신림선': '신림선',
    '공항철도': '공항철도',
  };
  if (map[trimmed]) return map[trimmed];
  if (map[cleaned]) return map[cleaned];
  return cleaned || trimmed;
}

// 2. target_line 분리 및 정규화
function parseTargetLines(targetLineStr) {
  if (!targetLineStr) return [];
  return targetLineStr
    .split(',')
    .map(s => normalizeLine(s.trim()))
    .filter(Boolean);
}

// 3. 역명 정규화 (station_key)
function getStationKey(name) {
  if (!name) return '';
  const cleaned = name.trim();
  if (cleaned === '서울역') return '서울역';
  return cleaned.replace(/역$/, '').replace(/\(.*?\)/g, '').trim();
}

// 4. 방향 및 지선/급행 힌트 매핑
function resolveDirection(currentLine, currentDir) {
  const line = currentLine;
  const dir = currentDir ? currentDir.trim() : '전체';

  let updnCode = 'ALL'; // "0" (상행/외선), "1" (하행/내선), "ALL"
  let branchHint = null; // "성수지선" | "신정지선" | "마천" | "하남검단산" | "급행" | null

  // 1호선
  if (line === '1호선') {
    if (dir.includes('연천') || dir.includes('광운대') || dir.includes('청량리')) {
      updnCode = '0';
    } else if (dir.includes('인천') || dir.includes('신창') || dir.includes('천안')) {
      updnCode = '1';
    } else if (dir.includes('용산 급행')) {
      updnCode = '0';
      branchHint = '급행';
    } else if (dir.includes('동인천 급행')) {
      updnCode = '1';
      branchHint = '급행';
    }
  }
  // 2호선
  else if (line === '2호선') {
    if (dir.includes('외선')) {
      updnCode = '0';
    } else if (dir.includes('내선')) {
      updnCode = '1';
    } else if (dir.includes('신정지선')) {
      branchHint = '신정지선';
      updnCode = 'ALL';
    } else if (dir.includes('성수지선')) {
      branchHint = '성수지선';
      updnCode = 'ALL';
    }
  }
  // 3호선
  else if (line === '3호선') {
    if (dir.includes('대화')) updnCode = '0';
    else if (dir.includes('오금')) updnCode = '1';
  }
  // 4호선
  else if (line === '4호선') {
    if (dir.includes('진접') || dir.includes('불암산')) updnCode = '0';
    else if (dir.includes('사당') || dir.includes('오이도')) updnCode = '1';
  }
  // 5호선
  else if (line === '5호선') {
    if (dir.includes('방화')) {
      updnCode = '0';
    } else if (dir.includes('하남검단산/마천')) {
      updnCode = '1';
    } else if (dir.includes('하남검단산')) {
      updnCode = '1';
      branchHint = '하남검단산';
    } else if (dir.includes('마천')) {
      updnCode = '1';
      branchHint = '마천';
    }
  }
  // 6호선
  else if (line === '6호선') {
    if (dir.includes('응암')) updnCode = '0';
    else if (dir.includes('신내')) updnCode = '1';
  }
  // 7호선
  else if (line === '7호선') {
    if (dir.includes('장암')) updnCode = '0';
    else if (dir.includes('석남')) updnCode = '1';
  }
  // 8호선
  else if (line === '8호선') {
    if (dir.includes('별내')) updnCode = '0';
    else if (dir.includes('모란')) updnCode = '1';
  }
  // 공항철도
  else if (line === '공항철도') {
    if (dir.includes('서울역')) updnCode = '0';
    else if (dir.includes('인천공항')) updnCode = '1';
  }
  // 인천1호선
  else if (line === '인천1호선') {
    if (dir.includes('검단호수공원')) updnCode = '0';
    else if (dir.includes('송도달빛축제공원')) updnCode = '1';
  }
  // 인천2호선
  else if (line === '인천2호선') {
    if (dir.includes('검단오류')) updnCode = '0';
    else if (dir.includes('운연')) updnCode = '1';
  }
  // 경춘선
  else if (line === '경춘선') {
    if (dir.includes('청량리')) updnCode = '0';
    else if (dir.includes('춘천')) updnCode = '1';
  }
  // 신분당선
  else if (line === '신분당선') {
    if (dir.includes('신사')) updnCode = '0';
    else if (dir.includes('광교')) updnCode = '1';
  }
  // 경강선
  else if (line === '경강선') {
    if (dir.includes('판교')) updnCode = '0';
    else if (dir.includes('여주')) updnCode = '1';
  }
  // 서해선
  else if (line === '서해선') {
    if (dir.includes('일산') || dir.includes('대곡')) updnCode = '0';
    else if (dir.includes('원시')) updnCode = '1';
  }
  // 의정부경전철
  else if (line === '의정부경전철') {
    if (dir.includes('발곡')) updnCode = '0';
    else if (dir.includes('탑석')) updnCode = '1';
  }
  // 우이신설선
  else if (line === '우이신설선') {
    if (dir.includes('북한산우이')) updnCode = '0';
    else if (dir.includes('신설동')) updnCode = '1';
  }
  // 신림선
  else if (line === '신림선') {
    if (dir.includes('샛강')) updnCode = '0';
    else if (dir.includes('관악산')) updnCode = '1';
  }
  // 수인분당선
  else if (line === '수인분당선') {
    if (dir.includes('청량리') || dir.includes('왕십리')) updnCode = '0';
    else if (dir.includes('인천') || dir.includes('고색') || dir.includes('수원')) updnCode = '1';
  }
  // GTX-A
  else if (line === 'GTX-A') {
    if (dir.includes('운정중앙') || dir.includes('수서')) updnCode = '0';
    else if (dir.includes('서울역') || dir.includes('동탄')) updnCode = '1';
  }

  return { updnCode, branchHint };
}

const cleanedRecords = [];
let skippedCount = 0;

rawData.forEach((item) => {
  // 1. 탑승 위치가 없거나 '-'인 경우 제외
  const bp = (item.boarding_position || '').trim();
  if (!bp || bp === '-') {
    skippedCount++;
    return;
  }

  let currentLine = item.current_line;
  let stationName = item.station_name;
  let currentDirection = item.current_direction;

  // 2. GTX-A 깨짐 레코드 복원 (tr-438 ~ tr-447)
  if (currentLine === 'GTX' && stationName === 'A') {
    currentLine = 'GTX-A';
    // raw_source 예: 'GTX-A - 대곡역 - 운정중앙 방면', 'GTX-A - 수서역'
    const parts = (item.raw_source || '').split(' - ');
    if (parts.length >= 2) {
      stationName = parts[1].trim();
      currentDirection = parts[2] ? parts[2].trim() : '전체';
    }
  }

  currentLine = normalizeLine(currentLine);
  const stationKey = getStationKey(stationName);
  const targetLines = parseTargetLines(item.target_line);
  const { updnCode, branchHint } = resolveDirection(currentLine, currentDirection);

  // 런타임(클라이언트 번들)에서 사용하는 필드만 출력하여 용량 절감
  // (station_display, target_line_raw, raw_source, raw_target 등 원본 추적용 필드는 제외)
  cleanedRecords.push({
    id: item.id,
    station_key: stationKey,
    current_line: currentLine,
    current_direction: currentDirection,
    updn_code: updnCode,
    branch_hint: branchHint,
    target_lines: targetLines,
    target_direction: (item.target_direction || '전체').trim(),
    boarding_position: bp,
  });
});

fs.writeFileSync(outPath, JSON.stringify(cleanedRecords, null, 2), 'utf8');

console.log(`[generate_transfer_data] Complete!`);
console.log(`- Source file: ${path.basename(srcPath)}`);
console.log(`- Original records: ${rawData.length}`);
console.log(`- Skipped records (-): ${skippedCount}`);
console.log(`- Cleaned records: ${cleanedRecords.length}`);
console.log(`- Output saved to: ${outPath}`);
