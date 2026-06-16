const fs = require('fs');
const path = require('path');

const stationsPath = path.join(__dirname, '../json/stations.json');
const distancesPath = path.join(__dirname, '../json/distances.json');
const aliasesPath = path.join(__dirname, '../json/stations_nm_alias.json');
const adjustPath = path.join(__dirname, '../json/adjust.json');
const outputPath = path.join(__dirname, '../json/subway_data.json');

// Read JSON files
const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8')).DATA;
let distancesData = [];
if (fs.existsSync(distancesPath)) {
  distancesData = JSON.parse(fs.readFileSync(distancesPath, 'utf8')).DATA;
}
let aliasesData = [];
if (fs.existsSync(aliasesPath)) {
  aliasesData = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
}
let adjustData = [];
if (fs.existsSync(adjustPath)) {
  adjustData = JSON.parse(fs.readFileSync(adjustPath, 'utf8'));
}

// Helpers
function normalizeRouteLine(lineName) {
  const match = lineName.match(/(\d+)호선/);
  if (match) {
    return parseInt(match[1], 10).toString();
  }
  return lineName;
}

function isMatch(name1, name2) {
  if (!name1 || !name2) return false;
  return name1 === name2 || name1.includes(name2) || name2.includes(name1);
}

function hmToSeconds(hm) {
  if (!hm || !hm.includes(':')) return 0;
  const parts = hm.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function secondsToHm(seconds) {
  if (isNaN(seconds)) return "0:00";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}:${rs.toString().padStart(2, '0')}`;
}

// Map aliases by station name
const aliasMap = {};
stationsData.forEach(st => {
  const nm = st.station_nm;
  if (!aliasMap[nm]) aliasMap[nm] = new Set();
});

aliasesData.forEach(item => {
  const statnNm = item.STATN_NM;
  const statnAlias = item.STATN_ALIAS;
  
  Object.keys(aliasMap).forEach(nm => {
    if (statnNm === nm || statnAlias === nm || statnNm.startsWith(nm + "(")) {
      if (statnNm !== nm) aliasMap[nm].add(statnNm);
      if (statnAlias !== nm) aliasMap[nm].add(statnAlias);
    }
  });
});

// Group stations by line_num
const lines = {};
stationsData.forEach(station => {
  const line = station.line_num;
  if (!lines[line]) lines[line] = [];
  lines[line].push(station);
});

const unifiedData = [];

for (const line in lines) {
  let lineStations = lines[line];
  
  // Sort stations
  if (line === "02호선") {
    const mainLine = [];
    const seongsuBranch = []; // 211-n
    const sinjeongBranch = []; // 234-n

    lineStations.forEach(st => {
      if (st.fr_code.startsWith("211-")) {
        seongsuBranch.push(st);
      } else if (st.fr_code.startsWith("234-")) {
        sinjeongBranch.push(st);
      } else {
        mainLine.push(st);
      }
    });

    mainLine.sort((a, b) => a.fr_code.localeCompare(b.fr_code, undefined, { numeric: true, sensitivity: 'base' }));
    seongsuBranch.sort((a, b) => a.fr_code.localeCompare(b.fr_code, undefined, { numeric: true, sensitivity: 'base' }));
    sinjeongBranch.sort((a, b) => a.fr_code.localeCompare(b.fr_code, undefined, { numeric: true, sensitivity: 'base' }));

    lineStations = [...mainLine, ...seongsuBranch, ...sinjeongBranch];
  } else {
    lineStations.sort((a, b) => a.fr_code.localeCompare(b.fr_code, undefined, { numeric: true, sensitivity: 'base' }));
  }

  const routLn = normalizeRouteLine(line);
  const lineDistances = distancesData.filter(d => d.sbwy_rout_ln === routLn);

  const currentLineUnifiedData = [];

  for (let i = 0; i < lineStations.length; i++) {
    const st = lineStations[i];
    
    let hm = "0:00";
    let hm2 = "0:00";

    // Find hm (time to next station)
    if (i < lineStations.length - 1) {
      const nextSt = lineStations[i + 1];
      for (let k = 0; k < lineDistances.length - 1; k++) {
        if (isMatch(lineDistances[k].sbwy_stns_nm, st.station_nm) && 
            isMatch(lineDistances[k + 1].sbwy_stns_nm, nextSt.station_nm)) {
          hm = lineDistances[k + 1].hm || "0:00";
          break;
        }
      }
    }

    // Find hm2 (time from prev station)
    if (i > 0) {
      const prevSt = lineStations[i - 1];
      for (let k = 0; k < lineDistances.length - 1; k++) {
        if (isMatch(lineDistances[k].sbwy_stns_nm, prevSt.station_nm) && 
            isMatch(lineDistances[k + 1].sbwy_stns_nm, st.station_nm)) {
          hm2 = lineDistances[k + 1].hm || "0:00";
          break;
        }
      }
    }

    const aliases = aliasMap[st.station_nm] || new Set();
    const aliasesWithYeok = aliasMap[st.station_nm + "역"] || new Set();
    const allAliases = [...new Set([...aliases, ...aliasesWithYeok])];

    currentLineUnifiedData.push({
      line_num: st.line_num,
      station_name: st.station_nm,
      station_alias: allAliases,
      station_cd: st.station_cd,
      fr_code: st.fr_code,
      hm: hm,
      hm2: hm2,
      adj_hm: "0:00",
      adj_hm2: "0:00"
    });
  }

  // Process adjust.json for this line
  const adjusts = adjustData.filter(a => a.line_num === line);
  adjusts.forEach(adj => {
    const startIndex = currentLineUnifiedData.findIndex(s => isMatch(s.station_name, adj.station_name_start));
    const endIndex = currentLineUnifiedData.findIndex(s => isMatch(s.station_name, adj.station_name_end));

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const segmentCount = endIndex - startIndex;
      let totalOriginalSeconds = 0;
      let hasZero = false;

      for (let i = startIndex; i < endIndex; i++) {
        const sec = hmToSeconds(currentLineUnifiedData[i].hm);
        totalOriginalSeconds += sec;
        if (sec === 0) hasZero = true;
      }

      const totSec = hmToSeconds(adj.tot_hm);

      if (hasZero || totalOriginalSeconds === 0) {
        // Case 1: distribute equally
        const eqSec = totSec / segmentCount;
        for (let i = startIndex; i < endIndex; i++) {
          currentLineUnifiedData[i].adj_hm = secondsToHm(eqSec);
        }
      } else {
        // Case 2: distribute proportionally
        for (let i = startIndex; i < endIndex; i++) {
          const sec = hmToSeconds(currentLineUnifiedData[i].hm);
          const propSec = sec * (totSec / totalOriginalSeconds);
          currentLineUnifiedData[i].adj_hm = secondsToHm(propSec);
        }
      }

      // Propagate adj_hm to adj_hm2 for consistency
      for (let i = startIndex + 1; i <= endIndex; i++) {
        currentLineUnifiedData[i].adj_hm2 = currentLineUnifiedData[i - 1].adj_hm;
      }
    }
  });

  unifiedData.push(...currentLineUnifiedData);
}

fs.writeFileSync(outputPath, JSON.stringify(unifiedData, null, 2));
console.log(`Successfully generated subway_data.json with ${unifiedData.length} entries.`);
